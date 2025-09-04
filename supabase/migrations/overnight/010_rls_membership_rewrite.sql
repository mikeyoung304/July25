-- RLS Policy Rewrite: Remove JWT claim dependency, use membership-based checks
-- This migration replaces all policies that reference request.jwt.claims.restaurant_id
-- with policies that check membership via user_restaurants table

-- 1. TABLES table
DROP POLICY IF EXISTS tables_manage_same_restaurant ON public.tables;
DROP POLICY IF EXISTS tables_tenant_isolation ON public.tables;

CREATE POLICY tables_tenant_access ON public.tables
FOR ALL
USING (public.is_member_of_restaurant(restaurant_id))
WITH CHECK (public.is_member_of_restaurant(restaurant_id));

-- 2. ORDERS table
DROP POLICY IF EXISTS "Users can manage their restaurant orders" ON public.orders;
DROP POLICY IF EXISTS orders_tenant_isolation ON public.orders;

CREATE POLICY orders_tenant_access ON public.orders
FOR ALL
USING (public.is_member_of_restaurant(restaurant_id))
WITH CHECK (public.is_member_of_restaurant(restaurant_id));

-- 3. MENU_ITEMS table
DROP POLICY IF EXISTS mi_modify_same_restaurant ON public.menu_items;
DROP POLICY IF EXISTS mi_select_same_restaurant ON public.menu_items;
DROP POLICY IF EXISTS menu_items_tenant_isolation ON public.menu_items;

CREATE POLICY menu_items_tenant_access ON public.menu_items
FOR ALL
USING (public.is_member_of_restaurant(restaurant_id))
WITH CHECK (public.is_member_of_restaurant(restaurant_id));

-- 4. MENU_CATEGORIES table
DROP POLICY IF EXISTS mc_modify_same_restaurant ON public.menu_categories;
DROP POLICY IF EXISTS mc_select_same_restaurant ON public.menu_categories;
DROP POLICY IF EXISTS menu_categories_tenant_isolation ON public.menu_categories;

CREATE POLICY menu_categories_tenant_access ON public.menu_categories
FOR ALL
USING (public.is_member_of_restaurant(restaurant_id))
WITH CHECK (public.is_member_of_restaurant(restaurant_id));

-- 5. RESTAURANTS table (special case - checking ID itself)
DROP POLICY IF EXISTS restaurants_select_own ON public.restaurants;
DROP POLICY IF EXISTS restaurants_update_own ON public.restaurants;
DROP POLICY IF EXISTS restaurants_tenant_isolation ON public.restaurants;

CREATE POLICY restaurants_tenant_access ON public.restaurants
FOR ALL
USING (public.is_member_of_restaurant(id))
WITH CHECK (public.is_member_of_restaurant(id));

-- 6. ORDER_STATUS_HISTORY table
DROP POLICY IF EXISTS "Users can view their restaurant order history" ON public.order_status_history;
DROP POLICY IF EXISTS order_status_history_tenant_isolation ON public.order_status_history;

CREATE POLICY order_status_history_tenant_access ON public.order_status_history
FOR ALL
USING (public.is_member_of_restaurant(restaurant_id))
WITH CHECK (public.is_member_of_restaurant(restaurant_id));

-- 7. VOICE_ORDER_LOGS table
DROP POLICY IF EXISTS "Users can manage their restaurant voice logs" ON public.voice_order_logs;
DROP POLICY IF EXISTS voice_order_logs_tenant_isolation ON public.voice_order_logs;

CREATE POLICY voice_order_logs_tenant_access ON public.voice_order_logs
FOR ALL
USING (public.is_member_of_restaurant(restaurant_id))
WITH CHECK (public.is_member_of_restaurant(restaurant_id));

-- 8. STATION_TOKENS table
DROP POLICY IF EXISTS station_tokens_restaurant_select ON public.station_tokens;

CREATE POLICY station_tokens_tenant_access ON public.station_tokens
FOR ALL
USING (public.is_member_of_restaurant(restaurant_id))
WITH CHECK (public.is_member_of_restaurant(restaurant_id));

-- 9. USER_PINS table (already has restaurant_id)
-- First check if any JWT-based policies exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_pins'
    AND (qual ILIKE '%jwt%' OR with_check ILIKE '%jwt%')
  ) THEN
    -- Drop any JWT-based policies
    EXECUTE 'DROP POLICY IF EXISTS user_pins_tenant_isolation ON public.user_pins';
  END IF;
END $$;

-- Create membership-based policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_pins'
    AND policyname = 'user_pins_tenant_access'
  ) THEN
    EXECUTE 'CREATE POLICY user_pins_tenant_access ON public.user_pins
    FOR ALL
    USING (public.is_member_of_restaurant(restaurant_id))
    WITH CHECK (public.is_member_of_restaurant(restaurant_id))';
  END IF;
END $$;

-- 10. USER_RESTAURANTS table (self-referential - users can see their own memberships)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_restaurants'
    AND policyname = 'user_restaurants_self_access'
  ) THEN
    EXECUTE 'CREATE POLICY user_restaurants_self_access ON public.user_restaurants
    FOR SELECT
    USING (user_id = auth.uid())';
  END IF;
END $$;

-- Verify all tables have RLS enabled
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restaurants ENABLE ROW LEVEL SECURITY;