-- Seed data for Restaurant OS
-- This ensures test users are linked to the default restaurant

-- Link existing users to default restaurant with appropriate roles
-- These users should already exist from auth migrations
INSERT INTO user_restaurants (user_id, restaurant_id, role)
SELECT
  u.id,
  '11111111-1111-1111-1111-111111111111'::uuid,
  CASE
    WHEN u.email = 'owner@restaurant.com' THEN 'owner'
    WHEN u.email = 'manager@restaurant.com' THEN 'manager'
    WHEN u.email = 'server@restaurant.com' THEN 'server'
    WHEN u.email = 'cashier@restaurant.com' THEN 'cashier'
    WHEN u.email = 'kitchen@restaurant.com' THEN 'kitchen'
    WHEN u.email = 'expo@restaurant.com' THEN 'expo'
  END as role
FROM auth.users u
WHERE u.email IN (
  'owner@restaurant.com',
  'manager@restaurant.com',
  'server@restaurant.com',
  'cashier@restaurant.com',
  'kitchen@restaurant.com',
  'expo@restaurant.com'
)
ON CONFLICT (user_id, restaurant_id) DO NOTHING;

-- Note: User creation should be handled by migrations or Supabase dashboard
-- This seed file only creates the necessary relationships