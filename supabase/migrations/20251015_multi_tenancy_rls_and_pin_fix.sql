-- Migration: Multi-Tenancy RLS Hardening & Per-Restaurant PIN Fix
-- Date: 2025-10-15
-- Description: Enforce restaurant_id on all mutations via RLS, fix PIN table for per-restaurant PINs

-- ============================================================================
-- PART 1: Fix user_pins table for true per-restaurant PINs
-- ============================================================================

-- Drop the old UNIQUE constraint on user_id only
-- (This allowed one PIN per user globally, but we want one PIN per user per restaurant)
ALTER TABLE user_pins DROP CONSTRAINT IF EXISTS user_pins_user_id_key;

-- Add composite UNIQUE constraint for per-restaurant PINs
-- A user can have different PINs for different restaurants
ALTER TABLE user_pins
ADD CONSTRAINT user_pins_restaurant_user_unique
UNIQUE (restaurant_id, user_id);

-- Add index for efficient PIN lookups by restaurant
CREATE INDEX IF NOT EXISTS idx_user_pins_restaurant_user
ON user_pins (restaurant_id, user_id);

-- ============================================================================
-- PART 2: RLS Policies for orders table
-- ============================================================================

-- Enable RLS on orders table if not already enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate with proper guards)
DROP POLICY IF EXISTS "tenant_select_orders" ON orders;
DROP POLICY IF EXISTS "tenant_insert_orders" ON orders;
DROP POLICY IF EXISTS "tenant_update_orders" ON orders;
DROP POLICY IF EXISTS "tenant_delete_orders" ON orders;

-- SELECT: Users can only see orders from their restaurant
CREATE POLICY "tenant_select_orders"
ON orders
FOR SELECT
USING (
  restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);

-- INSERT: Users can only create orders for their restaurant
CREATE POLICY "tenant_insert_orders"
ON orders
FOR INSERT
WITH CHECK (
  restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);

-- UPDATE: Users can only update orders from their restaurant
-- USING clause: determines which rows can be selected for update
-- WITH CHECK clause: ensures the updated row still belongs to the same restaurant
CREATE POLICY "tenant_update_orders"
ON orders
FOR UPDATE
USING (
  restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
)
WITH CHECK (
  restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);

-- DELETE: Users can only delete orders from their restaurant
CREATE POLICY "tenant_delete_orders"
ON orders
FOR DELETE
USING (
  restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);

-- ============================================================================
-- PART 3: RLS Policies for scheduled_orders (if table exists)
-- ============================================================================
-- Note: The 'orders' table already includes scheduled order fields
-- (is_scheduled, scheduled_pickup_time, auto_fire_time, manually_fired)
-- So scheduled_orders are just orders with is_scheduled=true.
-- The policies above already cover them. No separate table.

-- ============================================================================
-- PART 4: Additional Multi-Tenancy Indexes for Performance
-- ============================================================================

-- Ensure restaurant_id indexes exist on key tables for query performance
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders (restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders (restaurant_id, created_at DESC);

-- Index for scheduled order queries (already partially covered by existing index)
-- Enhance to include restaurant_id if not already optimal
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_restaurant
ON orders (restaurant_id, is_scheduled, auto_fire_time)
WHERE is_scheduled = true AND manually_fired = false;

-- ============================================================================
-- PART 5: Comments for Documentation
-- ============================================================================

COMMENT ON CONSTRAINT user_pins_restaurant_user_unique ON user_pins IS
'Per-restaurant PINs: A user can have different PINs for different restaurants';

COMMENT ON POLICY "tenant_update_orders" ON orders IS
'Multi-tenancy guard: UPDATE operations restricted by restaurant_id in both USING and WITH CHECK clauses';

COMMENT ON POLICY "tenant_delete_orders" ON orders IS
'Multi-tenancy guard: DELETE operations restricted by restaurant_id';
