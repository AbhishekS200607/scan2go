const productService = require('../services/product.service');
const { sendSuccess, sendError } = require('../utils/response');

const productController = {
  async getCategories(req, res, next) {
    try {
      const categories = await productService.getCategories();
      return sendSuccess(res, categories);
    } catch (err) {
      next(err);
    }
  },

  async getProducts(req, res, next) {
    try {
      const { category_id, search, page = 1, limit = 20 } = req.query;
      const data = await productService.getProducts({ category_id, search, page, limit });
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getProductById(req, res, next) {
    try {
      const product = await productService.getProductById(req.params.id);
      if (!product) {
        return sendError(res, 'Product not found.', 404, 'PRODUCT_NOT_FOUND');
      }
      return sendSuccess(res, product);
    } catch (err) {
      next(err);
    }
  },

  async getProductByBarcode(req, res, next) {
    try {
      const { barcode } = req.params;
      const product = await productService.getProductByBarcode(barcode);
      if (!product) {
        return sendError(res, `No product found matching barcode ${barcode}.`, 404, 'PRODUCT_NOT_FOUND');
      }
      return sendSuccess(res, product);
    } catch (err) {
      next(err);
    }
  },

  async createProduct(req, res, next) {
    try {
      const product = await productService.createProduct(req.body, req.user.id);
      return sendSuccess(res, product, 201, 'Product created successfully.');
    } catch (err) {
      if (err.code === 'DUPLICATE_BARCODE') {
        return sendError(res, err.message, 400, 'DUPLICATE_BARCODE');
      }
      next(err);
    }
  },

  async updateProduct(req, res, next) {
    try {
      const updated = await productService.updateProduct(req.params.id, req.body);
      if (!updated) {
        return sendError(res, 'Product not found.', 404, 'PRODUCT_NOT_FOUND');
      }
      return sendSuccess(res, updated, 200, 'Product updated successfully.');
    } catch (err) {
      next(err);
    }
  },

  async deactivateProduct(req, res, next) {
    try {
      const deactivated = await productService.deactivateProduct(req.params.id);
      if (!deactivated) {
        return sendError(res, 'Product not found.', 404, 'PRODUCT_NOT_FOUND');
      }
      return sendSuccess(res, deactivated, 200, 'Product deactivated successfully.');
    } catch (err) {
      next(err);
    }
  }
};

module.exports = productController;
