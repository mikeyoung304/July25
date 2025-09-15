-- Fix Restaurant Membership for Staff Users
-- This script ensures all staff users have proper restaurant membership entries
-- Required after September 11-14 auth changes that enforce strict membership checks

-- First, let's see what users exist and their restaurant memberships
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'role' as user_role,
  ur.restaurant_id,
  ur.role as restaurant_role,
  ur.created_at as membership_created
FROM auth.users u
LEFT JOIN user_restaurants ur ON u.id = ur.user_id
WHERE u.email IN (
  'owner@restaurantos.com',
  'manager@restaurantos.com',
  'server@restaurantos.com',
  'cashier@restaurantos.com',
  'kitchen@restaurantos.com',
  'expo@restaurantos.com'
)
ORDER BY u.email;

-- Create user_restaurants table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_restaurants_user_id ON user_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);

-- Insert missing restaurant memberships for demo users
-- Using the default restaurant ID from the environment
DO $$
DECLARE
  default_restaurant_id UUID := '11111111-1111-1111-1111-111111111111';
  user_record RECORD;
BEGIN
  -- Loop through all demo users
  FOR user_record IN
    SELECT
      u.id as user_id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'role', 'customer') as role
    FROM auth.users u
    WHERE u.email IN (
      'owner@restaurantos.com',
      'manager@restaurantos.com',
      'server@restaurantos.com',
      'cashier@restaurantos.com',
      'kitchen@restaurantos.com',
      'expo@restaurantos.com'
    )
  LOOP
    -- Insert or update the user_restaurants entry
    INSERT INTO user_restaurants (user_id, restaurant_id, role, created_at, updated_at)
    VALUES (
      user_record.user_id,
      default_restaurant_id,
      user_record.role,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, restaurant_id)
    DO UPDATE SET
      role = EXCLUDED.role,
      updated_at = NOW();

    RAISE NOTICE 'Updated restaurant membership for % with role %', user_record.email, user_record.role;
  END LOOP;
END $$;

-- Also add entries for any users with specific roles who might not be in the demo list
INSERT INTO user_restaurants (user_id, restaurant_id, role, created_at, updated_at)
SELECT
  u.id,
  '11111111-1111-1111-1111-111111111111'::UUID,
  COALESCE(u.raw_user_meta_data->>'role', 'customer'),
  NOW(),
  NOW()
FROM auth.users u
WHERE
  u.raw_user_meta_data->>'role' IN ('owner', 'manager', 'server', 'cashier', 'kitchen', 'expo')
  AND NOT EXISTS (
    SELECT 1
    FROM user_restaurants ur
    WHERE ur.user_id = u.id
    AND ur.restaurant_id = '11111111-1111-1111-1111-111111111111'::UUID
  )
ON CONFLICT (user_id, restaurant_id) DO NOTHING;

-- Verify the fix
SELECT
  u.email,
  u.raw_user_meta_data->>'role' as auth_role,
  ur.role as restaurant_role,
  ur.restaurant_id,
  ur.updated_at
FROM auth.users u
INNER JOIN user_restaurants ur ON u.id = ur.user_id
WHERE ur.restaurant_id = '11111111-1111-1111-1111-111111111111'::UUID
ORDER BY u.email;

-- Count total memberships created
SELECT COUNT(*) as total_memberships
FROM user_restaurants
WHERE restaurant_id = '11111111-1111-1111-1111-111111111111'::UUID;