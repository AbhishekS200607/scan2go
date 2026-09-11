const { getSupabase, localDb, isSupabaseConfigured } = require('../config/supabase');
const productService = require('./product.service');

const cartService = {
  /**
   * Get or create cart for user
   */
  async getCartByUserId(userId) {
    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      let { data: cart } = await supabase.from('carts').select('*').eq('user_id', userId).single();
      if (!cart) {
        // Ensure profile exists in Supabase profiles table
        await supabase.from('profiles').upsert([{ id: userId, full_name: 'Customer Shopper', role: 'customer' }], { onConflict: 'id' });
        const { data: newCart, error } = await supabase.from('carts').insert([{ user_id: userId }]).select().single();
        if (error) throw error;
        cart = newCart;
      }

      // Fetch cart items with product details in a single query
      const { data: items, error: itemsError } = await supabase
        .from('cart_items')
        .select('id, quantity, product_id, products(*)')
        .eq('cart_id', cart.id);

      if (itemsError) throw itemsError;

      return this.formatCartPayload(cart, items || []);
    }

    // Local DB fallback
    let cart = localDb.carts.find(c => c.user_id === userId);
    if (!cart) {
      cart = {
        id: 'cart-' + userId,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localDb.carts.push(cart);
    }

    const items = localDb.cart_items
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const prod = localDb.products.find(p => p.id === ci.product_id);
        return {
          id: ci.id,
          quantity: ci.quantity,
          product_id: ci.product_id,
          products: prod || null
        };
      });

    return this.formatCartPayload(cart, items);
  },

  /**
   * Helper to format server-side cart payload with exact subtotal and tax calculation
   */
  formatCartPayload(cart, items) {
    let subtotal = 0;
    let tax_amount = 0;

    const formattedItems = items
      .filter(item => item.products && item.products.active)
      .map(item => {
        const p = item.products;
        const unitPrice = parseFloat(p.price) || 0;
        const taxPct = parseFloat(p.tax_percent) || 0;
        const lineSubtotal = unitPrice * item.quantity;
        const lineTax = (lineSubtotal * taxPct) / 100;

        subtotal += lineSubtotal;
        tax_amount += lineTax;

        return {
          cart_item_id: item.id,
          product_id: p.id,
          name: p.name,
          barcode: p.barcode,
          image_url: p.image_url,
          unit_price: parseFloat(unitPrice.toFixed(2)),
          tax_percent: parseFloat(taxPct.toFixed(2)),
          stock_quantity: p.stock_quantity,
          quantity: item.quantity,
          line_subtotal: parseFloat(lineSubtotal.toFixed(2)),
          line_tax: parseFloat(lineTax.toFixed(2)),
          line_total: parseFloat((lineSubtotal + lineTax).toFixed(2))
        };
      });

    subtotal = parseFloat(subtotal.toFixed(2));
    tax_amount = parseFloat(tax_amount.toFixed(2));
    const total_amount = parseFloat((subtotal + tax_amount).toFixed(2));

    return {
      cart_id: cart.id,
      user_id: cart.user_id,
      items: formattedItems,
      total_items: formattedItems.reduce((acc, i) => acc + i.quantity, 0),
      subtotal,
      tax_amount,
      discount_amount: 0.00,
      total_amount
    };
  },

  /**
   * Add Product to Cart (Optimized for maximum speed)
   */
  async addItem(userId, { product_id, barcode, quantity = 1 }) {
    if (quantity <= 0) {
      const err = new Error('Quantity must be greater than zero.');
      err.statusCode = 400;
      err.code = 'INVALID_QUANTITY';
      throw err;
    }

    // Parallel fetch product and current cart
    const [product, currentCart] = await Promise.all([
      product_id ? productService.getProductById(product_id) : productService.getProductByBarcode(barcode),
      this.getCartByUserId(userId)
    ]);

    if (!product || !product.active) {
      const err = new Error('Product not found or currently unavailable.');
      err.statusCode = 404;
      err.code = 'PRODUCT_NOT_FOUND';
      throw err;
    }

    const existingItem = currentCart.items.find(i => i.product_id === product.id);
    const existingQty = existingItem ? existingItem.quantity : 0;
    const requestedTotalQty = existingQty + quantity;

    if (requestedTotalQty > product.stock_quantity) {
      const err = new Error(`Cannot add ${quantity} units. Only ${product.stock_quantity} units available in stock (${existingQty} already in cart).`);
      err.statusCode = 400;
      err.code = 'INSUFFICIENT_STOCK';
      throw err;
    }

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: requestedTotalQty, updated_at: new Date().toISOString() })
          .eq('id', existingItem.cart_item_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert([{ cart_id: currentCart.cart_id, product_id: product.id, quantity: requestedTotalQty }]);
        if (error) throw error;
      }
    } else {
      const existingInLocal = localDb.cart_items.find(ci => ci.cart_id === currentCart.cart_id && ci.product_id === product.id);
      if (existingInLocal) {
        existingInLocal.quantity = requestedTotalQty;
        existingInLocal.updated_at = new Date().toISOString();
      } else {
        localDb.cart_items.push({
          id: 'ci-' + Date.now(),
          cart_id: currentCart.cart_id,
          product_id: product.id,
          quantity: requestedTotalQty,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    return this.getCartByUserId(userId);
  },

  /**
   * Update Quantity of specific Cart Item
   */
  async updateItemQuantity(userId, itemId, newQuantity) {
    if (newQuantity <= 0) {
      return this.removeItem(userId, itemId);
    }

    const currentCart = await this.getCartByUserId(userId);
    const item = currentCart.items.find(i => i.cart_item_id === itemId || i.product_id === itemId);

    if (!item) {
      const err = new Error('Cart item not found.');
      err.statusCode = 404;
      err.code = 'CART_ITEM_NOT_FOUND';
      throw err;
    }

    if (newQuantity > item.stock_quantity) {
      const err = new Error(`Only ${item.stock_quantity} units available in stock.`);
      err.statusCode = 400;
      err.code = 'INSUFFICIENT_STOCK';
      throw err;
    }

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', item.cart_item_id);
      if (error) throw error;
    } else {
      const localItem = localDb.cart_items.find(ci => ci.id === item.cart_item_id || ci.product_id === item.product_id);
      if (localItem) {
        localItem.quantity = newQuantity;
        localItem.updated_at = new Date().toISOString();
      }
    }

    return this.getCartByUserId(userId);
  },

  /**
   * Remove item from Cart
   */
  async removeItem(userId, itemId) {
    const currentCart = await this.getCartByUserId(userId);
    const item = currentCart.items.find(i => i.cart_item_id === itemId || i.product_id === itemId);
    if (!item) return currentCart;

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { error } = await supabase.from('cart_items').delete().eq('id', item.cart_item_id);
      if (error) throw error;
    } else {
      localDb.cart_items = localDb.cart_items.filter(ci => ci.id !== item.cart_item_id && ci.product_id !== item.product_id);
    }

    return this.getCartByUserId(userId);
  },

  /**
   * Clear entire cart
   */
  async clearCart(userId) {
    const currentCart = await this.getCartByUserId(userId);

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { error } = await supabase.from('cart_items').delete().eq('cart_id', currentCart.cart_id);
      if (error) throw error;
    } else {
      localDb.cart_items = localDb.cart_items.filter(ci => ci.cart_id !== currentCart.cart_id);
    }

    return this.getCartByUserId(userId);
  }
};

module.exports = cartService;
