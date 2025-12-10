const Address = require('../models/Address');
const User = require('../models/User');

// Get user addresses
exports.getUserAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ user: req.user.id })
            .sort({ isDefault: -1, createdAt: -1 });

        res.json({
            success: true,
            count: addresses.length,
            data: addresses
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch addresses',
            error: error.message
        });
    }
};

// Create new address
exports.createAddress = async (req, res) => {
    try {
        const addressData = {
            ...req.body,
            user: req.user.id
        };

        const address = new Address(addressData);
        await address.save();

        res.status(201).json({
            success: true,
            message: 'Address created successfully',
            data: address
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Address creation failed',
            error: error.message
        });
    }
};

// Get default address
exports.getDefaultAddress = async (req, res) => {
    try {
        const address = await Address.findOne({ 
            user: req.user.id, 
            isDefault: true 
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'No default address found'
            });
        }

        res.json({
            success: true,
            data: address
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch default address',
            error: error.message
        });
    }
};

// Update address
exports.updateAddress = async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.addressId,
            user: req.user.id
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        Object.assign(address, req.body);
        await address.save();

        res.json({
            success: true,
            message: 'Address updated successfully',
            data: address
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Address update failed',
            error: error.message
        });
    }
};

// Delete address
exports.deleteAddress = async (req, res) => {
    try {
        const address = await Address.findOneAndDelete({
            _id: req.params.addressId,
            user: req.user.id
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        res.json({
            success: true,
            message: 'Address deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete address',
            error: error.message
        });
    }
};

// Set address as default
exports.setDefaultAddress = async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.addressId,
            user: req.user.id
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Address not found'
            });
        }

        address.isDefault = true;
        await address.save();

        res.json({
            success: true,
            message: 'Address set as default successfully',
            data: address
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to set default address',
            error: error.message
        });
    }
};

// Validate address
exports.validateAddress = async (req, res) => {
    try {
        const { addressLine1, city, state, zipCode } = req.body;

        // Basic validation rules
        const validation = {
            isValid: true,
            issues: []
        };

        if (!addressLine1 || addressLine1.trim().length < 5) {
            validation.isValid = false;
            validation.issues.push('Address line 1 is too short');
        }

        if (!city || city.trim().length < 2) {
            validation.isValid = false;
            validation.issues.push('City is required');
        }

        if (!state || state.trim().length < 2) {
            validation.isValid = false;
            validation.issues.push('State is required');
        }

        if (!zipCode || !/^\d{6}$/.test(zipCode)) {
            validation.isValid = false;
            validation.issues.push('ZIP code must be 6 digits');
        }

        res.json({
            success: true,
            data: validation
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Address validation failed',
            error: error.message
        });
    }
};