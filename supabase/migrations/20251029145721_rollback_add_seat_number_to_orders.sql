-- ============================================================================
-- Rollback Migration: 20251029145721_rollback_add_seat_number_to_orders
-- ============================================================================
-- Purpose: Rollback seat_number column addition from orders table
-- Author: DATABASE_AGENT (Claude Code)
-- Created: 2025-10-29
-- Deployed: [Only use if rollback is needed]
-- Related:
--   - Reverses: 20251029145721_add_seat_number_to_orders.sql
--   - WARNING: This will delete seat_number data permanently
-- ============================================================================

-- WARNING: Running this migration will permanently delete all seat_number data
-- Ensure you have a backup before proceeding

-- ============================================================================
-- DOWN MIGRATION: Remove seat_number column and indexes
-- ============================================================================

-- Drop single-column index on seat_number
DROP INDEX IF EXISTS idx_orders_seat_number;

-- Drop composite index on table_number and seat_number
DROP INDEX IF EXISTS idx_orders_table_seat;

-- Remove seat_number column from orders table
-- This will permanently delete all seat assignment data
ALTER TABLE orders DROP COLUMN IF EXISTS seat_number;

-- ============================================================================
-- VALIDATION: Verify the rollback was successful
-- ============================================================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_index_exists BOOLEAN;
  v_seat_index_exists BOOLEAN;
BEGIN
  -- Check if seat_number column was removed
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'seat_number'
  ) INTO v_column_exists;

  IF v_column_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: seat_number column still exists in orders table';
  END IF;

  -- Check if composite index was removed
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'orders'
    AND indexname = 'idx_orders_table_seat'
  ) INTO v_index_exists;

  IF v_index_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: idx_orders_table_seat index still exists';
  END IF;

  -- Check if single-column index was removed
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'orders'
    AND indexname = 'idx_orders_seat_number'
  ) INTO v_seat_index_exists;

  IF v_seat_index_exists THEN
    RAISE EXCEPTION 'Rollback validation failed: idx_orders_seat_number index still exists';
  END IF;

  RAISE NOTICE '✓ Rollback successful: seat_number column removed from orders table';
  RAISE NOTICE '✓ Index removed: idx_orders_table_seat';
  RAISE NOTICE '✓ Index removed: idx_orders_seat_number';
  RAISE NOTICE '⚠ All seat assignment data has been permanently deleted';
END $$;
