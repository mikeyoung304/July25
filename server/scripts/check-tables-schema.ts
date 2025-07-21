#!/usr/bin/env tsx

/**
 * Check the actual schema of the tables table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

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

async function checkSchema() {
  try {
    console.log('🔍 Checking tables schema...\n');
    
    // Try to fetch one row to see what columns exist
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching tables:', error);
      
      // Try a minimal insert to see what's required
      console.log('\n🧪 Testing minimal insert...');
      const { error: insertError } = await supabase
        .from('tables')
        .insert({
          restaurant_id: '11111111-1111-1111-1111-111111111111',
          label: 'TEST1'
        })
        .select();
      
      if (insertError) {
        console.error('❌ Insert error:', insertError);
      }
    } else {
      if (data && data.length > 0) {
        console.log('📊 Table columns:');
        Object.keys(data[0]).forEach(key => {
          console.log(`   - ${key}: ${typeof data[0][key]} (${data[0][key]})`);
        });
      } else {
        console.log('ℹ️  No existing tables found');
        
        // Try inserting a simple table
        console.log('\n🧪 Testing simple insert...');
        const { data: insertData, error: insertError } = await supabase
          .from('tables')
          .insert({
            restaurant_id: '11111111-1111-1111-1111-111111111111',
            label: 'TEST1',
            x: 100,
            y: 100,
            width: 80,
            height: 80,
            seats: 4,
            status: 'available'
          })
          .select();
        
        if (insertError) {
          console.error('❌ Insert error:', insertError);
        } else {
          console.log('✅ Insert successful:', insertData);
          
          // Clean up test data
          await supabase
            .from('tables')
            .delete()
            .eq('label', 'TEST1');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkSchema();