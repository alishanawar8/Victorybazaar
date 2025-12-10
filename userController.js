const User = require('../models/User');

// Sync Firebase user with MongoDB
exports.syncFirebaseUser = async (req, res) => {
    try {
        const { firebaseUser, additionalData = {} } = req.body;

        if (!firebaseUser || !firebaseUser.uid) {
            return res.status(400).json({
                success: false,
                message: 'Firebase user data is required'
            });
        }

        // Check if user already exists
        let user = await User.findByFirebaseUid(firebaseUser.uid);

        if (user) {
            // Update existing user
            user.email = firebaseUser.email;
            user.profile.displayName = firebaseUser.displayName || user.profile.displayName;
            user.profile.photoURL = firebaseUser.photoURL || user.profile.photoURL;
            user.emailVerified = firebaseUser.emailVerified;
            user.lastLogin = new Date();
            
            await user.save();
        } else {
            // Create new user
            user = await User.createFromFirebase(firebaseUser, additionalData);
        }

        res.json({
            success: true,
            message: 'User synced successfully',
            data: {
                user: {
                    id: user._id,
                    firebaseUid: user.firebaseUid,
                    email: user.email,
                    profile: user.profile,
                    preferences: user.preferences,
                    loyalty: user.loyalty
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'User sync failed',
            error: error.message
        });
    }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-__v -socialLogins');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile',
            error: error.message
        });
    }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
    try {
        const { profile, phone } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update profile fields
        if (profile) {
            if (profile.fullName) user.profile.fullName = profile.fullName;
            if (profile.displayName) user.profile.displayName = profile.displayName;
            if (profile.gender) user.profile.gender = profile.gender;
            if (profile.dateOfBirth) user.profile.dateOfBirth = profile.dateOfBirth;
            if (profile.bio) user.profile.bio = profile.bio;
            if (profile.photoURL) user.profile.photoURL = profile.photoURL;
        }

        if (phone) {
            user.phone = phone;
            // Reset phone verification if phone changed
            if (phone !== user.phone) {
                user.phoneVerified = false;
            }
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Profile update failed',
            error: error.message
        });
    }
};

// Get user preferences
exports.getUserPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('preferences');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user.preferences
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch preferences',
            error: error.message
        });
    }
};

// Update user preferences
exports.updateUserPreferences = async (req, res) => {
    try {
        const { language, currency, theme, notifications } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update preferences
        if (language) user.preferences.language = language;
        if (currency) user.preferences.currency = currency;
        if (theme) user.preferences.theme = theme;
        if (notifications) {
            if (notifications.email !== undefined) 
                user.preferences.notifications.email = notifications.email;
            if (notifications.sms !== undefined) 
                user.preferences.notifications.sms = notifications.sms;
            if (notifications.push !== undefined) 
                user.preferences.notifications.push = notifications.push;
            if (notifications.promotional !== undefined) 
                user.preferences.notifications.promotional = notifications.promotional;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            data: user.preferences
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Preferences update failed',
            error: error.message
        });
    }
};

// Get loyalty information
exports.getLoyaltyInfo = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('loyalty');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Calculate points to next tier
        const tierRequirements = {
            silver: 0,
            gold: 1000,
            platinum: 2500
        };

        const nextTier = user.loyalty.tier === 'silver' ? 'gold' : 
                        user.loyalty.tier === 'gold' ? 'platinum' : null;

        const pointsToNextTier = nextTier ? 
            tierRequirements[nextTier] - user.loyalty.points : 0;

        res.json({
            success: true,
            data: {
                ...user.loyalty.toObject(),
                nextTier,
                pointsToNextTier,
                progress: nextTier ? 
                    (user.loyalty.points / tierRequirements[nextTier]) * 100 : 100
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch loyalty info',
            error: error.message
        });
    }
};

// Admin: Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;

        let filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { 'profile.fullName': { $regex: search, $options: 'i' } },
                { 'profile.displayName': { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .select('-addresses -socialLogins -preferences')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            count: users.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: users
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

// Admin: Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-socialLogins');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: error.message
        });
    }
};

// Admin: Update user status
exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { status },
            { new: true }
        ).select('-socialLogins -addresses');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User status updated successfully',
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update user status',
            error: error.message
        });
    }
};