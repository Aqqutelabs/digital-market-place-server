// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});

reviewSchema.index({ order: 1, product: 1, user: 1 }, { unique: true }); // Prevent duplicate reviews per order/product/user

module.exports = mongoose.model('Review', reviewSchema);
