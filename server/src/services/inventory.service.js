const { getSupabase, localDb, isSupabaseConfigured } = require('../config/supabase');
const productService = require('./product.service');

const inventoryService = {
  /**
   * Get Inventory Summary & Low-Stock / Out-Of-Stock Alerts
   */
  async getInventoryOverview() {
    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { data: products, error } = await supabase.from('products').select('*');
      if (error) throw error;

      const totalProducts = products.length;
      const totalUnits = products.reduce((acc, p) => acc + p.stock_quantity, 0);
      const lowStockProducts = products.filter(p => p.active && p.stock_quantity > 0 && p.stock_quantity <= p.minimum_stock);
      const outOfStockProducts = products.filter(p => p.active && p.stock_quantity === 0);

      return {
        total_products: totalProducts,
        total_units: totalUnits,
        low_stock_count: lowStockProducts.length,
        out_of_stock_count: outOfStockProducts.length,
        low_stock_items: lowStockProducts,
        out_of_stock_items: outOfStockProducts
      };
    }

    const products = localDb.products;
    const totalProducts = products.length;
    const totalUnits = products.reduce((acc, p) => acc + p.stock_quantity, 0);
    const lowStockProducts = products.filter(p => p.active && p.stock_quantity > 0 && p.stock_quantity <= p.minimum_stock);
    const outOfStockProducts = products.filter(p => p.active && p.stock_quantity === 0);

    return {
      total_products: totalProducts,
      total_units: totalUnits,
      low_stock_count: lowStockProducts.length,
      out_of_stock_count: outOfStockProducts.length,
      low_stock_items: lowStockProducts,
      out_of_stock_items: outOfStockProducts
    };
  },

  /**
   * Adjust Stock for a Product (Manual Admin Adjustment)
   * Creates mandatory Inventory Movement Record
   */
  async adjustStock(productId, { quantity, action = 'add', reason = 'Manual Stock Adjustment' }, performedByUserId) {
    const product = await productService.getProductById(productId);
    if (!product) {
      const err = new Error('Product not found.');
      err.statusCode = 404;
      err.code = 'PRODUCT_NOT_FOUND';
      throw err;
    }

    const qtyNumber = parseInt(quantity, 10);
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      const err = new Error('Quantity must be a positive integer.');
      err.statusCode = 400;
      err.code = 'INVALID_QUANTITY';
      throw err;
    }

    const changeQty = action === 'remove' ? -qtyNumber : qtyNumber;
    const previousQty = product.stock_quantity;
    const newQty = Math.max(0, previousQty + changeQty);

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      await supabase.from('products').update({ stock_quantity: newQty, updated_at: new Date().toISOString() }).eq('id', productId);

      const movement = {
        id: require('crypto').randomUUID(),
        product_id: productId,
        previous_quantity: previousQty,
        change_quantity: changeQty,
        new_quantity: newQty,
        reason: reason.trim(),
        reference_type: 'STOCK_ADJUSTMENT',
        performed_by: performedByUserId
      };
      await supabase.from('inventory_movements').insert([movement]);
    } else {
      const prod = localDb.products.find(p => p.id === productId);
      if (prod) {
        prod.stock_quantity = newQty;
        prod.updated_at = new Date().toISOString();
      }

      localDb.inventory_movements.unshift({
        id: 'inv-' + Date.now() + Math.random().toString(36).substring(2, 5),
        product_id: productId,
        previous_quantity: previousQty,
        change_quantity: changeQty,
        new_quantity: newQty,
        reason: reason.trim(),
        reference_type: 'STOCK_ADJUSTMENT',
        performed_by: performedByUserId,
        created_at: new Date().toISOString()
      });
    }

    return productService.getProductById(productId);
  },

  /**
   * Get Inventory Movement Audit Logs
   */
  async getInventoryMovements({ productId, page = 1, limit = 20 }) {
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      let query = supabase
        .from('inventory_movements')
        .select('*, products(name, barcode), profiles(full_name)', { count: 'exact' });

      if (productId) query = query.eq('product_id', productId);

      query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);
      const { data, count, error } = await query;
      if (error) throw error;

      return {
        movements: data,
        total: count,
        page: pageNum,
        totalPages: Math.ceil(count / limitNum)
      };
    }

    let list = localDb.inventory_movements;
    if (productId) list = list.filter(m => m.product_id === productId);

    const formatted = list.map(m => {
      const p = localDb.products.find(prod => prod.id === m.product_id);
      const user = localDb.profiles.find(u => u.id === m.performed_by);
      return {
        ...m,
        products: p ? { name: p.name, barcode: p.barcode } : null,
        profiles: user ? { full_name: user.full_name } : null
      };
    });

    const total = formatted.length;
    const paginated = formatted.slice(offset, offset + limitNum);

    return {
      movements: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    };
  }
};

module.exports = inventoryService;
