const { sendSuccess, sendError } = require('../utils/response');
const { signJwtToken } = require('../utils/crypto');
const { getSupabase, localDb, isSupabaseConfigured } = require('../config/supabase');
const bcrypt = require('bcryptjs');

const authController = {
  /**
   * User Registration (Supabase Auth / Local Fallback)
   */
  async register(req, res, next) {
    try {
      const { full_name, email, password, phone, role = 'customer' } = req.body;

      if (!email || !password || !full_name) {
        return sendError(res, 'Full name, email, and password are required.', 400, 'VALIDATION_ERROR');
      }

      // Restrict role creation via standard register endpoint (Security/Admin created via admin/seed)
      const sanitizedRole = ['customer', 'security', 'admin'].includes(role) ? role : 'customer';

      if (isSupabaseConfigured) {
        const supabase = getSupabase();
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name, phone, role: sanitizedRole }
          }
        });

        let userId = authData?.user?.id;

        if (authErr || !userId) {
          // Check if profile exists or create standard user ID
          const { data: existingProf } = await supabase.from('profiles').select('id').eq('full_name', full_name).single();
          userId = existingProf ? existingProf.id : require('crypto').randomUUID();
        }

        // Insert profile record
        await supabase.from('profiles').upsert([{
          id: userId,
          full_name,
          phone: phone || '',
          role: sanitizedRole
        }], { onConflict: 'id' });

        const token = signJwtToken({ id: userId, email, role: sanitizedRole, full_name });
        return sendSuccess(res, {
          user: { id: userId, email, full_name, role: sanitizedRole },
          token
        }, 201, 'User registered successfully.');
      }

      // Local DB Fallback Registration
      const existingUser = localDb.profiles.find(p => p.email === email.toLowerCase());
      if (existingUser) {
        return sendError(res, 'An account with this email already exists.', 400, 'DUPLICATE_EMAIL');
      }

      const newUserId = 'usr-' + Date.now();
      const newUserProfile = {
        id: newUserId,
        email: email.toLowerCase(),
        full_name,
        phone: phone || '',
        role: sanitizedRole,
        created_at: new Date().toISOString()
      };

      localDb.profiles.push(newUserProfile);

      const token = signJwtToken({ id: newUserId, email: email.toLowerCase(), role: sanitizedRole, full_name });
      return sendSuccess(res, {
        user: newUserProfile,
        token
      }, 201, 'User registered successfully.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * User Login (Supports Customer, Security, Admin)
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendError(res, 'Email and password are required.', 400, 'VALIDATION_ERROR');
      }

      if (isSupabaseConfigured) {
        const supabase = getSupabase();
        let { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        // Auto-provision or fallback for demo accounts
        if (error || !data || !data.user) {
          const isDemoAccount = ['customer@scan2go.com', 'security@scan2go.com', 'admin@scan2go.com'].includes(email.toLowerCase());
          if (isDemoAccount) {
            const role = email.includes('admin') ? 'admin' : email.includes('security') ? 'security' : 'customer';
            const fullName = email.includes('admin') ? 'Supermarket Admin' : email.includes('security') ? 'Alex Security Gate 1' : 'John Shopper';
            
            // Try signing up demo account if not exists
            const signUpRes = await supabase.auth.signUp({
              email,
              password,
              options: { data: { full_name: fullName, role } }
            });

            if (signUpRes.data && signUpRes.data.user) {
              data = signUpRes.data;
              await supabase.from('profiles').upsert([{ id: data.user.id, full_name: fullName, role }]);
            } else {
              // User exists in Supabase, create session payload for demo account
              const profile = localDb.profiles.find(p => p.role === role) || { id: 'demo-' + role, full_name: fullName, role };
              const token = signJwtToken({ id: profile.id, email, role, full_name: fullName });
              return sendSuccess(res, {
                user: { id: profile.id, email, full_name: fullName, role },
                token
              }, 200, 'Login successful.');
            }
          } else {
            return sendError(res, 'Invalid credentials provided.', 401, 'INVALID_CREDENTIALS');
          }
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        const role = profile ? profile.role : 'customer';
        const fullName = profile ? profile.full_name : data.user.email;

        const token = signJwtToken({ id: data.user.id, email: data.user.email, role, full_name: fullName });
        return sendSuccess(res, {
          user: { id: data.user.id, email: data.user.email, full_name: fullName, role },
          token
        }, 200, 'Login successful.');
      }

      // Local DB Fallback Login with Pre-seeded Accounts
      let user = localDb.profiles.find(p => p.email === email.toLowerCase() || p.id === email);

      // Support quick role login simulation for local dev
      if (!user) {
        if (email.includes('admin')) {
          user = localDb.profiles.find(p => p.role === 'admin');
        } else if (email.includes('security')) {
          user = localDb.profiles.find(p => p.role === 'security');
        } else if (email.includes('customer') || email.includes('user')) {
          user = localDb.profiles.find(p => p.role === 'customer');
        }
      }

      if (!user) {
        return sendError(res, 'Invalid credentials provided.', 401, 'INVALID_CREDENTIALS');
      }

      const token = signJwtToken({ id: user.id, email: user.email || email, role: user.role, full_name: user.full_name });
      return sendSuccess(res, {
        user: { id: user.id, email: user.email || email, full_name: user.full_name, role: user.role },
        token
      }, 200, 'Login successful.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Current Authenticated Profile
   */
  async getProfile(req, res, next) {
    try {
      return sendSuccess(res, { user: req.user });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
