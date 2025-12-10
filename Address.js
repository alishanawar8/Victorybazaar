const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
    },
    label: {
        type: String,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    addressLine1: {
        type: String,
        required: true,
        trim: true
    },
    addressLine2: {
        type: String,
        trim: true
    },
    landmark: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    zipCode: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        default: 'India',
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    coordinates: {
        lat: Number,
        lng: Number
    },
    instructions: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Ensure only one default address per user
addressSchema.pre('save', async function(next) {
    if (this.isDefault) {
        await mongoose.model('Address').updateMany(
            { 
                user: this.user, 
                _id: { $ne: this._id } 
            },
            { $set: { isDefault: false } }
        );
    }
    next();
});

// Index for efficient queries
addressSchema.index({ user: 1, isDefault: 1 });
addressSchema.index({ user: 1, type: 1 });

addressSchema.methods.getFormattedAddress = function() {
    const parts = [
        this.addressLine1,
        this.addressLine2,
        this.landmark,
        this.city,
        this.state,
        this.zipCode,
        this.country
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
};

module.exports = mongoose.model('Address', addressSchema);