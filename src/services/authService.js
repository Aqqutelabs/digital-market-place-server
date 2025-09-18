// services/authService.js
const User = require('../models/User');
const AppError = require('../utils/appError');
const Email = require('../utils/email'); // For sending emails
const jwt = require('jsonwebtoken');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Set cookie options (optional, but good for browser-based apps)
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Prevent client-side JS from reading the cookie
    secure: process.env.NODE_ENV === 'production' // Only send over HTTPS in production
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output before sending response
  user.password = undefined;

  return {
    status: 'success',
    token,
    data: {
      user
    }
  };
};

exports.signup = async (userData, origin) => {
  const { email, fullName, phoneNumber, password } = userData;

  const newUser = await User.create({
    email,
    fullName,
    phoneNumber,
    password,
    userRole: 'vendor' // Default role for signup based on UI context
  });

  // Generate email verification token and save
  const verificationToken = newUser.createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false }); // Save token without re-validating password

  // Send verification email
  const verificationUrl = `${origin}/verify-email/${verificationToken}`; // Or just send the code directly
  await new Email(newUser, verificationUrl).sendEmailVerification(verificationToken); // Passing token directly for UI use case

  return createSendToken(newUser, 201); // 201 Created
};

exports.login = async (email, password) => {
  if (!email || !password) {
    throw new AppError('Please provide email and password!', 400);
  }

  // 1) Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password'); // Explicitly select password
  if (!user || !(await user.correctPassword(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  // 2) Check if email is verified
  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email address to log in.', 401);
  }

  // 3) If everything is ok, send token to client
  return createSendToken(user, 200);
};

exports.verifyEmail = async (token) => {
  // Hash the token received from the user to compare with the stored hashed token
  const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() } // Check if token is not expired
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined; // Clear token after use
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return { status: 'success', message: 'Email successfully verified!' };
};

exports.forgotPassword = async (email, origin) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('There is no user with that email address.', 404);
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // Save user with new token

  // 3) Send it to user's email
  const resetURL = `${origin}/reset-password/${resetToken}`; // Frontend URL for reset
  try {
    await new Email(user, resetURL).sendPasswordReset();
    return { status: 'success', message: 'Token sent to email!' };
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError(
      'There was an error sending the email. Try again later!',
      500
    );
  }
};

exports.resetPassword = async (token, newPassword, confirmPassword) => {
  // 1) Get user based on the token
  const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() } // Token must not be expired
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  // 2) Set new password
  if (newPassword !== confirmPassword) {
    throw new AppError('Passwords do not match.', 400);
  }
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); // Mongoose pre-save hook will hash the new password

  // 3) Log the user in, send JWT
  return createSendToken(user, 200);
};

exports.updatePassword = async (userId, currentPassword, newPassword, confirmPassword) => {
  // 1) Get user from DB
  const user = await User.findById(userId).select('+password');

  // 2) Check if POSTed current password is correct
  if (!user || !(await user.correctPassword(currentPassword, user.password))) {
    throw new AppError('Your current password is wrong.', 401);
  }

  // 3) If so, update password
  if (newPassword !== confirmPassword) {
    throw new AppError('New passwords do not match.', 400);
  }
  user.password = newPassword;
  await user.save(); // Mongoose pre-save hook will hash the new password

  // 4) Log user in, send JWT
  return createSendToken(user, 200);
};

exports.completeVendorKyc = async (userId, companyData) => {
  const { companyName, companyAddress, roleInCompany } = companyData;

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (user.userRole !== 'vendor') {
    throw new AppError('Only vendors can complete KYC.', 403);
  }

  user.companyName = companyName;
  user.companyAddress = companyAddress;
  user.roleInCompany = roleInCompany;

  await user.save({ validateModifiedOnly: true }); // Only validate modified fields

  return { status: 'success', data: { user } };
};

// You might also add a logout service which essentially just clears the JWT cookie.
// exports.logout = (res) => {
//   res.cookie('jwt', 'loggedout', {
//     expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
//     httpOnly: true
//   });
//   return { status: 'success', message: 'Logged out successfully' };
// };