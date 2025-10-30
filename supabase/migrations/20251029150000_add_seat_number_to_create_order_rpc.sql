-- Migration: Add seat_number parameter to create_order_with_audit RPC
-- Task: BE_001/BE_002 - Add seat number support to order creation API
-- Date: 2025-10-29
-- Description: Updates the create_order_with_audit function to accept and store seat_number

-- Drop existing function (must drop before changing signature)
DROP FUNCTION IF EXISTS create_order_with_audit(
  UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, DECIMAL, DECIMAL, DECIMAL, TEXT, VARCHAR, VARCHAR, JSONB
);

-- Create function with seat_number parameter
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
  p_seat_number INTEGER DEFAULT NULL,  -- ✅ ADDED: seat_number parameter
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
  seat_number INTEGER,  -- ✅ ADDED: seat_number in return type
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
  version INTEGER
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
    seat_number,  -- ✅ ADDED: seat_number column
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
    p_seat_number,  -- ✅ ADDED: seat_number value
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

  -- Return created order with ALL columns including seat_number and version
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
    o.seat_number,  -- ✅ ADDED: seat_number in SELECT
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
    o.version
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
Tasks: BE_001/BE_002 - Add seat number support to order creation API.';

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

  -- Verify seat_number is in RETURNS TABLE
  IF v_function_result NOT LIKE '%seat_number%' THEN
    RAISE EXCEPTION 'Migration failed: seat_number not in RETURNS TABLE';
  END IF;

  RAISE NOTICE 'Migration successful: create_order_with_audit now includes seat_number';
  RAISE NOTICE 'Function signature: %', v_function_result;
END $$;
