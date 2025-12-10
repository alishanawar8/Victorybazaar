const Payment = require('../models/Payment');
const Order = require('../models/Order');
const paymentService = require('../services/paymentService');

// Create payment
exports.createPayment = async (req, res) => {
    try {
        const { orderId, paymentMethod, paymentGateway } = req.body;

        // Order validate karo
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if payment already exists
        const existingPayment = await Payment.findOne({ order: order._id });
        if (existingPayment) {
            return res.json({
                success: true,
                message: 'Payment already exists',
                data: existingPayment
            });
        }

        // Payment create karo
        const payment = new Payment({
            order: order._id,
            user: order.user,
            amount: order.total,
            paymentMethod,
            paymentGateway,
            paymentStatus: 'pending'
        });

        await payment.save();

        // Payment gateway ke according process karo
        let paymentData = {};
        
        switch (paymentGateway) {
            case 'razorpay':
                paymentData = await paymentService.createRazorpayOrder(order, payment);
                break;
            case 'stripe':
                paymentData = await paymentService.createStripePayment(order, payment);
                break;
            case 'paypal':
                paymentData = await paymentService.createPaypalOrder(order, payment);
                break;
            case 'phonepe':
                paymentData = await paymentService.createPhonePeOrder(order, payment);
                break;
            default:
                // Cash on delivery
                paymentData = { cod: true };
        }

        // Payment link update karo
        if (paymentData.paymentLink) {
            payment.paymentLink = paymentData.paymentLink;
            await payment.save();
        }

        res.json({
            success: true,
            message: 'Payment created successfully',
            data: {
                payment,
                gatewayData: paymentData
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Payment creation failed',
            error: error.message
        });
    }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
    try {
        const { paymentId, gatewayData } = req.body;

        const payment = await Payment.findOne({ paymentId });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Payment gateway ke according verify karo
        const verification = await paymentService.verifyPayment(payment, gatewayData);

        if (verification.success) {
            // Payment successful
            await payment.markAsCompleted(verification.data);
            
            // Order update karo
            await Order.findByIdAndUpdate(payment.order, {
                paymentStatus: 'completed',
                orderStatus: 'confirmed'
            });

            res.json({
                success: true,
                message: 'Payment verified successfully',
                data: payment
            });
        } else {
            // Payment failed
            await payment.markAsFailed();
            
            await Order.findByIdAndUpdate(payment.order, {
                paymentStatus: 'failed'
            });

            res.status(400).json({
                success: false,
                message: 'Payment verification failed',
                error: verification.error
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
};

// Get payment status
exports.getPaymentStatus = async (req, res) => {
    try {
        const payment = await Payment.findOne({ paymentId: req.params.paymentId })
            .populate('order', 'orderId total items');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            data: payment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment status',
            error: error.message
        });
    }
};

// Capture payment (for authorized payments)
exports.capturePayment = async (req, res) => {
    try {
        const payment = await Payment.findOne({ paymentId: req.params.paymentId });
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.paymentStatus !== 'processing') {
            return res.status(400).json({
                success: false,
                message: 'Payment cannot be captured'
            });
        }

        // Gateway specific capture logic
        const captureResult = await paymentService.capturePayment(payment);

        if (captureResult.success) {
            await payment.markAsCompleted(captureResult.data);
            
            await Order.findByIdAndUpdate(payment.order, {
                paymentStatus: 'completed',
                orderStatus: 'confirmed'
            });

            res.json({
                success: true,
                message: 'Payment captured successfully',
                data: payment
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment capture failed',
                error: captureResult.error
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Payment capture failed',
            error: error.message
        });
    }
};

// Refund payment
exports.refundPayment = async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const payment = await Payment.findOne({ paymentId: req.params.paymentId });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.paymentStatus !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Only completed payments can be refunded'
            });
        }

        const refundAmount = amount || payment.amount;

        // Gateway specific refund logic
        const refundResult = await paymentService.processRefund(payment, refundAmount, reason);

        if (refundResult.success) {
            await payment.initiateRefund(refundAmount, reason);
            
            // Order update karo
            await Order.findByIdAndUpdate(payment.order, {
                paymentStatus: 'refunded'
            });

            res.json({
                success: true,
                message: 'Refund processed successfully',
                data: {
                    payment,
                    refundId: refundResult.refundId
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Refund failed',
                error: refundResult.error
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Refund processing failed',
            error: error.message
        });
    }
};

// Get payment by order
exports.getPaymentByOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const payment = await Payment.findOne({ order: order._id })
            .populate('order', 'orderId total items');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found for this order'
            });
        }

        res.json({
            success: true,
            data: payment
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment',
            error: error.message
        });
    }
};