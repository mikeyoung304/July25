#!/usr/bin/env tsx

/**
 * Database Seeding Script
 * Creates consistent test data for development and testing
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const defaultRestaurantId = process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const seedData = {
  restaurants: [
    {
      id: defaultRestaurantId,
      name: 'Grow Fresh Local Food',
      address: '123 Farm Street, Local City, LC 12345',
      phone: '555-0123',
      email: 'contact@growfreshlocalfood.com',
      timezone: 'America/New_York',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  menu_categories: [
    { id: 'appetizers', name: 'Appetizers', restaurant_id: defaultRestaurantId, sort_order: 1 },
    { id: 'mains', name: 'Main Courses', restaurant_id: defaultRestaurantId, sort_order: 2 },
    { id: 'desserts', name: 'Desserts', restaurant_id: defaultRestaurantId, sort_order: 3 },
    { id: 'beverages', name: 'Beverages', restaurant_id: defaultRestaurantId, sort_order: 4 }
  ],
  menu_items: [
    {
      id: 'farm-salad',
      name: 'Farm Fresh Salad',
      description: 'Mixed greens from our local farm with seasonal vegetables',
      price: 12.95,
      category_id: 'appetizers',
      restaurant_id: defaultRestaurantId,
      is_available: true,
      preparation_time: 10,
      allergens: ['gluten'],
      dietary_tags: ['vegetarian', 'vegan', 'gluten-free']
    },
    {
      id: 'grass-fed-burger',
      name: 'Grass-Fed Beef Burger',
      description: 'Locally sourced grass-fed beef with organic vegetables',
      price: 16.95,
      category_id: 'mains',
      restaurant_id: defaultRestaurantId,
      is_available: true,
      preparation_time: 20,
      allergens: ['gluten', 'dairy'],
      dietary_tags: []
    },
    {
      id: 'seasonal-fruit-tart',
      name: 'Seasonal Fruit Tart',
      description: 'Fresh seasonal fruits on a house-made pastry',
      price: 8.95,
      category_id: 'desserts',
      restaurant_id: defaultRestaurantId,
      is_available: true,
      preparation_time: 5,
      allergens: ['gluten', 'eggs', 'dairy'],
      dietary_tags: ['vegetarian']
    },
    {
      id: 'fresh-juice',
      name: 'Fresh-Pressed Juice',
      description: 'Daily selection of fresh-pressed fruit and vegetable juices',
      price: 5.95,
      category_id: 'beverages',
      restaurant_id: defaultRestaurantId,
      is_available: true,
      preparation_time: 3,
      allergens: [],
      dietary_tags: ['vegan', 'gluten-free']
    }
  ],
  tables: [
    { id: 'table-1', number: 1, seats: 2, restaurant_id: defaultRestaurantId, status: 'available' },
    { id: 'table-2', number: 2, seats: 4, restaurant_id: defaultRestaurantId, status: 'available' },
    { id: 'table-3', number: 3, seats: 6, restaurant_id: defaultRestaurantId, status: 'available' },
    { id: 'table-4', number: 4, seats: 2, restaurant_id: defaultRestaurantId, status: 'available' }
  ],
  sample_orders: [
    {
      id: 'sample-order-1',
      restaurant_id: defaultRestaurantId,
      table_id: 'table-1',
      status: 'completed',
      customer_info: {
        name: 'John Doe',
        phone: '555-0101'
      },
      items: [
        {
          menu_item_id: 'farm-salad',
          quantity: 1,
          unit_price: 12.95,
          special_instructions: 'Dressing on the side'
        },
        {
          menu_item_id: 'fresh-juice',
          quantity: 1,
          unit_price: 5.95,
          special_instructions: 'Orange and carrot mix'
        }
      ],
      subtotal: 18.90,
      tax_amount: 1.89,
      total_amount: 20.79,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
    }
  ]
};

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Clearing existing development data...');
      await supabase.from('order_items').delete().neq('id', '');
      await supabase.from('orders').delete().neq('id', '');
      await supabase.from('menu_items').delete().neq('id', '');
      await supabase.from('menu_categories').delete().neq('id', '');
      await supabase.from('tables').delete().neq('id', '');
      await supabase.from('restaurants').delete().neq('id', '');
    }

    // Seed restaurants
    console.log('🏪 Seeding restaurants...');
    const { error: restaurantError } = await supabase
      .from('restaurants')
      .upsert(seedData.restaurants, { onConflict: 'id' });
    
    if (restaurantError) throw restaurantError;

    // Seed menu categories
    console.log('📋 Seeding menu categories...');
    const { error: categoryError } = await supabase
      .from('menu_categories')
      .upsert(seedData.menu_categories, { onConflict: 'id' });
    
    if (categoryError) throw categoryError;

    // Seed menu items
    console.log('🍽️ Seeding menu items...');
    const { error: menuError } = await supabase
      .from('menu_items')
      .upsert(seedData.menu_items, { onConflict: 'id' });
    
    if (menuError) throw menuError;

    // Seed tables
    console.log('🪑 Seeding tables...');
    const { error: tableError } = await supabase
      .from('tables')
      .upsert(seedData.tables, { onConflict: 'id' });
    
    if (tableError) throw tableError;

    // Seed sample orders
    console.log('📝 Seeding sample orders...');
    for (const order of seedData.sample_orders) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .upsert(order, { onConflict: 'id' });
      
      if (orderError) throw orderError;
    }

    console.log('✅ Database seeding completed successfully!');
    console.log(`   Restaurant ID: ${defaultRestaurantId}`);
    console.log(`   Menu items: ${seedData.menu_items.length}`);
    console.log(`   Tables: ${seedData.tables.length}`);
    console.log(`   Sample orders: ${seedData.sample_orders.length}`);

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase, seedData };