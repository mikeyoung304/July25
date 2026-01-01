-- Migration: Atomic PIN Attempt Increment
-- Purpose: Fix race condition in failed PIN attempt counter (P1 security issue)
-- The read-modify-write pattern in pinAuth.ts allows concurrent requests to bypass lockout
-- This RPC function performs an atomic increment in a single database operation

-- Create function to atomically increment PIN attempts
CREATE OR REPLACE FUNCTION increment_pin_attempts(
  p_pin_id UUID,
  p_restaurant_id UUID,
  p_max_attempts INTEGER DEFAULT 5,
  p_lockout_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  new_attempts INTEGER,
  is_locked BOOLEAN,
  locked_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_attempts INTEGER;
  v_locked_until TIMESTAMPTZ;
  v_is_locked BOOLEAN := FALSE;
BEGIN
  -- Atomic update: increment attempts and conditionally set lockout
  UPDATE user_pins
  SET
    attempts = COALESCE(attempts, 0) + 1,
    last_attempt_at = NOW(),
    locked_until = CASE
      WHEN COALESCE(attempts, 0) + 1 >= p_max_attempts
      THEN NOW() + (p_lockout_minutes || ' minutes')::INTERVAL
      ELSE locked_until
    END
  WHERE id = p_pin_id
    AND restaurant_id = p_restaurant_id
  RETURNING
    attempts,
    locked_until
  INTO v_new_attempts, v_locked_until;

  -- Check if we actually updated a row
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PIN record not found for id % in restaurant %', p_pin_id, p_restaurant_id;
  END IF;

  -- Determine if account is now locked
  v_is_locked := v_locked_until IS NOT NULL AND v_locked_until > NOW();

  RETURN QUERY SELECT v_new_attempts, v_is_locked, v_locked_until;
END;
$$;

-- Grant execute permission to authenticated users (service role will use this)
GRANT EXECUTE ON FUNCTION increment_pin_attempts(UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_pin_attempts(UUID, UUID, INTEGER, INTEGER) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION increment_pin_attempts IS
  'Atomically increments failed PIN attempts and handles lockout.
   Prevents race condition where concurrent requests could bypass the lockout mechanism.
   Returns the new attempt count, lock status, and lock expiry time.';
