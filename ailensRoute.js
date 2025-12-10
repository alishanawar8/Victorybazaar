const express = require('express');
const router = express.Router();
const aiLensController = require('../controllers/aiLensController');

// POST /api/ai-lens/scan - Scan product from image
router.post('/scan', aiLensController.scanProduct);

// POST /api/ai-lens/upload - Upload and analyze image file
router.post('/upload', aiLensController.uploadAndAnalyze);

// POST /api/ai-lens/similar - Search similar products
router.post('/similar', aiLensController.searchSimilarProducts);

// POST /api/ai-lens/save-scan - Save scan history
router.post('/save-scan', aiLensController.saveScanHistory);

// GET /api/ai-lens/history/:userId - Get user scan history
router.get('/history/:userId', aiLensController.getScanHistory);

// POST /api/ai-lens/live-scan - Process live camera scan
router.post('/live-scan', aiLensController.processLiveScan);

module.exports = router;