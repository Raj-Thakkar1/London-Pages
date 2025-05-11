const express = require('express');
const path = require('path');
const router = express.Router();
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

// Helper to send email
async function sendEmail({ to, subject, text }) {
  // Configure your SMTP transport here
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'sales.londonpages@gmail.com',
      pass: process.env.GMAIL_PASS || 'your_gmail_app_password',
    },
  });
  await transporter.sendMail({
    from: 'London Pages <sales.londonpages@gmail.com>',
    to,
    subject,
    text,
  });
}

// GET /payment/checkout?plan=planName
router.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'checkout.html'));
});

// Razorpay Webhook Handler
router.post(
  '/api/razorpay-webhook',
  express.raw({ type: 'application/json' }),
  [
    // Validate headers and raw body
    (req, res, next) => {
      if (!req.headers['x-razorpay-signature']) {
        return res.status(400).json({ error: 'Missing Razorpay signature header' });
      }
      if (!req.body) {
        return res.status(400).json({ error: 'Missing webhook payload' });
      }
      next();
    }
  ],
  async (req, res) => {
    const crypto = require('crypto');
    const db = require('../config/firebase').db;
    const admin = require('../config/firebase').admin;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret';

    // Razorpay sends raw body for signature verification
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body;
    const expectedSignature = crypto.createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // If signature is invalid, do nothing
    if (signature !== expectedSignature) {
      return res.status(200).end();
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      // If payload is invalid, do nothing
      return res.status(200).end();
    }

    // Only handle payment.captured and payment.failed events
    if (event.event === 'payment.captured' || event.event === 'payment.failed') {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const status = event.event === 'payment.captured' ? 'captured' : 'failed';
      try {
        // Add plan name to the Payments document during update
        await db.collection('Payments').doc(orderId).update({
          status: status,
          paymentId: paymentEntity.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentDetails: paymentEntity,
          plan: paymentData.plan // Ensure the plan is stored
        });
        // Fetch client email from Payments doc
        const paymentDoc = await db.collection('Payments').doc(orderId).get();
        const paymentData = paymentDoc.exists ? paymentDoc.data() : null;
        const clientEmail = paymentData ? paymentData.email : null;
        const planType = paymentData ? (paymentData.plan || '').toLowerCase() : null;

        // Map plan types to translation minutes
        const planMinutesMap = {
          starter: 10,
          growth: 200,
          scale: 500,
          enterprise: 1100,
          // Annual plans
          'starter-annual': 120,
          'growth-annual': 2400,
          'scale-annual': 6000,
          'enterprise-annual': 13200
          // 'empire' is custom/coming soon, not handled
        };

        if (clientEmail) {
          if (status === 'captured') {
            // Update user's translationMinutes if user exists
            const userQuery = await db.collection('Users').where('email', '==', clientEmail).limit(1).get();
            if (!userQuery.empty && planType && planMinutesMap[planType]) {
              const userDoc = userQuery.docs[0];
              await db.collection('Users').doc(userDoc.id).update({
                translationMinutes: admin.firestore.FieldValue.increment(planMinutesMap[planType])
              });
            } else if (userQuery.empty) {
              // User not found, notify support
              await sendEmail({
                to: 'sales.londonpages@gmail.com',
                subject: 'User Not Found for Payment',
                text: `No user found for email ${clientEmail} (orderId: ${orderId}) during payment webhook.`
              });
            }
            await sendEmail({
              to: clientEmail,
              subject: 'Payment Successful - London Pages',
              text: 'Your payment was processed successfully. You can now access your translation minutes by logging in to the website.'
            });
          } else {
            await sendEmail({
              to: clientEmail,
              subject: 'Payment Pending/Failed - London Pages',
              text: 'We are processing your payment for three days. If the amount was debited and not processed, it will be credited back soon.'
            });
          }
        }
        return res.status(200).end();
      } catch (err) {
        // On update failure, email support
        await sendEmail({
          to: 'sales.londonpages@gmail.com',
          subject: 'Payment Update Error',
          text: `Error updating payment for orderId ${orderId}: ${err.message}`
        });
        return res.status(200).end();
      }
    } else {
      // If event is ignored, email support
      await sendEmail({
        to: 'sales.londonpages@gmail.com',
        subject: 'Razorpay Webhook Event Ignored',
        text: `Ignored event received: ${JSON.stringify(event)}`
      });
      return res.status(200).end();
    }
  }
);

module.exports = router;
