#!/usr/bin/env node

/**
 * Run database migrations on Supabase
 * This script applies all migration files to the cloud database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

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

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    console.log(`Found ${sqlFiles.length} migration files:`);
    sqlFiles.forEach(file => console.log(`  - ${file}`));
    console.log('');
    
    // Run each migration
    for (const file of sqlFiles) {
      console.log(`\n📝 Running migration: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');
      
      try {
        // Execute the SQL
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: sql 
        }).single();
        
        if (error) {
          // If exec_sql doesn't exist, try a direct query (this won't work with service key, but worth trying)
          console.log('⚠️  exec_sql function not available, attempting alternative method...');
          
          // For Supabase, we need to use the SQL editor in the dashboard
          console.log('\n❗ Please run this migration manually in the Supabase SQL Editor:');
          console.log(`   1. Go to: ${SUPABASE_URL.replace('/rest/v1', '')}/project/default/sql`);
          console.log(`   2. Copy and paste the contents of: ${file}`);
          console.log(`   3. Click "Run" to execute the migration\n`);
          
          console.log('Migration content preview:');
          console.log('----------------------------');
          console.log(sql.substring(0, 500) + '...\n');
          
          continue;
        }
        
        console.log(`✅ Successfully applied: ${file}`);
      } catch (err) {
        console.error(`❌ Error applying ${file}:`, err.message);
        
        // Show manual instructions
        console.log('\n❗ Please run this migration manually in the Supabase SQL Editor:');
        console.log(`   1. Go to: ${SUPABASE_URL.replace('/rest/v1', '')}/project/default/sql`);
        console.log(`   2. Copy and paste the contents of: ${file}`);
        console.log(`   3. Click "Run" to execute the migration\n`);
      }
    }
    
    console.log('\n✨ Migration process complete!');
    console.log('\n📋 Next steps:');
    console.log('1. If any migrations failed, run them manually in the Supabase SQL Editor');
    console.log('2. Verify the tables were created: npm run check:db');
    console.log('3. Start the development server: npm run dev');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Also create a simple check script
async function checkDatabase() {
  try {
    console.log('\n🔍 Checking database tables...\n');
    
    // Check for our new tables
    const tables = ['restaurants', 'menu_items', 'orders', 'tables', 'floor_plan_layouts'];
    
    for (const tableName of tables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table '${tableName}' - NOT FOUND or ERROR:`, error.message);
      } else {
        console.log(`✅ Table '${tableName}' - EXISTS`);
      }
    }
    
    // Check for sample data
    console.log('\n📊 Checking sample data...\n');
    
    const { data: restaurantData } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', '11111111-1111-1111-1111-111111111111')
      .single();
    
    if (restaurantData) {
      console.log('✅ Default restaurant found:', restaurantData.name);
    } else {
      console.log('⚠️  Default restaurant not found');
    }
    
    const { data: tablesData } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', '11111111-1111-1111-1111-111111111111');
    
    if (tablesData && tablesData.length > 0) {
      console.log(`✅ Found ${tablesData.length} tables for Grow Fresh Local Food`);
    } else {
      console.log('⚠️  No tables found for default restaurant');
    }
    
  } catch (error) {
    console.error('❌ Check error:', error);
  }
}

// Run based on command
const command = process.argv[2];

if (command === 'check') {
  checkDatabase();
} else {
  runMigrations();
}