const express = require('express');
const {
    createDepositPayment,
    createRemainingPayment,
    getPaymentHistory,
    handleStripeWebhook,
    createRefund,
} = require('../controllers/payment.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Webhook route (must be before body parser in app.js, handled separately there usually, 
// but here we define the route. Note: In server.js we need to ensure raw body for this specific route)
router.post('/webhook', handleStripeWebhook);

router.use(protect);

router.post('/deposit', createDepositPayment);
router.post('/confirm', createRemainingPayment);
router.get('/history', getPaymentHistory);
router.post('/:id/refund', restrictTo('admin'), createRefund);

module.exports = router;
