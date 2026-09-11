const { verifyJwtToken } = require('../utils/crypto');
const { sendError } = require('../utils/response');
const { getSupabase, localDb } = require('../config/supabase');

/**
 * Authentication Middleware: Verifies Bearer JWT or Supabase Session token
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. Please log in.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7);
    
    // 1. First try verifying server JWT
    const decoded = verifyJwtToken(token);
    if (decoded && decoded.id && decoded.role) {
      req.user = decoded;
      return next();
    }

    // 2. Fallback to Supabase Auth token check if remote Supabase enabled
    const supabase = getSupabase();
    if (supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        // Fetch profile role from database
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        req.user = {
          id: user.id,
          email: user.email,
          role: profile ? profile.role : 'customer',
          full_name: profile ? profile.full_name : user.email
        };
        return next();
      }
    }

    // 3. Fallback to local user check in dev mode if token matches demo user id
    const profile = localDb.profiles.find(p => p.id === token);
    if (profile) {
      req.user = profile;
      return next();
    }

    return sendError(res, 'Invalid or expired authentication token.', 401, 'INVALID_TOKEN');
  } catch (error) {
    return sendError(res, 'Failed to authenticate user request.', 401, 'AUTH_ERROR', error.message);
  }
}

module.exports = {
  requireAuth
};
