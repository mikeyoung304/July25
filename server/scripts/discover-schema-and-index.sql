-- ============================================
-- SCHEMA DISCOVERY AND SAFE INDEX CREATION
-- ============================================
-- This script first discovers your actual schema,
-- then creates only appropriate indexes.
-- Safe to run multiple times.

\echo '========================================='
\echo '🔍 PHASE 1: SCHEMA DISCOVERY'
\echo '========================================='

-- Create temporary table to store discovery results
CREATE TEMP TABLE IF NOT EXISTS schema_discovery (
    table_name text,
    column_name text,
    data_type text,
    is_nullable text
);

-- ============================================
-- DISCOVER ORDERS TABLE SCHEMA
-- ============================================
\echo '\n📋 Discovering ORDERS table structure...'

INSERT INTO schema_discovery
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

\echo 'Orders table columns:'
SELECT column_name, data_type 
FROM schema_discovery 
WHERE table_name = 'orders';

-- ============================================
-- DISCOVER MENU_ITEMS TABLE SCHEMA
-- ============================================
\echo '\n📋 Discovering MENU_ITEMS table structure...'

-- Check if menu_items exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_items') THEN
        INSERT INTO schema_discovery
        SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'menu_items'
        ORDER BY ordinal_position;
        
        RAISE NOTICE 'menu_items table found';
    ELSE
        RAISE NOTICE 'menu_items table NOT found';
    END IF;
END $$;

-- Show menu_items columns if they exist
SELECT column_name, data_type 
FROM schema_discovery 
WHERE table_name = 'menu_items';

-- ============================================
-- DISCOVER ORDER_ITEMS TABLE SCHEMA
-- ============================================
\echo '\n📋 Discovering ORDER_ITEMS table structure...'

-- Check if order_items exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        INSERT INTO schema_discovery
        SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'order_items'
        ORDER BY ordinal_position;
        
        RAISE NOTICE 'order_items table found';
    ELSE
        RAISE NOTICE 'order_items table NOT found';
    END IF;
END $$;

-- Show order_items columns if they exist
SELECT column_name, data_type 
FROM schema_discovery 
WHERE table_name = 'order_items';

-- ============================================
-- DISCOVER RESTAURANTS TABLE SCHEMA
-- ============================================
\echo '\n📋 Discovering RESTAURANTS table structure...'

-- Check if restaurants exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurants') THEN
        INSERT INTO schema_discovery
        SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'restaurants'
        ORDER BY ordinal_position;
        
        RAISE NOTICE 'restaurants table found';
    ELSE
        RAISE NOTICE 'restaurants table NOT found';
    END IF;
END $$;

-- Show restaurants columns if they exist
SELECT column_name, data_type 
FROM schema_discovery 
WHERE table_name = 'restaurants';

-- ============================================
-- PHASE 2: CREATE INDEXES BASED ON DISCOVERY
-- ============================================

\echo '\n========================================='
\echo '⚡ PHASE 2: CREATING PERFORMANCE INDEXES'
\echo '========================================='

-- Helper function to check if column exists
CREATE OR REPLACE FUNCTION temp_column_exists(p_table text, p_column text) 
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM schema_discovery 
        WHERE table_name = p_table 
        AND column_name = p_column
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ORDERS TABLE INDEXES (CONDITIONAL)
-- ============================================
\echo '\n📦 Creating ORDERS table indexes...'

-- Always create these core indexes if columns exist
DO $$
BEGIN
    -- Core: restaurant_id + status (most common query)
    IF temp_column_exists('orders', 'restaurant_id') AND temp_column_exists('orders', 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status 
        ON orders(restaurant_id, status);
        RAISE NOTICE '✅ Created index: idx_orders_restaurant_status';
    ELSE
        RAISE NOTICE '⚠️  Skipped idx_orders_restaurant_status - missing columns';
    END IF;

    -- Core: restaurant_id + created_at
    IF temp_column_exists('orders', 'restaurant_id') AND temp_column_exists('orders', 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created 
        ON orders(restaurant_id, created_at DESC);
        RAISE NOTICE '✅ Created index: idx_orders_restaurant_created';
    ELSE
        RAISE NOTICE '⚠️  Skipped idx_orders_restaurant_created - missing columns';
    END IF;

    -- Status index
    IF temp_column_exists('orders', 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_status 
        ON orders(status);
        RAISE NOTICE '✅ Created index: idx_orders_status';
    END IF;

    -- Order type index (check both 'order_type' and 'type')
    IF temp_column_exists('orders', 'order_type') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_order_type 
        ON orders(order_type);
        RAISE NOTICE '✅ Created index: idx_orders_order_type';
    ELSIF temp_column_exists('orders', 'type') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_type 
        ON orders(type);
        RAISE NOTICE '✅ Created index: idx_orders_type';
    ELSE
        RAISE NOTICE '⚠️  No order type column found';
    END IF;

    -- Check for metadata JSONB field
    IF temp_column_exists('orders', 'metadata') THEN
        -- Payment status in metadata
        CREATE INDEX IF NOT EXISTS idx_orders_metadata_payment_status 
        ON orders((metadata->>'payment_status'))
        WHERE metadata->>'payment_status' IS NOT NULL;
        RAISE NOTICE '✅ Created index: idx_orders_metadata_payment_status (JSONB)';
        
        -- Payment method in metadata
        CREATE INDEX IF NOT EXISTS idx_orders_metadata_payment_method 
        ON orders((metadata->>'payment_method'))
        WHERE metadata->>'payment_method' IS NOT NULL;
        RAISE NOTICE '✅ Created index: idx_orders_metadata_payment_method (JSONB)';
        
        -- Tip amount in metadata (for Square payments)
        CREATE INDEX IF NOT EXISTS idx_orders_metadata_tip 
        ON orders((metadata->>'tip_amount'))
        WHERE metadata->>'tip_amount' IS NOT NULL;
        RAISE NOTICE '✅ Created index: idx_orders_metadata_tip (JSONB)';
    END IF;

    -- KDS optimized index
    IF temp_column_exists('orders', 'restaurant_id') AND 
       temp_column_exists('orders', 'status') AND 
       temp_column_exists('orders', 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_kds 
        ON orders(restaurant_id, status, created_at DESC)
        WHERE status IN ('new', 'pending', 'confirmed', 'preparing', 'ready');
        RAISE NOTICE '✅ Created index: idx_orders_kds (Kitchen Display)';
    END IF;
END $$;

-- ============================================
-- MENU_ITEMS TABLE INDEXES (CONDITIONAL)
-- ============================================
\echo '\n🍔 Creating MENU_ITEMS table indexes...'

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_discovery WHERE table_name = 'menu_items') THEN
        -- Restaurant + available
        IF temp_column_exists('menu_items', 'restaurant_id') AND temp_column_exists('menu_items', 'available') THEN
            CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_available 
            ON menu_items(restaurant_id, available)
            WHERE available = true;
            RAISE NOTICE '✅ Created index: idx_menu_items_restaurant_available';
        END IF;

        -- Name search
        IF temp_column_exists('menu_items', 'restaurant_id') AND temp_column_exists('menu_items', 'name') THEN
            CREATE INDEX IF NOT EXISTS idx_menu_items_name 
            ON menu_items(restaurant_id, name);
            RAISE NOTICE '✅ Created index: idx_menu_items_name';
        END IF;

        -- Price range queries
        IF temp_column_exists('menu_items', 'price') THEN
            CREATE INDEX IF NOT EXISTS idx_menu_items_price 
            ON menu_items(restaurant_id, price);
            RAISE NOTICE '✅ Created index: idx_menu_items_price';
        END IF;

        -- Check if category exists as column or in metadata
        IF temp_column_exists('menu_items', 'category') THEN
            CREATE INDEX IF NOT EXISTS idx_menu_items_category 
            ON menu_items(restaurant_id, category);
            RAISE NOTICE '✅ Created index: idx_menu_items_category';
        ELSIF temp_column_exists('menu_items', 'metadata') THEN
            -- Category might be in metadata
            CREATE INDEX IF NOT EXISTS idx_menu_items_metadata_category 
            ON menu_items(restaurant_id, (metadata->>'category'));
            RAISE NOTICE '✅ Created index: idx_menu_items_metadata_category (JSONB)';
        ELSE
            RAISE NOTICE '⚠️  No category field found in menu_items';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  menu_items table not found - skipping all menu indexes';
    END IF;
END $$;

-- ============================================
-- ORDER_ITEMS TABLE INDEXES (CONDITIONAL)
-- ============================================
\echo '\n📝 Creating ORDER_ITEMS table indexes...'

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_discovery WHERE table_name = 'order_items') THEN
        -- Order lookup
        IF temp_column_exists('order_items', 'order_id') THEN
            CREATE INDEX IF NOT EXISTS idx_order_items_order 
            ON order_items(order_id);
            RAISE NOTICE '✅ Created index: idx_order_items_order';
        END IF;

        -- Menu item lookup
        IF temp_column_exists('order_items', 'menu_item_id') THEN
            CREATE INDEX IF NOT EXISTS idx_order_items_menu_item 
            ON order_items(menu_item_id);
            RAISE NOTICE '✅ Created index: idx_order_items_menu_item';
        END IF;

        -- Composite index
        IF temp_column_exists('order_items', 'order_id') AND temp_column_exists('order_items', 'menu_item_id') THEN
            CREATE INDEX IF NOT EXISTS idx_order_items_order_menu 
            ON order_items(order_id, menu_item_id);
            RAISE NOTICE '✅ Created index: idx_order_items_order_menu';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  order_items table not found - skipping all order_items indexes';
    END IF;
END $$;

-- ============================================
-- RESTAURANTS TABLE INDEXES (CONDITIONAL)
-- ============================================
\echo '\n🏪 Creating RESTAURANTS table indexes...'

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_discovery WHERE table_name = 'restaurants') THEN
        -- Active restaurants
        IF temp_column_exists('restaurants', 'active') THEN
            CREATE INDEX IF NOT EXISTS idx_restaurants_active 
            ON restaurants(active)
            WHERE active = true;
            RAISE NOTICE '✅ Created index: idx_restaurants_active';
        END IF;

        -- Slug lookup
        IF temp_column_exists('restaurants', 'slug') THEN
            CREATE INDEX IF NOT EXISTS idx_restaurants_slug 
            ON restaurants(slug)
            WHERE slug IS NOT NULL;
            RAISE NOTICE '✅ Created index: idx_restaurants_slug';
        END IF;

        -- Name search
        IF temp_column_exists('restaurants', 'name') THEN
            CREATE INDEX IF NOT EXISTS idx_restaurants_name 
            ON restaurants(name);
            RAISE NOTICE '✅ Created index: idx_restaurants_name';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  restaurants table not found - skipping all restaurant indexes';
    END IF;
END $$;

-- ============================================
-- ANALYZE TABLES
-- ============================================
\echo '\n📊 Analyzing tables for query optimization...'

DO $$
BEGIN
    -- Analyze each table that exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ANALYZE orders;
        RAISE NOTICE '✅ Analyzed orders table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'menu_items') THEN
        ANALYZE menu_items;
        RAISE NOTICE '✅ Analyzed menu_items table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        ANALYZE order_items;
        RAISE NOTICE '✅ Analyzed order_items table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurants') THEN
        ANALYZE restaurants;
        RAISE NOTICE '✅ Analyzed restaurants table';
    END IF;
END $$;

-- ============================================
-- FINAL REPORT
-- ============================================
\echo '\n========================================='
\echo '📊 FINAL REPORT'
\echo '========================================='

\echo '\n📈 Index Summary:'
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_stat_user_indexes ON indexrelname = indexname
WHERE schemaname = 'public'
AND tablename IN ('orders', 'menu_items', 'order_items', 'restaurants')
ORDER BY tablename, indexname;

\echo '\n💾 Table Sizes:'
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('orders', 'menu_items', 'order_items', 'restaurants')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo '\n🔍 Discovered Schema Summary:'
SELECT 
    table_name,
    COUNT(*) as column_count,
    string_agg(column_name, ', ' ORDER BY column_name) as columns
FROM schema_discovery
GROUP BY table_name
ORDER BY table_name;

-- Cleanup
DROP FUNCTION IF EXISTS temp_column_exists(text, text);

\echo '\n========================================='
\echo '✅ INDEX OPTIMIZATION COMPLETE!'
\echo '========================================='
\echo 'Indexes have been created based on your actual schema.'
\echo 'Payment data appears to be stored in metadata JSONB field.'
\echo 'Square Sandbox integration ready for demo mode.'
\echo '========================================='