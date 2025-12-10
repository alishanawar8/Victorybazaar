const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/gemini', require('./routes/geminiRoutes'));
app.use('/api/ai-lens', require('./routes/aiLensRoutes'));
app.use('/api/cj-supplier', require('./routes/cjSupplierRoutes')); // CJ Supplier Routes

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Victory Bazaar API with CJ Supplier is running!',
    timestamp: new Date().toISOString()
  });
});

exports.api = functions.https.onRequest(app);