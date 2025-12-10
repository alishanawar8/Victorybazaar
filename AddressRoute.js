const express = require('express');
const router = express.Router();
const addressController = require('../../controllers/addressController');
const authMiddleware = require('../../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Address CRUD Operations
router.get('/', addressController.getUserAddresses);
router.post('/', addressController.createAddress);
router.get('/default', addressController.getDefaultAddress);
router.put('/:addressId', addressController.updateAddress);
router.delete('/:addressId', addressController.deleteAddress);
router.patch('/:addressId/set-default', addressController.setDefaultAddress);

// Address Validation
router.post('/validate', addressController.validateAddress);

module.exports = router;