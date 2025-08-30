-- Safe Performance Indexes for Restaurant OS
-- This script checks for column existence before creating indexes
-- Safe to run multiple times (idempotent)

-- ============================================
-- HELPER FUNCTION TO CHECK COLUMNS
-- ============================================
CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text) 
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ORDERS TABLE INDEXES (CORE - ALWAYS NEEDED)
-- ============================================

-- Core composite index for restaurant + status queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status 
ON orders(restaurant_id, status);

-- Core index for restaurant + created_at (for order history)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created 
ON orders(restaurant_id, created_at DESC);

-- Core index for status filtering
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status);

-- ============================================
-- CONDITIONAL ORDERS INDEXES
-- ============================================

-- Payment status index (if column exists - may be in metadata)
DO $$ 
BEGIN
    IF column_exists('orders', 'payment_status') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
        ON orders(payment_status) 
        WHERE payment_status IS NOT NULL;
        RAISE NOTICE 'Created index on payment_status';
    ELSE
        RAISE NOTICE 'Skipping payment_status index - column does not exist (likely in metadata)';
    END IF;
END $$;

-- Order type index (if column exists)
DO $$ 
BEGIN
    IF column_exists('orders', 'order_type') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_type 
        ON orders(order_type);
        RAISE NOTICE 'Created index on order_type';
    ELSIF column_exists('orders', 'type') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_type 
        ON orders(type);
        RAISE NOTICE 'Created index on type';
    ELSE
        RAISE NOTICE 'Skipping order_type index - column does not exist';
    END IF;
END $$;

-- Metadata JSONB index (if your payment_status is in metadata)
DO $$ 
BEGIN
    IF column_exists('orders', 'metadata') THEN
        -- Index for payment_status in metadata
        CREATE INDEX IF NOT EXISTS idx_orders_metadata_payment_status 
        ON orders((metadata->>'payment_status'))
        WHERE metadata->>'payment_status' IS NOT NULL;
        
        -- Index for payment_method in metadata
        CREATE INDEX IF NOT EXISTS idx_orders_metadata_payment_method 
        ON orders((metadata->>'payment_method'))
        WHERE metadata->>'payment_method' IS NOT NULL;
        
        RAISE NOTICE 'Created indexes on metadata JSONB fields';
    END IF;
END $$;

-- KDS optimized index (for active kitchen orders)
CREATE INDEX IF NOT EXISTS idx_orders_kds 
ON orders(restaurant_id, status, created_at DESC)
WHERE status IN ('new', 'pending', 'confirmed', 'preparing', 'ready');

-- ============================================
-- MENU_ITEMS TABLE INDEXES
-- ============================================

-- Check if menu_items table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_items') THEN
        -- Restaurant + available items
        CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_available 
        ON menu_items(restaurant_id, available)
        WHERE available = true;
        
        -- Category filtering
        IF column_exists('menu_items', 'category') THEN
            CREATE INDEX IF NOT EXISTS idx_menu_items_category 
            ON menu_items(restaurant_id, category);
        END IF;
        
        -- Name search
        CREATE INDEX IF NOT EXISTS idx_menu_items_name 
        ON menu_items(restaurant_id, name);
        
        RAISE NOTICE 'Created indexes on menu_items table';
    ELSE
        RAISE NOTICE 'menu_items table not found - skipping';
    END IF;
END $$;

-- ============================================
-- ORDER_ITEMS TABLE INDEXES
-- ============================================

-- Check if order_items table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        -- Order lookup
        CREATE INDEX IF NOT EXISTS idx_order_items_order 
        ON order_items(order_id);
        
        -- Order + menu item composite
        IF column_exists('order_items', 'menu_item_id') THEN
            CREATE INDEX IF NOT EXISTS idx_order_items_order_menu 
            ON order_items(order_id, menu_item_id);
        END IF;
        
        RAISE NOTICE 'Created indexes on order_items table';
    ELSE
        RAISE NOTICE 'order_items table not found - skipping';
    END IF;
END $$;

-- ============================================
-- RESTAURANTS TABLE INDEXES
-- ============================================

-- Check if restaurants table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurants') THEN
        -- Active restaurants
        IF column_exists('restaurants', 'active') THEN
            CREATE INDEX IF NOT EXISTS idx_restaurants_active 
            ON restaurants(active)
            WHERE active = true;
        END IF;
        
        -- Slug/subdomain lookup
        IF column_exists('restaurants', 'slug') THEN
            CREATE INDEX IF NOT EXISTS idx_restaurants_slug 
            ON restaurants(slug)
            WHERE slug IS NOT NULL;
        END IF;
        
        RAISE NOTICE 'Created indexes on restaurants table';
    ELSE
        RAISE NOTICE 'restaurants table not found - skipping';
    END IF;
END $$;

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

-- Update statistics for query planner optimization
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ANALYZE orders;
        RAISE NOTICE 'Analyzed orders table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_items') THEN
        ANALYZE menu_items;
        RAISE NOTICE 'Analyzed menu_items table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        ANALYZE order_items;
        RAISE NOTICE 'Analyzed order_items table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurants') THEN
        ANALYZE restaurants;
        RAISE NOTICE 'Analyzed restaurants table';
    END IF;
END $$;

-- ============================================
-- SUMMARY REPORT
-- ============================================

-- Show all indexes on core tables
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_stat_user_indexes ON indexrelname = indexname
WHERE schemaname = 'public'
AND tablename IN ('orders', 'menu_items', 'order_items', 'restaurants')
ORDER BY tablename, indexname;

-- Show table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('orders', 'menu_items', 'order_items', 'restaurants')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- CLEANUP
-- ============================================
DROP FUNCTION IF EXISTS column_exists(text, text);

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Performance indexes created successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'For Square Sandbox: Payment data is in metadata JSONB field';
    RAISE NOTICE 'Indexes have been optimized for your current schema';
    RAISE NOTICE '========================================';
END $$;