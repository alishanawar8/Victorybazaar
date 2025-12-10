const Product = require('../models/Product');

// Get all products with filters
exports.getAllProducts = async (req, res) => {
    try {
        const { 
            category, 
            minPrice, 
            maxPrice, 
            brand, 
            featured, 
            trending,
            page = 1, 
            limit = 20,
            sort = 'createdAt'
        } = req.query;

        // Filter build karo
        let filter = {};
        
        if (category) filter.category = category;
        if (featured) filter.featured = featured === 'true';
        if (trending) filter.trending = trending === 'true';
        if (brand) filter.brand = new RegExp(brand, 'i');
        
        // Price range filter
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        // Sort options
        const sortOptions = {
            'price-low': { price: 1 },
            'price-high': { price: -1 },
            'newest': { createdAt: -1 },
            'popular': { 'ratings.average': -1 },
            'name': { name: 1 }
        };

        const sortBy = sortOptions[sort] || { createdAt: -1 };

        // Pagination
        const skip = (page - 1) * limit;

        const products = await Product.find(filter)
            .sort(sortBy)
            .skip(skip)
            .limit(Number(limit))
            .select('-specifications'); // Heavy data avoid karo

        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            count: products.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Search products
exports.searchProducts = async (req, res) => {
    try {
        const { q, category, page = 1, limit = 20 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        let filter = {
            $text: { $search: q }
        };

        if (category) filter.category = category;

        const products = await Product.find(filter)
            .sort({ score: { $meta: "textScore" } })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Product.countDocuments(filter);

        res.json({
            success: true,
            query: q,
            count: products.length,
            total,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message
        });
    }
};

// Get single product
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get featured products
exports.getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.find({ featured: true })
            .limit(10)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get trending products
exports.getTrendingProducts = async (req, res) => {
    try {
        const products = await Product.find({ trending: true })
            .limit(10)
            .sort({ 'ratings.average': -1 });

        res.json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 20, sort = 'newest' } = req.query;

        const sortOptions = {
            'price-low': { price: 1 },
            'price-high': { price: -1 },
            'newest': { createdAt: -1 },
            'popular': { 'ratings.average': -1 }
        };

        const products = await Product.find({ category })
            .sort(sortOptions[sort] || { createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Product.countDocuments({ category });

        res.json({
            success: true,
            category,
            count: products.length,
            total,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Create product (Admin)
exports.createProduct = async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Product creation failed',
            error: error.message
        });
    }
};

// Update product (Admin)
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Product update failed',
            error: error.message
        });
    }
};

// Delete product (Admin)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Update stock (Admin)
exports.updateStock = async (req, res) => {
    try {
        const { stock } = req.body;
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { 
                stock,
                status: stock > 0 ? 'active' : 'out_of_stock'
            },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Stock updated successfully',
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Stock update failed',
            error: error.message
        });
    }
};