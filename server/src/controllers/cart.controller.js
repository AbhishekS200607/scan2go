const cartService = require('../services/cart.service');
const { sendSuccess, sendError } = require('../utils/response');

const cartController = {
  async getCart(req, res, next) {
    try {
      const cart = await cartService.getCartByUserId(req.user.id);
      return sendSuccess(res, cart);
    } catch (err) {
      next(err);
    }
  },

  async addItem(req, res, next) {
    try {
      const { product_id, barcode, quantity } = req.body;
      const cart = await cartService.addItem(req.user.id, { product_id, barcode, quantity });
      return sendSuccess(res, cart, 200, 'Item added to cart.');
    } catch (err) {
      if (err.code === 'INSUFFICIENT_STOCK' || err.code === 'PRODUCT_NOT_FOUND') {
        return sendError(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  },

  async updateItemQuantity(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      const cart = await cartService.updateItemQuantity(req.user.id, id, quantity);
      return sendSuccess(res, cart, 200, 'Cart item updated.');
    } catch (err) {
      if (err.code === 'INSUFFICIENT_STOCK' || err.code === 'CART_ITEM_NOT_FOUND') {
        return sendError(res, err.message, err.statusCode || 400, err.code);
      }
      next(err);
    }
  },

  async removeItem(req, res, next) {
    try {
      const { id } = req.params;
      const cart = await cartService.removeItem(req.user.id, id);
      return sendSuccess(res, cart, 200, 'Item removed from cart.');
    } catch (err) {
      next(err);
    }
  },

  async clearCart(req, res, next) {
    try {
      const cart = await cartService.clearCart(req.user.id);
      return sendSuccess(res, cart, 200, 'Cart cleared.');
    } catch (err) {
      next(err);
    }
  }
};

module.exports = cartController;
