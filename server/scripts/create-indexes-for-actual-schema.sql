-- ============================================
-- PERFORMANCE INDEXES FOR YOUR EXACT SCHEMA
-- Based on actual Supabase database inspection
-- ============================================

\echo '========================================='
\echo '⚡ CREATING PERFORMANCE INDEXES'
\echo 'Based on your actual database schema'
\echo '========================================='

-- ============================================
-- ORDERS TABLE INDEXES
-- Your columns: id, restaurant_id, order_number, type, status, 
-- items(jsonb), subtotal, tax, total_amount, customer_name,
-- table_number, metadata(jsonb), created_at, updated_at,
-- preparing_at, ready_at, completed_at, cancelled_at
-- ============================================

\echo '\n📦 Creating ORDERS table indexes...'

-- Core index: restaurant_id + status (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status 
ON orders(restaurant_id, status);

-- Core index: restaurant_id + created_at (order history queries)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created 
ON orders(restaurant_id, created_at DESC);

-- Status index for filtering
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status);

-- Type index (you have 'type' not 'order_type')
CREATE INDEX IF NOT EXISTS idx_orders_type 
ON orders(type);

-- Order number lookup (unique per restaurant usually)
CREATE INDEX IF NOT EXISTS idx_orders_order_number 
ON orders(restaurant_id, order_number);

-- Customer name search
CREATE INDEX IF NOT EXISTS idx_orders_customer_name 
ON orders(restaurant_id, customer_name)
WHERE customer_name IS NOT NULL;

-- Table number for restaurant floor management
CREATE INDEX IF NOT EXISTS idx_orders_table_number 
ON orders(restaurant_id, table_number)
WHERE table_number IS NOT NULL;

-- Kitchen Display System optimized index
CREATE INDEX IF NOT EXISTS idx_orders_kds 
ON orders(restaurant_id, status, created_at DESC)
WHERE status IN ('new', 'pending', 'confirmed', 'preparing', 'ready');

-- Preparing orders (for kitchen view)
CREATE INDEX IF NOT EXISTS idx_orders_preparing 
ON orders(restaurant_id, preparing_at)
WHERE preparing_at IS NOT NULL;

-- Ready orders (for expo/pickup)
CREATE INDEX IF NOT EXISTS idx_orders_ready 
ON orders(restaurant_id, ready_at)
WHERE ready_at IS NOT NULL;

-- ============================================
-- METADATA JSONB INDEXES (Payment & Source Info)
-- Sample: {"source": "web_app", "customer_email": "...", 
--          "customer_phone": "...", "payment_status": "pending"}
-- ============================================

\echo '\n💳 Creating METADATA JSONB indexes...'

-- Payment status in metadata
CREATE INDEX IF NOT EXISTS idx_orders_metadata_payment_status 
ON orders((metadata->>'payment_status'))
WHERE metadata->>'payment_status' IS NOT NULL;

-- Source tracking (web_app, kiosk, voice, etc.)
CREATE INDEX IF NOT EXISTS idx_orders_metadata_source 
ON orders((metadata->>'source'))
WHERE metadata->>'source' IS NOT NULL;

-- Customer email for lookups
CREATE INDEX IF NOT EXISTS idx_orders_metadata_customer_email 
ON orders((metadata->>'customer_email'))
WHERE metadata->>'customer_email' IS NOT NULL;

-- Customer phone for lookups
CREATE INDEX IF NOT EXISTS idx_orders_metadata_customer_phone 
ON orders((metadata->>'customer_phone'))
WHERE metadata->>'customer_phone' IS NOT NULL;

-- Square payment ID (if stored)
CREATE INDEX IF NOT EXISTS idx_orders_metadata_square_payment 
ON orders((metadata->>'square_payment_id'))
WHERE metadata->>'square_payment_id' IS NOT NULL;

-- ============================================
-- MENU_ITEMS TABLE INDEXES
-- Your columns: id, restaurant_id, category_id, name, description,
-- price, active, available, dietary_flags(jsonb), modifiers(jsonb),
-- aliases(jsonb), prep_time_minutes, image_url, external_id
-- ============================================

\echo '\n🍔 Creating MENU_ITEMS table indexes...'

-- Restaurant + available items (most common query)
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_available 
ON menu_items(restaurant_id, available)
WHERE available = true;

-- Restaurant + active items
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_active 
ON menu_items(restaurant_id, active)
WHERE active = true;

-- Category lookup (you have category_id, not category)
CREATE INDEX IF NOT EXISTS idx_menu_items_category 
ON menu_items(restaurant_id, category_id);

-- Name search (for menu item lookups)
CREATE INDEX IF NOT EXISTS idx_menu_items_name 
ON menu_items(restaurant_id, name);

-- Price range queries
CREATE INDEX IF NOT EXISTS idx_menu_items_price 
ON menu_items(restaurant_id, price)
WHERE active = true AND available = true;

-- External ID for integrations
CREATE INDEX IF NOT EXISTS idx_menu_items_external_id 
ON menu_items(external_id)
WHERE external_id IS NOT NULL;

-- Prep time for kitchen optimization
CREATE INDEX IF NOT EXISTS idx_menu_items_prep_time 
ON menu_items(restaurant_id, prep_time_minutes)
WHERE prep_time_minutes IS NOT NULL;

-- ============================================
-- RESTAURANTS TABLE INDEXES
-- Your columns: id, name, slug, timezone, settings(jsonb),
-- active, created_at, updated_at
-- ============================================

\echo '\n🏪 Creating RESTAURANTS table indexes...'

-- Active restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_active 
ON restaurants(active)
WHERE active = true;

-- Slug for URL routing
CREATE INDEX IF NOT EXISTS idx_restaurants_slug 
ON restaurants(slug)
WHERE slug IS NOT NULL;

-- Name search
CREATE INDEX IF NOT EXISTS idx_restaurants_name 
ON restaurants(name);

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

\echo '\n📊 Analyzing tables for query optimization...'

ANALYZE orders;
ANALYZE menu_items;
ANALYZE restaurants;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

\echo '\n✅ Verifying index creation...'

-- Show all indexes on our tables
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_stat_user_indexes ON indexrelname = indexname
WHERE schemaname = 'public'
AND tablename IN ('orders', 'menu_items', 'restaurants')
ORDER BY tablename, indexname;

-- Show table sizes
\echo '\n💾 Table sizes:'
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT COUNT(*) FROM orders WHERE tablename = 'orders' 
     UNION SELECT COUNT(*) FROM menu_items WHERE tablename = 'menu_items'
     UNION SELECT COUNT(*) FROM restaurants WHERE tablename = 'restaurants'
     LIMIT 1) as approximate_rows
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('orders', 'menu_items', 'restaurants')
ORDER BY tablename;

-- ============================================
-- TEST QUERIES TO VERIFY PERFORMANCE
-- ============================================

\echo '\n🚀 Testing index usage with EXPLAIN...'

-- Test 1: Kitchen Display Query
EXPLAIN (COSTS OFF) 
SELECT * FROM orders 
WHERE restaurant_id = '11111111-1111-1111-1111-111111111111' 
AND status IN ('new', 'pending', 'confirmed', 'preparing')
ORDER BY created_at DESC
LIMIT 20;

-- Test 2: Payment Status Query
EXPLAIN (COSTS OFF)
SELECT * FROM orders
WHERE metadata->>'payment_status' = 'pending'
AND restaurant_id = '11111111-1111-1111-1111-111111111111';

-- Test 3: Menu Items Query
EXPLAIN (COSTS OFF)
SELECT * FROM menu_items
WHERE restaurant_id = '11111111-1111-1111-1111-111111111111'
AND available = true
AND active = true;

\echo '\n========================================='
\echo '✅ INDEX CREATION COMPLETE!'
\echo '========================================='
\echo 'All indexes created based on your exact schema.'
\echo ''
\echo 'Key indexes created:'
\echo '  • Orders: 15 indexes including JSONB metadata'
\echo '  • Menu Items: 7 indexes for fast lookups'
\echo '  • Restaurants: 3 indexes for routing'
\echo ''
\echo 'Payment data properly indexed in metadata JSONB'
\echo 'Square Sandbox ready for demo mode'
\echo '========================================='