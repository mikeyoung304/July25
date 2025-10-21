-- =============================================================================
-- Order Flow Database Verification Checklist
-- =============================================================================
-- Purpose: Verify database schema state after P0 audit deployment (Oct 19)
-- Run this in: Supabase SQL Editor
-- Date: 2025-10-20
--
-- Instructions:
-- 1. Copy this entire file
-- 2. Paste into Supabase SQL Editor (https://app.supabase.com/project/YOUR_PROJECT/sql)
-- 3. Run query
-- 4. Review results for each check
-- 5. Any FAILED checks indicate issues needing fixes
--
-- Expected Result: All checks should show status='PASS'
-- =============================================================================

-- Create temporary results table
CREATE TEMP TABLE IF NOT EXISTS verification_results (
  check_number INTEGER,
  check_name TEXT,
  status TEXT,
  details TEXT,
  recommendation TEXT
);

-- =============================================================================
-- CHECK #1: Verify orders table has version column
-- =============================================================================
-- Purpose: Confirm optimistic locking column exists (added Oct 19)
-- Expected: version column present with INTEGER type
-- Related: Migration 20251019_add_version_to_orders.sql
-- =============================================================================

INSERT INTO verification_results
SELECT
  1 AS check_number,
  'orders.version column exists' AS check_name,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END AS status,
  CASE
    WHEN COUNT(*) > 0 THEN
      'Column found: ' || MAX(data_type) || ', default: ' || MAX(column_default)
    ELSE
      'Column NOT FOUND - optimistic locking will not work!'
  END AS details,
  CASE
    WHEN COUNT(*) = 0 THEN
      'Run migration: supabase/migrations/20251019_add_version_to_orders.sql'
    ELSE NULL
  END AS recommendation
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name = 'version';

-- =============================================================================
-- CHECK #2: Verify restaurants table has tax_rate column
-- =============================================================================
-- Purpose: Confirm per-restaurant tax configuration exists (added Oct 19)
-- Expected: tax_rate column present with DECIMAL(5,4) type
-- Related: Migration 20251019_add_tax_rate_to_restaurants.sql, ADR-007
-- =============================================================================

INSERT INTO verification_results
SELECT
  2 AS check_number,
  'restaurants.tax_rate column exists' AS check_name,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END AS status,
  CASE
    WHEN COUNT(*) > 0 THEN
      'Column found: ' || MAX(data_type) || ', precision: ' || MAX(numeric_precision) || ',' || MAX(numeric_scale)
    ELSE
      'Column NOT FOUND - per-restaurant tax rates unavailable!'
  END AS details,
  CASE
    WHEN COUNT(*) = 0 THEN
      'Run migration: supabase/migrations/20251019_add_tax_rate_to_restaurants.sql'
    ELSE NULL
  END AS recommendation
FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name = 'tax_rate';

-- =============================================================================
-- CHECK #3: Verify all restaurants have tax_rate configured
-- =============================================================================
-- Purpose: Ensure no NULL tax rates that would cause calculation errors
-- Expected: All restaurants have tax_rate set (default 0.0825)
-- =============================================================================

INSERT INTO verification_results
SELECT
  3 AS check_number,
  'All restaurants have tax_rate set' AS check_name,
  CASE
    WHEN null_count = 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END AS status,
  'Total restaurants: ' || total || ', with NULL tax_rate: ' || null_count || ', range: ' || min_rate || ' to ' || max_rate AS details,
  CASE
    WHEN null_count > 0 THEN
      'UPDATE restaurants SET tax_rate = 0.0825 WHERE tax_rate IS NULL;'
    ELSE NULL
  END AS recommendation
FROM (
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN tax_rate IS NULL THEN 1 ELSE 0 END) AS null_count,
    MIN(tax_rate) AS min_rate,
    MAX(tax_rate) AS max_rate
  FROM restaurants
) AS stats;

-- =============================================================================
-- CHECK #4: Verify create_order_with_audit RPC function exists
-- =============================================================================
-- Purpose: Confirm atomic order creation function deployed (added Oct 19)
-- Expected: Function exists in public schema
-- Related: Migration 20251019_add_create_order_with_audit_rpc.sql, ADR-003
-- =============================================================================

INSERT INTO verification_results
SELECT
  4 AS check_number,
  'create_order_with_audit RPC function exists' AS check_name,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END AS status,
  CASE
    WHEN COUNT(*) > 0 THEN
      'Function found, language: ' || MAX(l.lanname) || ', security: ' ||
      CASE WHEN BOOL_OR(p.prosecdef) THEN 'DEFINER' ELSE 'INVOKER' END
    ELSE
      'Function NOT FOUND - atomic order creation unavailable!'
  END AS details,
  CASE
    WHEN COUNT(*) = 0 THEN
      'Run migration: supabase/migrations/20251019_add_create_order_with_audit_rpc.sql'
    ELSE NULL
  END AS recommendation
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_order_with_audit';

-- =============================================================================
-- CHECK #5: Verify RPC function RETURNS includes version column
-- =============================================================================
-- Purpose: Confirm RPC returns version field (CRITICAL BUG if missing)
-- Expected: RETURNS TABLE should include version INTEGER
-- Related: ORDER_FAILURE_INCIDENT_REPORT.md - Hypothesis #1
-- =============================================================================

INSERT INTO verification_results
SELECT
  5 AS check_number,
  'create_order_with_audit RETURNS includes version' AS check_name,
  CASE
    WHEN pg_get_function_result(p.oid) LIKE '%version%' THEN 'PASS ✅'
    ELSE 'FAIL ❌ CRITICAL'
  END AS status,
  'RETURNS signature: ' || pg_get_function_result(p.oid) AS details,
  CASE
    WHEN pg_get_function_result(p.oid) NOT LIKE '%version%' THEN
      'CRITICAL: Apply fix migration to add version to RETURNS TABLE. See PR_PLAN.md'
    ELSE NULL
  END AS recommendation
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_order_with_audit';

-- =============================================================================
-- CHECK #6: Verify RPC function parameter count
-- =============================================================================
-- Purpose: Ensure RPC has expected 12 parameters
-- Expected: 12 parameters (p_restaurant_id through p_metadata)
-- =============================================================================

INSERT INTO verification_results
SELECT
  6 AS check_number,
  'create_order_with_audit has correct parameters' AS check_name,
  CASE
    WHEN pronargs = 12 THEN 'PASS ✅'
    ELSE 'WARN ⚠️'
  END AS status,
  'Parameter count: ' || pronargs || ', expected: 12' AS details,
  CASE
    WHEN pronargs != 12 THEN
      'Parameter count mismatch - verify migration applied correctly'
    ELSE NULL
  END AS recommendation
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_order_with_audit';

-- =============================================================================
-- CHECK #7: Verify orders table columns match expected schema
-- =============================================================================
-- Purpose: Detect schema drift between DB and code expectations
-- Expected: All critical columns present
-- =============================================================================

INSERT INTO verification_results
SELECT
  7 AS check_number,
  'orders table has all expected columns' AS check_name,
  CASE
    WHEN missing_count = 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END AS status,
  'Missing columns: ' || COALESCE(missing_columns, 'none') AS details,
  CASE
    WHEN missing_count > 0 THEN
      'Verify schema migrations applied in correct order'
    ELSE NULL
  END AS recommendation
FROM (
  SELECT
    SUM(CASE WHEN c.column_name IS NULL THEN 1 ELSE 0 END) AS missing_count,
    STRING_AGG(CASE WHEN c.column_name IS NULL THEN expected.col ELSE NULL END, ', ') AS missing_columns
  FROM (
    VALUES
      ('id'), ('restaurant_id'), ('order_number'), ('status'), ('type'),
      ('items'), ('subtotal'), ('tax'), ('total_amount'),
      ('customer_name'), ('table_number'), ('metadata'),
      ('created_at'), ('updated_at'), ('version'),
      ('preparing_at'), ('ready_at'), ('completed_at'), ('cancelled_at')
  ) AS expected(col)
  LEFT JOIN information_schema.columns c
    ON c.table_name = 'orders'
    AND c.column_name = expected.col
) AS column_check;

-- =============================================================================
-- CHECK #8: Verify RLS policies exist on orders table
-- =============================================================================
-- Purpose: Ensure multi-tenancy isolation enforced (ADR-002)
-- Expected: At least one RLS policy for tenant isolation
-- =============================================================================

INSERT INTO verification_results
SELECT
  8 AS check_number,
  'orders table has RLS policies' AS check_name,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END AS status,
  'RLS enabled: ' || (SELECT relrowsecurity FROM pg_class WHERE relname = 'orders')::TEXT ||
  ', policy count: ' || COUNT(*) AS details,
  CASE
    WHEN COUNT(*) = 0 THEN
      'CRITICAL: Add RLS policies to prevent cross-tenant data access'
    ELSE NULL
  END AS recommendation
FROM pg_policies
WHERE tablename = 'orders';

-- =============================================================================
-- CHECK #9: Verify order_status_history table exists
-- =============================================================================
-- Purpose: Confirm audit logging table present for RPC function
-- Expected: Table exists for storing status change history
-- Related: ADR-003 (Transaction Requirements)
-- =============================================================================

INSERT INTO verification_results
SELECT
  9 AS check_number,
  'order_status_history table exists' AS check_name,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END AS status,
  CASE
    WHEN COUNT(*) > 0 THEN
      'Table found with ' || (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'order_status_history')::TEXT || ' columns'
    ELSE
      'Table NOT FOUND - audit logging unavailable!'
  END AS details,
  CASE
    WHEN COUNT(*) = 0 THEN
      'Create order_status_history table for audit trail'
    ELSE NULL
  END AS recommendation
FROM information_schema.tables
WHERE table_name = 'order_status_history';

-- =============================================================================
-- CHECK #10: Verify recent orders have version initialized
-- =============================================================================
-- Purpose: Ensure existing orders got version=1 default value
-- Expected: All orders created after Oct 19 have version >= 1
-- =============================================================================

INSERT INTO verification_results
SELECT
  10 AS check_number,
  'Recent orders have version initialized' AS check_name,
  CASE
    WHEN null_count = 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌'
  END AS status,
  'Orders checked: ' || total_count || ', with NULL version: ' || null_count ||
  ', version range: ' || min_version || ' to ' || max_version AS details,
  CASE
    WHEN null_count > 0 THEN
      'UPDATE orders SET version = 1 WHERE version IS NULL;'
    ELSE NULL
  END AS recommendation
FROM (
  SELECT
    COUNT(*) AS total_count,
    SUM(CASE WHEN version IS NULL THEN 1 ELSE 0 END) AS null_count,
    MIN(version) AS min_version,
    MAX(version) AS max_version
  FROM orders
  WHERE created_at >= '2025-10-19'::DATE
) AS stats;

-- =============================================================================
-- CHECK #11: Verify no orphaned orders (missing items)
-- =============================================================================
-- Purpose: Detect data integrity issues (empty items JSONB array)
-- Expected: All orders have at least one item
-- =============================================================================

INSERT INTO verification_results
SELECT
  11 AS check_number,
  'No orders with empty items array' AS check_name,
  CASE
    WHEN orphan_count = 0 THEN 'PASS ✅'
    ELSE 'WARN ⚠️'
  END AS status,
  'Orders with empty items: ' || orphan_count || ' out of ' || total_count AS details,
  CASE
    WHEN orphan_count > 0 THEN
      'Investigate orders: SELECT id, order_number FROM orders WHERE jsonb_array_length(items) = 0;'
    ELSE NULL
  END AS recommendation
FROM (
  SELECT
    COUNT(*) AS total_count,
    SUM(CASE WHEN jsonb_array_length(items) = 0 THEN 1 ELSE 0 END) AS orphan_count
  FROM orders
) AS stats;

-- =============================================================================
-- CHECK #12: Verify batch_update_tables RPC exists (from audit fixes)
-- =============================================================================
-- Purpose: Confirm floor plan batch update optimization deployed
-- Expected: Function exists for efficient table position updates
-- Related: DATABASE.md - Bulk Operations Pattern
-- =============================================================================

INSERT INTO verification_results
SELECT
  12 AS check_number,
  'batch_update_tables RPC function exists' AS check_name,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS ✅'
    ELSE 'WARN ⚠️'
  END AS status,
  CASE
    WHEN COUNT(*) > 0 THEN
      'Function found'
    ELSE
      'Function not found - floor plan updates may be slow'
  END AS details,
  CASE
    WHEN COUNT(*) = 0 THEN
      'Optional: Deploy batch_update_tables RPC for better performance'
    ELSE NULL
  END AS recommendation
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'batch_update_tables';

-- =============================================================================
-- DISPLAY RESULTS
-- =============================================================================

SELECT
  check_number AS "#",
  check_name AS "Check",
  status AS "Status",
  details AS "Details",
  recommendation AS "Action Required"
FROM verification_results
ORDER BY check_number;

-- =============================================================================
-- SUMMARY STATISTICS
-- =============================================================================

SELECT
  '=== VERIFICATION SUMMARY ===' AS summary,
  SUM(CASE WHEN status LIKE '%PASS%' THEN 1 ELSE 0 END) AS passed,
  SUM(CASE WHEN status LIKE '%FAIL%' THEN 1 ELSE 0 END) AS failed,
  SUM(CASE WHEN status LIKE '%WARN%' THEN 1 ELSE 0 END) AS warnings,
  COUNT(*) AS total_checks
FROM verification_results;

-- =============================================================================
-- CRITICAL ISSUES (Failures Only)
-- =============================================================================

SELECT
  '=== CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION ===' AS alert,
  check_number AS "#",
  check_name AS "Failed Check",
  recommendation AS "Required Action"
FROM verification_results
WHERE status LIKE '%FAIL%'
ORDER BY check_number;

-- =============================================================================
-- ADDITIONAL DIAGNOSTIC QUERIES
-- =============================================================================
-- Uncomment these to run deeper diagnostics
-- =============================================================================

-- Query #1: Show RPC function source code
-- SELECT pg_get_functiondef(oid) AS function_definition
-- FROM pg_proc
-- WHERE proname = 'create_order_with_audit';

-- Query #2: Show all RLS policies on orders
-- SELECT
--   policyname,
--   cmd AS operation,
--   qual AS using_expression,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'orders';

-- Query #3: Show recent order totals for validation
-- SELECT
--   order_number,
--   subtotal,
--   tax,
--   total_amount,
--   (subtotal + tax) AS calculated_total,
--   total_amount - (subtotal + tax) AS difference
-- FROM orders
-- WHERE created_at >= NOW() - INTERVAL '24 hours'
-- ORDER BY created_at DESC
-- LIMIT 20;

-- Query #4: Show restaurant tax rates
-- SELECT
--   id,
--   name,
--   tax_rate,
--   ROUND((tax_rate * 100)::NUMERIC, 2) AS tax_percentage
-- FROM restaurants
-- ORDER BY name;

-- Query #5: Show order version distribution
-- SELECT
--   version,
--   COUNT(*) AS order_count
-- FROM orders
-- GROUP BY version
-- ORDER BY version;

-- =============================================================================
-- CLEANUP
-- =============================================================================

DROP TABLE IF EXISTS verification_results;

-- =============================================================================
-- END OF VERIFICATION CHECKLIST
-- =============================================================================
-- Next Steps:
-- 1. Review results above
-- 2. Apply recommended actions for any FAILED checks
-- 3. Run fix migrations as needed (see PR_PLAN.md)
-- 4. Re-run this script to verify fixes
-- 5. Proceed with Track A deployment when all checks PASS
-- =============================================================================
