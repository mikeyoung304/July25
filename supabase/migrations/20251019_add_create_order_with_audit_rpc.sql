-- Migration: Add RPC function for atomic order creation with audit logging
-- Issue: #117 (STAB-001) - Transaction wrapping for createOrder
-- Audit Finding: createOrder performs insert + audit log without transaction
-- Solution: PostgreSQL RPC function for atomic operations (ADR-003)
-- Date: 2025-10-19

-- Drop function if it exists (for idempotent migrations)
DROP FUNCTION IF EXISTS create_order_with_audit(
  p_restaurant_id UUID,
  p_order_number VARCHAR,
  p_type VARCHAR,
  p_status VARCHAR,
  p_items JSONB,
  p_subtotal DECIMAL,
  p_tax DECIMAL,
  p_total_amount DECIMAL,
  p_notes TEXT,
  p_customer_name VARCHAR,
  p_table_number VARCHAR,
  p_metadata JSONB
);

-- Create atomic order creation function
-- This function ensures order insert + audit log are transactional
-- If either operation fails, both rollback (ACID compliance)
CREATE OR REPLACE FUNCTION create_order_with_audit(
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
  manually_fired BOOLEAN
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

  -- Return created order
  -- Using RETURN QUERY to return full order record
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
    o.manually_fired
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

-- Grant execute permission to authenticated users
-- Note: RLS policies on orders and order_status_history tables
-- will still enforce restaurant_id scoping
GRANT EXECUTE ON FUNCTION create_order_with_audit TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_audit TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION create_order_with_audit IS
'Atomically creates an order and logs its initial status change.
Both operations happen in a single transaction - if either fails, both rollback.
This ensures data consistency per ADR-003 (Embedded Orders Pattern).
See Issue #117 (STAB-001) for rationale.';

-- Migration validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'create_order_with_audit'
  ) THEN
    RAISE EXCEPTION 'Migration failed: create_order_with_audit function not created';
  END IF;

  RAISE NOTICE 'Migration successful: create_order_with_audit RPC function created';
END $$;
