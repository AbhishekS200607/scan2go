-- ============================================================================
-- Scan2Go — PostgreSQL / Supabase Demo Seed Data (seed.sql)
-- ============================================================================

-- Insert Categories
INSERT INTO public.categories (id, name, description, image_url, active) VALUES
('c0000000-0000-0000-0000-000000000001', 'Dairy & Eggs', 'Fresh milk, butter, cheese, yogurt and eggs', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500', true),
('c0000000-0000-0000-0000-000000000002', 'Bakery & Bread', 'Freshly baked artisanal breads, rolls, and pastries', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500', true),
('c0000000-0000-0000-0000-000000000003', 'Beverages', 'Refreshing juices, soft drinks, tea and coffee', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=500', true),
('c0000000-0000-0000-0000-000000000004', 'Snacks & Munchies', 'Chips, biscuits, nuts, chocolates and snacks', 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=500', true),
('c0000000-0000-0000-0000-000000000005', 'Groceries & Staples', 'Rice, flour, pulses, spices, and cooking oils', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500', true),
('c0000000-0000-0000-0000-000000000006', 'Personal Care', 'Soaps, shampoos, toothpaste, skincare and hygiene', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500', true),
('c0000000-0000-0000-0000-000000000007', 'Household Essentials', 'Cleaning agents, detergents, tissues and accessories', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500', true),
('c0000000-0000-0000-0000-000000000008', 'Fruits & Vegetables', 'Farm fresh organic fruits and seasonal vegetables', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Products with Realistic Barcodes (Valid Hexadecimal UUIDs)
INSERT INTO public.products (id, barcode, sku, name, description, category_id, price, tax_percent, image_url, minimum_stock, stock_quantity, active) VALUES
-- Dairy
('f0000000-0000-0000-0000-000000000001', '8901234567890', 'DAIRY-001', 'Farm Fresh Whole Milk 1L', 'Pasteurized fresh whole cow milk rich in calcium and vitamin D.', 'c0000000-0000-0000-0000-000000000001', 68.00, 5.00, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500', 10, 45, true),
('f0000000-0000-0000-0000-000000000002', '8901234567891', 'DAIRY-002', 'Salted Creamery Butter 500g', 'Rich, creamy butter made from pure cow milk cream.', 'c0000000-0000-0000-0000-000000000001', 275.00, 5.00, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500', 5, 20, true),
('f0000000-0000-0000-0000-000000000003', '8901234567892', 'DAIRY-003', 'Greek Style Plain Yogurt 400g', 'High protein, thick and delicious plain Greek yogurt.', 'c0000000-0000-0000-0000-000000000001', 120.00, 5.00, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500', 5, 14, true),
('f0000000-0000-0000-0000-000000000004', '8901234567893', 'DAIRY-004', 'Farm Brown Eggs (Pack of 12)', 'Nutritious cage-free brown eggs packed with protein.', 'c0000000-0000-0000-0000-000000000001', 95.00, 0.00, 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=500', 8, 30, true),

-- Bakery
('f0000000-0000-0000-0000-000000000005', '8901234567894', 'BAK-001', 'Multi-Grain Whole Wheat Bread 400g', 'Soft whole grain bread rich in dietary fiber.', 'c0000000-0000-0000-0000-000000000002', 55.00, 0.00, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500', 6, 8, true),
('f0000000-0000-0000-0000-000000000006', '8901234567895', 'BAK-002', 'French Butter Croissant (2 Pcs)', 'Flaky, buttery baked croissants.', 'c0000000-0000-0000-0000-000000000002', 110.00, 5.00, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500', 5, 12, true),

-- Beverages
('f0000000-0000-0000-0000-000000000007', '8901234567896', 'BEV-001', 'Sparkling Orange Juice 1L', '100% natural orange juice with light sparkling carbonation.', 'c0000000-0000-0000-0000-000000000003', 145.00, 12.00, 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500', 10, 25, true),
('f0000000-0000-0000-0000-000000000008', '8901234567897', 'BEV-002', 'Premium Cold Brew Coffee 250ml', 'Smooth, non-acidic cold brewed Arabica coffee.', 'c0000000-0000-0000-0000-000000000003', 180.00, 12.00, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500', 5, 15, true),
('f0000000-0000-0000-0000-000000000009', '8901234567898', 'BEV-003', 'Natural Mineral Water 1.5L', 'Pure mountain spring mineral water.', 'c0000000-0000-0000-0000-000000000003', 30.00, 12.00, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500', 20, 60, true),

-- Snacks
('f0000000-0000-0000-0000-000000000010', '8901234567899', 'SNK-001', 'Crispy Potato Chips - Sea Salt 150g', 'Hand-cooked potato crisps lightly dusted with sea salt.', 'c0000000-0000-0000-0000-000000000004', 60.00, 12.00, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500', 10, 32, true),
('f0000000-0000-0000-0000-000000000011', '8901234567900', 'SNK-002', 'Dark Chocolate Bar 70% Cacao 100g', 'Rich Belgian dark chocolate made with organic cocoa beans.', 'c0000000-0000-0000-0000-000000000004', 190.00, 12.00, 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500', 5, 18, true),
('f0000000-0000-0000-0000-000000000012', '8901234567901', 'SNK-003', 'Roasted Almonds & Cashews 200g', 'Lightly salted oven roasted premium dry fruit mix.', 'c0000000-0000-0000-0000-000000000004', 320.00, 5.00, 'https://images.unsplash.com/photo-1536591375315-198956582377?w=500', 5, 4, true), -- Low stock

-- Groceries
('f0000000-0000-0000-0000-000000000013', '8901234567902', 'GRO-001', 'Organic Basmati Rice 5kg', 'Aromatic extra long grain premium Basmati rice.', 'c0000000-0000-0000-0000-000000000005', 650.00, 0.00, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500', 5, 25, true),
('f0000000-0000-0000-0000-000000000014', '8901234567903', 'GRO-002', 'Cold Pressed Extra Virgin Olive Oil 1L', 'First cold-pressed extra virgin Mediterranean olive oil.', 'c0000000-0000-0000-0000-000000000005', 890.00, 5.00, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500', 4, 2, true), -- Low stock
('f0000000-0000-0000-0000-000000000015', '8901234567904', 'GRO-003', 'Himalayan Pink Rock Salt 1kg', 'Unrefined pure Himalayan pink rock salt rich in natural minerals.', 'c0000000-0000-0000-0000-000000000005', 110.00, 0.00, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500', 5, 0, true), -- Out of stock

-- Personal Care
('f0000000-0000-0000-0000-000000000016', '8901234567905', 'PER-001', 'Nourishing Botanical Body Wash 500ml', 'Gentle sulfate-free bath gel with aloe vera and lavender.', 'c0000000-0000-0000-0000-000000000006', 350.00, 18.00, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500', 5, 16, true),
('f0000000-0000-0000-0000-000000000017', '8901234567906', 'PER-002', 'Herbal Toothpaste Fluoride Free 150g', 'Natural neem and clove toothpaste for complete oral health.', 'c0000000-0000-0000-0000-000000000006', 125.00, 18.00, 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=500', 8, 3, true), -- Low stock

-- Household
('f0000000-0000-0000-0000-000000000018', '8901234567907', 'HOU-001', 'Eco Liquid Laundry Detergent 2L', 'Plant-based biodegradable laundry detergent tough on stains.', 'c0000000-0000-0000-0000-000000000007', 480.00, 18.00, 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500', 5, 22, true),
('f0000000-0000-0000-0000-000000000019', '8901234567908', 'HOU-002', 'Bamboo Facial Tissues (Pack of 4)', 'Ultra-soft 3-ply eco-friendly bamboo tissues.', 'c0000000-0000-0000-0000-000000000007', 220.00, 12.00, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500', 6, 28, true),

-- Fruits & Veggies
('f0000000-0000-0000-0000-000000000020', '8901234567909', 'FRU-001', 'Organic Washington Red Apples 1kg', 'Crisp, sweet organic red delicious apples.', 'c0000000-0000-0000-0000-000000000008', 240.00, 0.00, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500', 10, 35, true),
('f0000000-0000-0000-0000-000000000021', '8901234567910', 'FRU-002', 'Fresh Hass Avocados (Pack of 3)', 'Ripe creamy Hass avocados perfect for salads and toast.', 'c0000000-0000-0000-0000-000000000008', 290.00, 0.00, 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500', 5, 12, true)
ON CONFLICT (barcode) DO NOTHING;
