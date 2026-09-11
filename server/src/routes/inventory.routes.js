const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/overview', inventoryController.getOverview);
router.post('/adjust', inventoryController.adjustStock);
router.get('/movements', inventoryController.getMovements);

module.exports = router;
