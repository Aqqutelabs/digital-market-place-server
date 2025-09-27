// services/cartService.js
const Cart = require('../models/Cart');
const AppError = require('../utils/appError');

exports.getCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

exports.addToCart = async (userId, { product, variantId, quantity }) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === product && item.variantId.toString() === variantId
  );
  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += quantity;
  } else {
    cart.items.push({ product, variantId, quantity });
  }
  await cart.save();
  return cart;
};

exports.updateCartItem = async (userId, { product, variantId, quantity }) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError('Cart not found', 404);
  const item = cart.items.find(
    item => item.product.toString() === product && item.variantId.toString() === variantId
  );
  if (!item) throw new AppError('Cart item not found', 404);
  item.quantity = quantity;
  await cart.save();
  return cart;
};

exports.removeFromCart = async (userId, { product, variantId }) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError('Cart not found', 404);
  cart.items = cart.items.filter(
    item => !(item.product.toString() === product && item.variantId.toString() === variantId)
  );
  await cart.save();
  return cart;
};

exports.clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
};
