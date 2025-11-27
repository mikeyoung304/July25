-- Migration: Fix orders_status_check constraint to include all valid statuses
-- Issue: KDS cannot update order status - "orders_status_check" constraint violation
-- Root Cause: CHECK constraint on orders.status doesn't include 'confirmed' state
-- Date: 2025-11-27

-- ============================================================================
-- PROBLEM
-- ============================================================================
-- The orders.status column has a CHECK constraint that is missing some valid
-- status values from the state machine. Specifically:
--   - 'confirmed' - Required for pending → confirmed → preparing flow
--   - 'picked-up' - Required for ready → picked-up → completed flow
--   - 'new' - Initial state for some order flows
--
-- This causes KDS to fail with error 23514 when marking orders as ready.

-- ============================================================================
-- SOLUTION
-- ============================================================================
-- Drop the existing constraint and recreate it with ALL valid statuses from
-- the order state machine (see server/src/services/orderStateMachine.ts)

-- Drop existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Recreate with ALL valid statuses from state machine
-- Order flow: new → pending → confirmed → preparing → ready → picked-up → completed
-- Any state can also transition to: cancelled
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IS NULL OR status IN (
    'new',        -- Initial state
    'pending',    -- Waiting for confirmation
    'confirmed',  -- Order confirmed, waiting to prepare
    'preparing',  -- Kitchen is preparing the order
    'ready',      -- Ready for pickup/delivery
    'picked-up',  -- Customer has picked up (before completion)
    'completed',  -- Order fulfilled
    'cancelled'   -- Order cancelled
  ));

-- ============================================================================
-- VALIDATION
-- ============================================================================
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  -- Check constraint was created
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_status_check'
    AND conrelid = 'orders'::regclass
  ) INTO constraint_exists;

  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'Migration failed: orders_status_check constraint not created';
  END IF;

  RAISE NOTICE 'Migration successful: orders_status_check constraint updated with all valid statuses';
END $$;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To rollback, run:
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check
--   CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled'));
