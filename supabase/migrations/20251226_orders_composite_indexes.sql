-- Migration: Add composite indexes for orders table optimization
-- Created: 2025-12-26
-- Purpose: Optimize KDS queries, order history, and table lookups

-- Index for KDS queries (restaurant_id + status)
-- Covers common query: SELECT * FROM orders WHERE restaurant_id = ? AND status IN (...)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_status
ON orders (restaurant_id, status);

-- Index for order history queries with sorting
-- Covers common query: SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_created
ON orders (restaurant_id, created_at DESC);

-- Partial index for table-specific lookups (only for orders with a table)
-- Covers common query: SELECT * FROM orders WHERE table_id = ? AND status = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_table_status
ON orders (table_id, status) WHERE table_id IS NOT NULL;

-- Composite index for scheduled orders queries
-- Covers query: SELECT * FROM orders WHERE restaurant_id = ? AND is_scheduled = true
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_scheduled
ON orders (restaurant_id, is_scheduled, auto_fire_time) WHERE is_scheduled = true;

COMMENT ON INDEX idx_orders_restaurant_status IS 'Optimize KDS and status-based order queries';
COMMENT ON INDEX idx_orders_restaurant_created IS 'Optimize order history pagination';
COMMENT ON INDEX idx_orders_table_status IS 'Optimize table-specific order lookups';
COMMENT ON INDEX idx_orders_scheduled IS 'Optimize scheduled orders auto-fire queries';
