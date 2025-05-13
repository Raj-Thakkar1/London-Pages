const express = require('express');
const path = require('path');
const fs = require('fs');
const { getUserFolders } = require('../config/googleDrive');
const router = express.Router();
const db = require('../config/firebase').db;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const upload = require('../config/multerConfig');
const { body, query, validationResult } = require('express-validator');
const clamav = require('clamav.js');
const CLAMAV_PORT = 3310;
const CLAMAV_HOST = '127.0.0.1';
const { addFfmpegJob } = require('../ffmpegQueue');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');
const axios = require('axios');
const archiver = require('archiver');

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Protected route middleware
function requireLogin(req, res, next) {
  if (req.cookies && req.cookies.loggedIn === "true") {
    next();
  } else {
    // If AJAX/API request, respond with JSON
    if (req.originalUrl.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    } else {
      res.redirect('/login');
    }
  }
}

// Wrap file upload in an error handling middleware
const uploadHandler = async (req, res, next) => {
  upload.single('videoFile')(req, res, async (err) => {
    if (err) {
      return res.redirect('/dashboard/creator-upload-error?message=' + 
        encodeURIComponent(err.message));
    }
    // Check video resolution and reject if above 4K BEFORE virus scan
    if (req.file && req.file.path) {
      try {
        // Use ffprobe to get video stream info
        const probeData = await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(req.file.path, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata);
          });
        });
        // Find the first video stream
        // (Removed: if (videoStream && videoStream.height > 2160) { ... })
        // No longer rejecting videos above 4K
      } catch (err) {
        logger.error('Error during video resolution check', { error: err });
        if (req.file && req.file.path) cleanupTempFile(req.file.path);
        const isAjax = req.xhr || req.headers.accept?.includes('application/json');
        if (isAjax) {
          return res.status(500).json({ success: false, message: "Error processing video resolution." });
        }
        return res.redirect('/dashboard/creator-upload-error?message=' + encodeURIComponent("Error processing video resolution."));
      }
    }
    // Antivirus scan after upload (chunked)
    if (req.file && req.file.path) {
      try {
        // Ensure file exists before scanning
        if (!fs.existsSync(req.file.path)) {
          throw new Error('Uploaded file does not exist for scanning.');
        }
        const CHUNK_SIZE = 500 * 1024 * 1024; // 500MB
        const fileSize = fs.statSync(req.file.path).size;
        const numChunks = Math.ceil(fileSize / CHUNK_SIZE);
        const scanChunk = (start, end) => {
          return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(req.file.path, { start, end });
            let resolvedOrRejected = false;
            const cleanup = () => {
              if (!resolvedOrRejected) {
                resolvedOrRejected = true;
                stream.destroy();
              }
            };
            stream.on('error', (err) => {
              if (!resolvedOrRejected) {
                resolvedOrRejected = true;
                reject(new Error('File stream error during scan: ' + err.message));
              }
            });
            clamav.ping(CLAMAV_PORT, CLAMAV_HOST, 1000, (pingErr) => {
              if (pingErr) {
                cleanup();
                return reject(new Error('ClamAV service unavailable.'));
              }
              const scanner = clamav.createScanner(CLAMAV_PORT, CLAMAV_HOST);
              scanner.scan(stream, (scanErr, object, malicious) => {
                if (resolvedOrRejected) return; // Prevent double-callback
                resolvedOrRejected = true;
                stream.destroy();
                if (scanErr) return reject(scanErr);
                if (malicious) return reject(new Error('Malware detected in uploaded file chunk.'));
                resolve();
              });
            });
          });
        };
        for (let i = 0; i < numChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min((i + 1) * CHUNK_SIZE - 1, fileSize - 1);
          await scanChunk(start, end);
        }
      } catch (scanErr) {
        // Log the incident with more details
        logger.error('Security incident: Malware detected or scan error', {
          error: scanErr,
          message: scanErr && scanErr.message,
          stack: scanErr && scanErr.stack
        });
        if (req.file && req.file.path) {
          fs.unlink(req.file.path, () => {});
        }
        return res.redirect('/dashboard/creator-upload-error?message=' + encodeURIComponent('Security error: ' + (scanErr && scanErr.message)));
      }
    }
    next();
  });
};

// Schedule cleanup of old temp files
setInterval(() => {
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadDir)) {
    fs.readdir(uploadDir, (err, files) => {
      if (err) {
        logger.error('Error reading uploads directory', { error: err });
        return;
      }

      const now = Date.now();
      files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) {
            logger.error('Error getting file stats', { error: err });
            return;
          }

          // Remove files older than 24 hours
          if (now - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
            if (stats.isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
          }
        });
      });
    });
  }
}, 60 * 60 * 1000); // Run every hour

// Helper function to call ElevenLabs Dubbing API (with file upload)
async function sendToElevenLabsDubbing({
  file,
  projectName,
  sourceLanguage,
  targetLanguage,
  numberOfSpeakers,
  removeBackgroundMusic
}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('Missing ElevenLabs API key');
  const endpoint = 'https://api.elevenlabs.io/v1/dubbing/translate';
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', fs.createReadStream(file.path), file.originalname);
  form.append('name', projectName);
  form.append('source_lang', sourceLanguage);
  form.append('target_lang', targetLanguage);
  form.append('num_speakers', numberOfSpeakers);
  form.append('drop_background_audio', removeBackgroundMusic);
  form.append('dubbing_studio', 'true'); // Set to create a dubbing studio project
  form.append('highest_resolution', 'true'); 
  const headers = {
    'xi-api-key': apiKey,
    ...form.getHeaders()
  };
  const response = await axios.post(endpoint, form, { headers });
  return response.data;
}

// POST route for handling video file upload
router.post(
  '/creator-upload-video',
  requireLogin,
  uploadHandler,
  [
    body('sourceLanguage').isString().trim().escape(),
    body('targetLanguage').isString().trim().escape(),
    body('numberOfSpeakers').isString().trim().escape(),
    body('removeBackgroundMusic').optional().toBoolean(),
    body('projectName').isString().trim().escape()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/dashboard/creator-upload-error?message=' + encodeURIComponent('Validation error: ' + JSON.stringify(errors.array())));
    }
    next();
  },
  async (req, res) => {
    // Helper to detect AJAX (XHR or fetch) request
    const isAjax = req.xhr || req.headers.accept?.includes('application/json');

    if (!req.file) {
      if (isAjax) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
      }
      return res.redirect('/dashboard/creator-upload-error?message=' + 
        encodeURIComponent("No file uploaded."));
    }

    // Log and check if file exists immediately after multer upload
    if (req.file && req.file.path) {
      if (fs.existsSync(req.file.path)) {
        logger.info('File exists immediately after multer upload', { path: req.file.path, file: req.file });
      } else {
        logger.error('File missing immediately after multer upload', { path: req.file.path, file: req.file });
        if (isAjax) {
          return res.status(500).json({ success: false, message: "Uploaded file missing right after upload. Please try again." });
        }
        return res.redirect('/dashboard/creator-upload-error?message=' + 
          encodeURIComponent("Uploaded file missing right after upload. Please try again."));
      }
    }

    // Extra check: ensure uploaded file exists before processing
    if (!fs.existsSync(req.file.path)) {
      logger.error('Uploaded file missing before processing', { path: req.file.path, file: req.file });
      if (isAjax) {
        return res.status(500).json({ success: false, message: "Uploaded file missing. Please try again." });
      }
      return res.redirect('/dashboard/creator-upload-error?message=' + 
        encodeURIComponent("Uploaded file missing. Please try again."));
    }

    const { sourceLanguage, targetLanguage, numberOfSpeakers, projectName } = req.body;
    const removeBackgroundMusic = req.body.removeBackgroundMusic ? true : false;
    const userEmail = req.cookies.userEmail;

    // Map 'auto' to correct API values
    const apiNumSpeakers = numberOfSpeakers === 'auto' ? 0 : numberOfSpeakers;
    const apiSourceLanguage = sourceLanguage === 'auto' ? 'auto' : sourceLanguage;

    let duration = { minutes: 0, seconds: 0 };
    try {
      duration = await getVideoDuration(req.file.path);
      // Reject if video is longer than 2.5 hours (9000 seconds)
      const totalSeconds = (duration.minutes * 60) + duration.seconds;
      if (totalSeconds > 9000) {
        logger.warn('Rejected video upload: duration exceeds 2.5 hours', { duration });
        cleanupTempFile(req.file.path);
        if (isAjax) {
          return res.status(400).json({ success: false, message: "Video duration exceeds 2.5 hours (150 minutes)." });
        }
        return res.redirect('/dashboard/creator-upload-error?message=' + encodeURIComponent("Video duration exceeds 2.5 hours (150 minutes)."));
      }
    } catch (err) {
      logger.error('Error retrieving video duration', { error: err });
      cleanupTempFile(req.file.path);
      if (isAjax) {
        return res.status(500).json({ success: false, message: "Error retrieving video duration." });
      }
      return res.redirect('/dashboard/creator-upload-error?message=' + 
        encodeURIComponent("Error retrieving video duration."));
    }
  
    // Validate user's translation time
    const userTotalSeconds = await validateUserTranslationTime(userEmail, duration);
    if (userTotalSeconds === false) {
      cleanupTempFile(req.file.path);
      if (isAjax) {
        return res.status(400).json({ success: false, message: "Insufficient translation time." });
      }
      return res.redirect('/dashboard/creator-upload-error?message=' + 
        encodeURIComponent("Insufficient translation time."));
    }
  
    try {
      // Call ElevenLabs Dubbing API with the uploaded file
      let elevenLabsResponse;
      try {
        elevenLabsResponse = await sendToElevenLabsDubbing({
          file: req.file,
          projectName,
          sourceLanguage: apiSourceLanguage,
          targetLanguage,
          numberOfSpeakers: apiNumSpeakers,
          removeBackgroundMusic
        });
      } catch (err) {
        logger.error('Error sending to ElevenLabs Dubbing API', { error: err });
        cleanupTempFile(req.file.path);
        if (isAjax) {
          return res.status(500).json({ success: false, message: 'Failed to submit to ElevenLabs: ' + err.message });
        }
        return res.redirect('/dashboard/creator-upload-error?message=' + encodeURIComponent('Failed to submit to ElevenLabs: ' + err.message));
      }
  
      // Create Firestore record (store ElevenLabs job info, not Google Drive info)
      await createFirestoreRecord(null, req.file, userEmail, {
        sourceLanguage,
        targetLanguage,
        numberOfSpeakers,
        removeBackgroundMusic,
        duration,
        projectName,
        elevenLabsJob: elevenLabsResponse
      });
  
      // Update user's translation time
      await updateUserTranslationTime(userEmail, duration);
  
      // Cleanup and respond
      cleanupTempFile(req.file.path);
      if (isAjax) {
        return res.json({ success: true });
      }
      res.redirect('/dashboard/creator-upload-successful');
    } catch (error) {
      logger.error('Error in upload process', { 
        error: error,
        message: error && error.message,
        stack: error && error.stack
      });
      // Do NOT cleanup file here; leave it for scheduled cleanup to avoid race conditions
      if (isAjax) {
        return res.status(500).json({ success: false, message: "Upload failed: " + error.message });
      }
      return res.redirect('/dashboard/creator-upload-error?message=' + 
        encodeURIComponent("Upload failed: " + error.message));
    }
  }
);

// Helper function to clean up temporary files
function cleanupTempFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, err => {
      if (err) logger.error('Error deleting temp file', { error: err });
    });
  }
}

// Helper function to validate user's translation time
async function validateUserTranslationTime(userEmail, duration) {
  try {
    const usersSnapshot = await db.collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return false;
    }

    const userData = usersSnapshot.docs[0].data();
    const userTotalSeconds = (userData.translationMinutes || 0) * 60 + (userData.translationSeconds || 0);
    const videoTotalSeconds = duration.minutes * 60 + duration.seconds;

    return userTotalSeconds >= videoTotalSeconds ? userTotalSeconds : false;
  } catch (error) {
    logger.error('Error validating translation time', { error });
    return false;
  }
}

// Helper function to create Firestore record
async function createFirestoreRecord(_unused, file, userEmail, metadata) {
  const fileData = {
    fileName: file.originalname,
    assignedStatus: 'pending',
    assignedTo: null,
    userEmail,
    uploadDate: new Date(),
    ...metadata
  };
  await db.collection('uploadedFiles').add(fileData);
}

// Helper function to update user's translation time
async function updateUserTranslationTime(userEmail, duration) {
  const usersSnap = await db.collection('users')
    .where('email', '==', userEmail)
    .limit(1)
    .get();

  if (!usersSnap.empty) {
    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();
    const currentSeconds = (userData.translationMinutes || 0) * 60 + (userData.translationSeconds || 0);
    const videoSeconds = duration.minutes * 60 + duration.seconds;
    const remainingSeconds = currentSeconds - videoSeconds;
    
    await userDoc.ref.update({
      translationMinutes: Math.floor(remainingSeconds / 60),
      translationSeconds: remainingSeconds % 60
    });
  }
}

// GET routes for dashboard pages
router.get('/creator-dashboard', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard', 'creator-dashboard-upload.html'));
});

router.get('/creator-upload-videos', requireLogin, (req, res) => {
  res.render('dashboard/creator-upload-videos', { csrfToken: res.locals.csrfToken });
});

router.get('/creator-buy-minutes', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard', 'creator-buy-minutes.html'));
});

// GET route for the upload successful page
router.get('/creator-upload-successful', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard', 'creator-upload-successful.html'));
});

router.get('/creator-upload-error', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard', 'creator-upload-error.html'));
});

// Route to display the creator profile page
router.get('/creator-profile', requireLogin, async (req, res) => {
  const userEmail = req.cookies.userEmail;
  try {
    // Query the "users" collection for the logged-in creator
    const userSnapshot = await db.collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get();
      
    if (userSnapshot.empty) {
      return res.status(404).send("Creator not found");
    }
    
    // Retrieve the creator data from the document
    const creator = userSnapshot.docs[0].data();
    
    // Render the profile page using EJS
    res.render('dashboard/creator-profile', { creator });
  } catch (error) {
    logger.error('Error fetching creator profile', { error });
    res.status(500).send("Error fetching creator profile");
  }
});

// Serve the notifications page
router.get('/notifications', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard', 'notifications.html'));
});

// API endpoint to fetch notifications for the logged-in user
router.get('/api/notifications', requireLogin, async (req, res) => {
  const userEmail = req.cookies.userEmail;
  if (!userEmail) {
    return res.status(400).json({ error: "User email not found in cookie." });
  }
  try {
    const notificationsSnapshot = await db.collection('notifications')
      .where('userEmail', '==', userEmail)
      .orderBy('timestamp', 'desc')
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ notifications });
  } catch (error) {
    logger.error('Error fetching notifications', { error });
    res.status(500).json({ error: error.message });
  }
});

// GET route for downloading audio file
router.get('/download-audio', requireLogin, async (req, res) => {
  const fileId = req.query.fileId;
  if (!fileId) {
    return res.status(400).send("No fileId provided.");
  }

  let tempFilePath;
  let tempDir;
  let tempOutputPath;

  try {
    // Create temp directory for processing
    tempDir = path.join(__dirname, '..', 'uploads', `audio-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempFilePath = path.join(tempDir, `temp-${Date.now()}-${Math.round(Math.random() * 1e9)}.mp4`);
    tempOutputPath = path.join(tempDir, `output-${uuidv4()}.mp3`);

    // Set up streaming pipeline
    const videoStream = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Set up video write stream
    const writeStream = fs.createWriteStream(tempFilePath);

    // Download video
    await new Promise((resolve, reject) => {
      videoStream.data
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });

    // Add FFmpeg job to Bree queue
    const ffmpegOptions = [
      '-q:a 2',
      '-map 0:a:0',
      '-threads 2',
      '-bufsize 4M',
      '-maxrate 2M'
    ];
    const result = await addFfmpegJob(tempFilePath, tempOutputPath, ffmpegOptions);

    // Stream the output file
    res.setHeader('Content-Disposition', `attachment; filename="${fileId}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    const readStream = fs.createReadStream(result.outputPath);
    readStream.pipe(res);
    readStream.on('close', () => {
      cleanupTempFile(tempFilePath);
      cleanupTempFile(tempOutputPath);
      cleanupTempFile(tempDir);
    });
    readStream.on('error', (err) => {
      logger.error('Streaming error', { error: err });
      if (!res.headersSent) {
        res.status(500).send("Error streaming audio");
      }
      cleanupTempFile(tempFilePath);
      cleanupTempFile(tempOutputPath);
      cleanupTempFile(tempDir);
    });
  } catch (error) {
    logger.error('Error in audio extraction', { error });
    cleanupTempFile(tempFilePath);
    cleanupTempFile(tempOutputPath);
    cleanupTempFile(tempDir);
    if (!res.headersSent) {
      res.status(500).send("Error processing audio");
    }
  }
});

// Helper function to get video duration (in seconds)
function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const durationSeconds = metadata.format.duration;
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = Math.round(durationSeconds % 60);
      resolve({ minutes, seconds });
    });
  });
}

// GET route to fetch translation minutes for the logged-in user
router.get('/api/translation-minutes', requireLogin, async (req, res) => {
  const userEmail = req.cookies.userEmail;
  if (!userEmail) {
    return res.status(401).json({ translationMinutes: 0, translationSeconds: 0, error: 'User not logged in' });
  }
  try {
    const userSnapshot = await db.collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get();
    if (userSnapshot.empty) {
      return res.status(404).json({ translationMinutes: 0, translationSeconds: 0, error: 'User not found' });
    }
    const userData = userSnapshot.docs[0].data();
    res.json({
      translationMinutes: userData.translationMinutes || 0,
      translationSeconds: userData.translationSeconds || 0
    });
  } catch (error) {
    logger.error('Error fetching translation minutes', { error });
    res.status(500).json({ translationMinutes: 0, translationSeconds: 0, error: 'Internal server error' });
  }
});

// API endpoint to fetch all uploaded videos for the logged-in user
router.get('/api/creator-videos-submitted', requireLogin, async (req, res) => {
  const userEmail = req.cookies.userEmail;
  if (!userEmail) {
    return res.status(401).json({ videos: [], error: 'User not logged in' });
  }
  try {
    const snapshot = await db.collection('uploadedFiles')
      .where('userEmail', '==', userEmail)
      .orderBy('uploadDate', 'desc')
      .get();
    const videos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json({ videos });
  } catch (error) {
    logger.error('Error fetching user videos', { error });
    res.status(500).json({ videos: [], error: 'Failed to fetch videos' });
  }
});

// GET route for downloading translated video from Elevenlabs
router.get('/download-video', requireLogin, async (req, res) => {
  const fileId = req.query.fileId;
  if (!fileId) {
    return res.status(400).send("No fileId provided.");
  }

  try {
    // Get video details from Firestore
    const videoDoc = await db.collection('uploadedFiles').doc(fileId).get();
    if (!videoDoc.exists) {
      return res.status(404).send("Video not found");
    }

    const videoData = videoDoc.data();
    if (!videoData.elevenLabsJob || !videoData.elevenLabsJob.id) {
      return res.status(400).send("No Elevenlabs job ID found for this video");
    }

    // Call Elevenlabs API to get the video
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('Missing ElevenLabs API key');

    const downloadUrl = `https://api.elevenlabs.io/v1/dubbing/jobs/${videoData.elevenLabsJob.id}/download`;
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      headers: {
        'xi-api-key': apiKey
      },
      responseType: 'stream'
    });

    // Set headers for video download
    res.setHeader('Content-Disposition', `attachment; filename="${videoData.fileName}"`);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Pipe the video stream to response
    response.data.pipe(res);

  } catch (error) {
    logger.error('Error downloading video from Elevenlabs', { error });
    if (!res.headersSent) {
      res.status(500).send("Error downloading video");
    }
  }
});

// GET route for downloading audio from Elevenlabs
router.get('/download-audio', requireLogin, async (req, res) => {
  const fileId = req.query.fileId;
  if (!fileId) {
    return res.status(400).send("No fileId provided.");
  }

  try {
    // Get video details from Firestore
    const videoDoc = await db.collection('uploadedFiles').doc(fileId).get();
    if (!videoDoc.exists) {
      return res.status(404).send("Video not found");
    }

    const videoData = videoDoc.data();
    if (!videoData.elevenLabsJob || !videoData.elevenLabsJob.id) {
      return res.status(400).send("No Elevenlabs job ID found for this video");
    }

    // Call Elevenlabs API to get the video first
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('Missing ElevenLabs API key');

    const downloadUrl = `https://api.elevenlabs.io/v1/dubbing/jobs/${videoData.elevenLabsJob.id}/download`;
    
    // Create temp directory for processing
    const tempDir = path.join(__dirname, '..', 'uploads', `audio-${Date.now()}`);
    const tempVideoPath = path.join(tempDir, `temp-${Date.now()}.mp4`);
    const tempAudioPath = path.join(tempDir, `output-${Date.now()}.mp3`);

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download video to temp file
    const writer = fs.createWriteStream(tempVideoPath);
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      headers: {
        'xi-api-key': apiKey
      },
      responseType: 'stream'
    });

    await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Extract audio using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .toFormat('mp3')
        .on('end', resolve)
        .on('error', reject)
        .save(tempAudioPath);
    });

    // Stream the audio file
    res.setHeader('Content-Disposition', `attachment; filename="${videoData.fileName.replace(/\.[^/.]+$/, '')}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    const readStream = fs.createReadStream(tempAudioPath);
    readStream.pipe(res);

    // Cleanup after streaming is done
    readStream.on('end', () => {
      cleanupTempFile(tempVideoPath);
      cleanupTempFile(tempAudioPath);
      fs.rmdirSync(tempDir, { recursive: true });
    });

  } catch (error) {
    logger.error('Error downloading/extracting audio', { error });
    if (!res.headersSent) {
      res.status(500).send("Error processing audio");
    }
  }
});

// GET route for downloading transcripts from Elevenlabs
router.get('/download-transcript', requireLogin, async (req, res) => {
  const fileId = req.query.fileId;
  const type = req.query.type; // 'original' or 'translated'

  if (!fileId) {
    return res.status(400).send("No fileId provided.");
  }

  if (!type || !['original', 'translated'].includes(type)) {
    return res.status(400).send("Invalid transcript type. Must be 'original' or 'translated'.");
  }

  try {
    // Get video details from Firestore
    const videoDoc = await db.collection('uploadedFiles').doc(fileId).get();
    if (!videoDoc.exists) {
      return res.status(404).send("Video not found");
    }

    const videoData = videoDoc.data();
    if (!videoData.elevenLabsJob || !videoData.elevenLabsJob.id) {
      return res.status(400).send("No Elevenlabs job ID found for this video");
    }

    // Call Elevenlabs API to get the transcript
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('Missing ElevenLabs API key');

    const jobId = videoData.elevenLabsJob.id;
    const endpoint = `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}/transcript/${type}`;

    const response = await axios({
      method: 'GET',
      url: endpoint,
      headers: {
        'xi-api-key': apiKey
      },
      responseType: 'json'
    });

    // Send the transcript as a downloadable file
    const transcriptText = response.data.text;
    const fileName = `${type === 'original' ? 'original' : 'translated'}-transcript-${videoData.fileName.replace(/\.[^/.]+$/, '')}.txt`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(transcriptText);

  } catch (error) {
    logger.error('Error downloading transcript from Elevenlabs', { error });
    if (!res.headersSent) {
      res.status(500).send(`Error downloading ${type} transcript: ${error.message}`);
    }
  }
});

// GET route for downloading both transcripts as a zip file
router.get('/download-transcripts-zip', requireLogin, async (req, res) => {
  const fileId = req.query.fileId;
  if (!fileId) {
    return res.status(400).send("No fileId provided.");
  }

  try {
    // Get video details from Firestore
    const videoDoc = await db.collection('uploadedFiles').doc(fileId).get();
    if (!videoDoc.exists) {
      return res.status(404).send("Video not found");
    }
    const videoData = videoDoc.data();
    if (!videoData.elevenLabsJob || !videoData.elevenLabsJob.id) {
      return res.status(400).send("No Elevenlabs job ID found for this video");
    }
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('Missing ElevenLabs API key');
    const jobId = videoData.elevenLabsJob.id;

    // Helper to fetch transcript
    async function fetchTranscript(type) {
      const endpoint = `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}/transcript/${type}`;
      const response = await axios({
        method: 'GET',
        url: endpoint,
        headers: { 'xi-api-key': apiKey },
        responseType: 'json'
      });
      return response.data.text;
    }

    // Fetch both transcripts
    const [originalTranscript, translatedTranscript] = await Promise.all([
      fetchTranscript('original'),
      fetchTranscript('translated')
    ]);

    // Set up zip stream
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=transcripts-${videoData.fileName.replace(/\.[^/.]+$/, '')}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    archive.append(originalTranscript, { name: `original-transcript-${videoData.fileName.replace(/\.[^/.]+$/, '')}.txt` });
    archive.append(translatedTranscript, { name: `translated-transcript-${videoData.fileName.replace(/\.[^/.]+$/, '')}.txt` });
    archive.finalize();
  } catch (error) {
    logger.error('Error creating transcript zip', { error });
    if (!res.headersSent) {
      res.status(500).send("Error downloading transcripts as zip");
    }
  }
});

// === AI Proofread API Endpoints ===
// GET: Analyze transcript and return segments & cost
router.get('/api/ai-proofread-init', requireLogin, async (req, res) => {
  const userEmail = req.cookies.userEmail;
  const videoId = req.query.videoId;
  if (!userEmail || !videoId) {
    return res.status(400).json({ error: 'Missing user or video ID' });
  }
  try {
    // Fetch video doc
    const videoDoc = await db.collection('uploadedFiles').doc(videoId).get();
    if (!videoDoc.exists) return res.status(404).json({ error: 'Video not found' });
    const videoData = videoDoc.data();
    if (!videoData.elevenLabsJob || !videoData.elevenLabsJob.id) {
      return res.status(400).json({ error: 'No Elevenlabs job ID found for this video' });
    }
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('Missing ElevenLabs API key');
    const jobId = videoData.elevenLabsJob.id;
    // Fetch both transcripts from ElevenLabs
    const [originalResp, translatedResp] = await Promise.all([
      axios({
        method: 'GET',
        url: `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}/transcript/original`,
        headers: { 'xi-api-key': apiKey },
        responseType: 'json'
      }),
      axios({
        method: 'GET',
        url: `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}/transcript/translated`,
        headers: { 'xi-api-key': apiKey },
        responseType: 'json'
      })
    ]);
    const originalTranscript = originalResp.data.text;
    const translatedTranscript = translatedResp.data.text;
    // === Connect to AI to analyze segments ===
    // Example: OpenAI API call (replace with your AI provider as needed)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) throw new Error('Missing OpenAI API key');
    const aiPrompt = `You are an expert proofreader. Compare the following original and translated transcripts. Identify the segment numbers in the translated transcript that need to be regenerated for accuracy and naturalness. Return ONLY a JSON array of segment indices (0-based) that need regeneration.\n\nOriginal Transcript:\n${originalTranscript}\n\nTranslated Transcript:\n${translatedTranscript}`;
    const aiResp = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert proofreader for video transcripts.' },
        { role: 'user', content: aiPrompt }
      ],
      max_tokens: 256,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    // Parse AI response for segment indices
    let segmentsToRegenerate = [];
    try {
      const match = aiResp.data.choices[0].message.content.match(/\[.*\]/s);
      if (match) segmentsToRegenerate = JSON.parse(match[0]);
    } catch (e) {
      segmentsToRegenerate = [];
    }
    if (!Array.isArray(segmentsToRegenerate)) segmentsToRegenerate = [];
    const costPerSegment = 1; // 1 minute per segment (example)
    const totalCost = segmentsToRegenerate.length * costPerSegment;
    res.json({ segmentsToRegenerate: segmentsToRegenerate.length, costPerSegment, totalCost });
  } catch (err) {
    logger.error('AI Proofread Init Error', { error: err });
    res.status(500).json({ error: err.message });
  }
});

// POST: Deduct minutes and start regeneration
router.post('/api/ai-proofread-proceed', requireLogin, async (req, res) => {
  const userEmail = req.cookies.userEmail;
  const { videoId } = req.body;
  if (!userEmail || !videoId) {
    return res.status(400).json({ success: false, message: 'Missing user or video ID' });
  }
  try {
    // Fetch user and video
    const userSnapshot = await db.collection('users').where('email', '==', userEmail).limit(1).get();
    if (userSnapshot.empty) return res.status(404).json({ success: false, message: 'User not found' });
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const videoDoc = await db.collection('uploadedFiles').doc(videoId).get();
    if (!videoDoc.exists) return res.status(404).json({ success: false, message: 'Video not found' });
    const videoData = videoDoc.data();
    if (!videoData.elevenLabsJob || !videoData.elevenLabsJob.id) {
      return res.status(400).json({ success: false, message: 'No Elevenlabs job ID found for this video' });
    }
    // Fetch both transcripts
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const jobId = videoData.elevenLabsJob.id;
    const [originalResp, translatedResp] = await Promise.all([
      axios({
        method: 'GET',
        url: `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}/transcript/original`,
        headers: { 'xi-api-key': apiKey },
        responseType: 'json'
      }),
      axios({
        method: 'GET',
        url: `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}/transcript/translated`,
        headers: { 'xi-api-key': apiKey },
        responseType: 'json'
      })
    ]);
    const originalTranscript = originalResp.data.text;
    const translatedTranscript = translatedResp.data.text;
    // === Connect to AI to get improved segments ===
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) throw new Error('Missing OpenAI API key');
    const aiPrompt = `You are an expert proofreader. Compare the following original and translated transcripts. Return ONLY a JSON object with the improved translated segments that need to be regenerated, in the form {"segments": [{"index": <number>, "text": <string>}]} where index is the segment number and text is the improved translation.\n\nOriginal Transcript:\n${originalTranscript}\n\nTranslated Transcript:\n${translatedTranscript}`;
    const aiResp = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert proofreader for video transcripts.' },
        { role: 'user', content: aiPrompt }
      ],
      max_tokens: 2048,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    // Parse AI response for improved segments
    let improvedSegments = [];
    try {
      const match = aiResp.data.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        improvedSegments = obj.segments || [];
      }
    } catch (e) {
      improvedSegments = [];
    }
    if (!Array.isArray(improvedSegments) || improvedSegments.length === 0) {
      return res.status(400).json({ success: false, message: 'AI did not return improved segments.' });
    }
    // Calculate cost
    const costPerSegment = 1;
    const totalCost = improvedSegments.length * costPerSegment;
    const userMinutes = userData.translationMinutes || 0;
    if (userMinutes < totalCost) {
      return res.status(400).json({ success: false, message: 'Insufficient translation minutes.' });
    }
    // Deduct minutes
    await userDoc.ref.update({ translationMinutes: userMinutes - totalCost });
    // === Send improved segments to ElevenLabs API ===
    // ElevenLabs expects PATCH to /v1/dubbing/jobs/{jobId}/transcript/translated/segments
    await axios.patch(
      `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}/transcript/translated/segments`,
      { segments: improvedSegments },
      { headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' } }
    );
    // === Trigger regeneration in ElevenLabs ===
    await axios.post(
      `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}/regenerate`,
      {},
      { headers: { 'xi-api-key': apiKey } }
    );
    // Update video doc
    await videoDoc.ref.update({ aiProofreadStatus: 'completed', aiProofreadCompleted: new Date(), aiProofreadSegments: improvedSegments.length });
    res.json({ success: true });
  } catch (err) {
    logger.error('AI Proofread Proceed Error', { error: err });
    res.status(500).json({ success: false, message: err.message });
  }
});

// Hybrid Proofread form route (renamed from request free edit)
router.get('/hybrid-proofread', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard', 'creator-hybrid-proofread.html'));
});

// Hybrid Proofread form POST handler (renamed from request free edit)
router.post('/hybrid-proofread', requireLogin, async (req, res) => {
  // You can copy logic from the request-edit POST if needed, or add custom logic here
  // For now, just redirect to dashboard with a success message
  res.redirect('/dashboard/creator-dashboard?hybridProofread=success');
});

// Hybrid Proofread API route (AJAX)
router.post('/api/hybrid-proofread', requireLogin, async (req, res) => {
  try {
    const { videoId, issueType, description } = req.body;
    const userEmail = req.cookies.userEmail;
    if (!videoId || !issueType || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    // Add to Requested Edits collection
    await db.collection('Requested Edits').add({
      videoId,
      issueType,
      description,
      userEmail,
      timestamp: new Date()
    });
    // Set hybridRequested: true on the video document
    await db.collection('uploadedFiles').doc(videoId).update({ hybridRequested: true });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// === Video Editor Page ===
// Serve the video editor page
router.get('/video-editor', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard', 'creator-video-editor.html'));
});

// API: Fetch transcript segments and video URL for editor
router.get('/api/video-editor-data', requireLogin, async (req, res) => {
  const videoId = req.query.videoId;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });
  try {
    // Get video doc
    const videoDoc = await db.collection('uploadedFiles').doc(videoId).get();
    if (!videoDoc.exists) return res.status(404).json({ error: 'Video not found' });
    const videoData = videoDoc.data();
    if (!videoData.elevenLabsJob || !videoData.elevenLabsJob.id) {
      return res.status(400).json({ error: 'No ElevenLabs job ID found for this video' });
    }
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const jobId = videoData.elevenLabsJob.id;
    // Fetch transcript segments from ElevenLabs
    const transcriptResp = await axios.get(
      `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}/transcript/translated`,
      { headers: { 'xi-api-key': apiKey } }
    );
    // The ElevenLabs API returns segments as an array
    const segments = transcriptResp.data.segments || [];
    // Get video download URL (use our own endpoint for auth)
    const videoUrl = `/dashboard/download-video?fileId=${videoId}`;
    res.json({ segments, videoUrl });
  } catch (err) {
    logger.error('Error fetching video editor data', { error: err });
    res.status(500).json({ error: err.message });
  }
});

// API: Save transcript edits (PATCH to ElevenLabs)
router.patch('/api/video-editor-save', requireLogin, async (req, res) => {
  const { videoId, segments } = req.body;
  if (!videoId || !Array.isArray(segments)) {
    return res.status(400).json({ error: 'Missing videoId or segments' });
  }
  try {
    // Get video doc
    const videoDoc = await db.collection('uploadedFiles').doc(videoId).get();
    if (!videoDoc.exists) return res.status(404).json({ error: 'Video not found' });
    const videoData = videoDoc.data();
    if (!videoData.elevenLabsJob || !videoData.elevenLabsJob.id) {
      return res.status(400).json({ error: 'No ElevenLabs job ID found for this video' });
    }
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const jobId = videoData.elevenLabsJob.id;
    // PATCH segments to ElevenLabs
    await axios.patch(
      `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}/transcript/translated/segments`,
      { segments },
      { headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' } }
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('Error saving video editor transcript', { error: err });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
