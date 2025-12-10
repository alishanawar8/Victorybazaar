const express = require('express');
const router = express.Router();
const upiController = require('../../controllers/upiController');

// UPI Payment Routes
router.post('/create-order', upiController.createUpiOrder);
router.post('/verify', upiController.verifyUpiPayment);
router.post('/generate-qr', upiController.generateUpiQr);
router.get('/supported-apps', upiController.getSupportedApps);

module.exports = router;const express = require('express');
const router = express.Router();
const upiController = require('../../controllers/upiController');

// UPI Payment Routes
router.post('/create-order', upiController.createUpiOrder);
router.post('/verify', upiController.verifyUpiPayment);
router.post('/generate-qr', upiController.generateUpiQr);
router.get('/supported-apps', upiController.getSupportedApps);

module.exports = router;