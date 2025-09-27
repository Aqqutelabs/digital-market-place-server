// services/reviewService.js
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const AppError = require('../utils/appError');

exports.createReview = async (userId, { orderId, productId, rating, comment }) => {
  // Ensure the order exists and belongs to the user
  const order = await Order.findOne({ _id: orderId, buyer: userId });
  if (!order) throw new AppError('Order not found or not owned by user', 404);
  // Ensure the product is in the order
  const orderedProduct = order.orderItems.find(item => item.product.toString() === productId);
  if (!orderedProduct) throw new AppError('Product not found in this order', 400);
  // Create review
  const review = await Review.create({
    order: orderId,
    product: productId,
    user: userId,
    rating,
    comment
  });
  // Optionally update product's average rating and review count
  const stats = await Review.aggregate([
    { $match: { product: order.product } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
  ]);
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: stats[0].avgRating,
      reviewCount: stats[0].reviewCount
    });
  }
  return review;
};

exports.getProductReviews = async (productId) => {
  return Review.find({ product: productId }).populate('user', 'fullName');
};
