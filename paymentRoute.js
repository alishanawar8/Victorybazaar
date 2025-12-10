const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/paymentController');

// Payment Routes
router.post('/create', paymentController.createPayment);
router.post('/verify', paymentController.verifyPayment);
router.get('/:paymentId', paymentController.getPaymentStatus);
router.post('/:paymentId/capture', paymentController.capturePayment);
router.post('/:paymentId/refund', paymentController.refundPayment);
router.get('/order/:orderId', paymentController.getPaymentByOrder);

// Payment Method Specific Routes
router.use('/upi', require('./upiRoutes'));
router.use('/card', require('./cardRoutes'));
router.use('/wallet', require('./walletRoutes'));

module.exports = router;