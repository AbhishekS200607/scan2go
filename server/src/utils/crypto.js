const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate cryptographically secure random token (64 hex chars)
 */
function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * SHA-256 Hash of string
 */
function hashToken(rawToken) {
  return crypto.createHmac('sha256', env.QR_SECRET).update(rawToken).digest('hex');
}

/**
 * Sign JWT auth token
 */
function signJwtToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

/**
 * Verify JWT token
 */
function verifyJwtToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateRandomToken,
  hashToken,
  signJwtToken,
  verifyJwtToken
};
