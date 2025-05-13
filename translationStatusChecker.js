// translationStatusChecker.js
// Checks translation status of Firestore video docs with assignedStatus 'pending-untranscribed' every 30 minutes

const { db } = require('./config/firebase');
const axios = require('axios');
const logger = require('./logger');

async function checkTranslationStatus() {
  try {
    const snapshot = await db.collection('uploadedFiles')
      .where('assignedStatus', '==', 'pending-untranscribed')
      .get();
    if (snapshot.empty) return;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.elevenLabsJob || !data.elevenLabsJob.id) continue;
      const jobId = data.elevenLabsJob.id;
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        logger.error('Missing ElevenLabs API key');
        continue;
      }
      try {
        const resp = await axios.get(
          `https://api.elevenlabs.io/v1/dubbing/jobs/${jobId}`,
          { headers: { 'xi-api-key': apiKey } }
        );
        if (resp.data && resp.data.status === 'completed') {
          await doc.ref.update({ assignedStatus: 'translated' });
          logger.info(`Video ${doc.id} marked as translated.`);
        }
      } catch (err) {
        logger.error('Error checking ElevenLabs status', { jobId, error: err.message });
      }
    }
  } catch (err) {
    logger.error('Error querying Firestore for pending-untranscribed videos', { error: err.message });
  }
}

// Run every 30 minutes
setInterval(checkTranslationStatus, 30 * 60 * 1000);
// Also run immediately on startup
checkTranslationStatus();

module.exports = { checkTranslationStatus };
