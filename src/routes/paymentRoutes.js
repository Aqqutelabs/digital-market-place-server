// routes/paymentRoutes.js
const express = require('express');
const paystackService = require('../utils/paystackService');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Verify payment after Paystack callback
router.get('/verify/:reference', authMiddleware.protect, async (req, res, next) => {
  try {
    const payment = await paystackService.verifyPayment(req.params.reference);
    res.status(200).json({ status: 'success', data: { payment } });
  } catch (err) {
    next(err);
  }
});

// Get all payments for the logged-in user
router.get('/my', authMiddleware.protect, async (req, res, next) => {
  try {
    const payments = await paystackService.getPaymentHistory(req.user.id);
    res.status(200).json({ status: 'success', data: { payments } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
