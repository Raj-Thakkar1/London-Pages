const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer disk storage with streaming optimizations
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create a unique subfolder for each upload to prevent filename collisions
    const uploadDir = path.join(uploadsDir, uuidv4());
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('[MULTER] Created upload directory:', uploadDir);
    } catch (err) {
      console.error('[MULTER] Error creating upload directory:', uploadDir, err);
      return cb(err);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename while preserving extension
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = uniquePrefix + path.extname(file.originalname);
    console.log('[MULTER] Using filename:', filename);
    cb(null, filename);
  }
});

// Configure file filter for video and audio types
const fileFilter = (req, file, cb) => {
  // Accept only specific video and audio MIME types
  const allowedMimes = [
    'video/mp4',
    'video/webm',
    'audio/aac',
    'audio/x-aac',
    'audio/aiff',
    'audio/x-aiff',
    'video/x-msvideo', // AVI
    'audio/flac',
    'audio/x-flac',
    'audio/mp4', // M4A
    'video/x-m4v',
    'video/x-matroska', // MKV
    'video/quicktime', // MOV
    'audio/mpeg', // MP3, MPEG
    'video/mpeg', // MPEG, MPG
    'audio/ogg', // OGG, OGA
    'video/ogg',
    'audio/opus',
    'audio/wav',
    'audio/x-wav',
    'audio/webm', // WEBA
    'video/webm',
    'video/x-ms-wmv', // WMV
    'video/3gpp', // 3GPP
    'audio/3gpp',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only specific video and audio files are allowed.'), false);
  }
};

// Configure multer with optimized settings
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    files: 1,
    fieldSize: Infinity,
    fieldNameSize: 300,
    fileSize: 1 * 1024 * 1024 * 1024 // 1GB limit
  }
});

module.exports = upload;