// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { promisify } = require('util'); // To use async/await with jwt.verify
const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync'); // A helper for wrapping async functions

// Helper function to wrap async functions and catch errors
// This prevents us from writing try-catch blocks everywhere
// utils/catchAsync.js (create this file too)
/*
  module.exports = fn => {
    return (req, res, next) => {
      fn(req, res, next).catch(next); // Calls next(err) if an error occurs
    };
  };
*/

// Middleware to protect routes (ensure user is logged in)
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token and check if it exists
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Debug: Log the received token
  console.log('Received JWT:', token);
  // You might also check for a token in cookies if you're sending JWTs there
  // else if (req.cookies.jwt) {
  //   token = req.cookies.jwt;
  // }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2) Verify token
  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }
    req.user = currentUser;
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }
});

// Middleware to restrict access based on roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array like ['admin', 'vendor']
    if (!roles.includes(req.user.userRole)) {
      return next(
        new AppError('You do not have permission to perform this action', 403) // 403 Forbidden
      );
    }
    next();
  };
};

// Middleware to ensure a user is a vendor and has completed KYC if required for certain actions
exports.ensureVendorKyc = catchAsync(async (req, res, next) => {
  if (req.user.userRole !== 'vendor') {
    return next(new AppError('Only vendors can perform this action.', 403));
  }
  // If we require KYC to be completed before listing products:
  if (!req.user.companyName || !req.user.companyAddress || !req.user.roleInCompany) {
    return next(new AppError('Please complete your vendor KYC to proceed.', 403));
  }
  next();
});