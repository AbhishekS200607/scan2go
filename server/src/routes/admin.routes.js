const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/dashboard', adminController.getDashboardMetrics);
router.get('/customers', adminController.getCustomers);
router.get('/orders', adminController.getAllOrders);

// Admin Product Management Endpoints
router.post('/products', productController.createProduct);
router.patch('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deactivateProduct);

module.exports = router;
