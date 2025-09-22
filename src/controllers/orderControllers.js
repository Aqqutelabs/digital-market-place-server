// controllers/orderController.js
const orderService = require('../services/orderService');
const catchAsync = require('../utils/catchAsync');

exports.checkout = catchAsync(async (req, res, next) => {
  // `req.user.id` is available because the `authMiddleware.protect` is used
  const result = await orderService.createOrder(req.user.id, req.body);
  res.status(201).json(result); // 201 Created for a successful order
});

exports.getOrders = catchAsync(async (req, res, next) => {
  // Get all orders for the logged-in user
  const result = await orderService.getOrders(req.user.id);
  res.status(200).json(result);
});

exports.getOrder = catchAsync(async (req, res, next) => {
  // Get a specific order for the logged-in user by ID
  const result = await orderService.getOrderById(req.params.id, req.user.id);
  res.status(200).json(result);
});