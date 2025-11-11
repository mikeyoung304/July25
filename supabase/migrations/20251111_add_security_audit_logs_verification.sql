-- Verification Script for security_audit_logs Migration
-- Run this AFTER applying 20251111_add_security_audit_logs.sql
-- Purpose: Verify table, indexes, RLS policies, and constraints are correctly created

-- ============================================================================
-- VERIFICATION 1: Table Exists with Correct Columns
-- ============================================================================

SELECT
  'security_audit_logs table exists' AS check_name,
  EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'security_audit_logs'
  ) AS result;

-- Expected: result = true

-- ============================================================================
-- VERIFICATION 2: Column Definitions
-- ============================================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'security_audit_logs'
ORDER BY ordinal_position;

-- Expected 10 columns:
-- id (uuid, NOT NULL, default uuid_generate_v4())
-- event_type (text, NOT NULL)
-- user_id (text, NOT NULL)
-- authenticated_restaurant_id (text, NOT NULL)
-- attempted_restaurant_id (text, NOT NULL)
-- session_id (text, nullable)
-- ip_address (text, nullable)
-- user_agent (text, nullable)
-- severity (text, NOT NULL)
-- created_at (timestamp with time zone, NOT NULL, default NOW())

-- ============================================================================
-- VERIFICATION 3: Indexes Created
-- ============================================================================

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'security_audit_logs'
ORDER BY indexname;

-- Expected 5 indexes:
-- idx_security_audit_created_at (created_at DESC)
-- idx_security_audit_event_type (event_type)
-- idx_security_audit_restaurant_time (authenticated_restaurant_id, created_at DESC)
-- idx_security_audit_severity (severity)
-- idx_security_audit_user_id (user_id)

-- ============================================================================
-- VERIFICATION 4: CHECK Constraint on Severity
-- ============================================================================

SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'security_audit_logs'::regclass
AND contype = 'c';

-- Expected: severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')

-- ============================================================================
-- VERIFICATION 5: RLS Enabled
-- ============================================================================

SELECT
  'RLS enabled on security_audit_logs' AS check_name,
  relrowsecurity AS result
FROM pg_class
WHERE relname = 'security_audit_logs';

-- Expected: result = true

-- ============================================================================
-- VERIFICATION 6: RLS Policy Exists
-- ============================================================================

SELECT
  policyname,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'security_audit_logs';

-- Expected: security_audit_service_only policy for ALL commands

-- ============================================================================
-- VERIFICATION 7: Test Insert (As Service Role)
-- ============================================================================

-- This should be run via application code with service role credentials
-- DO NOT run this manually as it will fail if not using service role

-- INSERT INTO security_audit_logs (
--   event_type,
--   user_id,
--   authenticated_restaurant_id,
--   attempted_restaurant_id,
--   severity
-- ) VALUES (
--   'TEST_VERIFICATION',
--   'test-user-id',
--   'test-restaurant-a',
--   'test-restaurant-b',
--   'INFO'
-- );

-- SELECT * FROM security_audit_logs WHERE event_type = 'TEST_VERIFICATION';
-- DELETE FROM security_audit_logs WHERE event_type = 'TEST_VERIFICATION';

-- ============================================================================
-- VERIFICATION 8: Performance - Index Usage Check
-- ============================================================================

EXPLAIN (ANALYZE FALSE, COSTS FALSE)
SELECT * FROM security_audit_logs
WHERE user_id = 'test-user'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Index Scan using idx_security_audit_user_id

EXPLAIN (ANALYZE FALSE, COSTS FALSE)
SELECT * FROM security_audit_logs
WHERE severity = 'CRITICAL'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Bitmap Index Scan using idx_security_audit_severity

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

-- Run this to get a summary of all verification checks
SELECT
  'Migration 20251111_add_security_audit_logs.sql' AS migration,
  'Verification Complete' AS status,
  NOW() AS verified_at;

-- If all checks pass, migration is successfully applied
