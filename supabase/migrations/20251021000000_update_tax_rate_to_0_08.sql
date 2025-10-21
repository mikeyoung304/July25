-- Migration: Update existing restaurants to use 8% tax rate
-- Issue: Track A Stabilization - Default tax rate changed from 8.25% to 8%
-- Context: User requirement for 8% default with per-tenant configuration
-- Date: 2025-10-21

-- Update all restaurants that have the old default (0.0825) to new default (0.08)
UPDATE restaurants
SET tax_rate = 0.08
WHERE tax_rate = 0.0825;

-- Migration validation
DO $$
DECLARE
  v_count_0825 INTEGER;
  v_count_008 INTEGER;
BEGIN
  -- Check for any remaining 0.0825 rates
  SELECT COUNT(*) INTO v_count_0825
  FROM restaurants
  WHERE tax_rate = 0.0825;

  -- Check updated count
  SELECT COUNT(*) INTO v_count_008
  FROM restaurants
  WHERE tax_rate = 0.08;

  IF v_count_0825 > 0 THEN
    RAISE WARNING 'Migration incomplete: % restaurants still have 0.0825 tax rate', v_count_0825;
  ELSE
    RAISE NOTICE 'Migration successful: All restaurants updated to 0.08 tax rate (% total)', v_count_008;
  END IF;
END $$;
