const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const authMiddleware = require('../../middleware/authMiddleware');

// Public Routes
router.post('/sync-firebase', userController.syncFirebaseUser);

// Protected Routes (Firebase authentication required)
router.get('/profile', authMiddleware, userController.getUserProfile);
router.put('/profile', authMiddleware, userController.updateUserProfile);
router.get('/preferences', authMiddleware, userController.getUserPreferences);
router.put('/preferences', authMiddleware, userController.updateUserPreferences);
router.get('/loyalty', authMiddleware, userController.getLoyaltyInfo);

// Admin Routes
router.get('/admin/users', authMiddleware, userController.getAllUsers);
router.get('/admin/users/:userId', authMiddleware, userController.getUserById);
router.put('/admin/users/:userId/status', authMiddleware, userController.updateUserStatus);

module.exports = router;