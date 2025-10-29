-- Migration: Sync role_scopes table with server/src/middleware/rbac.ts definitions (v2)
-- Issue: Server role cannot submit orders due to scope mismatch
-- Root Cause: Database has 'orders.write' but code checks for 'orders:create'
--             Missing scopes: orders:update, orders:status, payments:read, payments:refund, tables:manage
--
-- Created: 2025-10-29
-- Author: Claude Code (via investigation)
-- Related: docs/investigations/workspace-auth-fix-2025-10-29.md

-- Step 1: Add missing scopes to api_scopes table
INSERT INTO api_scopes (scope, description) VALUES
  ('orders:update', 'Update existing orders'),
  ('orders:status', 'Update order status'),
  ('orders:delete', 'Delete/cancel orders'),
  ('payments:read', 'View payment information'),
  ('payments:refund', 'Process payment refunds'),
  ('tables:manage', 'Manage table layouts'),
  ('reports:view', 'View reports'),
  ('reports:export', 'Export reports'),
  ('staff:manage', 'Manage staff'),
  ('staff:schedule', 'Manage staff schedules'),
  ('system:config', 'System configuration')
ON CONFLICT (scope) DO NOTHING;

-- Step 2: Remove old scopes for server and kitchen roles
DELETE FROM role_scopes
WHERE role IN ('server', 'kitchen');

-- Step 3: Insert correct server scopes (matches rbac.ts:96-104)
INSERT INTO role_scopes (role, scope) VALUES
  ('server', 'orders:create'),
  ('server', 'orders:read'),
  ('server', 'orders:update'),
  ('server', 'orders:status'),
  ('server', 'payments:process'),
  ('server', 'payments:read'),
  ('server', 'tables:manage')
ON CONFLICT (role, scope) DO NOTHING;

-- Step 4: Insert correct kitchen scopes (matches rbac.ts:112-115)
INSERT INTO role_scopes (role, scope) VALUES
  ('kitchen', 'orders:read'),
  ('kitchen', 'orders:status')
ON CONFLICT (role, scope) DO NOTHING;

-- Step 5: Verification query (shows in migration output)
DO $$
DECLARE
  server_count INTEGER;
  kitchen_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO server_count FROM role_scopes WHERE role = 'server';
  SELECT COUNT(*) INTO kitchen_count FROM role_scopes WHERE role = 'kitchen';

  RAISE NOTICE 'Migration complete: server has % scopes, kitchen has % scopes',
    server_count, kitchen_count;

  IF server_count != 7 THEN
    RAISE WARNING 'Expected 7 server scopes, got %', server_count;
  END IF;

  IF kitchen_count != 2 THEN
    RAISE WARNING 'Expected 2 kitchen scopes, got %', kitchen_count;
  END IF;
END $$;

-- Step 6: Display final state for verification
SELECT 'FINAL STATE:' as verification;
SELECT role, scope FROM role_scopes WHERE role IN ('server', 'kitchen') ORDER BY role, scope;
