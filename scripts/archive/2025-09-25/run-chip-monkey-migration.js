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
  
  try {
    // Drop existing constraint
    const dropResult = await supabase.rpc('query', {
      query: `ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_shape_check;`
    }).single();
    
    if (dropResult.error && !dropResult.error.message.includes('does not exist')) {
      throw dropResult.error;
    }
    
    // Add new constraint with chip_monkey
    const addResult = await supabase.rpc('query', {
      query: `ALTER TABLE tables ADD CONSTRAINT tables_shape_check CHECK (shape IN ('circle', 'square', 'rectangle', 'chip_monkey'));`
    }).single();
    
    if (addResult.error) {
      throw addResult.error;
    }
    
    // Verify the constraint
    const { data, error } = await supabase
      .from('pg_constraint')
      .select('conname')
      .eq('conname', 'tables_shape_check')
      .single();
    
    if (data) {
    } else {
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Try alternative approach using direct SQL
    
    // Since Supabase doesn't expose rpc for DDL, we'll need to handle this differently
  }
}

runMigration().catch(console.error);