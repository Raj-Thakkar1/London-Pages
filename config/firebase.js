const admin = require('./firebaseAdmin');
require('dotenv').config();

// Normalize private key formatting for Windows and Unix
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
  // If it contains literal \n, replace with real newlines
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  } else if (privateKey.includes('\r') || privateKey.includes('\n')) {
    // If it contains actual newlines, normalize to \n
    privateKey = privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }
}

// Build service account object from environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = { db, admin };
