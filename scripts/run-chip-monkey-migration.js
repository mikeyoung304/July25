#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Running chip_monkey shape migration...\n');
  
  try {
    // Drop existing constraint
    console.log('1. Dropping existing constraint...');
    const dropResult = await supabase.rpc('query', {
      query: `ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_shape_check;`
    }).single();
    
    if (dropResult.error && !dropResult.error.message.includes('does not exist')) {
      throw dropResult.error;
    }
    
    // Add new constraint with chip_monkey
    console.log('2. Adding new constraint with chip_monkey...');
    const addResult = await supabase.rpc('query', {
      query: `ALTER TABLE tables ADD CONSTRAINT tables_shape_check CHECK (shape IN ('circle', 'square', 'rectangle', 'chip_monkey'));`
    }).single();
    
    if (addResult.error) {
      throw addResult.error;
    }
    
    // Verify the constraint
    console.log('3. Verifying constraint...');
    const { data, error } = await supabase
      .from('pg_constraint')
      .select('conname')
      .eq('conname', 'tables_shape_check')
      .single();
    
    if (data) {
      console.log('✅ Migration successful! chip_monkey shape is now allowed.');
    } else {
      console.log('⚠️  Constraint verification inconclusive, but migration may have succeeded.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Try alternative approach using direct SQL
    console.log('\n🔄 Trying alternative approach with raw SQL...');
    
    // Since Supabase doesn't expose rpc for DDL, we'll need to handle this differently
    console.log('Note: Direct DDL operations may need to be run in Supabase SQL Editor.');
    console.log('\nPlease run the following SQL in your Supabase dashboard:\n');
    console.log('-- Drop existing constraint');
    console.log("ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_shape_check;");
    console.log('\n-- Add new constraint with chip_monkey');
    console.log("ALTER TABLE tables ADD CONSTRAINT tables_shape_check");
    console.log("  CHECK (shape IN ('circle', 'square', 'rectangle', 'chip_monkey'));");
  }
}

runMigration().catch(console.error);