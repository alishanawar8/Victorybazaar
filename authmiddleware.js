// Firebase Authentication Middleware
const admin = require('firebase-admin');

// Firebase Admin SDK initialize karo (agar needed hai)
// const serviceAccount = require('../path/to/serviceAccountKey.json');

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Firebase token verify karo
        // const decodedToken = await admin.auth().verifyIdToken(token);
        // req.user = decodedToken;

        // Temporary implementation - Firebase integration ke baad change karenge
        req.user = {
            id: 'temp-user-id',
            uid: 'temp-firebase-uid',
            email: 'temp@user.com'
        };

        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token',
            error: error.message
        });
    }
};

module.exports = authMiddleware;