const { createClient } = require('@supabase/supabase-js');
const env = require('./env');
const logger = require('../utils/logger');
const crypto = require('crypto');

let supabaseClient = null;

const isSupabaseConfigured = Boolean(env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY));

if (isSupabaseConfigured) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  supabaseClient = createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false }
  });
  logger.info('Supabase client initialized successfully with remote URL:', { url: env.SUPABASE_URL });
} else {
  logger.warn('Supabase URL or Key not provided in .env. Initializing local database layer for development & testing.');
}

// ----------------------------------------------------------------------------
// Local In-Memory Fallback DB Engine (Mirrors Supabase Postgres tables)
// ----------------------------------------------------------------------------
const localDb = {
  profiles: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Supermarket Admin',
      phone: '+1 800 555 0199',
      role: 'admin',
      created_at: new Date().toISOString()
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      full_name: 'Alex Security Gate 1',
      phone: '+1 800 555 0200',
      role: 'security',
      created_at: new Date().toISOString()
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      full_name: 'John Shopper',
      phone: '+1 800 555 0300',
      role: 'customer',
      created_at: new Date().toISOString()
    }
  ],
  categories: [
    { id: 'c0000000-0000-0000-0000-000000000001', name: 'Dairy & Eggs', description: 'Fresh milk, butter, cheese, yogurt and eggs', image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500', active: true },
    { id: 'c0000000-0000-0000-0000-000000000002', name: 'Bakery & Bread', description: 'Freshly baked artisanal breads, rolls, and pastries', image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500', active: true },
    { id: 'c0000000-0000-0000-0000-000000000003', name: 'Beverages', description: 'Refreshing juices, soft drinks, tea and coffee', image_url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=500', active: true },
    { id: 'c0000000-0000-0000-0000-000000000004', name: 'Snacks & Munchies', description: 'Chips, biscuits, nuts, chocolates and snacks', image_url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=500', active: true },
    { id: 'c0000000-0000-0000-0000-000000000005', name: 'Groceries & Staples', description: 'Rice, flour, pulses, spices, and cooking oils', image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500', active: true },
    { id: 'c0000000-0000-0000-0000-000000000006', name: 'Personal Care', description: 'Soaps, shampoos, toothpaste, skincare and hygiene', image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500', active: true },
    { id: 'c0000000-0000-0000-0000-000000000007', name: 'Household Essentials', description: 'Cleaning agents, detergents, tissues and accessories', image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500', active: true },
    { id: 'c0000000-0000-0000-0000-000000000008', name: 'Fruits & Vegetables', description: 'Farm fresh organic fruits and seasonal vegetables', image_url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500', active: true }
  ],
  products: [
    { id: 'f0000000-0000-0000-0000-000000000001', barcode: '8901234567890', sku: 'DAIRY-001', name: 'Farm Fresh Whole Milk 1L', description: 'Pasteurized fresh whole cow milk rich in calcium and vitamin D.', category_id: 'c0000000-0000-0000-0000-000000000001', price: 68.00, tax_percent: 5.00, image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500', minimum_stock: 10, stock_quantity: 45, active: true },
    { id: 'f0000000-0000-0000-0000-000000000002', barcode: '8901234567891', sku: 'DAIRY-002', name: 'Salted Creamery Butter 500g', description: 'Rich, creamy butter made from pure cow milk cream.', category_id: 'c0000000-0000-0000-0000-000000000001', price: 275.00, tax_percent: 5.00, image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500', minimum_stock: 5, stock_quantity: 20, active: true },
    { id: 'f0000000-0000-0000-0000-000000000003', barcode: '8901234567892', sku: 'DAIRY-003', name: 'Greek Style Plain Yogurt 400g', description: 'High protein, thick and delicious plain Greek yogurt.', category_id: 'c0000000-0000-0000-0000-000000000001', price: 120.00, tax_percent: 5.00, image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500', minimum_stock: 5, stock_quantity: 14, active: true },
    { id: 'f0000000-0000-0000-0000-000000000004', barcode: '8901234567893', sku: 'DAIRY-004', name: 'Farm Brown Eggs (Pack of 12)', description: 'Nutritious cage-free brown eggs packed with protein.', category_id: 'c0000000-0000-0000-0000-000000000001', price: 95.00, tax_percent: 0.00, image_url: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=500', minimum_stock: 8, stock_quantity: 30, active: true },
    { id: 'f0000000-0000-0000-0000-000000000005', barcode: '8901234567894', sku: 'BAK-001', name: 'Multi-Grain Whole Wheat Bread 400g', description: 'Soft whole grain bread rich in dietary fiber.', category_id: 'c0000000-0000-0000-0000-000000000002', price: 55.00, tax_percent: 0.00, image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500', minimum_stock: 6, stock_quantity: 8, active: true },
    { id: 'f0000000-0000-0000-0000-000000000006', barcode: '8901234567895', sku: 'BAK-002', name: 'French Butter Croissant (2 Pcs)', description: 'Flaky, buttery baked croissants.', category_id: 'c0000000-0000-0000-0000-000000000002', price: 110.00, tax_percent: 5.00, image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500', minimum_stock: 5, stock_quantity: 12, active: true },
    { id: 'f0000000-0000-0000-0000-000000000007', barcode: '8901234567896', sku: 'BEV-001', name: 'Sparkling Orange Juice 1L', description: '100% natural orange juice with light sparkling carbonation.', category_id: 'c0000000-0000-0000-0000-000000000003', price: 145.00, tax_percent: 12.00, image_url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500', minimum_stock: 10, stock_quantity: 25, active: true },
    { id: 'f0000000-0000-0000-0000-000000000008', barcode: '8901234567897', sku: 'BEV-002', name: 'Premium Cold Brew Coffee 250ml', description: 'Smooth, non-acidic cold brewed Arabica coffee.', category_id: 'c0000000-0000-0000-0000-000000000003', price: 180.00, tax_percent: 12.00, image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500', minimum_stock: 5, stock_quantity: 15, active: true },
    { id: 'f0000000-0000-0000-0000-000000000009', barcode: '8901234567898', sku: 'BEV-003', name: 'Natural Mineral Water 1.5L', description: 'Pure mountain spring mineral water.', category_id: 'c0000000-0000-0000-0000-000000000003', price: 30.00, tax_percent: 12.00, image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500', minimum_stock: 20, stock_quantity: 60, active: true },
    { id: 'f0000000-0000-0000-0000-000000000010', barcode: '8901234567899', sku: 'SNK-001', name: 'Crispy Potato Chips - Sea Salt 150g', description: 'Hand-cooked potato crisps lightly dusted with sea salt.', category_id: 'c0000000-0000-0000-0000-000000000004', price: 60.00, tax_percent: 12.00, image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500', minimum_stock: 10, stock_quantity: 32, active: true },
    { id: 'f0000000-0000-0000-0000-000000000011', barcode: '8901234567900', sku: 'SNK-002', name: 'Dark Chocolate Bar 70% Cacao 100g', description: 'Rich Belgian dark chocolate made with organic cocoa beans.', category_id: 'c0000000-0000-0000-0000-000000000004', price: 190.00, tax_percent: 12.00, image_url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500', minimum_stock: 5, stock_quantity: 18, active: true },
    { id: 'f0000000-0000-0000-0000-000000000012', barcode: '8901234567901', sku: 'SNK-003', name: 'Roasted Almonds & Cashews 200g', description: 'Lightly salted oven roasted premium dry fruit mix.', category_id: 'c0000000-0000-0000-0000-000000000004', price: 320.00, tax_percent: 5.00, image_url: 'https://images.unsplash.com/photo-1536591375315-198956582377?w=500', minimum_stock: 5, stock_quantity: 4, active: true },
    { id: 'f0000000-0000-0000-0000-000000000013', barcode: '8901234567902', sku: 'GRO-001', name: 'Organic Basmati Rice 5kg', description: 'Aromatic extra long grain premium Basmati rice.', category_id: 'c0000000-0000-0000-0000-000000000005', price: 650.00, tax_percent: 0.00, image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500', minimum_stock: 5, stock_quantity: 25, active: true },
    { id: 'f0000000-0000-0000-0000-000000000014', barcode: '8901234567903', sku: 'GRO-002', name: 'Cold Pressed Extra Virgin Olive Oil 1L', description: 'First cold-pressed extra virgin Mediterranean olive oil.', category_id: 'c0000000-0000-0000-0000-000000000005', price: 890.00, tax_percent: 5.00, image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500', minimum_stock: 4, stock_quantity: 2, active: true },
    { id: 'f0000000-0000-0000-0000-000000000015', barcode: '8901234567904', sku: 'GRO-003', name: 'Himalayan Pink Rock Salt 1kg', description: 'Unrefined pure Himalayan pink rock salt rich in natural minerals.', category_id: 'c0000000-0000-0000-0000-000000000005', price: 110.00, tax_percent: 0.00, image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500', minimum_stock: 5, stock_quantity: 0, active: true },
    { id: 'f0000000-0000-0000-0000-000000000016', barcode: '8901234567905', sku: 'PER-001', name: 'Nourishing Botanical Body Wash 500ml', description: 'Gentle sulfate-free bath gel with aloe vera and lavender.', category_id: 'c0000000-0000-0000-0000-000000000006', price: 350.00, tax_percent: 18.00, image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500', minimum_stock: 5, stock_quantity: 16, active: true },
    { id: 'f0000000-0000-0000-0000-000000000017', barcode: '8901234567906', sku: 'PER-002', name: 'Herbal Toothpaste Fluoride Free 150g', description: 'Natural neem and clove toothpaste for complete oral health.', category_id: 'c0000000-0000-0000-0000-000000000006', price: 125.00, tax_percent: 18.00, image_url: 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=500', minimum_stock: 8, stock_quantity: 3, active: true },
    { id: 'f0000000-0000-0000-0000-000000000018', barcode: '8901234567907', sku: 'HOU-001', name: 'Eco Liquid Laundry Detergent 2L', description: 'Plant-based biodegradable laundry detergent tough on stains.', category_id: 'c0000000-0000-0000-0000-000000000007', price: 480.00, tax_percent: 18.00, image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500', minimum_stock: 5, stock_quantity: 22, active: true },
    { id: 'f0000000-0000-0000-0000-000000000019', barcode: '8901234567908', sku: 'HOU-002', name: 'Bamboo Facial Tissues (Pack of 4)', description: 'Ultra-soft 3-ply eco-friendly bamboo tissues.', category_id: 'c0000000-0000-0000-0000-000000000007', price: 220.00, tax_percent: 12.00, image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500', minimum_stock: 6, stock_quantity: 28, active: true },
    { id: 'f0000000-0000-0000-0000-000000000020', barcode: '8901234567909', sku: 'FRU-001', name: 'Organic Washington Red Apples 1kg', description: 'Crisp, sweet organic red delicious apples.', category_id: 'c0000000-0000-0000-0000-000000000008', price: 240.00, tax_percent: 0.00, image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500', minimum_stock: 10, stock_quantity: 35, active: true },
    { id: 'f0000000-0000-0000-0000-000000000021', barcode: '8901234567910', sku: 'FRU-002', name: 'Fresh Hass Avocados (Pack of 3)', description: 'Ripe creamy Hass avocados perfect for salads and toast.', category_id: 'c0000000-0000-0000-0000-000000000008', price: 290.00, tax_percent: 0.00, image_url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500', minimum_stock: 5, stock_quantity: 12, active: true }
  ],
  carts: [],
  cart_items: [],
  orders: [],
  order_items: [],
  payments: [],
  checkout_tokens: [],
  inventory_movements: [],
  security_logs: []
};

/**
 * Get Supabase Client Instance (or fallback memory wrapper)
 */
function getSupabase() {
  return supabaseClient;
}

module.exports = {
  getSupabase,
  isSupabaseConfigured,
  localDb
};
