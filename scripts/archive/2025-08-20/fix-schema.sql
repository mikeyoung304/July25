-- Floor Plan Creator Schema Fixes
-- This addresses the critical database schema mismatches identified

-- 1. Add missing z_index column for table layering
ALTER TABLE tables ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 1;

-- 2. Update shape constraint to support all UI options
ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_shape_check;
ALTER TABLE tables ADD CONSTRAINT tables_shape_check 
  CHECK (shape IN ('circle', 'square', 'rectangle'));

-- 3. Add indexes for better performance on floor plan queries
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_z_index ON tables(z_index);

-- 4. Verify current schema (for troubleshooting)
\d tables;