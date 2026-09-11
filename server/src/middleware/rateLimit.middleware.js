const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response');

/**
 * Tiered Rate Limiting Policies
 */

// 1. General API: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'Too many requests from this IP. Please try again later.', 429, 'TOO_MANY_REQUESTS');
  }
});

// 2. Login: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'Too many login attempts. Please wait 15 minutes before trying again.', 429, 'AUTH_RATE_LIMIT');
  }
});

// 3. Registration: 5 requests per hour
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'Registration limit reached for this IP. Please try again in an hour.', 429, 'REGISTER_RATE_LIMIT');
  }
});

// 4. Barcode Lookup: 100 requests per minute
const barcodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'Barcode scan rate limit exceeded.', 429, 'BARCODE_RATE_LIMIT');
  }
});

// 5. Security QR Verification: 20 requests per minute
const securityVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, 'Security verification rate limit exceeded.', 429, 'SECURITY_RATE_LIMIT');
  }
});

module.exports = {
  generalLimiter,
  loginLimiter,
  registerLimiter,
  barcodeLimiter,
  securityVerifyLimiter
};
