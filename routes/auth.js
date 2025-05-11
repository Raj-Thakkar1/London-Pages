const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../config/firebase').db;
const admin = require('../config/firebase').admin;
const Razorpay = require('razorpay');
const { body, validationResult } = require('express-validator');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const razorpayKey = process.env.RAZORPAY_KEY_ID;

// Route to serve the signup page
router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'signup.html'));
});

// Route to serve the login page
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'login.html'));
});

// Route to serve the our models page
router.get('/our-models', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'our-models.html'));
});

// Expose public Firebase config for frontend use
router.get('/api/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  });
});

// Check if user exists by email
router.post(
  '/api/check-user',
  [
    body('email').isEmail().normalizeEmail(),
    body('amount').isNumeric(),
    body('currency').isString().trim().escape(),
    body('plan').optional().isString().trim().escape(),
    body('receipt').optional().isString().trim().escape()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    const { email, amount, currency, receipt, plan } = req.body;
    if (!email) return res.status(400).json({ exists: false, error: 'Email required' });
    if (!amount || !currency) return res.status(400).json({ exists: false, error: 'Amount and currency are required from plan details.' });

    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('email', '==', email).get();
      if (!snapshot.empty) {
        // User exists
        // Create Razorpay order
        const orderOptions = {
          amount: amount, 
          currency: currency,
          receipt: receipt || `receipt_order_${Date.now()}`,
        };
        console.log(orderOptions, plan);
        try {
          const order = await razorpay.orders.create(orderOptions);
          // Store payment details in Firestore
          await db.collection('Payments').doc(order.id).set({
            email: email,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            status: 'created',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            receipt: order.receipt,
            plan: plan // Add plan information
          });
          // Attach the public key to the response for frontend use
          return res.json({ exists: true, proceedToPayment: true, order: { ...order, razorpayKey } });
        } catch (orderErr) {
          return res.status(500).json({ exists: true, proceedToPayment: false, error: orderErr.message });
        }
      } else {
        // User does not exist
        // Return a registerUrl for frontend to redirect (no plan param)
        return res.json({ exists: false, registerUrl: '/signup', message: 'Please signup before paying.' });
      }
    } catch (err) {
      return res.status(500).json({ exists: false, error: err.message });
    }
  }
);

module.exports = router;
