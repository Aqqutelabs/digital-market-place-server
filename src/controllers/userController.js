// controllers/userController.js
const userService = require('../services/userService');
const catchAsync = require('../utils/catchAsync');

exports.getMe = catchAsync(async (req, res, next) => {
  const result = await userService.getMe(req.user.id);
  res.status(200).json(result);
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // Pass the entire req.body to the service, it will filter allowed fields
  const result = await userService.updateMe(req.user.id, req.body);
  res.status(200).json(result);
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // In a real application, you might 'deactivate' the user instead of truly deleting them
  await userService.deleteMe(req.user.id);
  // Send 204 No Content for successful deletion
  res.status(204).json({
    status: 'success',
    data: null
  });
});