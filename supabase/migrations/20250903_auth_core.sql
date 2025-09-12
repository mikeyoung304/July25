-- Core Authentication Tables for RLS
-- Generated: 2025-09-03
-- CRITICAL: Required for ALL RLS policies to function
-- This migration is idempotent (safe to run multiple times)

-- ============================================
-- USER PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  phone TEXT,
  employee_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER-RESTAURANT ASSOCIATIONS (CRITICAL FOR RLS)
-- ============================================
CREATE TABLE IF NOT EXISTS user_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'server', 'cashier', 'kitchen', 'expo')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- Critical index for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_user_restaurants_lookup 
  ON user_restaurants(user_id, restaurant_id, is_active) 
  WHERE is_active = true;

-- ============================================
-- PIN AUTHENTICATION
-- ============================================
CREATE TABLE IF NOT EXISTS user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  restaurant_id UUID NOT NULL,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STATION TOKENS (Kitchen/Expo displays)
-- ============================================
CREATE TABLE IF NOT EXISTS station_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  station_type TEXT NOT NULL CHECK (station_type IN ('kitchen', 'expo', 'bar', 'prep')),
  station_name TEXT,
  restaurant_id UUID NOT NULL,
  device_fingerprint TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- API SCOPES (for RBAC)
-- ============================================
CREATE TABLE IF NOT EXISTS api_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROLE TO SCOPE MAPPINGS
-- ============================================
CREATE TABLE IF NOT EXISTS role_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  scope_name TEXT REFERENCES api_scopes(scope_name) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, scope_name)
);

-- ============================================
-- AUTHENTICATION AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID,
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_auth_logs_user 
  ON auth_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_restaurant 
  ON auth_logs(restaurant_id, created_at DESC);

-- ============================================
-- DEFAULT API SCOPES
-- ============================================
INSERT INTO api_scopes (scope_name, description) VALUES
  ('orders:create', 'Create new orders'),
  ('orders:read', 'View orders'),
  ('orders:update', 'Update order details'),
  ('orders:delete', 'Delete orders'),
  ('orders:status', 'Update order status'),
  ('payments:process', 'Process payments'),
  ('payments:read', 'View payment history'),
  ('payments:refund', 'Process refunds'),
  ('menu:read', 'View menu items'),
  ('menu:write', 'Modify menu items'),
  ('tables:read', 'View table status'),
  ('tables:write', 'Modify table configuration'),
  ('staff:manage', 'Manage staff accounts'),
  ('reports:view', 'View reports'),
  ('ai.voice:chat', 'Use voice ordering')
ON CONFLICT (scope_name) DO NOTHING;

-- ============================================
-- DEFAULT ROLE SCOPES
-- ============================================
INSERT INTO role_scopes (role, scope_name) VALUES
  -- Owner: Full access
  ('owner', 'orders:create'),
  ('owner', 'orders:read'),
  ('owner', 'orders:update'),
  ('owner', 'orders:delete'),
  ('owner', 'orders:status'),
  ('owner', 'payments:process'),
  ('owner', 'payments:read'),
  ('owner', 'payments:refund'),
  ('owner', 'menu:read'),
  ('owner', 'menu:write'),
  ('owner', 'tables:read'),
  ('owner', 'tables:write'),
  ('owner', 'staff:manage'),
  ('owner', 'reports:view'),
  
  -- Manager: Nearly full access
  ('manager', 'orders:create'),
  ('manager', 'orders:read'),
  ('manager', 'orders:update'),
  ('manager', 'orders:status'),
  ('manager', 'payments:process'),
  ('manager', 'payments:read'),
  ('manager', 'menu:read'),
  ('manager', 'menu:write'),
  ('manager', 'tables:read'),
  ('manager', 'tables:write'),
  ('manager', 'staff:manage'),
  ('manager', 'reports:view'),
  
  -- Server: Order and payment operations
  ('server', 'orders:create'),
  ('server', 'orders:read'),
  ('server', 'orders:update'),
  ('server', 'orders:status'),
  ('server', 'payments:process'),
  ('server', 'menu:read'),
  ('server', 'tables:read'),
  
  -- Cashier: Payment focus
  ('cashier', 'orders:read'),
  ('cashier', 'orders:status'),
  ('cashier', 'payments:process'),
  ('cashier', 'payments:read'),
  ('cashier', 'menu:read'),
  
  -- Kitchen: Order status only
  ('kitchen', 'orders:read'),
  ('kitchen', 'orders:status'),
  
  -- Expo: Order completion
  ('expo', 'orders:read'),
  ('expo', 'orders:status')
ON CONFLICT (role, scope_name) DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON user_profiles TO authenticated;
GRANT INSERT, UPDATE ON user_profiles TO authenticated;

GRANT SELECT ON user_restaurants TO authenticated;

GRANT SELECT ON user_pins TO authenticated;

GRANT SELECT ON station_tokens TO authenticated;

GRANT SELECT ON api_scopes TO authenticated;
GRANT SELECT ON role_scopes TO authenticated;

GRANT INSERT ON auth_logs TO authenticated;

-- ============================================
-- ENABLE RLS ON AUTH TABLES
-- ============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR AUTH TABLES
-- ============================================

-- Users can view/edit their own profile
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their restaurant associations
CREATE POLICY IF NOT EXISTS "Users can view own restaurant access" ON user_restaurants
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own PIN
CREATE POLICY IF NOT EXISTS "Users can view own PIN" ON user_pins
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can create auth logs
CREATE POLICY IF NOT EXISTS "Authenticated users can create logs" ON auth_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  missing_tables TEXT[];
  required_tables TEXT[] := ARRAY['user_restaurants', 'user_profiles', 'user_pins', 
                                  'station_tokens', 'api_scopes', 'role_scopes', 'auth_logs'];
  tbl TEXT;
BEGIN
  -- Check for missing tables
  SELECT ARRAY_AGG(t) INTO missing_tables
  FROM UNNEST(required_tables) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t
  );
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Failed to create required tables: %', array_to_string(missing_tables, ', ');
  END IF;
  
  RAISE NOTICE '✅ All auth tables created successfully';
END $$;