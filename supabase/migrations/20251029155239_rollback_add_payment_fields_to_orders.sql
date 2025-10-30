-- ============================================================================
-- Rollback Migration: 20251029155239_rollback_add_payment_fields_to_orders
-- ============================================================================
-- Purpose: Rollback payment-related fields from orders table
-- Author: DATABASE_AGENT (Claude Code)
-- Created: 2025-10-29
-- Related: Rollback for 20251029155239_add_payment_fields_to_orders.sql
-- WARNING: This will remove all payment data from the orders table!
-- ============================================================================

-- IMPORTANT: This rollback will permanently delete payment data
-- Ensure you have a backup before running this migration

-- ============================================================================
-- DOWN MIGRATION: Remove payment-related columns and indexes
-- ============================================================================

-- Drop foreign key constraint first (dependencies must be removed first)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_closed_by_user;

-- Drop indexes (in reverse order of creation)
DROP INDEX IF EXISTS idx_orders_payment_method;
DROP INDEX IF EXISTS idx_orders_check_closed;
DROP INDEX IF EXISTS idx_orders_payment_status;

-- Drop columns (in reverse order of creation)
-- This will permanently delete all payment data!
ALTER TABLE orders DROP COLUMN IF EXISTS closed_by_user_id;
ALTER TABLE orders DROP COLUMN IF EXISTS check_closed_at;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_id;
ALTER TABLE orders DROP COLUMN IF EXISTS change_given;
ALTER TABLE orders DROP COLUMN IF EXISTS cash_received;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_amount;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_method;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;

-- ============================================================================
-- VALIDATION: Verify the rollback was successful
-- ============================================================================

DO $$
DECLARE
  v_payment_status_exists BOOLEAN;
  v_payment_method_exists BOOLEAN;
  v_payment_amount_exists BOOLEAN;
  v_cash_received_exists BOOLEAN;
  v_change_given_exists BOOLEAN;
  v_payment_id_exists BOOLEAN;
  v_check_closed_at_exists BOOLEAN;
  v_closed_by_user_id_exists BOOLEAN;
  v_idx_payment_status_exists BOOLEAN;
  v_idx_check_closed_exists BOOLEAN;
  v_idx_payment_method_exists BOOLEAN;
  v_fk_constraint_exists BOOLEAN;
BEGIN
  -- Check that all columns were removed
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) INTO v_payment_status_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) INTO v_payment_method_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_amount'
  ) INTO v_payment_amount_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cash_received'
  ) INTO v_cash_received_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'change_given'
  ) INTO v_change_given_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_id'
  ) INTO v_payment_id_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'check_closed_at'
  ) INTO v_check_closed_at_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'closed_by_user_id'
  ) INTO v_closed_by_user_id_exists;

  -- Check that all indexes were removed
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'orders' AND indexname = 'idx_orders_payment_status'
  ) INTO v_idx_payment_status_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'orders' AND indexname = 'idx_orders_check_closed'
  ) INTO v_idx_check_closed_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'orders' AND indexname = 'idx_orders_payment_method'
  ) INTO v_idx_payment_method_exists;

  -- Check that foreign key constraint was removed
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_orders_closed_by_user'
  ) INTO v_fk_constraint_exists;

  -- Raise errors if any columns/indexes still exist
  IF v_payment_status_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: payment_status column still exists';
  END IF;

  IF v_payment_method_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: payment_method column still exists';
  END IF;

  IF v_payment_amount_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: payment_amount column still exists';
  END IF;

  IF v_cash_received_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: cash_received column still exists';
  END IF;

  IF v_change_given_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: change_given column still exists';
  END IF;

  IF v_payment_id_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: payment_id column still exists';
  END IF;

  IF v_check_closed_at_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: check_closed_at column still exists';
  END IF;

  IF v_closed_by_user_id_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: closed_by_user_id column still exists';
  END IF;

  IF v_idx_payment_status_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: idx_orders_payment_status index still exists';
  END IF;

  IF v_idx_check_closed_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: idx_orders_check_closed index still exists';
  END IF;

  IF v_idx_payment_method_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: idx_orders_payment_method index still exists';
  END IF;

  IF v_fk_constraint_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: fk_orders_closed_by_user constraint still exists';
  END IF;

  -- Success messages
  RAISE NOTICE '✓ Rollback successful: All payment fields removed from orders table';
  RAISE NOTICE '✓ Column removed: payment_status';
  RAISE NOTICE '✓ Column removed: payment_method';
  RAISE NOTICE '✓ Column removed: payment_amount';
  RAISE NOTICE '✓ Column removed: cash_received';
  RAISE NOTICE '✓ Column removed: change_given';
  RAISE NOTICE '✓ Column removed: payment_id';
  RAISE NOTICE '✓ Column removed: check_closed_at';
  RAISE NOTICE '✓ Column removed: closed_by_user_id';
  RAISE NOTICE '✓ Index removed: idx_orders_payment_status';
  RAISE NOTICE '✓ Index removed: idx_orders_check_closed';
  RAISE NOTICE '✓ Index removed: idx_orders_payment_method';
  RAISE NOTICE '✓ Foreign key constraint removed: fk_orders_closed_by_user';
  RAISE NOTICE 'Orders table restored to pre-payment-fields state';
END $$;

-- ============================================================================
-- TO RESTORE: Re-run the original migration
-- ============================================================================
-- To restore the payment fields, re-run:
-- 20251029155239_add_payment_fields_to_orders.sql
