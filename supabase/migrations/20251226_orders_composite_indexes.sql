-- Migration: Add composite indexes for orders table optimization
-- Created: 2025-12-26
-- Purpose: Optimize order history and scheduled orders queries
--
-- NOTE: The following indexes are NOT added because they already exist:
--   - idx_orders_restaurant_status (created in 20251015_multi_tenancy_rls_and_pin_fix.sql)
--
-- NOTE: The table_id column does not exist in orders table (only table_number as text).
-- A table_number index is not useful for status lookups due to its text type.

-- Index for order history queries with sorting
-- Covers common query: SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created
ON orders (restaurant_id, created_at DESC);

-- Composite index for scheduled orders queries
-- Covers query: SELECT * FROM orders WHERE restaurant_id = ? AND is_scheduled = true
CREATE INDEX IF NOT EXISTS idx_orders_scheduled
ON orders (restaurant_id, is_scheduled, auto_fire_time) WHERE is_scheduled = true;

COMMENT ON INDEX idx_orders_restaurant_created IS 'Optimize order history pagination';
COMMENT ON INDEX idx_orders_scheduled IS 'Optimize scheduled orders auto-fire queries';
