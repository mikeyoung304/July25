-- Migration: 20250903_100003_verification_bookmarks.sql  
-- Purpose: Create verification views for easy RLS and auth table checking (idempotent)

-- ========================================
-- View: RLS status for all public tables
-- ========================================
CREATE OR REPLACE VIEW public.v_rls_tables AS
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  pg_catalog.pg_get_userbyid(c.relowner) AS owner
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

COMMENT ON VIEW public.v_rls_tables IS 'Shows RLS status for all tables in public schema';

-- ========================================
-- View: Check if required auth tables exist
-- ========================================
CREATE OR REPLACE VIEW public.v_missing_auth_tables AS
WITH required(name) AS (
  VALUES
    ('user_profiles'),
    ('user_restaurants'),
    ('user_pins'),
    ('station_tokens'),
    ('api_scopes'),
    ('role_scopes')
)
SELECT
  r.name AS expected_table,
  (to_regclass('public.' || r.name) IS NOT NULL) AS exists,
  CASE 
    WHEN to_regclass('public.' || r.name) IS NOT NULL THEN 'OK'
    ELSE 'MISSING'
  END AS status
FROM required r
ORDER BY r.name;

COMMENT ON VIEW public.v_missing_auth_tables IS 'Checks existence of required auth tables';

-- ========================================
-- View: Policy count by table
-- ========================================
CREATE OR REPLACE VIEW public.v_policy_count AS
SELECT
  c.relname AS table_name,
  COUNT(p.polname) AS policy_count,
  STRING_AGG(p.polname, ', ' ORDER BY p.polname) AS policy_names
FROM pg_catalog.pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
GROUP BY c.relname
ORDER BY c.relname;

COMMENT ON VIEW public.v_policy_count IS 'Shows count and names of policies per table';

-- ========================================
-- View: Restaurant tenant isolation check
-- ========================================
CREATE OR REPLACE VIEW public.v_tenant_isolation AS
SELECT 
  c.relname AS table_name,
  EXISTS(
    SELECT 1 FROM pg_policy p 
    WHERE p.polrelid = c.oid 
    AND p.polname LIKE '%tenant%'
  ) AS has_tenant_policy,
  EXISTS(
    SELECT 1 FROM pg_policy p 
    WHERE p.polrelid = c.oid 
    AND p.polname = 'service_role_bypass'
  ) AS has_service_bypass,
  EXISTS(
    SELECT 1 
    FROM pg_attribute a 
    WHERE a.attrelid = c.oid 
    AND a.attname = 'restaurant_id'
    AND NOT a.attisdropped
  ) AS has_restaurant_id_column
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace  
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('tables', 'orders', 'menu_items', 'menu_categories', 'voice_order_logs')
ORDER BY c.relname;

COMMENT ON VIEW public.v_tenant_isolation IS 'Checks tenant isolation setup for multi-tenant tables';

-- ========================================
-- View: User and role overview
-- ========================================
CREATE OR REPLACE VIEW public.v_user_role_overview AS
SELECT 
  COUNT(DISTINCT ur.user_id) AS total_users,
  COUNT(DISTINCT ur.restaurant_id) AS total_restaurants,
  ur.role,
  COUNT(*) AS assignment_count
FROM public.user_restaurants ur
GROUP BY ur.role
ORDER BY assignment_count DESC;

COMMENT ON VIEW public.v_user_role_overview IS 'Overview of user-restaurant role assignments';

-- Grant SELECT on verification views to anon and authenticated
GRANT SELECT ON public.v_rls_tables TO anon, authenticated;
GRANT SELECT ON public.v_missing_auth_tables TO anon, authenticated;
GRANT SELECT ON public.v_policy_count TO anon, authenticated;
GRANT SELECT ON public.v_tenant_isolation TO anon, authenticated;
GRANT SELECT ON public.v_user_role_overview TO anon, authenticated;