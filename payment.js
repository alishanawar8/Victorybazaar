const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        unique: true,
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR']
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['card', 'upi', 'paypal', 'netbanking', 'wallet', 'cod']
    },
    paymentGateway: {
        type: String,
        enum: ['razorpay', 'stripe', 'paypal', 'phonepe', 'googlepay', 'paytm', 'cash']
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'pending'
    },
    gatewayPaymentId: String,
    gatewayOrderId: String,
    gatewaySignature: String,
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    paymentDetails: {
        // Card payments ke liye
        cardLast4: String,
        cardBrand: String,
        cardType: String,
        
        // UPI payments ke liye
        upiId: String,
        upiApp: String,
        
        // Wallet payments ke liye
        walletName: String,
        walletPhone: String,
        
        // Net banking ke liye
        bankName: String,
        bankTransactionId: String
    },
    attempts: {
        type: Number,
        default: 0
    },
    lastAttemptAt: Date,
    paymentLink: String,
    webhookData: mongoose.Schema.Types.Mixed,
    notes: String
}, {
    timestamps: true
});

// Payment ID automatically generate karne ke liye
paymentSchema.pre('save', async function(next) {
    if (!this.paymentId) {
        const count = await mongoose.model('Payment').countDocuments();
        this.paymentId = `PAY${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

// Payment status update karne ke liye methods
paymentSchema.methods.markAsProcessing = function() {
    this.paymentStatus = 'processing';
    this.attempts += 1;
    this.lastAttemptAt = new Date();
    return this.save();
};

paymentSchema.methods.markAsCompleted = function(gatewayData = {}) {
    this.paymentStatus = 'completed';
    this.gatewayPaymentId = gatewayData.paymentId;
    this.gatewayOrderId = gatewayData.orderId;
    this.gatewaySignature = gatewayData.signature;
    return this.save();
};

paymentSchema.methods.markAsFailed = function() {
    this.paymentStatus = 'failed';
    this.attempts += 1;
    this.lastAttemptAt = new Date();
    return this.save();
};

paymentSchema.methods.initiateRefund = function(amount, reason) {
    this.paymentStatus = 'refunded';
    this.refundAmount = amount;
    this.refundReason = reason;
    this.refundId = `REF${Date.now()}`;
    return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);