const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.post('/verify', paymentController.processPayment);
router.post('/create', paymentController.processPayment);

module.exports = router;
