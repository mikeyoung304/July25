-- Auto-generated index creation script
-- Based on Supabase schema inspection
-- Run this via: psql $DATABASE_URL < server/scripts/generated-indexes.sql

-- Core query pattern for restaurant orders by status
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
ON orders(restaurant_id, status);

-- Order history queries
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created
ON orders(restaurant_id, created_at DESC);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status);

-- Order type filtering
CREATE INDEX IF NOT EXISTS idx_orders_type
ON orders(type);

-- Order number lookup
CREATE INDEX IF NOT EXISTS idx_orders_order_number
ON orders(restaurant_id, order_number);

-- Customer name search
CREATE INDEX IF NOT EXISTS idx_orders_customer_name
ON orders(restaurant_id, customer_name)
WHERE customer_name IS NOT NULL;

-- Kitchen Display System optimized
CREATE INDEX IF NOT EXISTS idx_orders_kds
ON orders(restaurant_id, status, created_at DESC)
WHERE status IN ('new', 'pending', 'confirmed', 'preparing', 'ready');

-- Payment status in metadata
CREATE INDEX IF NOT EXISTS idx_orders_metadata_payment_status
ON orders((metadata->>'payment_status'))
WHERE metadata->>'payment_status' IS NOT NULL;

-- Order source tracking
CREATE INDEX IF NOT EXISTS idx_orders_metadata_source
ON orders((metadata->>'source'))
WHERE metadata->>'source' IS NOT NULL;

-- Customer email lookup
CREATE INDEX IF NOT EXISTS idx_orders_metadata_customer_email
ON orders((metadata->>'customer_email'))
WHERE metadata->>'customer_email' IS NOT NULL;

-- Available menu items
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_available
ON menu_items(restaurant_id, available)
WHERE available = true;

-- Active menu items
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_active
ON menu_items(restaurant_id, active)
WHERE active = true;

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_menu_items_category
ON menu_items(restaurant_id, category_id);

-- Menu item name search
CREATE INDEX IF NOT EXISTS idx_menu_items_name
ON menu_items(restaurant_id, name);

-- Active restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_active
ON restaurants(active)
WHERE active = true;

-- URL slug routing
CREATE INDEX IF NOT EXISTS idx_restaurants_slug
ON restaurants(slug)
WHERE slug IS NOT NULL;

-- Analyze tables for query optimization
ANALYZE orders;
ANALYZE menu_items;
ANALYZE restaurants;

-- Verify indexes were created
SELECT 
    pg_indexes.tablename,
    pg_indexes.indexname,
    pg_size_pretty(pg_relation_size(pg_stat_user_indexes.indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_stat_user_indexes ON pg_indexes.indexname = pg_stat_user_indexes.indexrelname
WHERE pg_indexes.schemaname = 'public'
AND pg_indexes.tablename IN ('orders', 'menu_items', 'restaurants')
ORDER BY pg_indexes.tablename, pg_indexes.indexname;
