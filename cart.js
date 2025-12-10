const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    coupon: {
        code: String,
        discount: Number
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Cart totals calculate karne ke liye methods
cartSchema.methods.calculateTotals = function() {
    const subtotal = this.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);

    const discount = this.coupon?.discount || 0;
    const shipping = subtotal > 500 ? 0 : 40; // Free shipping above 500
    const tax = Math.round(subtotal * 0.18); // 18% GST

    const total = subtotal - discount + shipping + tax;

    return {
        subtotal,
        discount,
        shipping,
        tax,
        total
    };
};

// Item add/update karne ke liye method
cartSchema.methods.addItem = async function(productId, quantity = 1) {
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
        throw new Error('Product not found');
    }

    if (product.stock < quantity) {
        throw new Error('Insufficient stock');
    }

    const existingItem = this.items.find(item => 
        item.product.toString() === productId.toString()
    );

    if (existingItem) {
        existingItem.quantity += quantity;
        if (existingItem.quantity > product.stock) {
            throw new Error('Quantity exceeds available stock');
        }
    } else {
        this.items.push({
            product: productId,
            quantity,
            price: product.price,
            name: product.name,
            image: product.images[0]?.url || '',
            stock: product.stock
        });
    }

    this.lastUpdated = new Date();
    return this.save();
};

// Item remove karne ke liye method
cartSchema.methods.removeItem = function(productId) {
    this.items = this.items.filter(item => 
        item.product.toString() !== productId.toString()
    );
    this.lastUpdated = new Date();
    return this.save();
};

// Cart clear karne ke liye method
cartSchema.methods.clearCart = function() {
    this.items = [];
    this.coupon = undefined;
    this.lastUpdated = new Date();
    return this.save();
};

module.exports = mongoose.model('Cart', cartSchema);