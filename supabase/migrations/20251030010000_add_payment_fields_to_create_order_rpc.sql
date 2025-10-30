-- Migration: Add payment fields to create_order_with_audit RPC return type
-- Issue: 500 error on order creation due to schema mismatch
-- Root Cause: Payment fields added to orders table but RPC not updated
-- Date: 2025-10-30
-- Related: 20251029155239_add_payment_fields_to_orders.sql

-- Drop existing function (must drop before changing signature)
DROP FUNCTION IF EXISTS create_order_with_audit(
  UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, DECIMAL, DECIMAL, DECIMAL, TEXT, VARCHAR, VARCHAR, INTEGER, JSONB
);

-- Create function with payment fields in RETURNS TABLE
CREATE FUNCTION create_order_with_audit(
  p_restaurant_id UUID,
  p_order_number VARCHAR,
  p_type VARCHAR,
  p_status VARCHAR DEFAULT 'pending',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_subtotal DECIMAL DEFAULT 0,
  p_tax DECIMAL DEFAULT 0,
  p_total_amount DECIMAL DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_customer_name VARCHAR DEFAULT NULL,
  p_table_number VARCHAR DEFAULT NULL,
  p_seat_number INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  order_number VARCHAR,
  type VARCHAR,
  status VARCHAR,
  items JSONB,
  subtotal DECIMAL,
  tax DECIMAL,
  total_amount DECIMAL,
  notes TEXT,
  customer_name VARCHAR,
  table_number VARCHAR,
  seat_number INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  scheduled_pickup_time TIMESTAMPTZ,
  auto_fire_time TIMESTAMPTZ,
  is_scheduled BOOLEAN,
  manually_fired BOOLEAN,
  version INTEGER,
  payment_status VARCHAR,     -- ✅ ADDED: payment status
  payment_method VARCHAR,      -- ✅ ADDED: payment method
  payment_amount DECIMAL,      -- ✅ ADDED: payment amount
  cash_received DECIMAL,       -- ✅ ADDED: cash received
  change_given DECIMAL,        -- ✅ ADDED: change given
  payment_id VARCHAR,          -- ✅ ADDED: payment ID
  check_closed_at TIMESTAMPTZ, -- ✅ ADDED: check closed timestamp
  closed_by_user_id UUID       -- ✅ ADDED: closed by user
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Generate UUID for new order
  v_order_id := gen_random_uuid();
  v_created_at := now();

  -- Insert order (operation #1)
  -- Payment fields will use their database defaults
  INSERT INTO orders (
    id,
    restaurant_id,
    order_number,
    type,
    status,
    items,
    subtotal,
    tax,
    total_amount,
    notes,
    customer_name,
    table_number,
    seat_number,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    p_restaurant_id,
    p_order_number,
    p_type,
    p_status,
    p_items,
    p_subtotal,
    p_tax,
    p_total_amount,
    p_notes,
    p_customer_name,
    p_table_number,
    p_seat_number,
    p_metadata,
    v_created_at,
    v_created_at
  );

  -- Insert audit log (operation #2) - ATOMIC with operation #1
  -- If this fails, entire transaction rolls back
  INSERT INTO order_status_history (
    order_id,
    restaurant_id,
    from_status,
    to_status,
    notes,
    created_at
  ) VALUES (
    v_order_id,
    p_restaurant_id,
    NULL, -- New order has no previous status
    p_status,
    'Order created',
    v_created_at
  );

  -- Return created order with ALL columns including payment fields
  RETURN QUERY
  SELECT
    o.id,
    o.restaurant_id,
    o.order_number,
    o.type,
    o.status,
    o.items,
    o.subtotal,
    o.tax,
    o.total_amount,
    o.notes,
    o.customer_name,
    o.table_number,
    o.seat_number,
    o.metadata,
    o.created_at,
    o.updated_at,
    o.preparing_at,
    o.ready_at,
    o.completed_at,
    o.cancelled_at,
    o.scheduled_pickup_time,
    o.auto_fire_time,
    o.is_scheduled,
    o.manually_fired,
    o.version,
    o.payment_status,      -- ✅ ADDED: return payment status
    o.payment_method,       -- ✅ ADDED: return payment method
    o.payment_amount,       -- ✅ ADDED: return payment amount
    o.cash_received,        -- ✅ ADDED: return cash received
    o.change_given,         -- ✅ ADDED: return change given
    o.payment_id,           -- ✅ ADDED: return payment ID
    o.check_closed_at,      -- ✅ ADDED: return check closed timestamp
    o.closed_by_user_id     -- ✅ ADDED: return closed by user
  FROM orders o
  WHERE o.id = v_order_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error details for debugging
    RAISE NOTICE 'create_order_with_audit failed: % %', SQLERRM, SQLSTATE;
    -- Re-raise exception to trigger rollback
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_order_with_audit TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_audit TO anon;

-- Update comment to reflect changes
COMMENT ON FUNCTION create_order_with_audit IS
'Atomically creates an order and logs its initial status change.
Both operations happen in a single transaction - if either fails, both rollback.
This ensures data consistency per ADR-003 (Embedded Orders Pattern).

Updated 2025-10-29: Added seat_number parameter and return field for table seating support.
Updated 2025-10-30: Added payment fields to RETURNS TABLE to fix schema mismatch.
  Payment fields: payment_status, payment_method, payment_amount, cash_received,
  change_given, payment_id, check_closed_at, closed_by_user_id';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Migration validation
DO $$
DECLARE
  v_function_result TEXT;
BEGIN
  -- Get function return type
  SELECT pg_get_function_result(oid) INTO v_function_result
  FROM pg_proc
  WHERE proname = 'create_order_with_audit';

  -- Verify function exists
  IF v_function_result IS NULL THEN
    RAISE EXCEPTION 'Migration failed: create_order_with_audit function not found';
  END IF;

  -- Verify payment_status is in RETURNS TABLE
  IF v_function_result NOT LIKE '%payment_status%' THEN
    RAISE EXCEPTION 'Migration failed: payment_status not in RETURNS TABLE';
  END IF;

  -- Verify payment_method is in RETURNS TABLE
  IF v_function_result NOT LIKE '%payment_method%' THEN
    RAISE EXCEPTION 'Migration failed: payment_method not in RETURNS TABLE';
  END IF;

  RAISE NOTICE 'Migration successful: create_order_with_audit now includes payment fields';
  RAISE NOTICE 'Function signature: %', v_function_result;
END $$;
