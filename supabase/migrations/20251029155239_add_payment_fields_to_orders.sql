-- ============================================================================
-- Migration: 20251029155239_add_payment_fields_to_orders
-- ============================================================================
-- Purpose: Add payment-related fields to orders table for payment workflow
-- Author: DATABASE_AGENT (Claude Code)
-- Created: 2025-10-29
-- Deployed: [Pending deployment]
-- Related:
--   - Task DB_002: Payment fields for order lifecycle management
--   - Enables payment status tracking, method capture, and cash handling
--   - Supports Square integration with payment_id field
--   - Tracks check closure and the user who closed it
-- Rollback: See rollback migration or run the DROP commands at the end
-- ============================================================================

-- IMPORTANT: Use idempotent patterns to allow safe re-runs

-- ============================================================================
-- UP MIGRATION: Add payment-related columns and indexes
-- ============================================================================

-- Add payment_status column with CHECK constraint for valid values
-- payment_status tracks the payment lifecycle: unpaid -> paid/failed/refunded
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid'
CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded'));

COMMENT ON COLUMN orders.payment_status IS 'Payment lifecycle status: unpaid (default), paid (payment successful), failed (payment attempted but failed), refunded (payment reversed). Used to track order payment state.';

-- Add payment_method column with CHECK constraint
-- payment_method distinguishes between cash, card, house account, gift card, etc.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20)
CHECK (payment_method IN ('cash', 'card', 'house_account', 'gift_card', 'other'));

COMMENT ON COLUMN orders.payment_method IS 'Payment method used: cash, card (Square), house_account, gift_card, or other. NULL until payment is attempted. Required for reporting and reconciliation.';

-- Add payment_amount column to track the actual amount paid
-- This may differ from order total due to tips, discounts, or rounding
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2);

COMMENT ON COLUMN orders.payment_amount IS 'Actual amount paid by customer. May differ from order total due to tips, discounts, or rounding. NULL until payment is processed.';

-- Add cash_received column for cash payments
-- Tracks how much cash the customer gave (e.g., $20 for a $15.50 order)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cash_received DECIMAL(10,2);

COMMENT ON COLUMN orders.cash_received IS 'Amount of cash received from customer. Used for cash payments to calculate change. Example: $20.00 received for $15.50 order = $4.50 change.';

-- Add change_given column for cash payments
-- Tracks how much change was returned to the customer
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS change_given DECIMAL(10,2);

COMMENT ON COLUMN orders.change_given IS 'Amount of change given back to customer. Calculated as cash_received minus payment_amount. NULL for non-cash payments.';

-- Add payment_id column for external payment processor IDs (e.g., Square)
-- Stores the payment processor's transaction ID for reconciliation and refunds
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);

COMMENT ON COLUMN orders.payment_id IS 'External payment processor transaction ID (e.g., Square payment ID). Used for reconciliation, refunds, and audit trail. NULL for cash payments.';

-- Add check_closed_at column to track when the check/order was closed
-- This is when the payment was finalized and the order is complete
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS check_closed_at TIMESTAMP;

COMMENT ON COLUMN orders.check_closed_at IS 'Timestamp when the check was closed and payment finalized. NULL for open checks. Used to track when orders are fully completed.';

-- Add closed_by_user_id column to track who closed the check
-- Foreign key to users table for audit trail
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS closed_by_user_id UUID;

COMMENT ON COLUMN orders.closed_by_user_id IS 'User ID of the person who closed the check and processed payment. Foreign key to users(id). Used for audit trail and accountability.';

-- Add foreign key constraint for closed_by_user_id
-- Note: Using IF NOT EXISTS pattern requires checking pg_constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_orders_closed_by_user'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT fk_orders_closed_by_user
    FOREIGN KEY (closed_by_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES: Optimize query performance for payment-related queries
-- ============================================================================

-- Index on payment_status for filtering by payment state
-- Supports queries like "show all unpaid orders" or "find failed payments"
CREATE INDEX IF NOT EXISTS idx_orders_payment_status
ON orders(payment_status);

COMMENT ON INDEX idx_orders_payment_status IS 'Index for filtering orders by payment status. Optimizes queries for unpaid/paid/failed/refunded orders.';

-- Index on check_closed_at for time-based queries
-- Supports queries like "orders closed today" or "payment history"
CREATE INDEX IF NOT EXISTS idx_orders_check_closed
ON orders(check_closed_at);

COMMENT ON INDEX idx_orders_check_closed IS 'Index for time-based payment queries. Optimizes queries for orders closed in a date range (e.g., daily/weekly reports).';

-- Partial index on payment_method (only for non-NULL values)
-- Supports queries like "all card payments today" without indexing NULL values
CREATE INDEX IF NOT EXISTS idx_orders_payment_method
ON orders(payment_method)
WHERE payment_method IS NOT NULL;

COMMENT ON INDEX idx_orders_payment_method IS 'Partial index for filtering orders by payment method. Only indexes non-NULL values to save space. Optimizes payment method reports.';

-- ============================================================================
-- VALIDATION: Verify the migration was successful
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
  -- Validate all columns were created
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

  -- Validate all indexes were created
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

  -- Validate foreign key constraint
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_orders_closed_by_user'
  ) INTO v_fk_constraint_exists;

  -- Raise errors if any validation fails
  IF NOT v_payment_status_exists THEN
    RAISE EXCEPTION 'Migration validation failed: payment_status column not found';
  END IF;

  IF NOT v_payment_method_exists THEN
    RAISE EXCEPTION 'Migration validation failed: payment_method column not found';
  END IF;

  IF NOT v_payment_amount_exists THEN
    RAISE EXCEPTION 'Migration validation failed: payment_amount column not found';
  END IF;

  IF NOT v_cash_received_exists THEN
    RAISE EXCEPTION 'Migration validation failed: cash_received column not found';
  END IF;

  IF NOT v_change_given_exists THEN
    RAISE EXCEPTION 'Migration validation failed: change_given column not found';
  END IF;

  IF NOT v_payment_id_exists THEN
    RAISE EXCEPTION 'Migration validation failed: payment_id column not found';
  END IF;

  IF NOT v_check_closed_at_exists THEN
    RAISE EXCEPTION 'Migration validation failed: check_closed_at column not found';
  END IF;

  IF NOT v_closed_by_user_id_exists THEN
    RAISE EXCEPTION 'Migration validation failed: closed_by_user_id column not found';
  END IF;

  IF NOT v_idx_payment_status_exists THEN
    RAISE EXCEPTION 'Migration validation failed: idx_orders_payment_status index not found';
  END IF;

  IF NOT v_idx_check_closed_exists THEN
    RAISE EXCEPTION 'Migration validation failed: idx_orders_check_closed index not found';
  END IF;

  IF NOT v_idx_payment_method_exists THEN
    RAISE EXCEPTION 'Migration validation failed: idx_orders_payment_method index not found';
  END IF;

  IF NOT v_fk_constraint_exists THEN
    RAISE EXCEPTION 'Migration validation failed: fk_orders_closed_by_user constraint not found';
  END IF;

  -- Success messages
  RAISE NOTICE '✓ Migration successful: All payment fields added to orders table';
  RAISE NOTICE '✓ Column added: payment_status (VARCHAR(20), default unpaid)';
  RAISE NOTICE '✓ Column added: payment_method (VARCHAR(20))';
  RAISE NOTICE '✓ Column added: payment_amount (DECIMAL(10,2))';
  RAISE NOTICE '✓ Column added: cash_received (DECIMAL(10,2))';
  RAISE NOTICE '✓ Column added: change_given (DECIMAL(10,2))';
  RAISE NOTICE '✓ Column added: payment_id (VARCHAR(255))';
  RAISE NOTICE '✓ Column added: check_closed_at (TIMESTAMP)';
  RAISE NOTICE '✓ Column added: closed_by_user_id (UUID)';
  RAISE NOTICE '✓ Index created: idx_orders_payment_status';
  RAISE NOTICE '✓ Index created: idx_orders_check_closed';
  RAISE NOTICE '✓ Index created: idx_orders_payment_method (partial, WHERE NOT NULL)';
  RAISE NOTICE '✓ Foreign key constraint: fk_orders_closed_by_user';
  RAISE NOTICE 'Ready for payment workflow implementation (BE_003, BE_004)';
END $$;

-- ============================================================================
-- DOWN MIGRATION: Rollback instructions
-- ============================================================================
-- To rollback this migration, run:
--
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_closed_by_user;
-- DROP INDEX IF EXISTS idx_orders_payment_method;
-- DROP INDEX IF EXISTS idx_orders_check_closed;
-- DROP INDEX IF EXISTS idx_orders_payment_status;
-- ALTER TABLE orders DROP COLUMN IF EXISTS closed_by_user_id;
-- ALTER TABLE orders DROP COLUMN IF EXISTS check_closed_at;
-- ALTER TABLE orders DROP COLUMN IF EXISTS payment_id;
-- ALTER TABLE orders DROP COLUMN IF EXISTS change_given;
-- ALTER TABLE orders DROP COLUMN IF EXISTS cash_received;
-- ALTER TABLE orders DROP COLUMN IF EXISTS payment_amount;
-- ALTER TABLE orders DROP COLUMN IF EXISTS payment_method;
-- ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;
--
-- Or use the dedicated rollback migration file:
-- 20251029155239_rollback_add_payment_fields_to_orders.sql
