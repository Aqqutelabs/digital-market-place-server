// controllers/cartController.js
const cartService = require('../services/cartService');
const orderService = require('../services/orderService');
const catchAsync = require('../utils/catchAsync');

exports.getCart = catchAsync(async (req, res, next) => {
  const cart = await cartService.getCart(req.user.id);
  res.status(200).json({ status: 'success', data: { cart } });
});

exports.addToCart = catchAsync(async (req, res, next) => {
  const { product, variantId, quantity } = req.body;
  const cart = await cartService.addToCart(req.user.id, { product, variantId, quantity });
  res.status(200).json({ status: 'success', data: { cart } });
});

exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { product, variantId, quantity } = req.body;
  const cart = await cartService.updateCartItem(req.user.id, { product, variantId, quantity });
  res.status(200).json({ status: 'success', data: { cart } });
});

exports.removeFromCart = catchAsync(async (req, res, next) => {
  const { product, variantId } = req.body;
  const cart = await cartService.removeFromCart(req.user.id, { product, variantId });
  res.status(200).json({ status: 'success', data: { cart } });
});

exports.clearCart = catchAsync(async (req, res, next) => {
  await cartService.clearCart(req.user.id);
  res.status(204).json({ status: 'success', data: null });
});

exports.checkoutCart = catchAsync(async (req, res, next) => {
  // billingAddress, paymentMethod, couponCode should be in req.body
  const result = await orderService.checkoutCart(req.user.id, req.body);
  res.status(201).json(result);
});
