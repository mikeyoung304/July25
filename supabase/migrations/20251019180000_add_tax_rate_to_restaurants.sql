-- Migration: Add tax_rate column to restaurants table
-- Issue: #119 (STAB-003) - Fix hardcoded tax rates
-- Audit Finding: THREE different hardcoded values (7%, 8%, 8.25%)
-- Solution: Per-restaurant configuration (ADR-007)
-- Date: 2025-10-19

-- Add tax_rate column with 8% default (per user requirement)
-- Using DECIMAL(5,4) to support rates like 0.08 (8%) or 0.0825 (8.25%)
-- Precision: 5 total digits, 4 after decimal point
-- Range: 0.0000 to 9.9999 (0% to 999.99%)
-- Each restaurant tenant can configure their own rate
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.08;

-- Add comment for documentation
COMMENT ON COLUMN restaurants.tax_rate IS 'Per-restaurant sales tax rate (decimal format: 0.0825 = 8.25%). Configurable per location for compliance with local tax jurisdictions. See ADR-007.';

-- Create index for potential reporting queries
CREATE INDEX IF NOT EXISTS idx_restaurants_tax_rate ON restaurants(tax_rate);

-- Migration validation: Verify column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'restaurants'
    AND column_name = 'tax_rate'
  ) THEN
    RAISE EXCEPTION 'Migration failed: tax_rate column not added to restaurants table';
  END IF;

  RAISE NOTICE 'Migration successful: tax_rate column added to restaurants table';
END $$;
