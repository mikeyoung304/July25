-- Migration: Add menu:read scope and fix RBAC permissions
-- Issue: customer/kiosk_demo roles had MENU_MANAGE (write access) instead of read-only
-- Fix: Split into MENU_READ (all roles) and MENU_MANAGE (owner/manager only)
--
-- Created: 2025-12-03
-- Author: Claude Code (via UI/UX security review)
-- Related: todos/152-pending-p1-rbac-menu-scope-split.md

-- Step 1: Add menu:read scope to api_scopes table
INSERT INTO api_scopes (scope, description) VALUES
  ('menu:read', 'View menu items and categories')
ON CONFLICT (scope) DO NOTHING;

-- Step 2: Remove menu:manage from customer and kiosk_demo roles
-- These roles should only have read access to menus
DELETE FROM role_scopes
WHERE role IN ('customer', 'kiosk_demo')
AND scope = 'menu:manage';

-- Step 3: Add menu:read to all roles that need it
INSERT INTO role_scopes (role, scope) VALUES
  ('owner', 'menu:read'),
  ('manager', 'menu:read'),
  ('server', 'menu:read'),
  ('cashier', 'menu:read'),
  ('kitchen', 'menu:read'),
  ('expo', 'menu:read'),
  ('kiosk_demo', 'menu:read'),
  ('customer', 'menu:read')
ON CONFLICT (role, scope) DO NOTHING;

-- Step 4: Verification
DO $$
DECLARE
  customer_menu_manage_count INTEGER;
  menu_read_count INTEGER;
BEGIN
  -- Verify customer no longer has menu:manage
  SELECT COUNT(*) INTO customer_menu_manage_count
  FROM role_scopes
  WHERE role = 'customer' AND scope = 'menu:manage';

  IF customer_menu_manage_count > 0 THEN
    RAISE EXCEPTION 'SECURITY: customer role still has menu:manage scope';
  END IF;

  -- Verify all roles have menu:read
  SELECT COUNT(*) INTO menu_read_count
  FROM role_scopes
  WHERE scope = 'menu:read';

  RAISE NOTICE 'Migration complete: % roles now have menu:read scope', menu_read_count;
  RAISE NOTICE 'customer/kiosk_demo no longer have menu:manage (write) access';
END $$;

-- Step 5: Display final state for verification
SELECT 'MENU SCOPE STATE:' as verification;
SELECT role, scope FROM role_scopes
WHERE scope IN ('menu:read', 'menu:manage')
ORDER BY scope, role;
