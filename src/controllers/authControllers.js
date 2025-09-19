// controllers/authController.js
const authService = require('../services/authService');
const catchAsync = require('../utils/catchAsync');

// Helper to send the response with token
const sendResponseWithToken = (res, statusCode, result) => {
  res.status(statusCode).json(result);
};

exports.signup = catchAsync(async (req, res, next) => {
  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`; // Determine the origin for email links
  const result = await authService.signup(req.body, origin);
  sendResponseWithToken(res, 201, result); // 201 Created
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  sendResponseWithToken(res, 200, result); // 200 OK
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.body;
  const result = await authService.verifyEmail(token);
  res.status(200).json(result);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
  const result = await authService.forgotPassword(req.body.email, origin);
  res.status(200).json(result);
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, password, passwordConfirm } = req.body;
  const result = await authService.resetPassword(token, password, passwordConfirm);
  sendResponseWithToken(res, 200, result);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const result = await authService.updatePassword(
    req.user.id,
    currentPassword,
    newPassword,
    confirmPassword
  );
  sendResponseWithToken(res, 200, result);
});

exports.completeVendorKyc = catchAsync(async (req, res, next) => {
  const result = await authService.completeVendorKyc(req.user.id, req.body);
  res.status(200).json(result);
});
