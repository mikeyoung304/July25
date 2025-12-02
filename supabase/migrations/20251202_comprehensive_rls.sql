-- Migration: Comprehensive RLS Policies for All Multi-Tenant Tables
-- Date: 2025-12-02
-- Description: Add Row Level Security to all 7 multi-tenant tables with restaurant_id
-- Pattern: 4 policies per table (SELECT, INSERT, UPDATE, DELETE) + service role bypass
-- Security: Uses PostgreSQL role TO service_role (NOT JWT claim check)

-- ============================================================================
-- TABLES
-- ============================================================================
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_tables" ON tables;
DROP POLICY IF EXISTS "tenant_insert_tables" ON tables;
DROP POLICY IF EXISTS "tenant_update_tables" ON tables;
DROP POLICY IF EXISTS "tenant_delete_tables" ON tables;
DROP POLICY IF EXISTS "service_role_tables" ON tables;

CREATE POLICY "tenant_select_tables" ON tables
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_tables" ON tables
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_tables" ON tables
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_tables" ON tables
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- Service role bypass using PostgreSQL role (NOT JWT claim - security fix)
CREATE POLICY "service_role_tables" ON tables
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables (restaurant_id);

-- ============================================================================
-- MENU_ITEMS
-- ============================================================================
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_menu_items" ON menu_items;
DROP POLICY IF EXISTS "tenant_insert_menu_items" ON menu_items;
DROP POLICY IF EXISTS "tenant_update_menu_items" ON menu_items;
DROP POLICY IF EXISTS "tenant_delete_menu_items" ON menu_items;
DROP POLICY IF EXISTS "service_role_menu_items" ON menu_items;

CREATE POLICY "tenant_select_menu_items" ON menu_items
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_menu_items" ON menu_items
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_menu_items" ON menu_items
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_menu_items" ON menu_items
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_menu_items" ON menu_items
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items (restaurant_id);

-- ============================================================================
-- MENU_CATEGORIES
-- ============================================================================
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "tenant_insert_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "tenant_update_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "tenant_delete_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "service_role_menu_categories" ON menu_categories;

CREATE POLICY "tenant_select_menu_categories" ON menu_categories
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_menu_categories" ON menu_categories
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_menu_categories" ON menu_categories
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_menu_categories" ON menu_categories
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_menu_categories" ON menu_categories
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories (restaurant_id);

-- ============================================================================
-- USER_PROFILES - SKIPPED
-- ============================================================================
-- NOTE: user_profiles is USER-SCOPED, not restaurant-scoped.
-- It has no restaurant_id column - users have one profile across all restaurants.
-- Tenant isolation is enforced via user_restaurants junction table.
-- If RLS is needed on user_profiles, use: user_id = auth.uid()

-- ============================================================================
-- USER_RESTAURANTS
-- ============================================================================
-- NOTE: This table is USER-scoped for SELECT (users see their own memberships)
-- but TENANT-scoped for mutations (only manage staff in your restaurant).
-- A user working at multiple restaurants must see all their memberships.
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_user_restaurants" ON user_restaurants;
DROP POLICY IF EXISTS "users_see_own_restaurants" ON user_restaurants;
DROP POLICY IF EXISTS "tenant_insert_user_restaurants" ON user_restaurants;
DROP POLICY IF EXISTS "tenant_update_user_restaurants" ON user_restaurants;
DROP POLICY IF EXISTS "tenant_delete_user_restaurants" ON user_restaurants;
DROP POLICY IF EXISTS "service_role_user_restaurants" ON user_restaurants;

-- Users can see all their own restaurant memberships (for restaurant switching)
CREATE POLICY "users_see_own_restaurants" ON user_restaurants
FOR SELECT USING (user_id = auth.uid());

-- Tenant-scoped mutations: Only manage staff within your current restaurant
CREATE POLICY "tenant_insert_user_restaurants" ON user_restaurants
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_user_restaurants" ON user_restaurants
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_user_restaurants" ON user_restaurants
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_user_restaurants" ON user_restaurants
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index already exists in most setups, IF NOT EXISTS handles duplication
CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON user_restaurants (restaurant_id);

-- ============================================================================
-- USER_PINS (RLS already enabled in 20251015 migration, add service role bypass)
-- ============================================================================
-- RLS already enabled, just add service role bypass if missing
DROP POLICY IF EXISTS "service_role_user_pins" ON user_pins;

CREATE POLICY "service_role_user_pins" ON user_pins
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Also add tenant policies if they don't exist
DROP POLICY IF EXISTS "tenant_select_user_pins" ON user_pins;
DROP POLICY IF EXISTS "tenant_insert_user_pins" ON user_pins;
DROP POLICY IF EXISTS "tenant_update_user_pins" ON user_pins;
DROP POLICY IF EXISTS "tenant_delete_user_pins" ON user_pins;

CREATE POLICY "tenant_select_user_pins" ON user_pins
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_user_pins" ON user_pins
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_user_pins" ON user_pins
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_user_pins" ON user_pins
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- Index already exists from 20251015 migration

-- ============================================================================
-- STATION_TOKENS
-- ============================================================================
ALTER TABLE station_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_station_tokens" ON station_tokens;
DROP POLICY IF EXISTS "tenant_insert_station_tokens" ON station_tokens;
DROP POLICY IF EXISTS "tenant_update_station_tokens" ON station_tokens;
DROP POLICY IF EXISTS "tenant_delete_station_tokens" ON station_tokens;
DROP POLICY IF EXISTS "service_role_station_tokens" ON station_tokens;

CREATE POLICY "tenant_select_station_tokens" ON station_tokens
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_station_tokens" ON station_tokens
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_station_tokens" ON station_tokens
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_station_tokens" ON station_tokens
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_station_tokens" ON station_tokens
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_station_tokens_restaurant_id ON station_tokens (restaurant_id);

-- ============================================================================
-- Add service role bypass to ORDERS table (from 20251015 migration)
-- ============================================================================
DROP POLICY IF EXISTS "service_role_orders" ON orders;

CREATE POLICY "service_role_orders" ON orders
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
COMMENT ON POLICY "service_role_tables" ON tables IS
'Service role bypass: Server-side operations with service_role can access all rows';

COMMENT ON POLICY "service_role_orders" ON orders IS
'Service role bypass: Server-side operations with service_role can access all rows';

-- ============================================================================
-- VERIFICATION QUERY (run after migration to verify)
-- ============================================================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('tables', 'menu_items', 'menu_categories',
--                   'user_restaurants', 'user_pins', 'station_tokens', 'orders');
--
-- Expected result: rowsecurity = true for all 7 tables
-- NOTE: user_profiles excluded (no restaurant_id column - user-scoped table)
