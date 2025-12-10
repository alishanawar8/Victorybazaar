const mongoose = require('mongoose');

const wishlistItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        maxlength: 200
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
});

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [wishlistItemSchema],
    isPublic: {
        type: Boolean,
        default: false
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    // Wishlist analytics
    analytics: {
        totalItemsAdded: {
            type: Number,
            default: 0
        },
        itemsPurchased: {
            type: Number,
            default: 0
        },
        lastPurchased: Date
    }
}, {
    timestamps: true
});

// Wishlist methods
wishlistSchema.methods.addItem = async function(productId, notes = '', priority = 'medium') {
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }

    // Check if product already in wishlist
    const existingItem = this.items.find(item => 
        item.product.toString() === productId.toString()
    );

    if (existingItem) {
        // Update existing item
        existingItem.notes = notes;
        existingItem.priority = priority;
        existingItem.addedAt = new Date();
    } else {
        // Add new item
        this.items.push({
            product: productId,
            notes,
            priority,
            addedAt: new Date()
        });
        this.analytics.totalItemsAdded += 1;
    }

    this.lastUpdated = new Date();
    return this.save();
};

wishlistSchema.methods.removeItem = function(productId) {
    const initialLength = this.items.length;
    this.items = this.items.filter(item => 
        item.product.toString() !== productId.toString()
    );
    
    // If item was removed, update analytics
    if (this.items.length < initialLength) {
        this.lastUpdated = new Date();
    }
    
    return this.save();
};

wishlistSchema.methods.clearWishlist = function() {
    this.items = [];
    this.lastUpdated = new Date();
    return this.save();
};

wishlistSchema.methods.moveToCart = async function(productId, quantity = 1) {
    const Cart = mongoose.model('Cart');
    
    // Find the wishlist item
    const wishlistItem = this.items.find(item => 
        item.product.toString() === productId.toString()
    );
    
    if (!wishlistItem) {
        throw new Error('Item not found in wishlist');
    }

    // Get or create user's cart
    let cart = await Cart.findOne({ user: this.user });
    if (!cart) {
        cart = new Cart({ user: this.user, items: [] });
    }

    // Add to cart
    await cart.addItem(productId, quantity);

    // Remove from wishlist
    await this.removeItem(productId);

    return cart;
};

wishlistSchema.methods.getSuggestions = async function() {
    const Product = mongoose.model('Product');
    
    // Get categories from wishlist items
    const wishlistProductIds = this.items.map(item => item.product);
    const wishlistProducts = await Product.find({ 
        _id: { $in: wishlistProductIds } 
    }).select('category brand');
    
    const categories = [...new Set(wishlistProducts.map(p => p.category))];
    const brands = [...new Set(wishlistProducts.map(p => p.brand).filter(Boolean))];
    
    // Get similar products
    let suggestions = await Product.find({
        category: { $in: categories },
        _id: { $nin: wishlistProductIds },
        status: 'active'
    })
    .limit(10)
    .sort({ 'ratings.average': -1, createdAt: -1 });
    
    // If not enough suggestions, get trending products
    if (suggestions.length < 5) {
        const trendingProducts = await Product.find({
            trending: true,
            _id: { $nin: wishlistProductIds },
            status: 'active'
        })
        .limit(10 - suggestions.length)
        .sort({ createdAt: -1 });
        
        suggestions = [...suggestions, ...trendingProducts];
    }
    
    return suggestions;
};

// Static methods
wishlistSchema.statics.getOrCreateWishlist = async function(userId) {
    let wishlist = await this.findOne({ user: userId })
        .populate('items.product', 'name price images discount stock ratings category brand');
    
    if (!wishlist) {
        wishlist = new this({ user: userId, items: [] });
        await wishlist.save();
        await wishlist.populate('items.product', 'name price images discount stock ratings category brand');
    }
    
    return wishlist;
};

// Indexes for better performance
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ 'items.product': 1 });
wishlistSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('Wishlist', wishlistSchema);