-- Migration: Add version column to orders table for optimistic locking
-- Issue: #118 (STAB-002) - Optimistic locking for updateOrderStatus
-- Audit Finding: Concurrent status updates can overwrite each other (lost update problem)
-- Solution: Optimistic locking pattern with version column (ADR-003)
-- Date: 2025-10-19

-- Add version column with default value of 1
-- All existing orders get version=1, new orders start at version=1
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN orders.version IS
  'Optimistic locking version number. Incremented on each update to prevent lost updates.
   When updating, include WHERE version = current_version to detect concurrent modifications.
   See ADR-003 and Issue #118 (STAB-002) for pattern rationale.';

-- Create index for version queries (optional, for debugging)
CREATE INDEX IF NOT EXISTS idx_orders_version ON orders(restaurant_id, version);

-- Migration validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'version'
  ) THEN
    RAISE EXCEPTION 'Migration failed: version column not added to orders table';
  END IF;

  RAISE NOTICE 'Migration successful: version column added to orders table';
  RAISE NOTICE 'All existing orders initialized with version=1';
END $$;
