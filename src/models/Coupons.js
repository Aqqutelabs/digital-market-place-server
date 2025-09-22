// models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [4, 'Coupon code must be at least 4 characters long']
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'], // e.g., 10% off, NGN 500 off
    required: [true, 'Coupon type is required']
  },
  value: { // The discount value (e.g., 10 for 10%, 500 for NGN 500 fixed)
    type: Number,
    required: [true, 'Coupon value is required'],
    min: [0, 'Coupon value cannot be negative']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Coupon expiry date is required']
  },
  minOrderAmount: { // Minimum amount required for the coupon to be valid
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount cannot be negative']
  },
  maxUses: { // Total number of times this coupon can be used across all users
    type: Number,
    default: 1, // Default for single-use generated coupons
    min: [0, 'Max uses cannot be negative']
  },
  usesCount: { // How many times this coupon has already been used
    type: Number,
    default: 0,
    min: [0, 'Uses count cannot be negative']
  },
  forSpecificUser: { // If this coupon is generated for a single user
    type: Boolean,
    default: false
  },
  userWhoCanUse: { // The user ID who can use this coupon (if forSpecificUser is true)
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  usedByUsers: [{ // Track which users have used this coupon (for single-use per user marketing coupons)
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: []
  }],
  isActive: { // Can be manually deactivated by an admin
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update `updatedAt` on every save
couponSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if a coupon is valid
couponSchema.methods.isValid = function(subtotal, userId) {
  if (!this.isActive) {
    return { valid: false, message: 'Coupon is inactive.' };
  }
  if (this.expiresAt < Date.now()) {
    return { valid: false, message: 'Coupon has expired.' };
  }
  if (this.usesCount >= this.maxUses) {
    return { valid: false, message: 'Coupon has reached its maximum usage limit.' };
  }
  if (subtotal < this.minOrderAmount) {
    return { valid: false, message: `Minimum order amount of NGN ${this.minOrderAmount.toFixed(2)} not met.` };
  }
  if (this.forSpecificUser && !this.userWhoCanUse.equals(userId)) {
      return { valid: false, message: 'This coupon is not for your account.' };
  }
  // If it's a general coupon (not forSpecificUser) but needs to be single-use per user
  if (!this.forSpecificUser && this.usedByUsers.some(id => id.equals(userId))) {
      return { valid: false, message: 'You have already used this coupon.' };
  }

  return { valid: true };
};

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;