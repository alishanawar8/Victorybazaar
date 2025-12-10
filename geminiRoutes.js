const express = require('express');
const router = express.Router();
const geminiController = require('../controllers/geminiController');

// POST /api/gemini/recommend - Product recommendations
router.post('/recommend', geminiController.getProductRecommendations);

// POST /api/gemini/search - AI-powered search
router.post('/search', geminiController.aiProductSearch);

// POST /api/gemini/analyze-image - AI Lens image analysis
router.post('/analyze-image', geminiController.analyzeProductImage);

// POST /api/gemini/size-recommendation - Size & fit help
router.post('/size-recommendation', geminiController.getSizeRecommendation);

// POST /api/gemini/chat - Chat with Victory AI
router.post('/chat', geminiController.chatWithAI);

module.exports = router;