const inventoryService = require('../services/inventory.service');
const { sendSuccess, sendError } = require('../utils/response');

const inventoryController = {
  async getOverview(req, res, next) {
    try {
      const overview = await inventoryService.getInventoryOverview();
      return sendSuccess(res, overview);
    } catch (err) {
      next(err);
    }
  },

  async adjustStock(req, res, next) {
    try {
      const { product_id, quantity, action, reason } = req.body;
      if (!product_id || !quantity) {
        return sendError(res, 'product_id and quantity are required.', 400, 'VALIDATION_ERROR');
      }

      const updated = await inventoryService.adjustStock(product_id, { quantity, action, reason }, req.user.id);
      return sendSuccess(res, updated, 200, 'Stock adjusted successfully.');
    } catch (err) {
      if (err.code === 'PRODUCT_NOT_FOUND' || err.code === 'INVALID_QUANTITY') {
        return sendError(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  },

  async getMovements(req, res, next) {
    try {
      const { product_id, page = 1, limit = 20 } = req.query;
      const data = await inventoryService.getInventoryMovements({ productId: product_id, page, limit });
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = inventoryController;
