-- Migration: Fix security_audit_logs Foreign Key Constraints
-- Date: 2025-11-21
-- Phase: P0 Critical - Database Schema Fix
-- Description: Convert restaurant_id fields from TEXT to UUID and add proper foreign key constraints
--              to maintain referential integrity with restaurants table
-- Related: VOICE_MENU_CONNECTION_INVESTIGATION_HANDOFF.md (P0 Database Schema Issue)

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (Run in reverse order if needed)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_security_audit_logs_restaurant_id;
-- DROP INDEX IF EXISTS idx_security_audit_logs_attempted_restaurant_id;
-- ALTER TABLE security_audit_logs DROP CONSTRAINT IF EXISTS fk_security_audit_attempted_restaurant;
-- ALTER TABLE security_audit_logs DROP CONSTRAINT IF EXISTS fk_security_audit_authenticated_restaurant;
-- ALTER TABLE security_audit_logs ALTER COLUMN attempted_restaurant_id TYPE TEXT;
-- ALTER TABLE security_audit_logs ALTER COLUMN authenticated_restaurant_id TYPE TEXT;

-- ============================================================================
-- PART 1: Data Cleanup - Remove Invalid Restaurant IDs
-- ============================================================================

-- Clean invalid data from authenticated_restaurant_id
-- Remove any records that don't have a valid UUID format
DELETE FROM security_audit_logs
WHERE authenticated_restaurant_id IS NOT NULL
  AND authenticated_restaurant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Clean invalid data from attempted_restaurant_id
DELETE FROM security_audit_logs
WHERE attempted_restaurant_id IS NOT NULL
  AND attempted_restaurant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Clean records with restaurant IDs that don't exist in restaurants table
-- This ensures referential integrity before adding FK constraints
DELETE FROM security_audit_logs
WHERE authenticated_restaurant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM restaurants WHERE id::text = authenticated_restaurant_id
  );

DELETE FROM security_audit_logs
WHERE attempted_restaurant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM restaurants WHERE id::text = attempted_restaurant_id
  );

-- ============================================================================
-- PART 2: Convert Columns from TEXT to UUID
-- ============================================================================

-- Convert authenticated_restaurant_id from TEXT to UUID
-- The USING clause handles the type conversion
ALTER TABLE security_audit_logs
  ALTER COLUMN authenticated_restaurant_id TYPE UUID USING authenticated_restaurant_id::uuid;

-- Convert attempted_restaurant_id from TEXT to UUID
ALTER TABLE security_audit_logs
  ALTER COLUMN attempted_restaurant_id TYPE UUID USING attempted_restaurant_id::uuid;

-- ============================================================================
-- PART 3: Add Foreign Key Constraints
-- ============================================================================

-- Add FK constraint for authenticated_restaurant_id -> restaurants(id)
-- ON DELETE CASCADE: If a restaurant is deleted, remove all related audit logs
-- This maintains data consistency and prevents orphaned records
ALTER TABLE security_audit_logs
  ADD CONSTRAINT fk_security_audit_authenticated_restaurant
    FOREIGN KEY (authenticated_restaurant_id)
    REFERENCES restaurants(id)
    ON DELETE CASCADE;

-- Add FK constraint for attempted_restaurant_id -> restaurants(id)
-- ON DELETE CASCADE: If a restaurant is deleted, remove all related audit logs
ALTER TABLE security_audit_logs
  ADD CONSTRAINT fk_security_audit_attempted_restaurant
    FOREIGN KEY (attempted_restaurant_id)
    REFERENCES restaurants(id)
    ON DELETE CASCADE;

-- ============================================================================
-- PART 4: Add Performance Indexes
-- ============================================================================

-- Index for authenticated_restaurant_id queries
-- This optimizes queries filtering by the authenticated restaurant
-- Note: The composite index idx_security_audit_restaurant_time already exists
-- but it may not be optimal for all queries, so we add a dedicated index
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_restaurant_id
  ON security_audit_logs(authenticated_restaurant_id);

-- Index for attempted_restaurant_id queries
-- This optimizes queries filtering by attempted access restaurant
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_attempted_restaurant_id
  ON security_audit_logs(attempted_restaurant_id);

-- ============================================================================
-- PART 5: Update Table Documentation
-- ============================================================================

COMMENT ON COLUMN security_audit_logs.authenticated_restaurant_id IS
'Restaurant ID from user JWT authentication token (UUID, FK to restaurants.id, CASCADE delete)';

COMMENT ON COLUMN security_audit_logs.attempted_restaurant_id IS
'Restaurant ID the user attempted to access - different from authenticated restaurant (UUID, FK to restaurants.id, CASCADE delete)';

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================

-- Verify column types are UUID
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'security_audit_logs'
--   AND column_name IN ('authenticated_restaurant_id', 'attempted_restaurant_id');
-- Expected: data_type = 'uuid' for both

-- Verify foreign key constraints exist
-- SELECT
--   tc.constraint_name,
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON tc.constraint_name = rc.constraint_name
-- WHERE tc.table_name = 'security_audit_logs'
--   AND tc.constraint_type = 'FOREIGN KEY';
-- Expected: 2 constraints with delete_rule = 'CASCADE'

-- Verify indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'security_audit_logs'
--   AND indexname IN ('idx_security_audit_logs_restaurant_id', 'idx_security_audit_logs_attempted_restaurant_id');
-- Expected: Both indexes should be present

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
