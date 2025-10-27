-- Migration: Fix payment_audit_logs to support demo users
-- Issue: Online ordering checkout fails when demo users try to place orders
-- Root Cause: user_id column requires UUID but demo users have string IDs like "demo:server:xyz"
-- Impact: All online orders fail with "Internal server error" at payment audit logging step
-- Date: 2025-10-27
-- Priority: P0 - Production blocking (online ordering completely broken)

-- Solution: Make user_id nullable and store demo user IDs in metadata field instead
-- This preserves:
--   - UUID type for real users (maintains FK integrity)
--   - Full audit trail (demo user IDs stored in metadata.demoUserId)
--   - PCI compliance (all payment attempts logged)
--   - Existing queries and indexes

-- Drop NOT NULL constraint to allow demo/guest users
ALTER TABLE payment_audit_logs
  ALTER COLUMN user_id DROP NOT NULL;

-- Update column documentation
COMMENT ON COLUMN payment_audit_logs.user_id IS
  'User ID from auth.users (UUID). NULL for demo/guest/anonymous users. For demo users, see metadata.demoUserId for identification. Real authenticated users have their Supabase auth.users UUID here.';

-- Migration validation
DO $$
BEGIN
  -- Verify column is now nullable
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'payment_audit_logs'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE 'Migration successful: user_id column is now nullable';
    RAISE NOTICE 'Demo users can now complete online orders';
    RAISE NOTICE 'Remember to update payment audit logging code to store demo IDs in metadata';
  ELSE
    RAISE EXCEPTION 'Migration failed: user_id column is still NOT NULL';
  END IF;
END $$;
