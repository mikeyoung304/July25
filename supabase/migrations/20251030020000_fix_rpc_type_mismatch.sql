-- Migration: Fix RPC type mismatch (TEXT vs VARCHAR)
-- Issue: RPC returns VARCHAR but table uses TEXT
-- Error: "Returned type text does not match expected type character varying"
-- Date: 2025-10-30
-- Related: 20251030010000_add_payment_fields_to_create_order_rpc.sql

-- Drop existing function
DROP FUNCTION IF EXISTS create_order_with_audit(
  UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, DECIMAL, DECIMAL, DECIMAL, TEXT, VARCHAR, VARCHAR, INTEGER, JSONB
);

-- Recreate with correct types matching the orders table
CREATE FUNCTION create_order_with_audit(
  p_restaurant_id UUID,
  p_order_number TEXT,           -- Changed from VARCHAR to TEXT
  p_type TEXT,                    -- Changed from VARCHAR to TEXT
  p_status TEXT DEFAULT 'pending', -- Changed from VARCHAR to TEXT
  p_items JSONB DEFAULT '[]'::jsonb,
  p_subtotal DECIMAL DEFAULT 0,
  p_tax DECIMAL DEFAULT 0,
  p_total_amount DECIMAL DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,  -- Changed from VARCHAR to TEXT
  p_table_number TEXT DEFAULT NULL,   -- Changed from VARCHAR to TEXT
  p_seat_number INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  order_number TEXT,              -- Changed from VARCHAR to TEXT
  type TEXT,                      -- Changed from VARCHAR to TEXT
  status TEXT,                    -- Changed from VARCHAR to TEXT
  items JSONB,
  subtotal DECIMAL,
  tax DECIMAL,
  total_amount DECIMAL,
  notes TEXT,
  customer_name TEXT,             -- Changed from VARCHAR to TEXT
  table_number TEXT,              -- Changed from VARCHAR to TEXT
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
  payment_status TEXT,            -- Changed from VARCHAR to TEXT
  payment_method TEXT,            -- Changed from VARCHAR to TEXT
  payment_amount DECIMAL,
  cash_received DECIMAL,
  change_given DECIMAL,
  payment_id TEXT,                -- Changed from VARCHAR to TEXT
  check_closed_at TIMESTAMPTZ,
  closed_by_user_id UUID
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

  -- Insert order
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

  -- Insert audit log
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
    NULL,
    p_status,
    'Order created',
    v_created_at
  );

  -- Return created order with ALL columns
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
    o.payment_status,
    o.payment_method,
    o.payment_amount,
    o.cash_received,
    o.change_given,
    o.payment_id,
    o.check_closed_at,
    o.closed_by_user_id
  FROM orders o
  WHERE o.id = v_order_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'create_order_with_audit failed: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_order_with_audit TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_audit TO anon;

-- Update comment
COMMENT ON FUNCTION create_order_with_audit IS
'Atomically creates an order and logs its initial status change.
Both operations happen in a single transaction - if either fails, both rollback.

Updated 2025-10-30: Fixed type mismatch - changed VARCHAR to TEXT to match orders table.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Validation
DO $$
DECLARE
  v_function_result TEXT;
BEGIN
  SELECT pg_get_function_result(oid) INTO v_function_result
  FROM pg_proc
  WHERE proname = 'create_order_with_audit'
  ORDER BY oid DESC LIMIT 1;

  IF v_function_result IS NULL THEN
    RAISE EXCEPTION 'Migration failed: create_order_with_audit function not found';
  END IF;

  IF v_function_result NOT LIKE '%payment_status%' THEN
    RAISE EXCEPTION 'Migration failed: payment_status not in RETURNS TABLE';
  END IF;

  -- Check for TEXT type (not VARCHAR)
  IF v_function_result LIKE '%character varying%' THEN
    RAISE EXCEPTION 'Migration failed: function still uses VARCHAR instead of TEXT';
  END IF;

  RAISE NOTICE 'Migration successful: create_order_with_audit uses correct TEXT types';
END $$;
