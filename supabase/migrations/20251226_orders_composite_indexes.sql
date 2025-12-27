-- Migration: Add composite indexes for orders table optimization
-- Created: 2025-12-26
-- Purpose: Optimize scheduled orders queries
--
-- NOTE: The following indexes are NOT added because they already exist:
--   - idx_orders_restaurant_status (created in 20251015_multi_tenancy_rls_and_pin_fix.sql)
--   - idx_orders_restaurant_created (created in 20251015_multi_tenancy_rls_and_pin_fix.sql)
--
-- NOTE: The table_id column does not exist in orders table (only table_number as text).
-- A table_number index is not useful for status lookups due to its text type.

-- Composite index for scheduled orders queries
-- Covers query: SELECT * FROM orders WHERE restaurant_id = ? AND is_scheduled = true
-- NOTE: A similar index idx_orders_scheduled_restaurant exists with additional
--       `manually_fired = false` condition. This simpler index covers broader use cases.
CREATE INDEX IF NOT EXISTS idx_orders_scheduled
ON orders (restaurant_id, is_scheduled, auto_fire_time) WHERE is_scheduled = true;

COMMENT ON INDEX idx_orders_scheduled IS 'Optimize scheduled orders auto-fire queries';
