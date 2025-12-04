-- Migration: Add composite indexes for menu queries
-- Issue: #166 - Missing Database Indexes for Menu Queries
-- Problem: Queries filter on restaurant_id AND active but only single-column index exists
-- Solution: Add partial composite indexes for optimal query performance
--
-- Created: 2025-12-04
-- Author: Claude Code (via PR #152 code review)

-- Composite index for menu items (restaurant + active filter)
-- Using CONCURRENTLY to avoid table locks during creation
-- Partial index (WHERE active = true) since we only query active items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_restaurant_active
  ON menu_items (restaurant_id, active)
  WHERE active = true;

-- Composite index for menu categories (restaurant + active filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_categories_restaurant_active
  ON menu_categories (restaurant_id, active)
  WHERE active = true;

-- Composite index for customer-facing queries (includes availability)
-- Filters: restaurant_id, active, AND available
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_availability
  ON menu_items (restaurant_id, active, available)
  WHERE active = true AND available = true;

-- Performance notes:
-- Before: Sequential scan on 'active' column after index lookup on restaurant_id
-- After: Direct index lookup on (restaurant_id, active) or (restaurant_id, active, available)
-- Expected improvement: 5-10x faster for large menus (1000+ items)

-- Verification query (run manually to check index usage):
-- EXPLAIN ANALYZE SELECT * FROM menu_items WHERE restaurant_id = 'test' AND active = true;
