-- Migration: Fix PIN Increment Function Security
-- Purpose: Address TODO #266 (add search_path) and #269 (remove authenticated grant)
--
-- Fixes:
-- 1. Adds SET search_path = public to prevent search_path hijacking (defense-in-depth)
-- 2. Revokes EXECUTE from authenticated role (least-privilege - only service_role needs access)

-- Recreate function with search_path restriction
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
SET search_path = public
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

-- Revoke authenticated role access (only service_role should call this)
-- This prevents authenticated users from calling this function directly,
-- which could be used for DoS attacks (locking out other users)
REVOKE EXECUTE ON FUNCTION increment_pin_attempts(UUID, UUID, INTEGER, INTEGER) FROM authenticated;

-- Ensure service_role still has access (idempotent)
GRANT EXECUTE ON FUNCTION increment_pin_attempts(UUID, UUID, INTEGER, INTEGER) TO service_role;

-- Update comment to reflect security changes
COMMENT ON FUNCTION increment_pin_attempts IS
  'Atomically increments failed PIN attempts and handles lockout.
   Prevents race condition where concurrent requests could bypass the lockout mechanism.
   Returns the new attempt count, lock status, and lock expiry time.

   Security: SECURITY DEFINER with search_path = public.
   Access: service_role only (backend calls).';
