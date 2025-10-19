#!/usr/bin/env node
/**
 * Verify 'tables' table schema, RLS status, and constraints
 * Uses SERVICE_ROLE_KEY to bypass RLS
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing credentials');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('🔍 Verifying tables table schema and RLS status\n');

  // 1. Check if RLS is enabled on 'tables' table
  console.log('1️⃣ Checking RLS status...');
  const { data: rlsData, error: rlsError } = await supabase.rpc('check_rls_enabled', {
    table_name: 'tables'
  }).maybeSingle();

  if (rlsError) {
    console.log('   ℹ️ RPC not available, using direct query\n');
  } else {
    console.log('   RLS enabled:', rlsData);
  }

  // 2. Get table schema
  console.log('\n2️⃣ Fetching table columns...');
  const { data: columns, error: colError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'tables')
    .order('ordinal_position');

  if (colError) {
    console.error('   ❌ Error:', colError.message);
  } else if (columns && columns.length > 0) {
    console.log('   ✅ Found columns:');
    columns.forEach(col => {
      console.log(`      - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
  } else {
    console.log('   ⚠️  No columns found - table may not exist');
  }

  // 3. Check for constraints
  console.log('\n3️⃣ Checking constraints...');
  const { data: constraints, error: constError } = await supabase
    .from('information_schema.table_constraints')
    .select('constraint_name, constraint_type')
    .eq('table_schema', 'public')
    .eq('table_name', 'tables');

  if (constError) {
    console.error('   ❌ Error:', constError.message);
  } else if (constraints && constraints.length > 0) {
    console.log('   ✅ Found constraints:');
    constraints.forEach(c => {
      console.log(`      - ${c.constraint_name} (${c.constraint_type})`);
    });
  } else {
    console.log('   ℹ️  No constraints found');
  }

  // 4. Check for indexes
  console.log('\n4️⃣ Checking indexes...');
  const { data: indexes, error: idxError } = await supabase
    .from('pg_indexes')
    .select('indexname, indexdef')
    .eq('schemaname', 'public')
    .eq('tablename', 'tables');

  if (idxError) {
    console.error('   ❌ Error:', idxError.message);
  } else if (indexes && indexes.length > 0) {
    console.log('   ✅ Found indexes:');
    indexes.forEach(idx => {
      console.log(`      - ${idx.indexname}`);
      console.log(`        ${idx.indexdef}\n`);
    });
  } else {
    console.log('   ℹ️  No indexes found');
  }

  // 5. Count rows
  console.log('5️⃣ Counting rows...');
  const { count, error: countError } = await supabase
    .from('tables')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('   ❌ Error:', countError.message);
  } else {
    console.log(`   ✅ Total rows: ${count || 0}`);
  }

  // 6. Sample a few rows
  if (count > 0) {
    console.log('\n6️⃣ Sample rows...');
    const { data: sample, error: sampleError } = await supabase
      .from('tables')
      .select('id, restaurant_id, label, active, x_pos, y_pos, shape')
      .limit(5);

    if (sampleError) {
      console.error('   ❌ Error:', sampleError.message);
    } else {
      console.log('   ✅ Sample data:');
      console.log(JSON.stringify(sample, null, 2));
    }
  }

  console.log('\n✅ Schema verification complete');
}

verifySchema().catch(console.error);
