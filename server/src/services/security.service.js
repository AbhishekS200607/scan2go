const { getSupabase, localDb, isSupabaseConfigured } = require('../config/supabase');
const { hashToken } = require('../utils/crypto');
const orderService = require('./order.service');
const logger = require('../utils/logger');

const securityService = {
  /**
   * Verify QR Token & Complete Atomic Exit Gate
   */
  async verifyAndExitToken(rawToken, securityUserId) {
    if (!rawToken || typeof rawToken !== 'string') {
      return {
        valid: false,
        reason: 'INVALID_TOKEN',
        message: 'Invalid or missing QR token string.'
      };
    }

    const tokenHash = hashToken(rawToken.trim());

    // 1. If remote Supabase is configured, call atomic PostgreSQL RPC procedure `verify_and_exit_checkout_token`
    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      if (securityUserId) {
        await supabase.from('profiles').upsert([{ id: securityUserId, full_name: 'Alex Security Gate 1', role: 'security' }], { onConflict: 'id' });
      }
      const { data, error } = await supabase.rpc('verify_and_exit_checkout_token', {
        p_token_hash: tokenHash,
        p_security_user_id: securityUserId
      });
      if (error) throw error;
      return data;
    }

    // 2. Atomic Simulation for local DB fallback
    const token = localDb.checkout_tokens.find(t => t.token_hash === tokenHash);

    // Invalid Token
    if (!token) {
      this.logSecurityAttempt(null, securityUserId, 'INVALID_TOKEN', 'Token hash not found in database');
      return {
        valid: false,
        reason: 'INVALID_TOKEN',
        message: 'Invalid or unrecognised QR checkout token.'
      };
    }

    // Check Expiration
    if (new Date(token.expires_at) < new Date()) {
      token.status = 'EXPIRED';
      this.logSecurityAttempt(token.order_id, securityUserId, 'EXPIRED', 'Token expired at ' + token.expires_at);
      return {
        valid: false,
        reason: 'EXPIRED',
        message: 'Checkout QR pass has expired.'
      };
    }

    // Check if Already Used / Exited (Race Condition Protection)
    if (token.status === 'EXITED') {
      this.logSecurityAttempt(token.order_id, securityUserId, 'ALREADY_USED', 'Token status is already EXITED');
      return {
        valid: false,
        reason: 'QR_ALREADY_USED',
        message: 'This QR pass has already been verified and exited.'
      };
    }

    // Fetch order
    const order = localDb.orders.find(o => o.id === token.order_id);
    if (!order || (order.status !== 'PAID' && order.status !== 'VERIFIED')) {
      this.logSecurityAttempt(token ? token.order_id : null, securityUserId, 'PAYMENT_FAILED', 'Order status is ' + (order ? order.status : 'NOT_FOUND'));
      return {
        valid: false,
        reason: 'PAYMENT_NOT_COMPLETED',
        message: 'Payment for this order has not been completed.'
      };
    }

    // ATOMIC STATE CHANGE
    token.status = 'EXITED';
    token.verified_by = securityUserId;
    token.verified_at = token.verified_at || new Date().toISOString();
    token.exited_at = new Date().toISOString();

    order.status = 'EXITED';
    order.updated_at = new Date().toISOString();

    // Log Successful Verification
    this.logSecurityAttempt(order.id, securityUserId, 'VALID', 'Successful verification and exit');

    const items = localDb.order_items.filter(i => i.order_id === order.id).map(i => ({
      name: i.product_name_snapshot,
      barcode: i.barcode_snapshot,
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: i.line_total
    }));

    return {
      valid: true,
      status: 'EXITED',
      order_id: order.id,
      order_number: order.order_number,
      total: order.total_amount,
      items,
      verified_at: token.exited_at
    };
  },

  /**
   * Internal helper to record security audit logs
   */
  logSecurityAttempt(orderId, securityUserId, result, reason) {
    const log = {
      id: require('crypto').randomUUID(),
      order_id: orderId,
      security_user_id: securityUserId,
      result,
      reason,
      created_at: new Date().toISOString()
    };
    localDb.security_logs.unshift(log);
  },

  /**
   * Get Security Verification Audit Logs (Admin & Security Staff)
   */
  async getSecurityLogs({ page = 1, limit = 20 }) {
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { data, count, error } = await supabase
        .from('security_logs')
        .select('*, orders(order_number), profiles(full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);
      if (error) throw error;
      return {
        logs: data,
        total: count,
        page: pageNum,
        totalPages: Math.ceil(count / limitNum)
      };
    }

    const list = localDb.security_logs.map(log => {
      const ord = localDb.orders.find(o => o.id === log.order_id);
      const secUser = localDb.profiles.find(p => p.id === log.security_user_id);
      return {
        ...log,
        orders: ord ? { order_number: ord.order_number } : null,
        profiles: secUser ? { full_name: secUser.full_name } : null
      };
    });

    const total = list.length;
    const paginated = list.slice(offset, offset + limitNum);

    return {
      logs: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    };
  }
};

module.exports = securityService;
