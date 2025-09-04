-- ROLLBACK SCRATCH FILE (INFORMATIONAL ONLY - DO NOT RUN IN PRODUCTION)
-- This file shows how to revert the auth migrations if needed
-- Run statements carefully in correct dependency order

-- ========================================
-- Drop policies (must be done before dropping tables)
-- ========================================

-- Drop policies on auth tables
DO $$ BEGIN DROP POLICY IF EXISTS user_profiles_self_select ON public.user_profiles; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS user_profiles_self_update ON public.user_profiles; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS user_restaurants_self_select ON public.user_restaurants; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS user_restaurants_service_all ON public.user_restaurants; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS user_pins_service_all ON public.user_pins; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS station_tokens_restaurant_select ON public.station_tokens; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS station_tokens_service_all ON public.station_tokens; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS api_scopes_read_all ON public.api_scopes; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS role_scopes_read_all ON public.role_scopes; END $$;

-- Drop tenant isolation policies
DO $$ BEGIN DROP POLICY IF EXISTS tables_tenant_isolation ON public.tables; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS orders_tenant_isolation ON public.orders; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS menu_items_tenant_isolation ON public.menu_items; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS restaurants_tenant_isolation ON public.restaurants; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS menu_categories_tenant_isolation ON public.menu_categories; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS order_status_history_tenant_isolation ON public.order_status_history; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS voice_order_logs_tenant_isolation ON public.voice_order_logs; END $$;

-- Drop service role bypass policies
DO $$ BEGIN DROP POLICY IF EXISTS service_role_bypass ON public.tables; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS service_role_bypass ON public.orders; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS service_role_bypass ON public.menu_items; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS service_role_bypass ON public.restaurants; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS service_role_bypass ON public.menu_categories; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS service_role_bypass ON public.order_status_history; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS service_role_bypass ON public.voice_order_logs; END $$;

-- ========================================
-- Drop verification views
-- ========================================
DROP VIEW IF EXISTS public.v_user_role_overview;
DROP VIEW IF EXISTS public.v_tenant_isolation;
DROP VIEW IF EXISTS public.v_policy_count;
DROP VIEW IF EXISTS public.v_missing_auth_tables;
DROP VIEW IF EXISTS public.v_rls_tables;

-- ========================================
-- Drop indexes
-- ========================================
DROP INDEX IF EXISTS idx_user_restaurants_restaurant_id;
DROP INDEX IF EXISTS idx_user_pins_restaurant_id;
DROP INDEX IF EXISTS idx_station_tokens_restaurant_id;

-- ========================================
-- Drop tables in correct dependency order
-- ========================================

-- First drop tables that reference others
DROP TABLE IF EXISTS public.role_scopes;
DROP TABLE IF EXISTS public.station_tokens;
DROP TABLE IF EXISTS public.user_pins;
DROP TABLE IF EXISTS public.user_restaurants;
DROP TABLE IF EXISTS public.user_profiles;

-- Then drop referenced tables
DROP TABLE IF EXISTS public.api_scopes;

-- ========================================
-- Revoke grants (optional cleanup)
-- ========================================

-- Revoke grants from anon
REVOKE SELECT ON public.restaurants FROM anon;
REVOKE SELECT ON public.menu_items FROM anon;
REVOKE SELECT ON public.menu_categories FROM anon;

-- Note: This is a destructive operation
-- Only run if you need to completely remove the auth system