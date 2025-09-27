// routes/cartRoutes.js
const express = require('express');
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware.protect);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.patch('/update', cartController.updateCartItem);
router.delete('/remove', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);
// Route for checking out the cart (creates an order from cart and clears cart)
router.post('/checkout', cartController.checkoutCart);

module.exports = router;
