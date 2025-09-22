#!/usr/bin/env tsx

/**
 * Seed Restaurants Script
 * 
 * Seeds the database with sample restaurant data for testing multi-tenancy
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const restaurants = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Grow Fresh Local Food',
    timezone: 'America/New_York',
    currency: 'USD',
    tax_rate: 0.08,
    default_tip_percentages: [15, 18, 20],
    address: '1019 Riverside Dr, Macon, GA 31201',
    phone: '(478) 743-4663',
    business_hours: 'Mon-Fri: 11:00 AM - 3:00 PM • Closed Weekends',
    description: 'Fresh food made with love and local ingredients'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Bella Vista Pizzeria',
    timezone: 'America/New_York',
    currency: 'USD',
    tax_rate: 0.075,
    default_tip_percentages: [18, 20, 25],
    address: '456 Main Street, Atlanta, GA 30309',
    phone: '(404) 555-0123',
    business_hours: 'Daily: 11:00 AM - 11:00 PM',
    description: 'Authentic Italian pizza and pasta made fresh daily'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Sunrise Cafe',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    tax_rate: 0.085,
    default_tip_percentages: [15, 18, 22],
    address: '789 Beach Blvd, Los Angeles, CA 90210',
    phone: '(310) 555-9876',
    business_hours: 'Daily: 6:00 AM - 3:00 PM',
    description: 'Fresh breakfast and brunch with ocean views'
  }
];

async function seedRestaurants() {
  
  try {
    // Check if restaurants table exists
    const { data: tables, error: tableError } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST116') {
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  tax_rate DECIMAL(5,4) DEFAULT 0.08,
  default_tip_percentages INTEGER[] DEFAULT '{15,18,20}',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  business_hours TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
      `);
      return;
    }

    // Insert restaurants
    for (const restaurant of restaurants) {
      
      const { error } = await supabase
        .from('restaurants')
        .upsert(restaurant);
      
      if (error) {
        console.error(`❌ Failed to seed ${restaurant.name}:`, error.message);
      } else {
      }
    }
    
    restaurants.forEach(restaurant => {
    });
    
  } catch (error) {
    console.error('❌ Error seeding restaurants:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedRestaurants();