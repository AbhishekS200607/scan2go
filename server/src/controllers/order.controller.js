const orderService = require('../services/order.service');
const { sendSuccess, sendError } = require('../utils/response');

const orderController = {
  async createOrder(req, res, next) {
    try {
      const order = await orderService.createOrderFromCart(req.user.id);
      return sendSuccess(res, order, 201, 'Order created successfully.');
    } catch (err) {
      if (err.code === 'EMPTY_CART' || err.code === 'INSUFFICIENT_STOCK' || err.code === 'PRODUCT_UNAVAILABLE') {
        return sendError(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  },

  async getUserOrders(req, res, next) {
    try {
      const orders = await orderService.getUserOrders(req.user.id);
      return sendSuccess(res, orders);
    } catch (err) {
      next(err);
    }
  },

  async getOrderById(req, res, next) {
    try {
      const isPrivileged = ['admin', 'security'].includes(req.user.role);
      const order = await orderService.getOrderById(req.params.id, req.user.id, isPrivileged);
      if (!order) {
        return sendError(res, 'Order not found.', 404, 'ORDER_NOT_FOUND');
      }
      return sendSuccess(res, order);
    } catch (err) {
      if (err.code === 'FORBIDDEN_ORDER_ACCESS') {
        return sendError(res, err.message, 403, 'FORBIDDEN');
      }
      next(err);
    }
  }
};

module.exports = orderController;
