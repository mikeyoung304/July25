#!/usr/bin/env tsx
/**
 * Check Database Schema
 * Verifies the actual column names in role_scopes table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSchema() {
  console.log('🔍 Checking role_scopes table schema...\n');

  // Query the information schema
  const { data: columns, error } = await supabase
    .rpc('exec_sql', {
      sql: `SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'role_scopes'
            ORDER BY ordinal_position;`
    })
    .single();

  if (error) {
    // Try alternative method - just query the table and inspect
    console.log('Using alternative method...\n');

    const { data: sample, error: sampleError } = await supabase
      .from('role_scopes')
      .select('*')
      .limit(1)
      .single();

    if (sampleError) {
      console.error('❌ Error:', sampleError.message);
      return;
    }

    console.log('✅ Sample row from role_scopes table:');
    console.log(JSON.stringify(sample, null, 2));
    console.log('\n📋 Columns found:', Object.keys(sample));

    // Check if it has 'scope' or 'scope_name'
    if ('scope' in sample) {
      console.log('\n✅ Table has column: scope');
    }
    if ('scope_name' in sample) {
      console.log('\n✅ Table has column: scope_name');
    }

    return;
  }

  console.log('Schema:', columns);
}

checkSchema().catch(console.error);
