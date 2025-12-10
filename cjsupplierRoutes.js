const express = require('express');
const router = express.Router();
const cjSupplierController = require('../controllers/cjSupplierController');

// GET /api/cj-supplier/products - Get products from CJ
router.get('/products', cjSupplierController.getCJProducts);

// GET /api/cj-supplier/products/:productId - Get product details
router.get('/products/:productId', cjSupplierController.getCJProductDetail);

// GET /api/cj-supplier/categories - Get categories
router.get('/categories', cjSupplierController.getCJCategories);

// POST /api/cj-supplier/shipping - Calculate shipping
router.post('/shipping', cjSupplierController.calculateShipping);

// POST /api/cj-supplier/orders - Create order
router.post('/orders', cjSupplierController.createCJOrder);

// GET /api/cj-supplier/orders/:orderId/track - Track order
router.get('/orders/:orderId/track', cjSupplierController.trackCJOrder);

// POST /api/cj-supplier/sync - Sync products to database
router.post('/sync', cjSupplierController.syncCJProducts);

// GET /api/cj-supplier/stats - Get supplier statistics
router.get('/stats', cjSupplierController.getSupplierStats);

module.exports = router;