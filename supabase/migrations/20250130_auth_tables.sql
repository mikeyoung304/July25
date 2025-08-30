-- Authentication & RBAC Tables Migration
-- Restaurant OS v6.0.2
-- Date: 2025-01-30

-- User profiles extending Supabase auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  phone TEXT,
  employee_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-tenant user-restaurant associations
CREATE TABLE IF NOT EXISTS user_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL, -- References restaurants table
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'server', 'cashier', 'kitchen', 'expo')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- PIN authentication for staff
CREATE TABLE IF NOT EXISTS user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  restaurant_id UUID NOT NULL, -- Restaurant-scoped PINs
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL, -- Additional salt for PIN
  attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Station authentication tokens
CREATE TABLE IF NOT EXISTS station_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  station_type TEXT NOT NULL CHECK (station_type IN ('kitchen', 'expo', 'bar', 'prep')),
  station_name TEXT,
  restaurant_id UUID NOT NULL,
  device_fingerprint TEXT, -- IP + User-Agent hash
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Authentication audit log
CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_success', 'login_failed', 'logout',
    'pin_success', 'pin_failed', 'pin_locked',
    'station_login', 'station_logout', 'station_revoked',
    'password_reset', 'mfa_enabled', 'mfa_disabled',
    'session_expired', 'token_refreshed'
  )),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API scope definitions
CREATE TABLE IF NOT EXISTS api_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role to scope mappings
CREATE TABLE IF NOT EXISTS role_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  scope_name TEXT REFERENCES api_scopes(scope_name) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, scope_name)
);

-- Insert default API scopes
INSERT INTO api_scopes (scope_name, description) VALUES
  ('orders:create', 'Create new orders'),
  ('orders:read', 'View orders'),
  ('orders:update', 'Update order details'),
  ('orders:delete', 'Delete orders'),
  ('orders:status', 'Update order status'),
  ('payments:process', 'Process payments'),
  ('payments:refund', 'Process refunds'),
  ('payments:read', 'View payment history'),
  ('reports:view', 'View reports and analytics'),
  ('reports:export', 'Export reports'),
  ('staff:manage', 'Manage staff accounts'),
  ('staff:schedule', 'Manage staff schedules'),
  ('system:config', 'System configuration'),
  ('menu:manage', 'Manage menu items'),
  ('tables:manage', 'Manage table layout')
ON CONFLICT (scope_name) DO NOTHING;

-- Insert default role-scope mappings
INSERT INTO role_scopes (role, scope_name) VALUES
  -- Owner has all scopes
  ('owner', 'orders:create'),
  ('owner', 'orders:read'),
  ('owner', 'orders:update'),
  ('owner', 'orders:delete'),
  ('owner', 'orders:status'),
  ('owner', 'payments:process'),
  ('owner', 'payments:refund'),
  ('owner', 'payments:read'),
  ('owner', 'reports:view'),
  ('owner', 'reports:export'),
  ('owner', 'staff:manage'),
  ('owner', 'staff:schedule'),
  ('owner', 'system:config'),
  ('owner', 'menu:manage'),
  ('owner', 'tables:manage'),
  
  -- Manager has most scopes except system config
  ('manager', 'orders:create'),
  ('manager', 'orders:read'),
  ('manager', 'orders:update'),
  ('manager', 'orders:delete'),
  ('manager', 'orders:status'),
  ('manager', 'payments:process'),
  ('manager', 'payments:refund'),
  ('manager', 'payments:read'),
  ('manager', 'reports:view'),
  ('manager', 'reports:export'),
  ('manager', 'staff:manage'),
  ('manager', 'staff:schedule'),
  ('manager', 'menu:manage'),
  ('manager', 'tables:manage'),
  
  -- Server can handle orders and payments
  ('server', 'orders:create'),
  ('server', 'orders:read'),
  ('server', 'orders:update'),
  ('server', 'orders:status'),
  ('server', 'payments:process'),
  ('server', 'payments:read'),
  ('server', 'tables:manage'),
  
  -- Cashier can process payments and view orders
  ('cashier', 'orders:read'),
  ('cashier', 'payments:process'),
  ('cashier', 'payments:read'),
  
  -- Kitchen can view and update order status
  ('kitchen', 'orders:read'),
  ('kitchen', 'orders:status'),
  
  -- Expo can view and complete orders
  ('expo', 'orders:read'),
  ('expo', 'orders:status')
ON CONFLICT (role, scope_name) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_restaurants_user_id ON user_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_pins_restaurant_id ON user_pins(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_station_tokens_restaurant_id ON station_tokens(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_station_tokens_expires_at ON station_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_restaurant_id ON auth_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can read their own profile, managers can read all in their restaurant
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view restaurant staff profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur1
      WHERE ur1.user_id = auth.uid()
      AND ur1.role IN ('owner', 'manager')
      AND EXISTS (
        SELECT 1 FROM user_restaurants ur2
        WHERE ur2.user_id = user_profiles.user_id
        AND ur2.restaurant_id = ur1.restaurant_id
      )
    )
  );

-- User restaurants: Users can see their own associations
CREATE POLICY "Users can view own restaurant associations" ON user_restaurants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view restaurant staff associations" ON user_restaurants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = user_restaurants.restaurant_id
      AND ur.role IN ('owner', 'manager')
    )
  );

-- Station tokens: Only managers can view/manage
CREATE POLICY "Managers can manage station tokens" ON station_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = station_tokens.restaurant_id
      AND ur.role IN ('owner', 'manager')
    )
  );

-- Audit logs: Users can see their own, managers can see restaurant logs
CREATE POLICY "Users can view own auth logs" ON auth_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view restaurant auth logs" ON auth_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = auth_logs.restaurant_id
      AND ur.role IN ('owner', 'manager')
    )
  );

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_restaurants_updated_at BEFORE UPDATE ON user_restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_pins_updated_at BEFORE UPDATE ON user_pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();