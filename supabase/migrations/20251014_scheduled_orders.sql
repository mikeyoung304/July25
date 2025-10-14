-- Migration: Add scheduled order support
-- Date: 2025-10-14
-- Description: Adds fields for scheduled pickup times and auto-fire logic

-- Add scheduled pickup fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS scheduled_pickup_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_fire_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manually_fired BOOLEAN DEFAULT false;

-- Create index for efficient scheduled order queries
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_pickup
ON orders (restaurant_id, scheduled_pickup_time)
WHERE is_scheduled = true;

-- Create index for auto-fire queries
CREATE INDEX IF NOT EXISTS idx_orders_auto_fire
ON orders (restaurant_id, auto_fire_time)
WHERE is_scheduled = true AND manually_fired = false;

-- Add comment for documentation
COMMENT ON COLUMN orders.scheduled_pickup_time IS 'When customer wants to pick up the order (future time)';
COMMENT ON COLUMN orders.auto_fire_time IS 'When kitchen should start preparing (scheduled_pickup_time - prep_time)';
COMMENT ON COLUMN orders.is_scheduled IS 'True if order is scheduled for future pickup';
COMMENT ON COLUMN orders.manually_fired IS 'True if kitchen manually started preparing early';
