-- Migration: Convert payment VARCHAR columns to TEXT
-- Issue: Payment fields created as VARCHAR but RPC expects TEXT
-- Error: "Returned type character varying(20) does not match expected type text"
-- Date: 2025-10-30
-- Related: 20251029155239 (created VARCHAR), 20251030020000 (RPC uses TEXT)

-- Convert payment_status from VARCHAR(20) to TEXT
ALTER TABLE orders
ALTER COLUMN payment_status TYPE TEXT;

-- Convert payment_method from VARCHAR(20) to TEXT
ALTER TABLE orders
ALTER COLUMN payment_method TYPE TEXT;

-- Convert payment_id from VARCHAR(255) to TEXT
ALTER TABLE orders
ALTER COLUMN payment_id TYPE TEXT;

-- Validation
DO $$
DECLARE
  v_payment_status_type TEXT;
  v_payment_method_type TEXT;
  v_payment_id_type TEXT;
BEGIN
  -- Check payment_status type
  SELECT data_type INTO v_payment_status_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'payment_status';

  -- Check payment_method type
  SELECT data_type INTO v_payment_method_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'payment_method';

  -- Check payment_id type
  SELECT data_type INTO v_payment_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'payment_id';

  -- Verify all are TEXT
  IF v_payment_status_type != 'text' THEN
    RAISE EXCEPTION 'Migration failed: payment_status is % not text', v_payment_status_type;
  END IF;

  IF v_payment_method_type != 'text' THEN
    RAISE EXCEPTION 'Migration failed: payment_method is % not text', v_payment_method_type;
  END IF;

  IF v_payment_id_type != 'text' THEN
    RAISE EXCEPTION 'Migration failed: payment_id is % not text', v_payment_id_type;
  END IF;

  RAISE NOTICE 'Migration successful: All payment columns converted to TEXT';
  RAISE NOTICE '  payment_status: %', v_payment_status_type;
  RAISE NOTICE '  payment_method: %', v_payment_method_type;
  RAISE NOTICE '  payment_id: %', v_payment_id_type;
END $$;
