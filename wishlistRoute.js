const express = require('express');
const router = express.Router();
const wishlistController = require('../../controllers/wishlistController');
const authMiddleware = require('../../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Wishlist CRUD Operations
router.get('/', wishlistController.getWishlist);
router.post('/items', wishlistController.addToWishlist);
router.delete('/items/:productId', wishlistController.removeFromWishlist);
router.delete('/clear', wishlistController.clearWishlist);
router.put('/items/:productId/priority', wishlistController.updateItemPriority);
router.put('/visibility', wishlistController.updateWishlistVisibility);

// Wishlist Actions
router.post('/items/:productId/move-to-cart', wishlistController.moveToCart);
router.post('/share', wishlistController.shareWishlist);
router.get('/suggestions', wishlistController.getSuggestions);
router.get('/analytics', wishlistController.getWishlistAnalytics);

// Public Wishlist (if enabled)
router.get('/public/:userId', wishlistController.getPublicWishlist);

module.exports = router;