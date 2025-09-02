-- Restaurant OS Database Optimization Script
-- Run this script in production to optimize query performance
-- Last Updated: September 2, 2025

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Orders table indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status 
ON orders(restaurant_id, status) 
WHERE status IN ('new', 'pending', 'confirmed', 'preparing', 'ready');

CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created 
ON orders(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer_email 
ON orders(customer_email) 
WHERE customer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_type_status 
ON orders(type, status);

-- Menu items indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_active 
ON menu_items(restaurant_id, active) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_menu_items_category 
ON menu_items(category_id, restaurant_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_available 
ON menu_items(restaurant_id, available) 
WHERE available = true;

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_menu_item 
ON order_items(menu_item_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id 
ON payments(order_id);

CREATE INDEX IF NOT EXISTS idx_payments_status 
ON payments(status) 
WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_payments_created_at 
ON payments(created_at DESC);

-- Users and authentication indexes
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_restaurant 
ON users(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id 
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at 
ON sessions(expires_at) 
WHERE expires_at > NOW();

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at DESC);

-- Tables indexes for floor plan
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_status 
ON tables(restaurant_id, status);

-- ============================================
-- PARTIAL INDEXES FOR SPECIFIC QUERIES
-- ============================================

-- Active orders for kitchen display
CREATE INDEX IF NOT EXISTS idx_active_kitchen_orders 
ON orders(restaurant_id, created_at DESC) 
WHERE status IN ('confirmed', 'preparing');

-- Ready orders for expo display
CREATE INDEX IF NOT EXISTS idx_ready_expo_orders 
ON orders(restaurant_id, created_at DESC) 
WHERE status = 'ready';

-- Today's orders for analytics
CREATE INDEX IF NOT EXISTS idx_todays_orders 
ON orders(restaurant_id, created_at) 
WHERE created_at >= CURRENT_DATE;

-- ============================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================

-- Daily order summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_order_summary AS
SELECT 
  restaurant_id,
  DATE(created_at) as order_date,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value,
  COUNT(DISTINCT customer_email) as unique_customers
FROM orders
GROUP BY restaurant_id, DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_order_summary 
ON mv_daily_order_summary(restaurant_id, order_date);

-- Popular menu items
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_menu_items AS
SELECT 
  mi.restaurant_id,
  mi.id as menu_item_id,
  mi.name,
  mi.category_id,
  COUNT(oi.id) as order_count,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.price * oi.quantity) as total_revenue,
  DATE_TRUNC('month', o.created_at) as month
FROM menu_items mi
JOIN order_items oi ON mi.id = oi.menu_item_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY mi.restaurant_id, mi.id, mi.name, mi.category_id, DATE_TRUNC('month', o.created_at);

CREATE INDEX IF NOT EXISTS idx_mv_popular_items 
ON mv_popular_menu_items(restaurant_id, month, order_count DESC);

-- ============================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ============================================

-- Function to get active orders efficiently
CREATE OR REPLACE FUNCTION get_active_orders(
  p_restaurant_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  status TEXT,
  type TEXT,
  created_at TIMESTAMPTZ,
  items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.order_number,
    o.status,
    o.type,
    o.created_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'name', oi.name,
          'quantity', oi.quantity,
          'modifiers', oi.modifiers
        ) ORDER BY oi.created_at
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'::jsonb
    ) as items
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE o.restaurant_id = p_restaurant_id
    AND o.status IN ('new', 'pending', 'confirmed', 'preparing', 'ready')
  GROUP BY o.id, o.order_number, o.status, o.type, o.created_at
  ORDER BY o.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MAINTENANCE PROCEDURES
-- ============================================

-- Refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_order_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_menu_items;
END;
$$ LANGUAGE plpgsql;

-- Clean up old sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Archive old orders (older than 90 days)
CREATE OR REPLACE FUNCTION archive_old_orders()
RETURNS void AS $$
BEGIN
  -- Move to archive table (create archive table first)
  INSERT INTO orders_archive 
  SELECT * FROM orders 
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status IN ('completed', 'cancelled');
  
  -- Delete from main table
  DELETE FROM orders 
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status IN ('completed', 'cancelled');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SCHEDULED JOBS (using pg_cron or similar)
-- ============================================

-- Schedule materialized view refresh every hour
-- SELECT cron.schedule('refresh-views', '0 * * * *', 'SELECT refresh_materialized_views();');

-- Schedule session cleanup every day at 2 AM
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions();');

-- Schedule order archival every Sunday at 3 AM
-- SELECT cron.schedule('archive-orders', '0 3 * * 0', 'SELECT archive_old_orders();');

-- ============================================
-- STATISTICS UPDATE
-- ============================================

-- Update table statistics for query planner
ANALYZE orders;
ANALYZE order_items;
ANALYZE menu_items;
ANALYZE users;
ANALYZE payments;
ANALYZE tables;
ANALYZE sessions;
ANALYZE audit_logs;

-- ============================================
-- CONNECTION POOLING CONFIGURATION
-- ============================================
-- Note: These settings should be configured in postgresql.conf or via ALTER SYSTEM

-- Recommended settings for production:
-- max_connections = 200
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- maintenance_work_mem = 64MB
-- work_mem = 4MB
-- wal_buffers = 16MB
-- checkpoint_completion_target = 0.9
-- random_page_cost = 1.1 (for SSD storage)

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Check index usage
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check slow queries
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time
FROM pg_stat_statements
WHERE mean_time > 100 -- queries averaging over 100ms
ORDER BY mean_time DESC
LIMIT 20;

-- Check table bloat
CREATE OR REPLACE VIEW v_table_bloat AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS live_tuples,
  n_dead_tup AS dead_tuples,
  ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0), 4) AS dead_ratio
FROM pg_stat_user_tables
WHERE n_dead_tup > 100
ORDER BY dead_ratio DESC;

COMMENT ON SCHEMA public IS 'Restaurant OS Production Database - Optimized for performance';