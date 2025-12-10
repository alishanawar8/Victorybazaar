const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getFirestore } = require('../config/firebaseConfig');
const admin = require('firebase-admin');

const db = getFirestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const aiLensController = {
  // Scan product from image
  scanProduct: async (req, res) => {
    try {
      const { imageBase64, imageType = 'jpeg' } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          message: 'Image data is required'
        });
      }

      // Use Gemini Pro Vision for image analysis
      const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

      const prompt = `
        Analyze this product image for an e-commerce shopping platform. Provide detailed information in this exact JSON format:
        
        {
          "productName": "Identified product name",
          "category": "Main category (electronics, fashion, home, beauty, sports, books)",
          "brand": "Brand name if visible",
          "description": "Detailed product description",
          "estimatedPrice": {
            "min": 0,
            "max": 0,
            "currency": "INR"
          },
          "keyFeatures": ["feature1", "feature2", "feature3"],
          "specifications": {
            "color": "",
            "size": "",
            "material": "",
            "dimensions": ""
          },
          "similarProducts": ["similar product 1", "similar product 2"],
          "shoppingAdvice": "Practical shopping advice",
          "confidenceScore": 0.85
        }
        
        Be accurate and helpful for online shopping.
      `;

      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: `image/${imageType}`
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const analysisText = response.text();

      // Parse the JSON response from Gemini
      let productData;
      try {
        // Extract JSON from response (Gemini might add extra text)
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          productData = JSON.parse(jsonMatch[0]);
        } else {
          productData = JSON.parse(analysisText);
        }
      } catch (parseError) {
        // If JSON parsing fails, create structured data from text
        productData = {
          productName: "Product from Image",
          category: "general",
          description: analysisText,
          estimatedPrice: { min: 0, max: 0, currency: "INR" },
          keyFeatures: [],
          specifications: {},
          similarProducts: [],
          shoppingAdvice: "Visit Victory Bazaar for similar products",
          confidenceScore: 0.7
        };
      }

      // Search for similar products in database
      const similarProducts = await searchSimilarProducts(productData);

      res.status(200).json({
        success: true,
        data: {
          analysis: productData,
          similarProducts: similarProducts,
          scanId: admin.firestore().collection('scans').doc().id,
          timestamp: new Date().toISOString()
        },
        message: 'Product scanned successfully'
      });

    } catch (error) {
      console.error('AI Lens Scan Error:', error);
      res.status(500).json({
        success: false,
        message: 'Product scan failed',
        error: error.message
      });
    }
  },

  // Upload and analyze image file
  uploadAndAnalyze: async (req, res) => {
    try {
      // This would handle file uploads via multer or similar
      // For now, we'll use base64 from frontend
      res.status(200).json({
        success: true,
        message: 'Use the scan endpoint with base64 image data'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Image upload failed',
        error: error.message
      });
    }
  },

  // Search similar products based on AI analysis
  searchSimilarProducts: async (req, res) => {
    try {
      const { category, productName, features, maxPrice } = req.body;
      
      let query = db.collection('products').where('isActive', '==', true);
      
      if (category && category !== 'general') {
        query = query.where('category', '==', category.toLowerCase());
      }
      
      if (maxPrice) {
        query = query.where('price', '<=', parseInt(maxPrice));
      }

      const snapshot = await query.get();
      const products = [];
      
      snapshot.forEach(doc => {
        products.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Simple keyword matching for similarity
      const similarProducts = products.filter(product => {
        const productText = `${product.title} ${product.description} ${product.category}`.toLowerCase();
        const searchText = `${productName} ${features.join(' ')}`.toLowerCase();
        
        return searchText.split(' ').some(word => 
          productText.includes(word.toLowerCase()) && word.length > 3
        );
      }).slice(0, 10); // Limit to 10 products

      res.status(200).json({
        success: true,
        data: similarProducts,
        count: similarProducts.length
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Similar products search failed',
        error: error.message
      });
    }
  },

  // Save scan history for user
  saveScanHistory: async (req, res) => {
    try {
      const { userId, scanData, imageUrl, productMatches } = req.body;
      
      const scanRef = await db.collection('scanHistory').add({
        userId: userId,
        scanData: scanData,
        imageUrl: imageUrl,
        productMatches: productMatches || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        message: 'Scan history saved',
        scanId: scanRef.id
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to save scan history',
        error: error.message
      });
    }
  },

  // Get user's scan history
  getScanHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      
      const snapshot = await db.collection('scanHistory')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const scans = [];
      snapshot.forEach(doc => {
        scans.push({
          id: doc.id,
          ...doc.data()
        });
      });

      res.status(200).json({
        success: true,
        data: scans,
        count: scans.length
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch scan history',
        error: error.message
      });
    }
  },

  // Live camera scan (WebRTC integration)
  processLiveScan: async (req, res) => {
    try {
      const { videoFrame, scanType = 'product' } = req.body;
      
      // For live camera, we'd process video frames
      // This is a simplified version using base64 frame
      const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

      const prompt = `
        Quickly identify the main object in this image frame for real-time product scanning.
        Respond with ONLY: PRODUCT|NOT_PRODUCT|UNKNOWN
        If PRODUCT, briefly describe what you see in 5 words or less.
      `;

      const imagePart = {
        inlineData: {
          data: videoFrame,
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const detection = response.text().trim();

      res.status(200).json({
        success: true,
        detection: detection,
        timestamp: new Date().toISOString(),
        isProduct: detection.startsWith('PRODUCT')
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Live scan processing failed',
        error: error.message
      });
    }
  }
};

// Helper function to search similar products
async function searchSimilarProducts(productData) {
  try {
    let query = admin.firestore().collection('products').where('isActive', '==', true);
    
    if (productData.category && productData.category !== 'general') {
      query = query.where('category', '==', productData.category.toLowerCase());
    }

    const snapshot = await query.limit(8).get();
    const products = [];
    
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return products;
  } catch (error) {
    console.error('Similar products search error:', error);
    return [];
  }
}

module.exports = aiLensController;