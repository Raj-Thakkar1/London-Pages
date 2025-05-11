/**
 * WARNING: This script will permanently delete ALL files and folders in your Google Drive.
 * Run it only if you are absolutely sure. To run:
 *   node deleteAll.js
 */

const path = require('path');
const { drive } = require('./config/googleDrive'); // Adjust this path as necessary
const logger = require('./logger');

async function deleteAllFiles() {
  let pageToken = null;
  do {
    // List all files (not trashed)
    const res = await drive.files.list({
      q: "trashed = false",
      fields: "nextPageToken, files(id, name)",
      pageToken: pageToken,
    });
    const files = res.data.files;
    if (!files || files.length === 0) {
      logger.info('No files found.');
      break;
    }
    for (const file of files) {
      try {
        await drive.files.delete({ fileId: file.id });
        logger.info('Deleted file', { name: file.name, id: file.id });
      } catch (err) {
        logger.error(`Failed to delete ${file.name} (${file.id})`, { error: err.message });
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
}

deleteAllFiles()
  .then(() => {
    console.log("All files processed for deletion.");
    process.exit(0);
  })
  .catch(err => {
    console.error("Error during deletion:", err);
    process.exit(1);
  });
