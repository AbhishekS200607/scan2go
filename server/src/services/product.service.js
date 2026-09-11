const { getSupabase, localDb, isSupabaseConfigured } = require('../config/supabase');
const logger = require('../utils/logger');

// Lightweight In-Memory TTL Cache (15s)
const CACHE_TTL_MS = 15000;
const productCache = {
  categories: null,
  categoriesTime: 0,
  barcodesMap: new Map(),
  defaultProducts: null,
  defaultProductsTime: 0,
  invalidate() {
    this.categories = null;
    this.categoriesTime = 0;
    this.barcodesMap.clear();
    this.defaultProducts = null;
    this.defaultProductsTime = 0;
  }
};

const productService = {
  /**
   * Get all active categories
   */
  async getCategories() {
    const now = Date.now();
    if (productCache.categories && (now - productCache.categoriesTime) < CACHE_TTL_MS) {
      return productCache.categories;
    }

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('categories').select('*').eq('active', true).order('name');
      if (error) throw error;
      productCache.categories = data;
      productCache.categoriesTime = now;
      return data;
    }
    
    const list = localDb.categories.filter(c => c.active);
    productCache.categories = list;
    productCache.categoriesTime = now;
    return list;
  },

  /**
   * Get products with optional category, search query, page & limit
   */
  async getProducts({ category_id, search, page = 1, limit = 20, active_only = true }) {
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * limitNum;
    const now = Date.now();

    const isDefaultQuery = !search && !category_id && pageNum === 1 && active_only;
    if (isDefaultQuery && productCache.defaultProducts && (now - productCache.defaultProductsTime) < CACHE_TTL_MS) {
      return productCache.defaultProducts;
    }

    let result = null;

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      let query = supabase.from('products').select('*, categories(name)', { count: 'exact' });

      if (active_only) query = query.eq('active', true);
      if (category_id) query = query.eq('category_id', category_id);
      if (search) {
        query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      query = query.order('name', { ascending: true }).range(offset, offset + limitNum - 1);
      const { data, count, error } = await query;
      if (error) throw error;

      result = {
        products: data,
        total: count,
        page: pageNum,
        totalPages: Math.ceil(count / limitNum)
      };
    } else {
      let list = localDb.products;
      if (active_only) list = list.filter(p => p.active);
      if (category_id) list = list.filter(p => p.category_id === category_id);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q) || p.sku.toLowerCase().includes(q));
      }

      const total = list.length;
      const paginated = list.slice(offset, offset + limitNum).map(p => {
        const cat = localDb.categories.find(c => c.id === p.category_id);
        return { ...p, categories: cat ? { name: cat.name } : null };
      });

      result = {
        products: paginated,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      };
    }

    if (isDefaultQuery) {
      productCache.defaultProducts = result;
      productCache.defaultProductsTime = now;
    }

    return result;
  },

  /**
   * Find single product by ID
   */
  async getProductById(id) {
    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('products').select('*, categories(name)').eq('id', id).single();
      if (error) return null;
      return data;
    }
    const prod = localDb.products.find(p => p.id === id);
    if (!prod) return null;
    const cat = localDb.categories.find(c => c.id === prod.category_id);
    return { ...prod, categories: cat ? { name: cat.name } : null };
  },

  /**
   * Find product by Barcode (EAN-13, EAN-8, UPC-A, Code 128)
   */
  async getProductByBarcode(barcode) {
    const cleanBarcode = barcode.trim();
    const now = Date.now();
    const cached = productCache.barcodesMap.get(cleanBarcode);
    if (cached && (now - cached.time) < CACHE_TTL_MS) {
      return cached.data;
    }

    let result = null;

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('products')
        .select('id, barcode, sku, name, description, price, tax_percent, image_url, stock_quantity, minimum_stock, active, category_id, categories(name)')
        .eq('barcode', cleanBarcode)
        .single();
      if (!error && data) {
        result = data;
      }
    } else {
      const prod = localDb.products.find(p => p.barcode === cleanBarcode);
      if (prod) {
        const cat = localDb.categories.find(c => c.id === prod.category_id);
        result = {
          id: prod.id,
          barcode: prod.barcode,
          sku: prod.sku,
          name: prod.name,
          description: prod.description,
          price: prod.price,
          tax_percent: prod.tax_percent,
          image_url: prod.image_url,
          stock_quantity: prod.stock_quantity,
          minimum_stock: prod.minimum_stock,
          active: prod.active,
          category_id: prod.category_id,
          categories: cat ? { name: cat.name } : null,
          stock_available: prod.stock_quantity > 0
        };
      }
    }

    if (result) {
      productCache.barcodesMap.set(cleanBarcode, { data: result, time: now });
    }
    return result;
  },

  /**
   * Create new product (Admin)
   */
  async createProduct(productData, performedByUserId) {
    const { barcode, sku, name, description, category_id, price, tax_percent = 0, image_url, minimum_stock = 5, stock_quantity = 0 } = productData;

    // Check duplicate barcode
    const existing = await this.getProductByBarcode(barcode);
    if (existing) {
      const err = new Error(`Product with barcode ${barcode} already exists.`);
      err.statusCode = 400;
      err.code = 'DUPLICATE_BARCODE';
      throw err;
    }

    const newProd = {
      id: require('crypto').randomUUID(),
      barcode: barcode.trim(),
      sku: sku ? sku.trim() : `SKU-${Date.now()}`,
      name: name.trim(),
      description: description || '',
      category_id: category_id || null,
      price: parseFloat(price),
      tax_percent: parseFloat(tax_percent),
      image_url: image_url || null,
      minimum_stock: parseInt(minimum_stock, 10),
      stock_quantity: parseInt(stock_quantity, 10),
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('products').insert([newProd]).select().single();
      if (error) throw error;
      productCache.invalidate();
      return data;
    }

    localDb.products.push(newProd);
    
    // Log initial inventory movement
    localDb.inventory_movements.push({
      id: 'inv-' + Date.now(),
      product_id: newProd.id,
      previous_quantity: 0,
      change_quantity: newProd.stock_quantity,
      new_quantity: newProd.stock_quantity,
      reason: 'Initial Product Creation',
      reference_type: 'INITIAL_SEED',
      performed_by: performedByUserId,
      created_at: new Date().toISOString()
    });

    productCache.invalidate();
    return newProd;
  },

  /**
   * Update Product (Admin)
   */
  async updateProduct(id, updateFields) {
    productCache.invalidate();
    if (isSupabaseConfigured) {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('products')
        .update({ ...updateFields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const index = localDb.products.findIndex(p => p.id === id);
    if (index === -1) return null;

    localDb.products[index] = {
      ...localDb.products[index],
      ...updateFields,
      updated_at: new Date().toISOString()
    };

    return localDb.products[index];
  },

  /**
   * Soft Deactivate Product (Admin - Never permanently hard delete referenced items)
   */
  async deactivateProduct(id) {
    return this.updateProduct(id, { active: false });
  }
};

module.exports = productService;
