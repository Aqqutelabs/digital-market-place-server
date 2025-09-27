// controllers/reviewController.js
const reviewService = require('../services/reviewService');
const catchAsync = require('../utils/catchAsync');

exports.createReview = catchAsync(async (req, res, next) => {
  const review = await reviewService.createReview(req.user.id, req.body);
  res.status(201).json({ status: 'success', data: { review } });
});

exports.getProductReviews = catchAsync(async (req, res, next) => {
  const reviews = await reviewService.getProductReviews(req.params.productId);
  res.status(200).json({ status: 'success', results: reviews.length, data: { reviews } });
});
