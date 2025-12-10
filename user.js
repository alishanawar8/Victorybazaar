const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Firebase UID (Primary key)
    firebaseUid: {
        type: String,
        required: true,
        unique: true
    },
    // Basic Information
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    profile: {
        fullName: {
            type: String,
            trim: true
        },
        displayName: {
            type: String,
            trim: true
        },
        photoURL: String,
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer_not_to_say']
        },
        dateOfBirth: Date,
        bio: {
            type: String,
            maxlength: 500
        }
    },
    // Address Information
    addresses: [{
        type: {
            type: String,
            enum: ['home', 'work', 'other'],
            default: 'home'
        },
        fullName: String,
        phone: String,
        addressLine1: {
            type: String,
            required: true
        },
        addressLine2: String,
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        zipCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            default: 'India'
        },
        isDefault: {
            type: Boolean,
            default: false
        },
        landmark: String
    }],
    // Preferences
    preferences: {
        language: {
            type: String,
            default: 'en'
        },
        currency: {
            type: String,
            default: 'INR'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            },
            promotional: {
                type: Boolean,
                default: true
            }
        }
    },
    // Loyalty & Rewards
    loyalty: {
        points: {
            type: Number,
            default: 0
        },
        tier: {
            type: String,
            enum: ['silver', 'gold', 'platinum'],
            default: 'silver'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    // Account Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'deleted'],
        default: 'active'
    },
    // Timestamps
    lastLogin: Date,
    emailVerified: {
        type: Boolean,
        default: false
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    // Social Logins
    socialLogins: {
        google: String,
        facebook: String,
        apple: String
    }
}, {
    timestamps: true
});

// Virtual for user's full name
userSchema.virtual('fullName').get(function() {
    return this.profile.fullName || this.profile.displayName || '';
});

// Methods
userSchema.methods.getDefaultAddress = function() {
    return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

userSchema.methods.addAddress = function(addressData) {
    // If this is first address or marked as default, set as default
    if (this.addresses.length === 0 || addressData.isDefault) {
        addressData.isDefault = true;
        // Remove default from other addresses
        this.addresses.forEach(addr => addr.isDefault = false);
    }
    
    this.addresses.push(addressData);
    return this.save();
};

userSchema.methods.updateAddress = function(addressId, updateData) {
    const address = this.addresses.id(addressId);
    if (!address) throw new Error('Address not found');
    
    Object.assign(address, updateData);
    
    // If setting as default, update others
    if (updateData.isDefault) {
        this.addresses.forEach(addr => {
            if (addr._id.toString() !== addressId) {
                addr.isDefault = false;
            }
        });
    }
    
    return this.save();
};

userSchema.methods.removeAddress = function(addressId) {
    this.addresses = this.addresses.filter(addr => addr._id.toString() !== addressId);
    
    // If we removed the default address, set first as default
    const hasDefault = this.addresses.some(addr => addr.isDefault);
    if (!hasDefault && this.addresses.length > 0) {
        this.addresses[0].isDefault = true;
    }
    
    return this.save();
};

// Static Methods
userSchema.statics.findByFirebaseUid = function(firebaseUid) {
    return this.findOne({ firebaseUid });
};

userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.createFromFirebase = async function(firebaseUser, additionalData = {}) {
    const userData = {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        profile: {
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
        },
        emailVerified: firebaseUser.emailVerified,
        ...additionalData
    };
    
    return this.create(userData);
};

module.exports = mongoose.model('User', userSchema);