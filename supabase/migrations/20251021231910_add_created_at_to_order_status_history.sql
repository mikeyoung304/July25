-- Migration: Add created_at column to order_status_history table
-- Issue: ORDER_FAILURE_INCIDENT_REPORT.md - Second schema drift incident (Oct 21, 2025)
-- Bug: RPC function create_order_with_audit (20251019180800) inserts created_at but column doesn't exist
-- Impact: All voice orders and server orders fail with 500 error (column "created_at" does not exist)
-- Solution: Add missing created_at column to order_status_history table
-- Date: 2025-10-21
-- Related: Migration 20251019180800 (RPC), 20251020221553 (RPC fix for version)

-- Add created_at column with default value of now()
-- All existing status history records will get current timestamp
-- New records will automatically timestamp on insert
ALTER TABLE order_status_history
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Add comment for documentation
COMMENT ON COLUMN order_status_history.created_at IS
  'Timestamp when this status change was recorded. Required by create_order_with_audit RPC function.
   Added 2025-10-21 to fix schema drift - RPC migration (20251019180800) referenced this column
   but it was never added to the table. See POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md.';

-- Backfill existing records (defensive - should auto-populate via DEFAULT, but ensures consistency)
UPDATE order_status_history
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

-- Notify PostgREST to reload schema cache
-- This ensures the API layer sees the new column immediately
NOTIFY pgrst, 'reload schema';

-- Migration validation
DO $$
BEGIN
  -- Verify column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'order_status_history'
    AND column_name = 'created_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: created_at column not added to order_status_history table';
  END IF;

  -- Verify column type is correct
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'order_status_history'
    AND column_name = 'created_at'
    AND data_type = 'timestamp with time zone'
  ) THEN
    RAISE EXCEPTION 'Migration failed: created_at column has wrong data type';
  END IF;

  RAISE NOTICE 'Migration successful: created_at column added to order_status_history table';
  RAISE NOTICE 'Schema drift resolved - create_order_with_audit RPC can now insert audit logs';
  RAISE NOTICE 'All existing records backfilled with current timestamp';
END $$;
