-- Migration: 20250903_100000_auth_core.sql
-- Purpose: Create core authentication and RBAC tables (idempotent)
-- All statements use IF NOT EXISTS to ensure idempotency

-- 1. User profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.user_profiles IS 'User profile information linked to auth.users';
COMMENT ON COLUMN public.user_profiles.user_id IS 'References auth.users(id) - primary key';
COMMENT ON COLUMN public.user_profiles.display_name IS 'Display name for the user';
COMMENT ON COLUMN public.user_profiles.phone IS 'Phone number for PIN authentication';

-- 2. User-restaurant associations
CREATE TABLE IF NOT EXISTS public.user_restaurants (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, restaurant_id)
);
COMMENT ON TABLE public.user_restaurants IS 'Maps users to restaurants with roles';
COMMENT ON COLUMN public.user_restaurants.role IS 'Role within restaurant: owner, manager, server, cashier, kitchen, expo';

-- 3. User PINs for quick auth
CREATE TABLE IF NOT EXISTS public.user_pins (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  pin TEXT NOT NULL,
  UNIQUE(user_id, restaurant_id)
);
COMMENT ON TABLE public.user_pins IS 'PIN authentication for staff within a restaurant';
COMMENT ON COLUMN public.user_pins.pin IS 'Hashed PIN for quick authentication';

-- 4. Station tokens for shared devices
CREATE TABLE IF NOT EXISTS public.station_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  station_type TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.station_tokens IS 'Authentication tokens for shared station devices';
COMMENT ON COLUMN public.station_tokens.station_type IS 'Type: kitchen, expo, kiosk, etc.';

-- 5. API scopes
CREATE TABLE IF NOT EXISTS public.api_scopes (
  scope TEXT PRIMARY KEY,
  description TEXT
);
COMMENT ON TABLE public.api_scopes IS 'Available API permission scopes';

-- 6. Role-scope mappings
CREATE TABLE IF NOT EXISTS public.role_scopes (
  role TEXT NOT NULL,
  scope TEXT NOT NULL REFERENCES public.api_scopes(scope),
  PRIMARY KEY (role, scope)
);
COMMENT ON TABLE public.role_scopes IS 'Maps roles to their allowed API scopes';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON public.user_restaurants(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_pins_restaurant_id ON public.user_pins(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_station_tokens_restaurant_id ON public.station_tokens(restaurant_id);

-- Seed minimal scopes (idempotent with ON CONFLICT DO NOTHING)
INSERT INTO public.api_scopes (scope, description) VALUES
  ('users.read', 'Read user information'),
  ('users.write', 'Create and modify users'),
  ('tables.write', 'Modify table layouts'),
  ('menu.write', 'Modify menu items'),
  ('orders.read', 'View orders'),
  ('orders.write', 'Create and modify orders')
ON CONFLICT (scope) DO NOTHING;

-- Seed role-scope mappings (idempotent)
-- Manager permissions
INSERT INTO public.role_scopes (role, scope) VALUES
  ('manager', 'users.read'),
  ('manager', 'users.write'),
  ('manager', 'tables.write'),
  ('manager', 'menu.write'),
  ('manager', 'orders.read')
ON CONFLICT (role, scope) DO NOTHING;

-- Server/Cashier permissions  
INSERT INTO public.role_scopes (role, scope) VALUES
  ('server', 'orders.write'),
  ('server', 'tables.write'),
  ('cashier', 'orders.write'),
  ('cashier', 'tables.write')
ON CONFLICT (role, scope) DO NOTHING;

-- Kitchen/Expo permissions
INSERT INTO public.role_scopes (role, scope) VALUES
  ('kitchen', 'orders.read'),
  ('expo', 'orders.read')
ON CONFLICT (role, scope) DO NOTHING;