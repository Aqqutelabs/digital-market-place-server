const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing
const crypto = require('crypto');   // For generating secure tokens

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true, // Ensure emails are unique
    lowercase: true,
    trim: true,
    match: [/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/, 'Please enter a valid email address'] // Basic email regex validation
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    // You can add more specific phone number regex validation here if needed
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Exclude password from query results by default for security
  },
  // Vendor-specific fields (for KYC, optional initially)
  companyName: {
    type: String,
    trim: true,
    default: null // Will be populated during vendor KYC
  },
  companyAddress: {
    type: String,
    trim: true,
    default: null
  },
  roleInCompany: { // Renamed from 'Role' to avoid conflict with `userRole`
    type: String,
    trim: true,
    default: null
  },
  // User roles (extendable if other roles like 'admin' are introduced)
  userRole: {
    type: String,
    enum: ['vendor', 'admin'], // Based on the UI, 'vendor' is the primary role
    default: 'vendor'
  },
  isEmailVerified: {
    type: Boolean,
    default: false // Set to true after successful email verification
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// --- Schema Middleware ---

// Pre-save hook to hash password before saving if it's new or modified
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next(); // Only hash if password was modified
  this.password = await bcrypt.hash(this.password, 12); // Hash with a cost factor of 12
  next();
});

// Pre-save hook to update `updatedAt` timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// --- Instance Methods ---

// Method to compare candidate password with stored hashed password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Method to generate a secure random token for password reset
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex'); // Generate a random string
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex'); // Hash it for storage
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Token expires in 10 minutes
  return resetToken; // Return the unhashed token to send to the user
};

// Method to generate a secure random token for email verification
userSchema.methods.createEmailVerificationToken = function() {
  // Generate a 4-digit numeric code as a string
  const verificationToken = Math.floor(1000 + Math.random() * 9000).toString();
  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // Token expires in 10 minutes
  return verificationToken;
};

// Method to generate a 4-digit code for password reset
userSchema.methods.createPasswordResetCode = function() {
  // Generate a 4-digit numeric code as a string
  const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
  this.passwordResetToken = crypto.createHash('sha256').update(resetCode).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Code expires in 10 minutes
  return resetCode;
};

const User = mongoose.model('User', userSchema);
module.exports = User;