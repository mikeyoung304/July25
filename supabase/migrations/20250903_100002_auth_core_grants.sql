-- Migration: 20250903_100002_auth_core_grants.sql
-- Purpose: Configure role-based grants for anon and authenticated roles (idempotent)

-- ========================================
-- Grants for 'anon' role (minimal, read-only where appropriate)
-- ========================================

-- Allow anon to read restaurants (for public menu viewing)
GRANT SELECT ON public.restaurants TO anon;

-- Allow anon to read menu items and categories (public menu)
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT ON public.menu_categories TO anon;

-- Allow anon to read API scopes and role scopes (for understanding permissions)
GRANT SELECT ON public.api_scopes TO anon;
GRANT SELECT ON public.role_scopes TO anon;

-- No INSERT/UPDATE/DELETE for anon on any tables

-- ========================================
-- Grants for 'authenticated' role (relies on RLS for access control)
-- ========================================

-- Auth tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_restaurants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_pins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.station_tokens TO authenticated;

-- Business tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_order_logs TO authenticated;

-- Read-only for scope tables
GRANT SELECT ON public.api_scopes TO authenticated;
GRANT SELECT ON public.role_scopes TO authenticated;

-- ========================================
-- Sequence grants (for auto-generated IDs)
-- ========================================

-- Grant usage on all sequences in public schema to authenticated
DO $$
DECLARE
  seq_record RECORD;
BEGIN
  FOR seq_record IN 
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('GRANT USAGE ON SEQUENCE public.%I TO authenticated', seq_record.sequence_name);
    EXECUTE format('GRANT USAGE ON SEQUENCE public.%I TO anon', seq_record.sequence_name);
  END LOOP;
END$$;

-- ========================================
-- Note on service_role
-- ========================================
-- service_role already has full access via Supabase default configuration
-- We don't need to grant additional permissions to service_role
-- It bypasses RLS via policies we've created (service_role_bypass)