const paymentService = require('../services/payment.service');
const { sendSuccess, sendError } = require('../utils/response');

const paymentController = {
  async processPayment(req, res, next) {
    try {
      const { order_id, payment_method } = req.body;
      if (!order_id) {
        return sendError(res, 'order_id is required for payment.', 400, 'VALIDATION_ERROR');
      }

      const result = await paymentService.processOrderPayment(req.user.id, order_id, { payment_method });
      return sendSuccess(res, result, 200, 'Payment verified successfully.');
    } catch (err) {
      if (err.code === 'ALREADY_PAID' || err.code === 'ORDER_NOT_FOUND' || err.code === 'PAYMENT_FAILED') {
        return sendError(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  }
};

module.exports = paymentController;
