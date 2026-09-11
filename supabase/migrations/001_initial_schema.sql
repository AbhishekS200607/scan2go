-- ============================================================================
-- Scan2Go — PostgreSQL / Supabase Schema Migration (001_initial_schema.sql)
-- Smart Supermarket Self-Checkout & Management System
-- ============================================================================

-- Enable pgcrypto extension for UUID generation & crypto operations
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked with Supabase Auth users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'security')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ----------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(active);

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(64) UNIQUE NOT NULL,
    sku VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_percent >= 0),
    image_url TEXT,
    minimum_stock INT NOT NULL DEFAULT 5 CHECK (minimum_stock >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock_quantity, minimum_stock);

-- ----------------------------------------------------------------------------
-- 4. CARTS & CART_ITEMS TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_cart_product UNIQUE (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);

-- ----------------------------------------------------------------------------
-- 5. ORDERS & ORDER_ITEMS TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount NUMERIC(10, 2) NOT NULL CHECK (tax_amount >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'PAYMENT_PROCESSING', 'PAID', 'PAYMENT_FAILED', 'CANCELLED', 'VERIFIED', 'EXITED'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    barcode_snapshot VARCHAR(64) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ----------------------------------------------------------------------------
-- 6. PAYMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL DEFAULT 'mock',
    provider_transaction_id VARCHAR(128) UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);

-- ----------------------------------------------------------------------------
-- 7. CHECKOUT TOKENS TABLE (Secure Cryptographic Pass)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkout_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VERIFIED', 'EXITED', 'EXPIRED', 'CANCELLED')),
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    exited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_tokens_hash ON public.checkout_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_checkout_tokens_status ON public.checkout_tokens(status);

-- ----------------------------------------------------------------------------
-- 8. INVENTORY MOVEMENTS TABLE (Stock Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    previous_quantity INT NOT NULL,
    change_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    reason TEXT NOT NULL,
    reference_type VARCHAR(32) CHECK (reference_type IN ('SALE', 'STOCK_ADJUSTMENT', 'INITIAL_SEED', 'RETURN')),
    reference_id UUID,
    performed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);

-- ----------------------------------------------------------------------------
-- 9. SECURITY LOGS TABLE (Verification Audit Log)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    security_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    result VARCHAR(32) NOT NULL CHECK (result IN ('VALID', 'EXPIRED', 'ALREADY_USED', 'PAYMENT_FAILED', 'INVALID_TOKEN')),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_order ON public.security_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_logs(security_user_id);

-- ----------------------------------------------------------------------------
-- 10. ATOMIC VERIFICATION & EXIT RPC FUNCTION (Prevents Race Conditions)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_and_exit_checkout_token(
    p_token_hash VARCHAR(128),
    p_security_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_token RECORD;
    v_order RECORD;
    v_items JSON;
BEGIN
    -- 1. Lock the token row FOR UPDATE to prevent race conditions
    SELECT * INTO v_token
    FROM public.checkout_tokens
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    -- Token Not Found
    IF NOT FOUND THEN
        INSERT INTO public.security_logs (order_id, security_user_id, result, reason)
        VALUES (NULL, p_security_user_id, 'INVALID_TOKEN', 'Token hash does not exist');
        
        RETURN json_build_object(
            'valid', false,
            'reason', 'INVALID_TOKEN',
            'message', 'Invalid or unrecognised QR checkout token.'
        );
    END IF;

    -- Check if Expiry Passed
    IF v_token.expires_at < NOW() THEN
        UPDATE public.checkout_tokens SET status = 'EXPIRED' WHERE id = v_token.id;
        
        INSERT INTO public.security_logs (order_id, security_user_id, result, reason)
        VALUES (v_token.order_id, p_security_user_id, 'EXPIRED', 'Token expired at ' || v_token.expires_at);

        RETURN json_build_object(
            'valid', false,
            'reason', 'EXPIRED',
            'message', 'Checkout QR pass has expired.'
        );
    END IF;

    -- Check if Already Used / Exited (Re-verification allowed)
    IF v_token.status = 'EXITED' THEN
        INSERT INTO public.security_logs (order_id, security_user_id, result, reason)
        VALUES (v_token.order_id, p_security_user_id, 'ALREADY_USED', 'Token re-scanned (already EXITED)');

        SELECT * INTO v_order
        FROM public.orders
        WHERE id = v_token.order_id;

        SELECT json_agg(json_build_object(
            'name', product_name_snapshot,
            'barcode', barcode_snapshot,
            'quantity', quantity,
            'unit_price', unit_price,
            'line_total', line_total
        )) INTO v_items
        FROM public.order_items
        WHERE order_id = v_order.id;

        RETURN json_build_object(
            'valid', true,
            'already_exited', true,
            'status', 'EXITED',
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'total', v_order.total_amount,
            'items', v_items,
            'verified_at', COALESCE(v_token.exited_at, v_token.verified_at)
        );
    END IF;

    -- Retrieve Order details
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = v_token.order_id;

    -- Verify Order Payment Status
    IF v_order.status NOT IN ('PAID', 'VERIFIED') THEN
        INSERT INTO public.security_logs (order_id, security_user_id, result, reason)
        VALUES (v_token.order_id, p_security_user_id, 'PAYMENT_FAILED', 'Order status is ' || v_order.status);

        RETURN json_build_object(
            'valid', false,
            'reason', 'PAYMENT_NOT_COMPLETED',
            'message', 'Payment for this order has not been completed.'
        );
    END IF;

    -- Mark Token as EXITED atomically
    UPDATE public.checkout_tokens
    SET status = 'EXITED',
        verified_by = p_security_user_id,
        verified_at = COALESCE(verified_at, NOW()),
        exited_at = NOW()
    WHERE id = v_token.id;

    -- Update Order status to EXITED
    UPDATE public.orders
    SET status = 'EXITED',
        updated_at = NOW()
    WHERE id = v_order.id;

    -- Log Security Verification
    INSERT INTO public.security_logs (order_id, security_user_id, result, reason)
    VALUES (v_order.id, p_security_user_id, 'VALID', 'Successful verification and exit');

    -- Fetch order items snapshots
    SELECT json_agg(json_build_object(
        'name', product_name_snapshot,
        'barcode', barcode_snapshot,
        'quantity', quantity,
        'unit_price', unit_price,
        'line_total', line_total
    )) INTO v_items
    FROM public.order_items
    WHERE order_id = v_order.id;

    RETURN json_build_object(
        'valid', true,
        'status', 'EXITED',
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'total', v_order.total_amount,
        'items', v_items,
        'verified_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
