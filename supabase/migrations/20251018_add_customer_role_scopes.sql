-- Migration: Add 'customer' Role Scopes
-- Date: 2025-10-18
-- Purpose: Introduce 'customer' role as the canonical name for public/online orders
-- Related: PR #102, ADR-006 Dual Authentication Pattern
-- Context: 'kiosk_demo' is being deprecated in favor of 'customer' for clarity
--
-- This migration adds scope mappings for the 'customer' role while preserving
-- existing 'kiosk_demo' scopes for backwards compatibility during the transition period.
--
-- Migration Strategy:
-- 1. Add customer role with identical scopes to kiosk_demo
-- 2. Keep kiosk_demo scopes intact (no removal)
-- 3. Server middleware (auth.ts) provides kiosk_demo → customer aliasing via AUTH_ACCEPT_KIOSK_DEMO_ALIAS flag
-- 4. Future migration (Phase 2) will remove kiosk_demo once all clients updated

-- Ensure api_scopes table has required scopes
-- (These should already exist from 20251013_emergency_kiosk_demo_scopes.sql)
INSERT INTO api_scopes (scope_name, description) VALUES
  ('menu:read', 'View menu items and categories'),
  ('orders:create', 'Create new orders'),
  ('orders:read', 'View order details and history'),
  ('ai.voice:chat', 'Use voice AI assistant for ordering'),
  ('payments:process', 'Process payment transactions')
ON CONFLICT (scope_name) DO NOTHING;

-- Add 'customer' role scope mappings
-- Customer role is used for:
-- - Public online ordering (web/mobile)
-- - Friends & family demo accounts
-- - Self-service kiosks (renamed from kiosk_demo)
INSERT INTO role_scopes (role, scope_name) VALUES
  ('customer', 'menu:read'),
  ('customer', 'orders:create'),
  ('customer', 'orders:read'),
  ('customer', 'ai.voice:chat'),
  ('customer', 'payments:process')
ON CONFLICT (role, scope_name) DO NOTHING;

-- Verify indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_role_scopes_role ON role_scopes(role);
CREATE INDEX IF NOT EXISTS idx_role_scopes_scope_name ON role_scopes(scope_name);

-- Add comment to track migration history
COMMENT ON TABLE role_scopes IS 'Role-based access control (RBAC) scope mappings. Updated 2025-10-18: Added customer role';

-- Note: kiosk_demo scopes remain unchanged and active
-- See server/src/middleware/auth.ts:67-86 for kiosk_demo → customer aliasing logic
-- Once all clients migrated to 'customer', a future migration will remove kiosk_demo rows
