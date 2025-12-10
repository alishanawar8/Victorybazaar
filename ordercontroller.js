const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const { 
            shippingAddress, 
            paymentMethod, 
            items, 
            cartId 
        } = req.body;

        // User ID temporary (Firebase integration ke baad change karenge)
        const userId = req.body.userId || 'temp-user-id';

        // Items validate karo
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order must contain at least one item'
            });
        }

        // Products availability check karo
        for (let item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product not found: ${item.product}`
                });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`
                });
            }
        }

        // Order totals calculate karo
        let subtotal = 0;
        const orderItems = [];

        for (let item of items) {
            const product = await Product.findById(item.product);
            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                product: item.product,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.images[0]?.url || ''
            });
        }

        const shippingFee = subtotal > 500 ? 0 : 40;
        const tax = Math.round(subtotal * 0.18);
        const total = subtotal + shippingFee + tax;

        // Order create karo
        const order = new Order({
            user: userId,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            subtotal,
            shippingFee,
            tax,
            total,
            orderStatus: 'pending',
            paymentStatus: 'pending'
        });

        await order.save();

        // Stock update karo
        for (let item of items) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: -item.quantity } }
            );
        }

        // Cart clear karo agar cartId diya hai
        if (cartId) {
            await Cart.findByIdAndUpdate(cartId, { items: [] });
        }

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Order creation failed',
            error: error.message
        });
    }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
    try {
        // Temporary user ID
        const userId = req.query.userId || 'temp-user-id';
        const { page = 1, limit = 10, status } = req.query;

        let filter = { user: userId };
        if (status) filter.orderStatus = status;

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            count: orders.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: orders
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ 
            orderId: req.params.orderId 
        }).populate('items.product');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: error.message
        });
    }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ 
            orderId: req.params.orderId 
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Only pending or confirmed orders can be cancelled
        if (!['pending', 'confirmed'].includes(order.orderStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }

        // Stock restore karo
        for (let item of order.items) {
            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } }
            );
        }

        order.orderStatus = 'cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = req.body.reason || 'User requested cancellation';

        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error.message
        });
    }
};

// Track order
exports.trackOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ 
            orderId: req.params.orderId 
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Tracking information (dummy data for now)
        const trackingInfo = {
            orderId: order.orderId,
            status: order.orderStatus,
            estimatedDelivery: order.estimatedDelivery,
            trackingNumber: order.trackingNumber,
            carrier: order.carrier,
            history: [
                {
                    status: 'ordered',
                    timestamp: order.createdAt,
                    description: 'Order placed'
                }
            ]
        };

        // Status ke according history add karo
        if (order.orderStatus === 'confirmed') {
            trackingInfo.history.push({
                status: 'confirmed',
                timestamp: order.updatedAt,
                description: 'Order confirmed'
            });
        }

        if (order.orderStatus === 'shipped') {
            trackingInfo.history.push({
                status: 'shipped',
                timestamp: order.updatedAt,
                description: 'Order shipped'
            });
        }

        if (order.orderStatus === 'delivered') {
            trackingInfo.history.push({
                status: 'delivered',
                timestamp: order.deliveredAt,
                description: 'Order delivered'
            });
        }

        res.json({
            success: true,
            data: trackingInfo
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to track order',
            error: error.message
        });
    }
};

// Admin: Get all orders
exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, paymentStatus } = req.query;

        let filter = {};
        if (status) filter.orderStatus = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        const orders = await Order.find(filter)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            count: orders.length,
            total,
            data: orders
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// Admin: Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findOne({ orderId: req.params.orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.orderStatus = status;
        
        if (status === 'shipped') {
            order.trackingNumber = `TRK${Date.now()}`;
            order.carrier = 'Victory Express';
            order.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
        }

        await order.save();

        res.json({
            success: true,
            message: 'Order status updated successfully',
            data: order
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};