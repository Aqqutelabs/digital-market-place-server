// routes/reviewRoutes.js
const express = require('express');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

// Leave a review for a product in an order
router.post('/', reviewController.createReview);
// Get all reviews for a product
router.get('/product/:productId', reviewController.getProductReviews);

module.exports = router;
