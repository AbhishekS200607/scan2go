/**
 * Standard API Response Handlers
 */
function sendSuccess(res, data = {}, statusCode = 200, message = null) {
  const payload = {
    success: true,
    data
  };
  if (message) payload.message = message;
  return res.status(statusCode).json(payload);
}

function sendError(res, message = 'Internal Server Error', statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
  const payload = {
    success: false,
    error: {
      code: errorCode,
      message
    }
  };
  if (details && process.env.NODE_ENV !== 'production') {
    payload.error.details = details;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  sendSuccess,
  sendError
};
