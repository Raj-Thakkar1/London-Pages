const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');
const session = require('express-session');
const crypto = require('crypto');
const { db } = require('./config/firebase');  // Import the initialized db
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure body parser for streaming
app.use(express.json({ 
  limit: '50mb'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb'
}));

// Initialize cookie-parser first
app.use(cookieParser());

// Generate a strong SESSION_SECRET if not provided
function getSessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  // In production, load from a secrets manager (e.g., AWS Secrets Manager, Azure Key Vault)
  // For dev, generate a strong random secret
  const secret = crypto.randomBytes(64).toString('hex');
  logger.warn('Using a generated session secret. Set SESSION_SECRET in production!');
  return secret;
}

// Use default MemoryStore for all environments
let sessionStore = undefined;

app.use(session({
  store: sessionStore,
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: process.env.NODE_ENV === 'test' ? 1000 : 1000 * 60 * 60 // 1s for test, 1h otherwise
  }
}));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10, // limit each IP
  message: {
    error: 'Too many authentication attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour default
  max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX) || 5, // limit each IP
  message: {
    error: 'Too many video uploads. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: parseInt(process.env.PAYMENT_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour default
  max: parseInt(process.env.PAYMENT_RATE_LIMIT_MAX) || 20, // limit each IP
  message: {
    error: 'Too many payment requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters to relevant routes
app.use(['/login', '/signup', '/api/check-user'], authLimiter);
app.use('/dashboard/creator-upload-video', uploadLimiter);
app.use('/payment/api/razorpay-webhook', paymentLimiter);

// Helmet security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://cdnjs.cloudflare.com',
          'https://checkout.razorpay.com',
          'https://www.gstatic.com',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          'https://www.googleapis.com',
          'https://firebase.googleapis.com',
          'https://*.firebaseio.com',
          'https://*.firebaseapp.com'
        ],
        styleSrc: [
          "'self'",
          'https://cdnjs.cloudflare.com',
          'https://fonts.googleapis.com',
          'https://checkout.razorpay.com',
          'https://www.gstatic.com'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https://www.gstatic.com',
          'https://www.google-analytics.com',
          'https://drive.google.com',
          'https://www.googleapis.com',
          'https://*.firebaseio.com',
          'https://*.firebaseapp.com'
        ],
        connectSrc: [
          "'self'",
          'https://www.google-analytics.com',
          'https://firestore.googleapis.com',
          'https://checkout.razorpay.com',
          'https://www.googleapis.com',
          'https://firebase.googleapis.com',
          'https://*.firebaseio.com',
          'https://*.firebaseapp.com',
          'https://*.gstatic.com',
          'https://*.cloudfunctions.net',
          'https://*.appspot.com',
          'http://localhost:*',
          'https://identitytoolkit.googleapis.com'
        ],
        frameSrc: [
          "'self'",
          'https://checkout.razorpay.com'
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true,
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  })
);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const paymentRoutes = require('./routes/payment');

// Route to serve the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Register routes
app.use(authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/payment', paymentRoutes);

// Status endpoint for Bree queue
app.get('/status/ffmpeg-queue', (req, res) => {
  const { bree } = require('./ffmpegQueue');
  res.json({
    isRunning: bree.isWorkerRunning ? bree.isWorkerRunning : false,
    jobs: bree.config.jobs.map(j => j.name),
    active: bree.workers ? Object.keys(bree.workers) : []
  });
});

// Test-only session endpoints
if (process.env.NODE_ENV === 'test') {
  app.get('/set-session-test', (req, res) => {
    req.session.value = 'test123';
    res.json({ set: true });
  });
  app.get('/get-session-test', (req, res) => {
    res.json({ value: req.session.value });
  });
  app.get('/regenerate-session-test', (req, res) => {
    req.session.regenerate(err => {
      if (err) return res.json({ regenerated: false });
      res.json({ regenerated: true });
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  // Handle express-validator errors
  if (err && err.errors && Array.isArray(err.errors)) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors
    });
  }
  logger.error('Unhandled error', { message: err.message, stack: process.env.NODE_ENV === 'production' ? undefined : err.stack });
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 
      'Something went wrong' : 
      err.message
  });
});

// Listen for changes in uploadedFiles
if (db) {
  db.collection('uploadedFiles').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      // Check if the document was modified (i.e. its status was updated)
      if (change.type === 'modified') {
        const videoData = change.doc.data();
        if (
          videoData.assignedStatus === 'completed' ||
          videoData.assignedStatus === 'inappropriate'
        ) {
          let message = '';
          if (videoData.assignedStatus === 'completed') {
            message = `Your video "${videoData.fileName}" has been marked as completed.`;
          } else if (videoData.assignedStatus === 'inappropriate') {
            message = `Your video "${videoData.fileName}" has been marked as inappropriate.`;
          }
          // Add a notification document in the 'notifications' collection
          db.collection('notifications').add({
            userEmail: videoData.userEmail,
            message: message,
            timestamp: new Date()
          })
          .then(() => console.log('Notification stored for', videoData.userEmail))
          .catch(err => console.error('Error storing notification:', err));
        }
      }
    });
  });
}

// Start translation status checker background process
require('./translationStatusChecker');

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

module.exports = app;