const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (agar frontend serve karna hai)
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/victorybazaar', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

// Basic Routes (Health Check)
app.get('/', (req, res) => {
    res.json({
        message: '🏪 Victory Bazaar Backend Server',
        version: '1.0.0',
        status: 'Running 🟢',
        timestamp: new Date().toISOString()
    });
});

// API Routes (Yahan pe sab routes include karenge)
app.use('/api/products', require('./routes/products/productRoutes'));
app.use('/api/orders', require('./routes/orders/orderRoutes'));
app.use('/api/cart', require('./routes/orders/cartRoutes'));
app.use('/api/users', require('./routes/user/userRoutes'));
app.use('/api/payments', require('./routes/payments/paymentRoutes'));
app.use('/api/categories', require('./routes/products/categoryRoutes'));
app.use('/api/wishlist', require('./routes/wishlist/wishlistRoutes'));
app.use('/api/address', require('./routes/user/addressRoutes'));

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: '🚫 Route not found',
        requestedUrl: req.originalUrl
    });
});

// Error Handling Middleware
app.use((error, req, res, next) => {
    console.error('🔥 Server Error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong!'
    });
});

// Server Start
app.listen(PORT, () => {
    console.log(`🎯 Victory Bazaar Server running on PORT ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🕒 Started at: ${new Date().toLocaleString()}`);
});

module.exports = app;