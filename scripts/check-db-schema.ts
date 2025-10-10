#!/usr/bin/env tsx
/**
 * Check Database Schema for role_scopes table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSchema() {
  console.log('Checking role_scopes table schema...\n');

  // Query the information_schema to get column info
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'role_scopes'
        ORDER BY ordinal_position;
      `
    })
    .select();

  if (error) {
    console.log('❌ RPC method not available, trying direct query...\n');

    // Try selecting a single row to see structure
    const { data: sampleData, error: queryError } = await supabase
      .from('role_scopes')
      .select('*')
      .limit(1);

    if (queryError) {
      console.error('Error:', queryError);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      console.log('Sample row from role_scopes:');
      console.log(JSON.stringify(sampleData[0], null, 2));
      console.log('\nColumns:', Object.keys(sampleData[0]).join(', '));
    } else {
      console.log('Table is empty');
    }
    return;
  }

  console.log('Table structure:');
  console.table(data);
}

checkSchema().catch(console.error);
