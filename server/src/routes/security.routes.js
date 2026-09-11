const express = require('express');
const router = express.Router();
const securityController = require('../controllers/security.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { securityVerifyLimiter } = require('../middleware/rateLimit.middleware');

router.use(requireAuth);
router.use(requireRole('security', 'admin'));

router.post('/verify', securityVerifyLimiter, securityController.verifyExitToken);
router.post('/exit', securityVerifyLimiter, securityController.verifyExitToken);
router.get('/logs', securityController.getLogs);

module.exports = router;
