// routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authControllers');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Public authentication routes
router.post('/signup', authController.signup);
// router.post('/login', authController.login);
// router.get('/verify-email/:token', authController.verifyEmail); // UI: verification popup, then click a button/link
// router.post('/forgotPassword', authController.forgotPassword);
// router.patch('/resetPassword/:token', authController.resetPassword);

// Authenticated user routes (requires JWT)
// router.use(authMiddleware.protect); // All routes below this middleware require authentication

// router.patch('/updateMyPassword', authController.updatePassword);
// router.patch('/completeVendorKyc',
//   authMiddleware.restrictTo('vendor'), // Only vendors can complete KYC
//   authController.completeVendorKyc
// );
// router.get('/logout', authController.logout); // If you implement a logout in service/controller

module.exports = router;