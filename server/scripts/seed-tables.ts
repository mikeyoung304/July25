#!/usr/bin/env tsx

/**
 * Seed tables data for Grow Fresh Local Food
 * This script adds sample tables to the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const DEFAULT_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const tables = [
  { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'A1', type: 'circle', x: 100, y: 100, width: 80, height: 80, seats: 4, status: 'available' },
  { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'A2', type: 'circle', x: 250, y: 100, width: 80, height: 80, seats: 4, status: 'available' },
  { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'A3', type: 'circle', x: 400, y: 100, width: 80, height: 80, seats: 4, status: 'available' },
  { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'B1', type: 'rectangle', x: 100, y: 250, width: 120, height: 80, seats: 6, status: 'available' },
  { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'B2', type: 'rectangle', x: 300, y: 250, width: 120, height: 80, seats: 6, status: 'available' },
  { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'B3', type: 'rectangle', x: 500, y: 250, width: 120, height: 80, seats: 6, status: 'available' },
  { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'C1', type: 'square', x: 100, y: 400, width: 100, height: 100, seats: 4, status: 'available' },
  { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'C2', type: 'square', x: 250, y: 400, width: 100, height: 100, seats: 4, status: 'available' },
  { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'C3', type: 'square', x: 400, y: 400, width: 100, height: 100, seats: 4, status: 'available' },
  { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'VIP1', type: 'circle', x: 600, y: 200, width: 120, height: 120, seats: 8, status: 'available' }
];

async function seedTables() {
  try {
    
    // Check if tables already exist
    const { data: existingTables, error: checkError } = await supabase
      .from('tables')
      .select('id')
      .eq('restaurant_id', DEFAULT_RESTAURANT_ID);
    
    if (checkError) {
      console.error('❌ Error checking existing tables:', checkError);
      process.exit(1);
    }
    
    if (existingTables && existingTables.length > 0) {
      return;
    }
    
    // Insert tables
    
    const { data, error } = await supabase
      .from('tables')
      .insert(tables)
      .select();
    
    if (error) {
      console.error('❌ Error inserting tables:', error);
      process.exit(1);
    }
    
    
    // Verify insertion
    const { data: verifyData, error: verifyError } = await supabase
      .from('tables')
      .select('label, type, seats, status')
      .eq('restaurant_id', DEFAULT_RESTAURANT_ID)
      .order('label');
    
    if (verifyError) {
      console.error('❌ Error verifying tables:', verifyError);
    } else {
      verifyData?.forEach(table => {
      });
    }
    
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the seeding
seedTables();