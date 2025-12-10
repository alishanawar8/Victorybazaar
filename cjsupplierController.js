const axios = require('axios');

const CJ_SUPPLIER_API = {
  baseURL: 'https://developers.cjdropshipping.com/api2.0/v1',
  endpoints: {
    products: '/product/list',
    productDetail: '/product/query',
    categories: '/product/category/list',
    createOrder: '/shopping/order/createOrder',
    trackOrder: '/shopping/order/track',
    shipping: '/shopping/freight/calculate'
  }
};

const cjSupplierController = {
  // CJ Dropshipping API configuration
  cjConfig: {
    apiKey: process.env.CJ_API_KEY,
    getHeaders() {
      return {
        'Content-Type': 'application/json',
        'CJ-Access-Token': this.apiKey
      };
    }
  },

  // Get products from CJ Dropshipping
  getCJProducts: async (req, res) => {
    try {
      const { page = 1, limit = 20, categoryId, search } = req.query;
      
      const response = await axios.post(
        `${CJ_SUPPLIER_API.baseURL}${CJ_SUPPLIER_API.endpoints.products}`,
        {
          pageNum: parseInt(page),
          pageSize: parseInt(limit),
          categoryId: categoryId || undefined,
          productName: search || undefined
        },
        { headers: cjSupplierController.cjConfig.getHeaders() }
      );

      if (response.data.code === 200) {
        const products = response.data.data.map(product => ({
          id: product.pid,
          sku: product.sku,
          title: product.productName,
          description: product.description,
          images: product.images,
          price: product.price,
          originalPrice: product.originalPrice,
          category: product.categoryName,
          categoryId: product.categoryId,
          variants: product.variants,
          warehouse: product.warehouse,
          supplier: 'CJ Dropshipping',
          isActive: product.status === 1,
          stock: product.stock,
          minOrder: product.minOrder,
          weight: product.weight,
          dimensions: product.dimensions
        }));

        res.status(200).json({
          success: true,
          data: products,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: response.data.total,
            totalPages: Math.ceil(response.data.total / limit)
          }
        });
      } else {
        throw new Error(response.data.msg || 'Failed to fetch products');
      }

    } catch (error) {
      console.error('CJ Products Error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products from supplier',
        error: error.response?.data?.msg || error.message
      });
    }
  },

  // Get single product details
  getCJProductDetail: async (req, res) => {
    try {
      const { productId } = req.params;

      const response = await axios.post(
        `${CJ_SUPPLIER_API.baseURL}${CJ_SUPPLIER_API.endpoints.productDetail}`,
        {
          pid: productId
        },
        { headers: cjSupplierController.cjConfig.getHeaders() }
      );

      if (response.data.code === 200) {
        const product = response.data.data;
        
        const productDetail = {
          id: product.pid,
          sku: product.sku,
          title: product.productName,
          description: product.description,
          images: product.images,
          price: product.price,
          originalPrice: product.originalPrice,
          category: product.categoryName,
          variants: product.variants,
          warehouse: product.warehouse,
          supplier: 'CJ Dropshipping',
          specifications: product.specifications,
          shipping: product.shipping,
          weight: product.weight,
          dimensions: product.dimensions,
          video: product.videoUrl,
          minOrder: product.minOrder,
          stock: product.stock,
          isActive: product.status === 1
        };

        res.status(200).json({
          success: true,
          data: productDetail
        });
      } else {
        throw new Error(response.data.msg || 'Product not found');
      }

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product details',
        error: error.response?.data?.msg || error.message
      });
    }
  },

  // Get categories from CJ
  getCJCategories: async (req, res) => {
    try {
      const response = await axios.post(
        `${CJ_SUPPLIER_API.baseURL}${CJ_SUPPLIER_API.endpoints.categories}`,
        {},
        { headers: cjSupplierController.cjConfig.getHeaders() }
      );

      if (response.data.code === 200) {
        const categories = response.data.data.map(cat => ({
          id: cat.id,
          name: cat.categoryName,
          level: cat.level,
          parentId: cat.parentId,
          productCount: cat.productCount,
          image: cat.image
        }));

        res.status(200).json({
          success: true,
          data: categories
        });
      } else {
        throw new Error(response.data.msg || 'Failed to fetch categories');
      }

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.response?.data?.msg || error.message
      });
    }
  },

  // Calculate shipping cost
  calculateShipping: async (req, res) => {
    try {
      const { products, countryCode, postalCode } = req.body;

      const shippingRequest = {
        countryCode: countryCode,
        postalCode: postalCode,
        products: products.map(product => ({
          pid: product.productId,
          quantity: product.quantity,
          sellingPrice: product.price,
          variantId: product.variantId
        }))
      };

      const response = await axios.post(
        `${CJ_SUPPLIER_API.baseURL}${CJ_SUPPLIER_API.endpoints.shipping}`,
        shippingRequest,
        { headers: cjSupplierController.cjConfig.getHeaders() }
      );

      if (response.data.code === 200) {
        res.status(200).json({
          success: true,
          data: response.data.data
        });
      } else {
        throw new Error(response.data.msg || 'Shipping calculation failed');
      }

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Shipping calculation failed',
        error: error.response?.data?.msg || error.message
      });
    }
  },

  // Create order with CJ Dropshipping
  createCJOrder: async (req, res) => {
    try {
      const { 
        products, 
        shippingAddress, 
        billingAddress, 
        paymentMethod,
        customerNotes 
      } = req.body;

      // Prepare order for CJ
      const cjOrder = {
        products: products.map(product => ({
          pid: product.productId,
          quantity: product.quantity,
          sellingPrice: product.price,
          variantId: product.variantId,
          productName: product.name,
          productImage: product.image
        })),
        shippingInfo: {
          countryCode: shippingAddress.countryCode,
          state: shippingAddress.state,
          city: shippingAddress.city,
          address: shippingAddress.address,
          zipCode: shippingAddress.zipCode,
          phone: shippingAddress.phone,
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          email: shippingAddress.email
        },
        customerNotes: customerNotes,
        paymentMethod: paymentMethod
      };

      const response = await axios.post(
        `${CJ_SUPPLIER_API.baseURL}${CJ_SUPPLIER_API.endpoints.createOrder}`,
        cjOrder,
        { headers: cjSupplierController.cjConfig.getHeaders() }
      );

      if (response.data.code === 200) {
        const orderData = response.data.data;
        
        res.status(201).json({
          success: true,
          data: {
            orderId: orderData.orderId,
            cjOrderId: orderData.cjOrderId,
            totalAmount: orderData.totalAmount,
            shippingCost: orderData.shippingCost,
            estimatedDelivery: orderData.estimatedDelivery,
            trackingNumber: orderData.trackingNumber
          },
          message: 'Order created successfully with CJ Dropshipping'
        });
      } else {
        throw new Error(response.data.msg || 'Order creation failed');
      }

    } catch (error) {
      console.error('CJ Order Error:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to create order with supplier',
        error: error.response?.data?.msg || error.message
      });
    }
  },

  // Track CJ order
  trackCJOrder: async (req, res) => {
    try {
      const { orderId } = req.params;

      const response = await axios.post(
        `${CJ_SUPPLIER_API.baseURL}${CJ_SUPPLIER_API.endpoints.trackOrder}`,
        {
          orderId: orderId
        },
        { headers: cjSupplierController.cjConfig.getHeaders() }
      );

      if (response.data.code === 200) {
        res.status(200).json({
          success: true,
          data: response.data.data
        });
      } else {
        throw new Error(response.data.msg || 'Order tracking failed');
      }

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to track order',
        error: error.response?.data?.msg || error.message
      });
    }
  },

  // Sync CJ products to local database
  syncCJProducts: async (req, res) => {
    try {
      const { categoryId, limit = 50 } = req.body;
      
      // Fetch products from CJ
      const cjResponse = await axios.post(
        `${CJ_SUPPLIER_API.baseURL}${CJ_SUPPLIER_API.endpoints.products}`,
        {
          pageNum: 1,
          pageSize: limit,
          categoryId: categoryId || undefined
        },
        { headers: cjSupplierController.cjConfig.getHeaders() }
      );

      if (cjResponse.data.code !== 200) {
        throw new Error(cjResponse.data.msg || 'Failed to sync products');
      }

      const cjProducts = cjResponse.data.data;
      const db = admin.firestore();
      const batch = db.batch();

      // Sync to Firestore
      const syncResults = {
        success: 0,
        failed: 0,
        products: []
      };

      for (const cjProduct of cjProducts) {
        try {
          const productRef = db.collection('products').doc(`CJ_${cjProduct.pid}`);
          
          const productData = {
            id: `CJ_${cjProduct.pid}`,
            sku: cjProduct.sku,
            title: cjProduct.productName,
            description: cjProduct.description,
            images: cjProduct.images,
            price: parseFloat(cjProduct.price),
            originalPrice: parseFloat(cjProduct.originalPrice),
            category: cjProduct.categoryName,
            categoryId: cjProduct.categoryId,
            variants: cjProduct.variants,
            supplier: 'CJ Dropshipping',
            supplierId: cjProduct.pid,
            isActive: cjProduct.status === 1,
            stock: cjProduct.stock,
            minOrder: cjProduct.minOrder,
            weight: cjProduct.weight,
            dimensions: cjProduct.dimensions,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          batch.set(productRef, productData);
          syncResults.success++;
          syncResults.products.push(productData);

        } catch (productError) {
          console.error(`Failed to sync product ${cjProduct.pid}:`, productError);
          syncResults.failed++;
        }
      }

      // Commit batch
      await batch.commit();

      res.status(200).json({
        success: true,
        data: syncResults,
        message: `Synced ${syncResults.success} products from CJ Dropshipping`
      });

    } catch (error) {
      console.error('CJ Sync Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync products',
        error: error.response?.data?.msg || error.message
      });
    }
  },

  // Get supplier statistics
  getSupplierStats: async (req, res) => {
    try {
      // Mock stats - in real scenario, calculate from orders
      const stats = {
        totalProducts: 0,
        activeProducts: 0,
        totalOrders: 0,
        successRate: 98.5,
        averageShippingTime: '15-25 days',
        supplierRating: 4.7,
        supportedCountries: 200,
        warehouses: ['China', 'USA', 'Europe']
      };

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supplier stats',
        error: error.message
      });
    }
  }
};

module.exports = cjSupplierController;