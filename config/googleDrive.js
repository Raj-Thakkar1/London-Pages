const { google } = require('googleapis');
require('dotenv').config();
const logger = require('../logger');

// Build service account object from environment variables
const serviceAccount = {
  client_email: process.env.GDRIVE_CLIENT_EMAIL,
  private_key: process.env.GDRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Create JWT client with optimized settings
const auth = new google.auth.JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
  retryOptions: {
    retry: 5,
    statusCodesToRetry: [[500, 599]],
    noResponseRetries: 3,
    retryDelay: 2000
  }
});

// Configure drive with optimized settings for large files
const drive = google.drive({
  version: 'v3',
  auth,
  // Retry configuration
  retryConfig: {
    retry: 5,
    retryDelay: 2000,
    statusCodesToRetry: [[500, 599]],
    onRetryAttempt: (err) => {
      console.log('Retrying drive request:', err);
    }
  },
  // Upload configuration
  uploadOptions: {
    resumable: true,
    chunkSize: 16 * 1024 * 1024, // 16MB chunks for faster uploads
    onUploadProgress: (evt) => {
      const progress = (evt.bytesRead / evt.totalBytes) * 100;
      console.log(`Upload progress: ${Math.round(progress)}%`);
    }
  }
});

// Add utility functions for cleanup
const cleanupGoogleDrive = {
  // Delete temporary files older than 24 hours
  cleanupTempFiles: async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const response = await drive.files.list({
        q: `name contains 'temp-' and createdTime < '${yesterday.toISOString()}'`,
        fields: 'files(id)'
      });

      const files = response.data.files;
      if (files.length) {
        console.log(`Found ${files.length} old temp files to clean up`);
        for (const file of files) {
          try {
            await drive.files.delete({ fileId: file.id });
          } catch (err) {
            logger.error(`Failed to delete ${file.name} (${file.id})`, { error: err.message });
          }
        }
      }
    } catch (error) {
      logger.error('Error cleaning up temp files', { error });
    }
  },

  // Schedule cleanup to run every 12 hours
  scheduleCleanup: () => {
    setInterval(() => {
      cleanupGoogleDrive.cleanupTempFiles();
    }, 12 * 60 * 60 * 1000);
  },

  // Garbage collection helper
  forceGC: () => {
    if (global.gc) {
      global.gc();
    }
  }
};

// Initialize cleanup schedule
cleanupGoogleDrive.scheduleCleanup();

// Helper to get (or create) user folder and subfolders
async function getUserFolders(userEmail) {
  // Find or create main user folder
  const folderQuery = `name='${userEmail}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents`;
  let folderResponse = await drive.files.list({
    q: folderQuery,
    fields: 'files(id, name)',
    spaces: 'drive'
  });
  let userFolderId;
  if (folderResponse.data.files && folderResponse.data.files.length > 0) {
    userFolderId = folderResponse.data.files[0].id;
  } else {
    // Create user folder
    const folderMetadata = {
      name: userEmail,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root']
    };
    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });
    userFolderId = folder.data.id;
  }

  // Find or create 'Non-translated Videos' subfolder
  const subfolderQuery = `name='Non-translated Videos' and mimeType='application/vnd.google-apps.folder' and '${userFolderId}' in parents`;
  let subfolderResponse = await drive.files.list({
    q: subfolderQuery,
    fields: 'files(id, name)',
    spaces: 'drive'
  });
  let nonTranslatedId;
  if (subfolderResponse.data.files && subfolderResponse.data.files.length > 0) {
    nonTranslatedId = subfolderResponse.data.files[0].id;
  } else {
    // Create subfolder
    const subfolderMetadata = {
      name: 'Non-translated Videos',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [userFolderId]
    };
    const subfolder = await drive.files.create({
      requestBody: subfolderMetadata,
      fields: 'id'
    });
    nonTranslatedId = subfolder.data.id;
  }

  return {
    userFolderId,
    subfolders: {
      'Non-translated Videos': nonTranslatedId
    }
  };
}

// Export drive instance and cleanup utilities
module.exports = {
  drive,
  cleanupGoogleDrive,
  getUserFolders
};
