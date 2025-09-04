-- Migration to add chip_monkey shape to tables
-- Date: 2025-09-01
-- Purpose: Allow chip_monkey as a valid shape for floor plan elements

-- First, drop the existing constraint
ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_shape_check;

-- Add the new constraint including chip_monkey
ALTER TABLE tables ADD CONSTRAINT tables_shape_check 
  CHECK (shape IN ('circle', 'square', 'rectangle', 'chip_monkey'));

-- Verify the constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'tables_shape_check';