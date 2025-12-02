-- Migration: RLS Policies for Audit Tables
-- Date: 2025-12-03
-- Description: Add Row Level Security to order_status_history and voice_order_logs
-- Resolves: TODO-103 (Missing RLS on audit tables)
-- Pattern: Following 20251202_comprehensive_rls.sql structure

-- ============================================================================
-- ORDER_STATUS_HISTORY
-- ============================================================================
-- Note: restaurant_id is nullable on this table (legacy data may have NULL)
-- Policy handles this by requiring restaurant_id IS NOT NULL for tenant access

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_order_status_history" ON order_status_history;
DROP POLICY IF EXISTS "tenant_insert_order_status_history" ON order_status_history;
DROP POLICY IF EXISTS "tenant_update_order_status_history" ON order_status_history;
DROP POLICY IF EXISTS "tenant_delete_order_status_history" ON order_status_history;
DROP POLICY IF EXISTS "service_role_order_status_history" ON order_status_history;

-- SELECT: Only rows with matching restaurant_id (NULL rows hidden from tenants)
CREATE POLICY "tenant_select_order_status_history" ON order_status_history
FOR SELECT USING (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);

-- INSERT: Must provide restaurant_id matching JWT
CREATE POLICY "tenant_insert_order_status_history" ON order_status_history
FOR INSERT WITH CHECK (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);

-- UPDATE: Only own restaurant's rows
CREATE POLICY "tenant_update_order_status_history" ON order_status_history
FOR UPDATE USING (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
)
WITH CHECK (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);

-- DELETE: Only own restaurant's rows
CREATE POLICY "tenant_delete_order_status_history" ON order_status_history
FOR DELETE USING (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);

-- Service role bypass for server-side operations
CREATE POLICY "service_role_order_status_history" ON order_status_history
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index for RLS performance
CREATE INDEX IF NOT EXISTS idx_order_status_history_restaurant_id
ON order_status_history (restaurant_id);

-- ============================================================================
-- VOICE_ORDER_LOGS
-- ============================================================================
-- Note: restaurant_id is NOT NULL on this table

ALTER TABLE voice_order_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_voice_order_logs" ON voice_order_logs;
DROP POLICY IF EXISTS "tenant_insert_voice_order_logs" ON voice_order_logs;
DROP POLICY IF EXISTS "tenant_update_voice_order_logs" ON voice_order_logs;
DROP POLICY IF EXISTS "tenant_delete_voice_order_logs" ON voice_order_logs;
DROP POLICY IF EXISTS "service_role_voice_order_logs" ON voice_order_logs;

CREATE POLICY "tenant_select_voice_order_logs" ON voice_order_logs
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_voice_order_logs" ON voice_order_logs
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_voice_order_logs" ON voice_order_logs
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_voice_order_logs" ON voice_order_logs
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- Service role bypass for server-side operations
CREATE POLICY "service_role_voice_order_logs" ON voice_order_logs
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index for RLS performance
CREATE INDEX IF NOT EXISTS idx_voice_order_logs_restaurant_id
ON voice_order_logs (restaurant_id);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
COMMENT ON POLICY "tenant_select_order_status_history" ON order_status_history IS
'Tenant isolation: Users can only view order status history for their restaurant. NULL restaurant_id rows are hidden.';

COMMENT ON POLICY "service_role_order_status_history" ON order_status_history IS
'Service role bypass: Server-side operations with service_role can access all rows including NULL restaurant_id.';

COMMENT ON POLICY "tenant_select_voice_order_logs" ON voice_order_logs IS
'Tenant isolation: Users can only view voice order logs for their restaurant.';

COMMENT ON POLICY "service_role_voice_order_logs" ON voice_order_logs IS
'Service role bypass: Server-side operations with service_role can access all rows.';

-- ============================================================================
-- TABLES - COMPOSITE INDEX FOR QUERY OPTIMIZATION (TODO-105)
-- ============================================================================
-- The most frequent Server View query:
--   SELECT * FROM tables WHERE restaurant_id = ? AND active = true ORDER BY label
-- Current index only covers restaurant_id, causing in-memory filter/sort
-- Partial composite index optimizes this specific query pattern

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tables_restaurant_active_label
ON tables (restaurant_id, label)
WHERE active = true;

COMMENT ON INDEX idx_tables_restaurant_active_label IS
'Partial composite index for Server View query optimization. Covers WHERE restaurant_id=? AND active=true ORDER BY label pattern.';

-- ============================================================================
-- VERIFICATION QUERY (run after migration to verify)
-- ============================================================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('order_status_history', 'voice_order_logs');
--
-- Expected result: rowsecurity = true for both tables
--
-- Verify index:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'tables';
-- Expected: idx_tables_restaurant_active_label with WHERE active = true
