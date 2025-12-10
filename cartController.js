const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get user cart
exports.getCart = async (req, res) => {
    try {
        // Temporary user ID
        const userId = req.query.userId || 'temp-user-id';

        let cart = await Cart.findOne({ user: userId })
            .populate('items.product', 'name price images stock');

        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
            await cart.save();
        }

        // Cart totals calculate karo
        const totals = cart.calculateTotals();

        res.json({
            success: true,
            data: {
                ...cart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cart',
            error: error.message
        });
    }
};

// Add to cart
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const userId = req.body.userId || 'temp-user-id';

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        await cart.addItem(productId, quantity);

        const updatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price images stock');

        const totals = updatedCart.calculateTotals();

        res.json({
            success: true,
            message: 'Item added to cart',
            data: {
                ...updatedCart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.message
        });
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        const userId = req.body.userId || 'temp-user-id';

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const item = cart.items.find(item => 
            item.product.toString() === productId
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        // Stock check karo
        const product = await Product.findById(productId);
        if (quantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: 'Requested quantity exceeds available stock'
            });
        }

        item.quantity = quantity;
        cart.lastUpdated = new Date();

        await cart.save();

        const updatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price images stock');

        const totals = updatedCart.calculateTotals();

        res.json({
            success: true,
            message: 'Cart updated successfully',
            data: {
                ...updatedCart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update cart',
            error: error.message
        });
    }
};

// Remove from cart
exports.removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.body.userId || 'temp-user-id';

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        await cart.removeItem(productId);

        const updatedCart = await Cart.findById(cart._id)
            .populate('items.product', 'name price images stock');

        const totals = updatedCart.calculateTotals();

        res.json({
            success: true,
            message: 'Item removed from cart',
            data: {
                ...updatedCart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to remove item from cart',
            error: error.message
        });
    }
};

// Clear cart
exports.clearCart = async (req, res) => {
    try {
        const userId = req.body.userId || 'temp-user-id';

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        await cart.clearCart();

        res.json({
            success: true,
            message: 'Cart cleared successfully',
            data: cart
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to clear cart',
            error: error.message
        });
    }
};

// Get cart totals
exports.getCartTotals = async (req, res) => {
    try {
        const userId = req.query.userId || 'temp-user-id';

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.json({
                success: true,
                data: {
                    subtotal: 0,
                    discount: 0,
                    shipping: 0,
                    tax: 0,
                    total: 0
                }
            });
        }

        const totals = cart.calculateTotals();

        res.json({
            success: true,
            data: totals
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to calculate totals',
            error: error.message
        });
    }
};

// Apply coupon (basic implementation)
exports.applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.body.userId || 'temp-user-id';

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Simple coupon validation (baad mein database se check karenge)
        const coupons = {
            'WELCOME10': 10,
            'FIRSTORDER': 50,
            'VICTORY20': 20
        };

        if (!coupons[code]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        cart.coupon = {
            code,
            discount: coupons[code]
        };

        await cart.save();

        const totals = cart.calculateTotals();

        res.json({
            success: true,
            message: 'Coupon applied successfully',
            data: {
                ...cart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to apply coupon',
            error: error.message
        });
    }
};

// Remove coupon
exports.removeCoupon = async (req, res) => {
    try {
        const userId = req.body.userId || 'temp-user-id';

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        cart.coupon = undefined;
        await cart.save();

        const totals = cart.calculateTotals();

        res.json({
            success: true,
            message: 'Coupon removed successfully',
            data: {
                ...cart.toObject(),
                totals
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to remove coupon',
            error: error.message
        });
    }
};