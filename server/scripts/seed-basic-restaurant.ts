#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const restaurant = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Grow Fresh Local Food',
  timezone: 'America/New_York',
  currency: 'USD',
  tax_rate: 0.08,
  default_tip_percentages: [15, 18, 20],
  description: 'Fresh food made with love and local ingredients'
};

async function seedBasicRestaurant() {
  console.log('🌱 Seeding basic restaurant...');
  
  try {
    const { error } = await supabase
      .from('restaurants')
      .upsert(restaurant);
    
    if (error) {
      console.error(`❌ Failed to seed restaurant:`, error.message);
    } else {
      console.log(`✅ Successfully seeded ${restaurant.name}`);
    }
    
  } catch (error) {
    console.error('❌ Error seeding restaurant:', error);
  }
}

seedBasicRestaurant();