const securityService = require('../services/security.service');
const { sendSuccess, sendError } = require('../utils/response');

const securityController = {
  /**
   * Scan & Verify Customer Exit QR Token (Security Staff Only)
   */
  async verifyExitToken(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) {
        return sendError(res, 'QR token is required.', 400, 'VALIDATION_ERROR');
      }

      const result = await securityService.verifyAndExitToken(token, req.user.id);
      if (!result.valid) {
        return sendSuccess(res, result, 200, 'Verification failed: ' + result.reason);
      }

      return sendSuccess(res, result, 200, 'Exit verified successfully.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Reject / Deny Exit Verification (Security Staff Override)
   */
  async rejectExitToken(req, res, next) {
    try {
      const { token, reason } = req.body;
      if (!token) {
        return sendError(res, 'QR token or Order Ref is required.', 400, 'VALIDATION_ERROR');
      }

      const result = await securityService.rejectExitToken(token, req.user.id, reason || 'REJECTED_BY_SECURITY');
      return sendSuccess(res, result, 200, 'Exit verification rejected.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Security Audit Logs
   */
  async getLogs(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const logs = await securityService.getSecurityLogs({ page, limit });
      return sendSuccess(res, logs);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = securityController;
