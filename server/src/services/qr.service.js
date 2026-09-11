const { getSupabase, localDb, isSupabaseConfigured } = require('../config/supabase');
const { generateRandomToken, hashToken } = require('../utils/crypto');

const qrService = {
  /**
   * Generate Cryptographically Secure Checkout Token for Paid Order
   * Token expires in 15 minutes by default.
   */
  async generateCheckoutToken(orderId, expiryMinutes = 15) {
    // 1. Generate unguessable 64-character hex token string
    const rawToken = generateRandomToken(32);
    // 2. Hash raw token for safe DB storage
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const tokenRecord = {
      id: require('crypto').randomUUID(),
      order_id: orderId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      // Remove any existing active token for this order
      await supabase.from('checkout_tokens').delete().eq('order_id', orderId);
      const { error } = await supabase.from('checkout_tokens').insert([tokenRecord]);
      if (error) throw error;
    } else {
      localDb.checkout_tokens = localDb.checkout_tokens.filter(t => t.order_id !== orderId);
      localDb.checkout_tokens.push(tokenRecord);
    }

    return {
      raw_token: rawToken,
      expires_at: expiresAt,
      status: 'ACTIVE'
    };
  },

  /**
   * Get active QR Token details by Raw Token String
   */
  async getTokenByRawString(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return null;
    const tokenHash = hashToken(rawToken);

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('checkout_tokens').select('*').eq('token_hash', tokenHash).single();
      if (error || !data) return null;
      return data;
    }

    return localDb.checkout_tokens.find(t => t.token_hash === tokenHash) || null;
  }
};

module.exports = qrService;
