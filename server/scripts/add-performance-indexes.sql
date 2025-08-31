-- Performance Indexes for Restaurant OS
-- These indexes are critical for production performance
-- Run this script against your Supabase database

-- ============================================
-- ORDERS TABLE INDEXES
-- ============================================

-- Composite index for restaurant + status queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status 
ON orders(restaurant_id, status);

-- Composite index for restaurant + created_at (for order history queries)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created 
ON orders(restaurant_id, created_at DESC);

-- Index for finding orders by status alone (for global admin views)
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status);

-- Index for payment status queries (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
        ON orders(payment_status) 
        WHERE payment_status IS NOT NULL;
    END IF;
END $$;

-- Index for order type filtering (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'order_type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_orders_type 
        ON orders(order_type);
    END IF;
END $$;

-- Composite index for KDS queries (restaurant + status + created)
CREATE INDEX IF NOT EXISTS idx_orders_kds 
ON orders(restaurant_id, status, created_at DESC)
WHERE status IN ('new', 'pending', 'confirmed', 'preparing', 'ready');

-- ============================================
-- MENU_ITEMS TABLE INDEXES
-- ============================================

-- Composite index for restaurant + available items
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_available 
ON menu_items(restaurant_id, available)
WHERE available = true;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_menu_items_category 
ON menu_items(restaurant_id, category);

-- Index for finding items by name (for search)
CREATE INDEX IF NOT EXISTS idx_menu_items_name 
ON menu_items(restaurant_id, name);

-- ============================================
-- ORDER_ITEMS TABLE INDEXES
-- ============================================

-- Index for fetching items by order
CREATE INDEX IF NOT EXISTS idx_order_items_order 
ON order_items(order_id);

-- Composite index for order + menu item lookups
CREATE INDEX IF NOT EXISTS idx_order_items_order_menu 
ON order_items(order_id, menu_item_id);

-- ============================================
-- RESTAURANTS TABLE INDEXES
-- ============================================

-- Index for active restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_active 
ON restaurants(active)
WHERE active = true;

-- Index for finding restaurant by slug/subdomain
CREATE INDEX IF NOT EXISTS idx_restaurants_slug 
ON restaurants(slug)
WHERE slug IS NOT NULL;

-- ============================================
-- PAYMENTS TABLE INDEXES (if exists)
-- ============================================

-- Check if payments table exists before creating indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        -- Index for payment lookups by order
        CREATE INDEX IF NOT EXISTS idx_payments_order 
        ON payments(order_id);
        
        -- Index for payment status
        CREATE INDEX IF NOT EXISTS idx_payments_status 
        ON payments(status);
        
        -- Composite index for restaurant + created date
        CREATE INDEX IF NOT EXISTS idx_payments_restaurant_created 
        ON payments(restaurant_id, created_at DESC);
    END IF;
END $$;

-- ============================================
-- AUDIT_LOGS TABLE INDEXES (if exists)
-- ============================================

-- Check if audit_logs table exists before creating indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        -- Index for audit log queries by entity
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
        ON audit_logs(entity_type, entity_id);
        
        -- Index for audit log queries by user
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
        ON audit_logs(user_id);
        
        -- Index for audit log queries by timestamp
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
        ON audit_logs(created_at DESC);
    END IF;
END $$;

-- ============================================
-- WEBSOCKET_CONNECTIONS TABLE INDEXES (if exists)
-- ============================================

-- Check if websocket_connections table exists before creating indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'websocket_connections') THEN
        -- Index for active connections
        CREATE INDEX IF NOT EXISTS idx_websocket_connections_active 
        ON websocket_connections(restaurant_id, connected_at DESC)
        WHERE disconnected_at IS NULL;
    END IF;
END $$;

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

-- Update statistics for query planner optimization
ANALYZE orders;
ANALYZE menu_items;
ANALYZE order_items;
ANALYZE restaurants;

-- ============================================
-- QUERY PERFORMANCE VERIFICATION
-- ============================================

-- Test query to verify index usage (should use idx_orders_restaurant_status)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM orders 
WHERE restaurant_id = '11111111-1111-1111-1111-111111111111' 
AND status IN ('new', 'pending', 'confirmed')
ORDER BY created_at DESC
LIMIT 50;

-- Output index creation summary
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_stat_user_indexes ON indexrelname = indexname
WHERE schemaname = 'public'
AND tablename IN ('orders', 'menu_items', 'order_items', 'restaurants', 'payments')
ORDER BY tablename, indexname;