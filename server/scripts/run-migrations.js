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
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    
    // Run each migration
    for (const file of sqlFiles) {
      
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');
      
      try {
        // Execute the SQL
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: sql 
        }).single();
        
        if (error) {
          // If exec_sql doesn't exist, try a direct query (this won't work with service key, but worth trying)
          
          // For Supabase, we need to use the SQL editor in the dashboard
          
          
          continue;
        }
        
      } catch (err) {
        console.error(`❌ Error applying ${file}:`, err.message);
        
        // Show manual instructions
      }
    }
    
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Also create a simple check script
async function checkDatabase() {
  try {
    
    // Check for our new tables
    const tables = ['restaurants', 'menu_items', 'orders', 'tables', 'floor_plan_layouts'];
    
    for (const tableName of tables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      if (error) {
      } else {
      }
    }
    
    // Check for sample data
    
    const { data: restaurantData } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', '11111111-1111-1111-1111-111111111111')
      .single();
    
    if (restaurantData) {
    } else {
    }
    
    const { data: tablesData } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', '11111111-1111-1111-1111-111111111111');
    
    if (tablesData && tablesData.length > 0) {
    } else {
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