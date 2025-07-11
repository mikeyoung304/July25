-- Grow Fresh Local Food Restaurant OS
-- Initial database schema with multi-tenant support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core tables
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, slug)
);

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  available BOOLEAN DEFAULT true,
  dietary_flags TEXT[] DEFAULT '{}', -- ['vegetarian', 'vegan', 'keto', 'gluten-free']
  modifiers JSONB DEFAULT '[]', -- [{id, name, price, group}]
  aliases TEXT[] DEFAULT '{}', -- Alternative names for voice recognition
  prep_time_minutes INTEGER DEFAULT 10,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  type TEXT CHECK (type IN ('kiosk', 'drive-thru', 'online', 'voice')) DEFAULT 'kiosk',
  status TEXT CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')) DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  customer_name TEXT,
  table_number TEXT,
  metadata JSONB DEFAULT '{}', -- voice transcription, device info, etc
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Order status history (for analytics)
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Voice order logs (for improving recognition)
CREATE TABLE IF NOT EXISTS voice_order_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  transcription TEXT NOT NULL,
  parsed_items JSONB,
  confidence_score DECIMAL(3,2),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  audio_url TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_menu_items_restaurant_active ON menu_items(restaurant_id, active);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(restaurant_id, order_number);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX idx_voice_logs_restaurant ON voice_order_logs(restaurant_id, created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_order_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for menu items (when active)
CREATE POLICY "Public can view active menu items" ON menu_items
  FOR SELECT
  USING (active = true);

-- Public read access for menu categories (when active)
CREATE POLICY "Public can view active menu categories" ON menu_categories
  FOR SELECT
  USING (active = true);

-- Restaurant-scoped access for orders
CREATE POLICY "Users can manage their restaurant orders" ON orders
  FOR ALL
  USING (
    restaurant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'restaurant_id',
      current_setting('request.headers', true)::json->>'x-restaurant-id'
    )::uuid
  );

-- Restaurant-scoped access for order status history
CREATE POLICY "Users can view their restaurant order history" ON order_status_history
  FOR SELECT
  USING (
    restaurant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'restaurant_id',
      current_setting('request.headers', true)::json->>'x-restaurant-id'
    )::uuid
  );

-- Restaurant-scoped access for voice logs
CREATE POLICY "Users can manage their restaurant voice logs" ON voice_order_logs
  FOR ALL
  USING (
    restaurant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'restaurant_id',
      current_setting('request.headers', true)::json->>'x-restaurant-id'
    )::uuid
  );

-- Insert default restaurant for development
INSERT INTO restaurants (id, name, slug, settings) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Grow Fresh Local Food', 'grow-fresh', 
   '{"address": "Macon, GA", "phone": "(478) 555-0123", "hours": {"monday": "11am-9pm", "tuesday": "11am-9pm", "wednesday": "11am-9pm", "thursday": "11am-9pm", "friday": "11am-10pm", "saturday": "11am-10pm", "sunday": "12pm-8pm"}}')
ON CONFLICT (id) DO NOTHING;