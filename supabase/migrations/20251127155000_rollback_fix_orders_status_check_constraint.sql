-- Rollback Migration: Restore original orders_status_check constraint
-- Original Migration: 20251127155000_fix_orders_status_check_constraint.sql
-- Date: 2025-11-27
--
-- ============================================================================
-- WARNING: DATA IMPLICATIONS
-- ============================================================================
-- This rollback will REMOVE support for the following statuses:
--   - 'new'
--   - 'confirmed'
--   - 'picked-up'
--
-- Before running this rollback, you MUST verify that no orders exist with
-- these status values, or the rollback will fail with constraint violation.
--
-- Pre-flight check (run BEFORE executing this rollback):
-- SELECT status, COUNT(*) FROM orders
-- WHERE status IN ('new', 'confirmed', 'picked-up')
-- GROUP BY status;
--
-- If any rows are returned, you must either:
-- 1. Update those orders to a different status first
-- 2. NOT run this rollback
-- ============================================================================

-- ============================================================================
-- PRE-FLIGHT CHECK
-- ============================================================================
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM orders
  WHERE status IN ('new', 'confirmed', 'picked-up');

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot rollback: % orders have statuses that will become invalid (new, confirmed, picked-up). Update or delete these orders first.', invalid_count;
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- Drop the current constraint (with 8 statuses)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Restore original constraint (with 5 statuses)
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled'));

-- ============================================================================
-- VALIDATION
-- ============================================================================
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_status_check'
    AND conrelid = 'orders'::regclass
  ) INTO constraint_exists;

  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'Rollback failed: orders_status_check constraint not created';
  END IF;

  RAISE NOTICE 'Rollback successful: orders_status_check constraint restored to original 5-status version';
END $$;
