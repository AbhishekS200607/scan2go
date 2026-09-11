const { sendError } = require('../utils/response');

/**
 * Role-Based Access Control Middleware (RBAC)
 * Enforces role authorization server-side
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required before checking authorization.', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
}

module.exports = {
  requireRole
};
