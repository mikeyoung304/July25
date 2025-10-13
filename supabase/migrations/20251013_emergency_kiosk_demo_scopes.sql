-- Emergency Migration: Add kiosk_demo Role Scopes
-- Date: 2025-10-13
-- Issue: kiosk_demo role has no scope mappings causing 401 errors
-- Priority: P0 CRITICAL

-- First, ensure api_scopes and role_scopes tables exist
-- (In case 20250130_auth_tables.sql was never applied)

CREATE TABLE IF NOT EXISTS api_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  scope_name TEXT REFERENCES api_scopes(scope_name) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, scope_name)
);

-- Ensure required scopes exist
INSERT INTO api_scopes (scope_name, description) VALUES
  ('menu:read', 'View menu items'),
  ('orders:create', 'Create new orders'),
  ('orders:read', 'View orders'),
  ('ai.voice:chat', 'Use voice AI assistant'),
  ('payments:process', 'Process payments')
ON CONFLICT (scope_name) DO NOTHING;

-- Add kiosk_demo role scope mappings
-- This role is used for demo/friends & family online ordering
INSERT INTO role_scopes (role, scope_name) VALUES
  ('kiosk_demo', 'menu:read'),
  ('kiosk_demo', 'orders:create'),
  ('kiosk_demo', 'orders:read'),
  ('kiosk_demo', 'ai.voice:chat'),
  ('kiosk_demo', 'payments:process')
ON CONFLICT (role, scope_name) DO NOTHING;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_role_scopes_role ON role_scopes(role);
CREATE INDEX IF NOT EXISTS idx_role_scopes_scope_name ON role_scopes(scope_name);
