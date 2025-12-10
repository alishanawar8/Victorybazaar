const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// Get user's wishlist
exports.getWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);

        res.json({
            success: true,
            count: wishlist.items.length,
            data: wishlist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch wishlist',
            error: error.message
        });
    }
};

// Add item to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const { productId, notes, priority } = req.body;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);
        await wishlist.addItem(productId, notes, priority);

        const updatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('items.product', 'name price images discount stock ratings category brand');

        res.json({
            success: true,
            message: 'Item added to wishlist',
            data: updatedWishlist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add item to wishlist',
            error: error.message
        });
    }
};

// Remove item from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);
        await wishlist.removeItem(productId);

        const updatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('items.product', 'name price images discount stock ratings category brand');

        res.json({
            success: true,
            message: 'Item removed from wishlist',
            data: updatedWishlist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to remove item from wishlist',
            error: error.message
        });
    }
};

// Clear entire wishlist
exports.clearWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);
        await wishlist.clearWishlist();

        res.json({
            success: true,
            message: 'Wishlist cleared successfully',
            data: wishlist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to clear wishlist',
            error: error.message
        });
    }
};

// Update item priority
exports.updateItemPriority = async (req, res) => {
    try {
        const { productId } = req.params;
        const { priority } = req.body;

        if (!['low', 'medium', 'high'].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid priority value'
            });
        }

        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);
        const item = wishlist.items.find(item => 
            item.product.toString() === productId
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in wishlist'
            });
        }

        item.priority = priority;
        wishlist.lastUpdated = new Date();
        await wishlist.save();

        const updatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('items.product', 'name price images discount stock ratings category brand');

        res.json({
            success: true,
            message: 'Item priority updated',
            data: updatedWishlist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update item priority',
            error: error.message
        });
    }
};

// Update wishlist visibility
exports.updateWishlistVisibility = async (req, res) => {
    try {
        const { isPublic } = req.body;

        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);
        wishlist.isPublic = isPublic;
        wishlist.lastUpdated = new Date();
        await wishlist.save();

        res.json({
            success: true,
            message: `Wishlist is now ${isPublic ? 'public' : 'private'}`,
            data: wishlist
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update wishlist visibility',
            error: error.message
        });
    }
};

// Move item from wishlist to cart
exports.moveToCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity = 1 } = req.body;

        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);
        const cart = await wishlist.moveToCart(productId, quantity);

        const updatedWishlist = await Wishlist.findById(wishlist._id)
            .populate('items.product', 'name price images discount stock ratings category brand');

        res.json({
            success: true,
            message: 'Item moved to cart successfully',
            data: {
                wishlist: updatedWishlist,
                cart: cart
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to move item to cart',
            error: error.message
        });
    }
};

// Share wishlist
exports.shareWishlist = async (req, res) => {
    try {
        const { email, message } = req.body;

        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id)
            .populate('items.product', 'name price images discount stock ratings category brand');

        if (!wishlist.isPublic) {
            return res.status(400).json({
                success: false,
                message: 'Wishlist must be public to share'
            });
        }

        // Generate shareable link (in real app, this would be a proper URL)
        const shareableLink = `${process.env.FRONTEND_URL}/wishlist/${req.user.id}`;
        
        // Here you would integrate with email service
        // For now, just return the shareable data
        const shareData = {
            link: shareableLink,
            wishlist: {
                itemCount: wishlist.items.length,
                items: wishlist.items.map(item => ({
                    name: item.product.name,
                    price: item.product.price,
                    image: item.product.images[0]?.url
                }))
            },
            message: message || `Check out my wishlist on Victory Bazaar!`
        };

        res.json({
            success: true,
            message: 'Wishlist shared successfully',
            data: shareData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to share wishlist',
            error: error.message
        });
    }
};

// Get wishlist suggestions
exports.getSuggestions = async (req, res) => {
    try {
        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);
        const suggestions = await wishlist.getSuggestions();

        res.json({
            success: true,
            count: suggestions.length,
            data: suggestions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get suggestions',
            error: error.message
        });
    }
};

// Get wishlist analytics
exports.getWishlistAnalytics = async (req, res) => {
    try {
        const wishlist = await Wishlist.getOrCreateWishlist(req.user.id);

        // Calculate additional analytics
        const highPriorityItems = wishlist.items.filter(item => item.priority === 'high').length;
        const totalValue = wishlist.items.reduce((total, item) => {
            return total + (item.product?.price || 0);
        }, 0);

        const categories = {};
        wishlist.items.forEach(item => {
            if (item.product?.category) {
                categories[item.product.category] = (categories[item.product.category] || 0) + 1;
            }
        });

        const analytics = {
            ...wishlist.analytics.toObject(),
            highPriorityItems,
            totalValue,
            categories,
            averagePrice: totalValue / (wishlist.items.length || 1),
            oldestItem: wishlist.items.length > 0 ? 
                new Date(Math.min(...wishlist.items.map(item => new Date(item.addedAt)))) : 
                null
        };

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get wishlist analytics',
            error: error.message
        });
    }
};

// Get public wishlist
exports.getPublicWishlist = async (req, res) => {
    try {
        const { userId } = req.params;

        const wishlist = await Wishlist.findOne({ 
            user: userId, 
            isPublic: true 
        }).populate('items.product', 'name price images discount stock ratings category brand');

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Public wishlist not found or is private'
            });
        }

        res.json({
            success: true,
            data: {
                itemCount: wishlist.items.length,
                lastUpdated: wishlist.lastUpdated,
                items: wishlist.items.map(item => ({
                    product: item.product,
                    addedAt: item.addedAt,
                    notes: item.notes,
                    priority: item.priority
                }))
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public wishlist',
            error: error.message
        });
    }
};