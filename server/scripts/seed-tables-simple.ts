#!/usr/bin/env tsx

/**
 * Simple seed for tables - just the minimum required fields
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root directory
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

async function seedTables() {
  try {
    
    // First, let's see what columns the table actually has
    const { data: sample, error: sampleError } = await supabase
      .from('tables')
      .select('*')
      .limit(1);
    
    if (sampleError && sampleError.code !== 'PGRST116') {
    }
    
    // Try the simplest possible insert - just restaurant_id and label
    
    const minimalTables = [
      { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'Table 1' },
      { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'Table 2' },
      { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'Table 3' },
      { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'Table 4' },
      { restaurant_id: DEFAULT_RESTAURANT_ID, label: 'Table 5' }
    ];
    
    const { data, error } = await supabase
      .from('tables')
      .insert(minimalTables)
      .select();
    
    if (error) {
      console.error('❌ Insert error:', error);
      
      // If that fails, try even simpler - one table with just required fields
      const { data: singleData, error: singleError } = await supabase
        .from('tables')
        .insert({ 
          restaurant_id: DEFAULT_RESTAURANT_ID, 
          table_number: '1',
          seats: 4 
        })
        .select();
      
      if (singleError) {
        console.error('❌ Single insert also failed:', singleError);
      } else {
      }
    } else {
    }
    
    // List all tables
    const { data: allTables, error: listError } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', DEFAULT_RESTAURANT_ID);
    
    if (listError) {
      console.error('❌ Error fetching tables:', listError);
    } else {
      if (allTables && allTables.length > 0) {
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the seeding
seedTables();