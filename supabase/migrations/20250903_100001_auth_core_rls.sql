-- Migration: 20250903_100001_auth_core_rls.sql
-- Purpose: Enable RLS and create policies for auth tables and fix existing table policies (idempotent)

-- Enable RLS on auth tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_scopes ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Policies for user_profiles
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'user_profiles_self_select' AND polrelid = 'public.user_profiles'::regclass
  ) THEN
    CREATE POLICY user_profiles_self_select ON public.user_profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'user_profiles_self_update' AND polrelid = 'public.user_profiles'::regclass
  ) THEN
    CREATE POLICY user_profiles_self_update ON public.user_profiles
      FOR UPDATE USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- ========================================
-- Policies for user_restaurants
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'user_restaurants_self_select' AND polrelid = 'public.user_restaurants'::regclass
  ) THEN
    CREATE POLICY user_restaurants_self_select ON public.user_restaurants
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END$$;

-- Allow service role to manage user_restaurants (for provisioning)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'user_restaurants_service_all' AND polrelid = 'public.user_restaurants'::regclass
  ) THEN
    CREATE POLICY user_restaurants_service_all ON public.user_restaurants
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END$$;

-- ========================================
-- Policies for user_pins
-- ========================================
-- PIN lookup happens server-side with service client
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'user_pins_service_all' AND polrelid = 'public.user_pins'::regclass
  ) THEN
    CREATE POLICY user_pins_service_all ON public.user_pins
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END$$;

-- ========================================
-- Policies for station_tokens
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'station_tokens_restaurant_select' AND polrelid = 'public.station_tokens'::regclass
  ) THEN
    CREATE POLICY station_tokens_restaurant_select ON public.station_tokens
      FOR SELECT USING (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
END$$;

-- Service role can manage station tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'station_tokens_service_all' AND polrelid = 'public.station_tokens'::regclass
  ) THEN
    CREATE POLICY station_tokens_service_all ON public.station_tokens
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END$$;

-- ========================================
-- Policies for api_scopes and role_scopes (read-only for all)
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'api_scopes_read_all' AND polrelid = 'public.api_scopes'::regclass
  ) THEN
    CREATE POLICY api_scopes_read_all ON public.api_scopes
      FOR SELECT USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'role_scopes_read_all' AND polrelid = 'public.role_scopes'::regclass
  ) THEN
    CREATE POLICY role_scopes_read_all ON public.role_scopes
      FOR SELECT USING (true);
  END IF;
END$$;

-- ========================================
-- Fix policies for existing tables (tenant isolation)
-- ========================================

-- Tables table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'tables_tenant_isolation' AND polrelid = 'public.tables'::regclass
  ) THEN
    CREATE POLICY tables_tenant_isolation ON public.tables
      FOR ALL 
      USING (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid))
      WITH CHECK (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
END$$;

-- Orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'orders_tenant_isolation' AND polrelid = 'public.orders'::regclass
  ) THEN
    CREATE POLICY orders_tenant_isolation ON public.orders
      FOR ALL
      USING (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid))
      WITH CHECK (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
END$$;

-- Menu items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'menu_items_tenant_isolation' AND polrelid = 'public.menu_items'::regclass
  ) THEN
    CREATE POLICY menu_items_tenant_isolation ON public.menu_items
      FOR ALL
      USING (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid))
      WITH CHECK (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
END$$;

-- Restaurants table (users can only see their own)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'restaurants_tenant_isolation' AND polrelid = 'public.restaurants'::regclass
  ) THEN
    CREATE POLICY restaurants_tenant_isolation ON public.restaurants
      FOR ALL
      USING (id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid))
      WITH CHECK (id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
END$$;

-- Menu categories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'menu_categories_tenant_isolation' AND polrelid = 'public.menu_categories'::regclass
  ) THEN
    CREATE POLICY menu_categories_tenant_isolation ON public.menu_categories
      FOR ALL
      USING (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid))
      WITH CHECK (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
END$$;

-- Order status history table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'order_status_history_tenant_isolation' AND polrelid = 'public.order_status_history'::regclass
  ) THEN
    CREATE POLICY order_status_history_tenant_isolation ON public.order_status_history
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o 
          WHERE o.id = order_status_history.order_id 
          AND o.restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
        )
      );
  END IF;
END$$;

-- Voice order logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'voice_order_logs_tenant_isolation' AND polrelid = 'public.voice_order_logs'::regclass
  ) THEN
    CREATE POLICY voice_order_logs_tenant_isolation ON public.voice_order_logs
      FOR ALL
      USING (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid))
      WITH CHECK (restaurant_id = coalesce((auth.jwt() ->> 'restaurant_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
END$$;

-- ========================================
-- Service role bypass for all tables (for admin operations)
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'service_role_bypass' AND polrelid = 'public.tables'::regclass
  ) THEN
    CREATE POLICY service_role_bypass ON public.tables
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'service_role_bypass' AND polrelid = 'public.orders'::regclass
  ) THEN
    CREATE POLICY service_role_bypass ON public.orders
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'service_role_bypass' AND polrelid = 'public.menu_items'::regclass
  ) THEN
    CREATE POLICY service_role_bypass ON public.menu_items
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'service_role_bypass' AND polrelid = 'public.restaurants'::regclass
  ) THEN
    CREATE POLICY service_role_bypass ON public.restaurants
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'service_role_bypass' AND polrelid = 'public.menu_categories'::regclass
  ) THEN
    CREATE POLICY service_role_bypass ON public.menu_categories
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'service_role_bypass' AND polrelid = 'public.order_status_history'::regclass
  ) THEN
    CREATE POLICY service_role_bypass ON public.order_status_history
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'service_role_bypass' AND polrelid = 'public.voice_order_logs'::regclass
  ) THEN
    CREATE POLICY service_role_bypass ON public.voice_order_logs
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END$$;