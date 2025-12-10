const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const geminiController = {
  // Product recommendations
  getProductRecommendations: async (req, res) => {
    try {
      const { userQuery, budget, category, preferences } = req.body;
      
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        You are Victory Bazaar AI shopping assistant. Recommend products based on:
        User Query: ${userQuery}
        Budget: ${budget || 'Any'}
        Category: ${category || 'Any'}
        Preferences: ${preferences || 'None'}
        
        Provide 3-5 product recommendations with:
        1. Product name
        2. Key features
        3. Estimated price range
        4. Why it's suitable for user
        5. Alternative options
        
        Format response in JSON-like structure.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.status(200).json({
        success: true,
        data: text,
        message: 'Product recommendations generated successfully'
      });

    } catch (error) {
      console.error('Gemini AI Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating recommendations',
        error: error.message
      });
    }
  },

  // AI Product Search
  aiProductSearch: async (req, res) => {
    try {
      const { searchQuery, filters } = req.body;
      
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        As Victory Bazaar AI search assistant, analyze this search query and provide:
        Search: "${searchQuery}"
        Filters: ${JSON.stringify(filters || {})}
        
        Provide:
        1. Search intent analysis
        2. Best matching product categories
        3. Key features to look for
        4. Price range suggestions
        5. Related search terms
        
        Keep response concise and shopping-focused.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.status(200).json({
        success: true,
        data: text,
        query: searchQuery
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'AI search failed',
        error: error.message
      });
    }
  },

  // Image Analysis (AI Lens)
  analyzeProductImage: async (req, res) => {
    try {
      const { imageUrl, imageBase64 } = req.body;
      
      // For Gemini Pro Vision
      const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
      
      const prompt = `
        Analyze this product image and provide:
        1. Product identification
        2. Key features and specifications
        3. Estimated price range
        4. Similar product categories
        5. Shopping recommendations
        
        Be specific and helpful for online shopping.
      `;

      let imagePart;
      if (imageBase64) {
        imagePart = {
          inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg'
          }
        };
      }

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      res.status(200).json({
        success: true,
        data: text,
        type: 'image_analysis'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Image analysis failed',
        error: error.message
      });
    }
  },

  // Size & Fit Recommendation
  getSizeRecommendation: async (req, res) => {
    try {
      const { productType, userMeasurements, preferences } = req.body;
      
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        As a fashion expert for Victory Bazaar, provide size recommendations:
        Product Type: ${productType}
        User Measurements: ${JSON.stringify(userMeasurements)}
        Preferences: ${JSON.stringify(preferences || {})}
        
        Provide:
        1. Recommended size
        2. Fit guidance
        3. Brand-specific size notes
        4. Care instructions
        5. Alternative size options
        
        Be precise and helpful.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.status(200).json({
        success: true,
        data: text,
        productType: productType
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Size recommendation failed',
        error: error.message
      });
    }
  },

  // Chat with Victory AI
  chatWithAI: async (req, res) => {
    try {
      const { message, chatHistory = [] } = req.body;
      
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      // Build conversation context
      const context = `
        You are "Victory AI" - the shopping assistant for Victory Bazaar e-commerce platform.
        You help users with:
        - Product recommendations
        - Order tracking
        - Size and fit guidance
        - Price comparisons
        - Product information
        - Shopping advice
        
        Be friendly, helpful, and focused on shopping assistance.
        Current conversation history: ${JSON.stringify(chatHistory)}
        
        User Message: "${message}"
      `;

      const result = await model.generateContent(context);
      const response = await result.response;
      const text = response.text();

      res.status(200).json({
        success: true,
        data: text,
        message: message,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Chat failed',
        error: error.message
      });
    }
  }
};

module.exports = geminiController;