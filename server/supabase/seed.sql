-- Seed data for Grow Fresh Local Food
-- This seeds the menu data for the default restaurant

-- Get the default restaurant ID
DO $$
DECLARE
  restaurant_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Insert menu categories
  INSERT INTO menu_categories (restaurant_id, name, slug, display_order) VALUES
    (restaurant_id, 'Starters', 'starters', 1),
    (restaurant_id, 'Salads', 'salads', 2),
    (restaurant_id, 'Bowls', 'bowls', 3),
    (restaurant_id, 'Entrees', 'entrees', 4),
    (restaurant_id, 'Sides', 'sides', 5),
    (restaurant_id, 'Veggie Plate', 'veggie-plate', 6)
  ON CONFLICT (restaurant_id, slug) DO NOTHING;

  -- Insert Starters
  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, dietary_flags, aliases) VALUES
    (restaurant_id, 
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'starters'),
     'Summer Sampler', 
     'GA Made Sausage, Jalapeño Pimento Cheese Bites, Tomato Tea Sandwich, House Pickles, Fruit, Flatbread',
     16.00,
     '{}',
     '{"sampler", "sampler plate", "appetizer sampler"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'starters'),
     'Peach & Prosciutto Caprese',
     'Fresh peaches with prosciutto and mozzarella',
     12.00,
     '{}',
     '{"peach and prosciutto", "caprese", "peach salad"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'starters'),
     'Watermelon Tataki',
     'Seared watermelon with Asian-inspired flavors',
     12.00,
     '{"vegetarian", "vegan"}',
     '{"watermelon", "tataki"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'starters'),
     'Tea Sandwiches',
     'Assorted finger sandwiches',
     10.00,
     '{}',
     '{"tea sandwich", "finger sandwiches"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'starters'),
     'Jalapeño Pimento Bites',
     'Spicy pimento cheese bites',
     10.00,
     '{"vegetarian"}',
     '{"pimento bites", "jalapeno bites", "pimento cheese"}')
  ON CONFLICT DO NOTHING;

  -- Insert Salads
  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, dietary_flags, aliases, modifiers) VALUES
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'salads'),
     'Summer Salad',
     'Seasonal greens with fresh summer produce',
     12.00,
     '{"vegetarian"}',
     '{"house salad", "seasonal salad"}',
     '[{"name": "Add Chicken", "price": 4}, {"name": "Add Salmon", "price": 6}]'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'salads'),
     'Peach Arugula Salad',
     'Fresh peaches with peppery arugula',
     12.00,
     '{"vegetarian"}',
     '{"peach salad", "arugula salad"}',
     '[{"name": "Add Prosciutto", "price": 4}]'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'salads'),
     'Greek Salad',
     'Traditional Greek salad with feta and olives',
     12.00,
     '{"vegetarian"}',
     '{"mediterranean salad"}',
     '[{"name": "Add Chicken", "price": 4}, {"name": "Add Salmon", "price": 6}]'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'salads'),
     'Tuna Salad',
     'House-made tuna salad on fresh greens',
     14.00,
     '{}',
     '{"tuna", "tuna plate"}',
     '[]'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'salads'),
     'Mom''s Chicken Salad',
     'Family recipe chicken salad',
     13.00,
     '{}',
     '{"mama salad", "chicken salad", "mom salad", "mama chicken"}',
     '[]'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'salads'),
     'Grilled Chicken Salad',
     'Grilled chicken breast on mixed greens',
     14.00,
     '{}',
     '{"grilled chicken", "chicken breast salad"}',
     '[]')
  ON CONFLICT DO NOTHING;

  -- Insert Bowls
  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, dietary_flags, aliases, modifiers) VALUES
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'bowls'),
     'Soul Bowl',
     'GA made Smoked Sausage, Collards, Black-Eyed Peas, Rice, Pico De Gallo, Cornbread',
     14.00,
     '{}',
     '{"georgia soul", "soul food bowl", "sausage bowl", "collard bowl"}',
     '[{"name": "No Rice", "price": 0}, {"name": "Extra Collards", "price": 2}]'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'bowls'),
     'Chicken Fajita Keto',
     'Keto-friendly chicken fajita bowl',
     14.00,
     '{"keto"}',
     '{"fajita bowl", "keto bowl", "chicken fajita", "keto chicken"}',
     '[{"name": "Add Rice", "price": 1}]'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'bowls'),
     'Greek Bowl',
     'Marinated Chicken Thigh, Couscous, Cucumber Salad, Feta, Olives, Naan, Tzatziki Sauce',
     14.00,
     '{}',
     '{"greek chicken", "mediterranean bowl", "greek chicken bowl"}',
     '[{"name": "No Olives", "price": 0}, {"name": "No Feta", "price": 0}]'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'bowls'),
     'Summer Vegan Bowl',
     'Cold vegan bowl with fresh summer vegetables',
     14.00,
     '{"vegan"}',
     '{"vegan bowl", "cold vegan", "vegan option"}',
     '[]'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'bowls'),
     'Summer Succotash',
     'Hot vegan succotash bowl',
     14.00,
     '{"vegan"}',
     '{"succotash", "hot vegan", "succotash bowl"}',
     '[]')
  ON CONFLICT DO NOTHING;

  -- Insert Entrees
  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, dietary_flags, aliases) VALUES
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'entrees'),
     'Peach Chicken',
     'Chicken with peach glaze',
     16.00,
     '{}',
     '{"chicken with peaches", "peach glazed chicken"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'entrees'),
     'Teriyaki Salmon Over Rice',
     'Glazed salmon served over rice',
     16.00,
     '{}',
     '{"salmon", "salmon over rice", "salmon rice"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'entrees'),
     'Hamburger Steak over rice',
     'Southern-style hamburger steak with gravy over rice',
     15.00,
     '{}',
     '{"burger steak", "salisbury steak", "steak over rice"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'entrees'),
     'Greek Chicken Thighs (2) Over Rice',
     'Two marinated Greek chicken thighs served over rice',
     16.00,
     '{}',
     '{"greek thighs", "chicken thighs", "greek chicken over rice"}')
  ON CONFLICT DO NOTHING;

  -- Insert Sides (as a special category)
  INSERT INTO menu_items (restaurant_id, category_id, name, price, dietary_flags, aliases) VALUES
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'sides'),
     'Potatoes Romanoff',
     4.00,
     '{"vegetarian"}',
     '{"romanoff", "potato romanoff", "creamy potatoes"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'sides'),
     'Black Eyed Peas',
     4.00,
     '{"vegan"}',
     '{"black eye peas", "peas", "field peas"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'sides'),
     'Collards',
     4.00,
     '{}',
     '{"collard greens", "greens"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'sides'),
     'Sweet Potatoes',
     4.00,
     '{"vegetarian"}',
     '{"sweet potato", "yams"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'sides'),
     'Rice',
     3.00,
     '{"vegan"}',
     '{"white rice", "steamed rice"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'sides'),
     'Potato Salad',
     4.00,
     '{"vegetarian"}',
     '{"tater salad"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'sides'),
     'Fruit Cup',
     4.00,
     '{"vegan"}',
     '{"fruit", "fresh fruit"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'sides'),
     'Cucumber Salad',
     4.00,
     '{"vegan"}',
     '{"cucumber", "cucumbers"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'sides'),
     'Side Salad',
     4.00,
     '{"vegetarian"}',
     '{"small salad", "garden salad"}'),
    
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'sides'),
     'Peanut Asian Noodles',
     4.00,
     '{"vegetarian"}',
     '{"asian noodles", "peanut noodles", "noodles"}')
  ON CONFLICT DO NOTHING;

  -- Insert Veggie Plate option
  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, dietary_flags, aliases, modifiers) VALUES
    (restaurant_id,
     (SELECT id FROM menu_categories WHERE restaurant_id = restaurant_id AND slug = 'veggie-plate'),
     'Veggie Plate',
     'Choose 3 or 4 sides',
     10.00,
     '{"vegetarian"}',
     '{"vegetable plate", "veggie platter", "vegetarian plate"}',
     '[{"name": "Three Sides", "price": 0}, {"name": "Four Sides", "price": 2.50}]')
  ON CONFLICT DO NOTHING;

END $$;