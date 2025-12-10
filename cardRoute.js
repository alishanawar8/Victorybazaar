const express = require('express');
const router = express.Router();
const cardController = require('../../controllers/cardController');

// Card Payment Routes
router.post('/create-payment-intent', cardController.createPaymentIntent);
router.post('/confirm-payment', cardController.confirmCardPayment);
router.post('/save-card', cardController.saveCardForFuture);
router.get('/saved-cards', cardController.getSavedCards);
router.delete('/saved-cards/:cardId', cardController.deleteSavedCard);

module.exports = router;