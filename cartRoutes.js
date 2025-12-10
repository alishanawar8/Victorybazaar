const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/cartController');

// Cart Routes
router.get('/', cartController.getCart);
router.post('/items', cartController.addToCart);
router.put('/items/:productId', cartController.updateCartItem);
router.delete('/items/:productId', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);
router.get('/totals', cartController.getCartTotals);
router.post('/apply-coupon', cartController.applyCoupon);
router.delete('/remove-coupon', cartController.removeCoupon);

module.exports = router;