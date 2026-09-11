const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

/**
 * Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  logger.error(`Unhandled Exception at ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred.';
  const errorCode = err.code || 'SERVER_ERROR';

  return sendError(res, message, statusCode, errorCode, err);
}

module.exports = {
  errorHandler
};
