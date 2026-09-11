const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { barcodeLimiter } = require('../middleware/rateLimit.middleware');

router.get('/categories', productController.getCategories);
router.get('/barcode/:barcode', barcodeLimiter, productController.getProductByBarcode);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

module.exports = router;
