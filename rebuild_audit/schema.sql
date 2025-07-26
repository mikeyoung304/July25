-- Supabase Schema Export
-- Generated: 2025-07-21T14:36:10.465Z

-- Table: restaurants (exists)
-- Columns: id, name, slug, timezone, settings, active, created_at, updated_at
-- Table: orders (exists)
-- Table: menu_items (exists)
-- Columns: id, restaurant_id, category_id, name, description, price, active, available, dietary_flags, modifiers, aliases, prep_time_minutes, image_url, created_at, updated_at
-- Table: tables (exists)
-- Columns: id, restaurant_id, created_at, updated_at, label, seats, x_pos, y_pos, width, height, rotation, shape, status, current_order_id, active
