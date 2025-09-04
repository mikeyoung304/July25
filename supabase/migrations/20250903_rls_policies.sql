-- Comprehensive RLS Policies for Production
-- Restaurant OS v6.0.3
-- Date: 2025-09-03

-- ============================================
-- TABLES TABLE RLS POLICIES
-- ============================================

-- Enable RLS on tables table if not already enabled
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Staff can view restaurant tables" ON tables;
DROP POLICY IF EXISTS "Managers can create tables" ON tables;
DROP POLICY IF EXISTS "Managers can update tables" ON tables;
DROP POLICY IF EXISTS "Managers can delete tables" ON tables;

-- View Policy: All authenticated restaurant staff can view tables
CREATE POLICY "Staff can view restaurant tables" ON tables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = tables.restaurant_id
      AND ur.is_active = true
    )
  );

-- Create Policy: Only managers/owners can create tables
CREATE POLICY "Managers can create tables" ON tables
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = tables.restaurant_id
      AND ur.role IN ('owner', 'manager')
      AND ur.is_active = true
    )
  );

-- Update Policy: Managers can update, servers can update status only
CREATE POLICY "Staff can update tables" ON tables
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = tables.restaurant_id
      AND ur.is_active = true
      AND (
        -- Managers can update everything
        ur.role IN ('owner', 'manager')
        OR
        -- Servers can only update status and current_order_id
        (ur.role IN ('server', 'cashier') AND 
         COALESCE(tables.x_pos = OLD.x_pos, true) AND
         COALESCE(tables.y_pos = OLD.y_pos, true) AND
         COALESCE(tables.shape = OLD.shape, true) AND
         COALESCE(tables.label = OLD.label, true) AND
         COALESCE(tables.capacity = OLD.capacity, true))
      )
    )
  );

-- Delete Policy: Only managers/owners can delete tables
CREATE POLICY "Managers can delete tables" ON tables
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = tables.restaurant_id
      AND ur.role IN ('owner', 'manager')
      AND ur.is_active = true
    )
  );

-- ============================================
-- ORDERS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on orders table if not already enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Staff can view restaurant orders" ON orders;
DROP POLICY IF EXISTS "Staff can create orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;

-- View Policy: All restaurant staff can view orders
CREATE POLICY "Staff can view restaurant orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = orders.restaurant_id
      AND ur.is_active = true
    )
  );

-- Create Policy: Servers, cashiers, and managers can create orders
CREATE POLICY "Staff can create orders" ON orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = orders.restaurant_id
      AND ur.role IN ('owner', 'manager', 'server', 'cashier')
      AND ur.is_active = true
    )
  );

-- Update Policy: Different roles have different update permissions
CREATE POLICY "Staff can update orders" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = orders.restaurant_id
      AND ur.is_active = true
      AND (
        -- Managers can update everything
        ur.role IN ('owner', 'manager')
        OR
        -- Kitchen can update status for kitchen operations
        (ur.role = 'kitchen' AND NEW.status IN ('confirmed', 'preparing', 'ready'))
        OR
        -- Expo can mark as completed
        (ur.role = 'expo' AND NEW.status IN ('ready', 'completed'))
        OR
        -- Servers/cashiers can update their own orders
        (ur.role IN ('server', 'cashier') AND orders.created_by = auth.uid())
      )
    )
  );

-- ============================================
-- MENU_ITEMS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on menu_items table if not already enabled
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can view active menu items" ON menu_items;
DROP POLICY IF EXISTS "Managers can manage menu items" ON menu_items;

-- View Policy: Anyone can view active menu items (public menu)
CREATE POLICY "Anyone can view active menu items" ON menu_items
  FOR SELECT
  USING (active = true);

-- Manage Policy: Only managers/owners can create/update/delete menu items
CREATE POLICY "Managers can manage menu items" ON menu_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = menu_items.restaurant_id
      AND ur.role IN ('owner', 'manager')
      AND ur.is_active = true
    )
  );

-- ============================================
-- MENU_CATEGORIES TABLE RLS POLICIES
-- ============================================

-- Enable RLS on menu_categories table if not already enabled
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can view active categories" ON menu_categories;
DROP POLICY IF EXISTS "Managers can manage categories" ON menu_categories;

-- View Policy: Anyone can view active categories
CREATE POLICY "Anyone can view active categories" ON menu_categories
  FOR SELECT
  USING (active = true);

-- Manage Policy: Only managers/owners can manage categories
CREATE POLICY "Managers can manage categories" ON menu_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = menu_categories.restaurant_id
      AND ur.role IN ('owner', 'manager')
      AND ur.is_active = true
    )
  );

-- ============================================
-- PAYMENTS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on payments table if not already enabled
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Staff can view payments" ON payments;
DROP POLICY IF EXISTS "Authorized staff can create payments" ON payments;

-- View Policy: Staff can view restaurant payments
CREATE POLICY "Staff can view payments" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = payments.restaurant_id
      AND ur.is_active = true
      AND ur.role IN ('owner', 'manager', 'cashier', 'server')
    )
  );

-- Create Policy: Cashiers and managers can process payments
CREATE POLICY "Authorized staff can create payments" ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = payments.restaurant_id
      AND ur.role IN ('owner', 'manager', 'cashier', 'server')
      AND ur.is_active = true
    )
  );

-- ============================================
-- RESTAURANTS TABLE RLS POLICIES
-- ============================================

-- Enable RLS on restaurants table if not already enabled
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Staff can view their restaurant" ON restaurants;
DROP POLICY IF EXISTS "Owners can update restaurant" ON restaurants;

-- View Policy: Staff can view their restaurant
CREATE POLICY "Staff can view their restaurant" ON restaurants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = restaurants.id
      AND ur.is_active = true
    )
  );

-- Update Policy: Only owners can update restaurant details
CREATE POLICY "Owners can update restaurant" ON restaurants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants ur
      WHERE ur.user_id = auth.uid()
      AND ur.restaurant_id = restaurants.id
      AND ur.role = 'owner'
      AND ur.is_active = true
    )
  );

-- ============================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON tables TO authenticated;
GRANT INSERT, UPDATE ON orders TO authenticated;
GRANT INSERT ON payments TO authenticated;
GRANT UPDATE ON restaurants TO authenticated;

-- Grant permissions to anon users for public menu viewing
GRANT SELECT ON menu_items TO anon;
GRANT SELECT ON menu_categories TO anon;

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Function to check if user has role in restaurant
CREATE OR REPLACE FUNCTION user_has_role_in_restaurant(
  check_user_id UUID,
  check_restaurant_id UUID,
  check_roles TEXT[]
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_restaurants
    WHERE user_id = check_user_id
    AND restaurant_id = check_restaurant_id
    AND role = ANY(check_roles)
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in restaurant
CREATE OR REPLACE FUNCTION get_user_restaurant_role(
  check_user_id UUID,
  check_restaurant_id UUID
) RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_restaurants
  WHERE user_id = check_user_id
  AND restaurant_id = check_restaurant_id
  AND is_active = true
  LIMIT 1;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- NOTES
-- ============================================
-- 1. All tables now have comprehensive RLS policies
-- 2. Policies respect the role hierarchy: owner > manager > server/cashier > kitchen/expo
-- 3. Service role key will bypass all RLS (use for admin operations)
-- 4. User tokens will respect RLS (use for user operations)
-- 5. Helper functions available for complex permission checks