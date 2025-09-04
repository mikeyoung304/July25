-- Ensure Auth Tables Exist for RLS Policies
-- Generated: 2025-09-03
-- This migration ensures all required auth tables exist
-- Safe to run multiple times (idempotent)

-- User profiles extending Supabase auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  phone TEXT,
  employee_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-tenant user-restaurant associations (CRITICAL FOR RLS)
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

-- Create index for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_user_restaurants_lookup 
ON user_restaurants(user_id, restaurant_id, is_active) 
WHERE is_active = true;

-- PIN authentication for staff
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

-- Authentication audit log
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

-- Insert demo user access if admin@demo.com exists
-- This ensures the demo admin can access the default restaurant
DO $$
DECLARE
  demo_user_id UUID;
  demo_restaurant_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Get demo user ID if exists
  SELECT id INTO demo_user_id 
  FROM auth.users 
  WHERE email = 'admin@demo.com' 
  LIMIT 1;
  
  -- If demo user exists, ensure they have owner access
  IF demo_user_id IS NOT NULL THEN
    INSERT INTO user_restaurants (
      user_id, 
      restaurant_id, 
      role, 
      is_active
    ) VALUES (
      demo_user_id,
      demo_restaurant_id,
      'owner',
      true
    )
    ON CONFLICT (user_id, restaurant_id) 
    DO UPDATE SET 
      role = 'owner',
      is_active = true,
      updated_at = NOW();
    
    RAISE NOTICE 'Demo admin access ensured for restaurant %', demo_restaurant_id;
  END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_restaurants TO authenticated;
GRANT SELECT ON user_pins TO authenticated;
GRANT INSERT ON auth_logs TO authenticated;

-- Add RLS to auth tables themselves
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can see restaurant associations they're part of
CREATE POLICY IF NOT EXISTS "Users can view own restaurant access" ON user_restaurants
  FOR SELECT USING (auth.uid() = user_id);

-- Users can see their own PIN record
CREATE POLICY IF NOT EXISTS "Users can view own PIN" ON user_pins
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone authenticated can insert auth logs
CREATE POLICY IF NOT EXISTS "Authenticated users can create logs" ON auth_logs
  FOR INSERT WITH CHECK (true);

-- Verify tables were created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_restaurants') THEN
    RAISE EXCEPTION 'Failed to create user_restaurants table - RLS policies will fail!';
  END IF;
  
  RAISE NOTICE 'Auth tables verified successfully';
END $$;