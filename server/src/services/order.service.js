const { getSupabase, localDb, isSupabaseConfigured } = require('../config/supabase');
const cartService = require('./cart.service');
const productService = require('./product.service');

const orderService = {
  /**
   * Create pending order from user cart (Enforces Server-Authoritative Calculation)
   */
  async createOrderFromCart(userId) {
    const cart = await cartService.getCartByUserId(userId);
    if (!cart.items || cart.items.length === 0) {
      const err = new Error('Cart is empty. Please add items before checking out.');
      err.statusCode = 400;
      err.code = 'EMPTY_CART';
      throw err;
    }

    // 1. Verify live stock for all cart items
    for (const item of cart.items) {
      const product = await productService.getProductById(item.product_id);
      if (!product || !product.active) {
        const err = new Error(`Product '${item.name}' is no longer available.`);
        err.statusCode = 400;
        err.code = 'PRODUCT_UNAVAILABLE';
        throw err;
      }
      if (item.quantity > product.stock_quantity) {
        const err = new Error(`Stock for '${product.name}' has changed. Only ${product.stock_quantity} available.`);
        err.statusCode = 400;
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
      }
    }

    // 2. Generate unique order number
    const orderNumber = 'SG-' + Math.floor(100000 + Math.random() * 900000);
    const orderId = require('crypto').randomUUID();

    const newOrder = {
      id: orderId,
      order_number: orderNumber,
      user_id: userId,
      subtotal: cart.subtotal,
      tax_amount: cart.tax_amount,
      discount_amount: cart.discount_amount || 0.00,
      total_amount: cart.total_amount,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const orderItemSnapshots = cart.items.map(item => ({
      id: require('crypto').randomUUID(),
      order_id: orderId,
      product_id: item.product_id,
      product_name_snapshot: item.name,
      barcode_snapshot: item.barcode,
      unit_price: item.unit_price,
      tax_amount: item.line_tax,
      quantity: item.quantity,
      line_total: item.line_total,
      created_at: new Date().toISOString()
    }));

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { data: createdOrder, error: orderErr } = await supabase.from('orders').insert([newOrder]).select().single();
      if (orderErr) throw orderErr;

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemSnapshots);
      if (itemsErr) throw itemsErr;

      // Clear Cart after successful order creation
      await cartService.clearCart(userId);

      return this.getOrderById(createdOrder.id, userId, true);
    }

    // Local DB fallback
    localDb.orders.push(newOrder);
    localDb.order_items.push(...orderItemSnapshots);
    await cartService.clearCart(userId);

    return this.getOrderById(orderId, userId, true);
  },

  /**
   * Get Order by ID with IDOR Security Check
   */
  async getOrderById(orderId, requestingUserId, isPrivilegedRole = false) {
    let order = null;
    let items = [];
    let payment = null;
    let checkoutToken = null;

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const [orderRes, itemsRes, payRes, tokenRes] = await Promise.all([
        supabase.from('orders').select('*, profiles(full_name, phone)').eq('id', orderId).single(),
        supabase.from('order_items').select('*').eq('order_id', orderId),
        supabase.from('payments').select('*').eq('order_id', orderId).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('checkout_tokens').select('*').eq('order_id', orderId).single()
      ]);

      if (orderRes.error || !orderRes.data) return null;
      order = orderRes.data;
      items = itemsRes.data || [];
      payment = payRes.data || null;
      checkoutToken = tokenRes.data || null;
    } else {
      order = localDb.orders.find(o => o.id === orderId || o.order_number === orderId);
      if (!order) return null;

      items = localDb.order_items.filter(i => i.order_id === order.id);
      payment = localDb.payments.find(p => p.order_id === order.id) || null;
      checkoutToken = localDb.checkout_tokens.find(t => t.order_id === order.id) || null;

      const profile = localDb.profiles.find(p => p.id === order.user_id);
      order.profiles = profile ? { full_name: profile.full_name, phone: profile.phone } : null;
    }

    // IDOR Protection: User can only view their own order unless Admin or Security Staff
    if (!isPrivilegedRole && order.user_id !== requestingUserId) {
      const err = new Error('Access denied. You do not have permission to view this order.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN_ORDER_ACCESS';
      throw err;
    }

    return {
      ...order,
      items,
      payment,
      checkout_token: checkoutToken
    };
  },

  /**
   * Get Orders for a specific Customer
   */
  async getUserOrders(userId) {
    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), checkout_tokens(status, expires_at, raw_token)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(o => ({
        ...o,
        items: o.order_items || o.items || []
      }));
    }

    return localDb.orders
      .filter(o => o.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(o => {
        const token = localDb.checkout_tokens.find(t => t.order_id === o.id);
        const items = localDb.order_items.filter(i => i.order_id === o.id);
        return {
          ...o,
          items,
          order_items: items,
          checkout_tokens: token ? { status: token.status, expires_at: token.expires_at, raw_token: token.raw_token } : null
        };
      });
  },

  /**
   * Get All Orders (Admin Dashboard)
   */
  async getAllOrders({ status, page = 1, limit = 20 }) {
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      let query = supabase.from('orders').select('*, profiles(full_name, phone)', { count: 'exact' });

      if (status) query = query.eq('status', status);

      query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);
      const { data, count, error } = await query;
      if (error) throw error;

      return {
        orders: data,
        total: count,
        page: pageNum,
        totalPages: Math.ceil(count / limitNum)
      };
    }

    let list = localDb.orders;
    if (status) list = list.filter(o => o.status === status);
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = list.length;
    const paginated = list.slice(offset, offset + limitNum).map(o => {
      const p = localDb.profiles.find(pr => pr.id === o.user_id);
      return { ...o, profiles: p ? { full_name: p.full_name, phone: p.phone } : null };
    });

    return {
      orders: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    };
  }
};

module.exports = orderService;
