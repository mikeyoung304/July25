-- ============================================================================
-- Migration: 20251029145721_add_seat_number_to_orders
-- ============================================================================
-- Purpose: Add seat_number column to orders table for multi-seat ordering
-- Author: DATABASE_AGENT (Claude Code)
-- Created: 2025-10-29
-- Deployed: [Pending deployment]
-- Related:
--   - Task DB_001: Foundation for multi-seat ordering feature
--   - Enables servers to take orders seat-by-seat at tables
--   - Kitchen can identify which seat ordered what items
-- Rollback: See rollback migration or ALTER TABLE orders DROP COLUMN seat_number
-- ============================================================================

-- IMPORTANT: Use idempotent patterns to allow safe re-runs

-- ============================================================================
-- UP MIGRATION: Add seat_number column and index
-- ============================================================================

-- Add seat_number column to orders table
-- seat_number represents the position of a seat at a table (1, 2, 3, etc.)
-- NULL indicates no specific seat assignment (e.g., takeout orders)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS seat_number INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN orders.seat_number IS 'Seat position at the table (1, 2, 3, etc.). NULL for non-dine-in orders or unassigned seats. Used for multi-seat ordering to identify which seat ordered what.';

-- Create composite index for efficient queries by table and seat
-- This supports queries like "get all orders for table 5, seat 2"
-- or "show me all seats with active orders at table 5"
CREATE INDEX IF NOT EXISTS idx_orders_table_seat
ON orders(table_number, seat_number)
WHERE table_number IS NOT NULL AND seat_number IS NOT NULL;

-- Create single-column index on seat_number for analytics
-- Supports queries like "how many orders per seat across all tables"
CREATE INDEX IF NOT EXISTS idx_orders_seat_number
ON orders(seat_number)
WHERE seat_number IS NOT NULL;

-- ============================================================================
-- VALIDATION: Verify the migration was successful
-- ============================================================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_index_exists BOOLEAN;
  v_seat_index_exists BOOLEAN;
BEGIN
  -- Check if seat_number column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'seat_number'
  ) INTO v_column_exists;

  IF NOT v_column_exists THEN
    RAISE EXCEPTION 'Migration validation failed: seat_number column not found in orders table';
  END IF;

  -- Check if composite index exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'orders'
    AND indexname = 'idx_orders_table_seat'
  ) INTO v_index_exists;

  IF NOT v_index_exists THEN
    RAISE EXCEPTION 'Migration validation failed: idx_orders_table_seat index not found';
  END IF;

  -- Check if single-column index exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'orders'
    AND indexname = 'idx_orders_seat_number'
  ) INTO v_seat_index_exists;

  IF NOT v_seat_index_exists THEN
    RAISE EXCEPTION 'Migration validation failed: idx_orders_seat_number index not found';
  END IF;

  RAISE NOTICE '✓ Migration successful: seat_number column added to orders table';
  RAISE NOTICE '✓ Index created: idx_orders_table_seat (table_number, seat_number)';
  RAISE NOTICE '✓ Index created: idx_orders_seat_number (seat_number)';
  RAISE NOTICE 'Ready for multi-seat ordering implementation (BE_001, BE_002)';
END $$;

-- ============================================================================
-- DOWN MIGRATION: Rollback instructions
-- ============================================================================
-- To rollback this migration, run:
--
-- DROP INDEX IF EXISTS idx_orders_seat_number;
-- DROP INDEX IF EXISTS idx_orders_table_seat;
-- ALTER TABLE orders DROP COLUMN IF EXISTS seat_number;
--
-- Or use the dedicated rollback migration file:
-- 20251029145721_rollback_add_seat_number_to_orders.sql
