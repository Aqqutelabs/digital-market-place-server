// services/userService.js
const User = require('../models/User');
const AppError = require('../utils/appError');

// Helper function to filter allowed fields for updates
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.updateMe = async (userId, data) => {
  // 1) Filter out unwanted fields that are not allowed to be updated
  const filteredBody = filterObj(data, 'fullName', 'email', 'phoneNumber');

  // 2) Update user document
  const updatedUser = await User.findByIdAndUpdate(userId, filteredBody, {
    new: true, // Return the updated document
    runValidators: true // Run schema validators on update
  });

  if (!updatedUser) {
    throw new AppError('User not found!', 404);
  }

  return { status: 'success', data: { user: updatedUser } };
};

exports.deleteMe = async (userId) => {
  // In a real application, you might 'deactivate' the user instead of truly deleting them
  // await User.findByIdAndUpdate(userId, { active: false });
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found!', 404);
  }

  // For now, let's simulate a soft delete by marking them as inactive.
  // Add an 'active: { type: Boolean, default: true, select: false }' field to User model.
  // user.active = false;
  // await user.save({ validateBeforeSave: false });

  // Or for a hard delete (use with caution!)
  await User.findByIdAndDelete(userId);

  return { status: 'success', message: 'User deleted successfully.' };
};

// You might also have getMe, etc. which are simple finds.
exports.getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found!', 404);
  }
  return { status: 'success', data: { user } };
};