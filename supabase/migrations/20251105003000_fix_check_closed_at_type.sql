-- Migration: Fix check_closed_at timestamp type mismatch in create_order_with_audit
-- Issue: Function returns TIMESTAMPTZ but column is TIMESTAMP
-- Error: "Returned type timestamp without time zone does not match expected type timestamp with time zone in column 32"
-- Date: 2025-11-05

-- Drop existing function
DROP FUNCTION IF EXISTS create_order_with_audit(
  UUID, TEXT, TEXT, TEXT, JSONB, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, INTEGER, JSONB
);

-- Recreate with correct timestamp type for check_closed_at
CREATE FUNCTION create_order_with_audit(
  p_restaurant_id UUID,
  p_order_number TEXT,
  p_type TEXT,
  p_status TEXT DEFAULT 'pending',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_subtotal DECIMAL DEFAULT 0,
  p_tax DECIMAL DEFAULT 0,
  p_total_amount DECIMAL DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_table_number TEXT DEFAULT NULL,
  p_seat_number INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  order_number TEXT,
  type TEXT,
  status TEXT,
  items JSONB,
  subtotal DECIMAL,
  tax DECIMAL,
  total_amount DECIMAL,
  notes TEXT,
  customer_name TEXT,
  table_number TEXT,
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
  payment_status TEXT,
  payment_method TEXT,
  payment_amount DECIMAL,
  cash_received DECIMAL,
  change_given DECIMAL,
  payment_id TEXT,
  check_closed_at TIMESTAMP,  -- Changed from TIMESTAMPTZ to TIMESTAMP to match table
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

Updated 2025-11-05: Fixed check_closed_at type mismatch - changed TIMESTAMPTZ to TIMESTAMP to match orders table.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
