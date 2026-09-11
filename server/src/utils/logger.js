/**
 * Structured Logger for Scan2Go Express Server
 */
const logger = {
  info: (msg, meta = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, Object.keys(meta).length ? meta : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, Object.keys(meta).length ? meta : '');
  },
  error: (msg, error = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error.stack || error);
  },
  http: (req, res, durationMs) => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`);
  }
};

module.exports = logger;
