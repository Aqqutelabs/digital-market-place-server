// routes/orderRoutes.js
const express = require('express');
const orderController = require('../controllers/orderControllers');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All order routes require authentication
router.use(authMiddleware.protect);

// Route for processing checkout (creating an order)
router.post('/checkout', orderController.checkout);

// Routes for retrieving orders
router.get('/', orderController.getOrders); // Get all orders for the current user
router.get('/:id', orderController.getOrder); // Get a specific order by ID for the current user
// Get all orders for a specific user (admin only)
router.get('/user/:userId',  orderController.getOrdersByUser);

module.exports = router;