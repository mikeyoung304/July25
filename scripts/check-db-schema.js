#!/usr/bin/env node
/**
 * Quick Database Schema Checker
 * Lists all tables in the public schema
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking Database Schema\n');

  // Try to query information_schema
  const { data, error } = await supabase
    .rpc('get_schema_info', {});

  if (error) {
    console.log('⚠️  RPC not available, trying direct query...\n');

    // Try common table names
    const tableNames = ['tables', 'floor_tables', 'restaurant_tables', 'menu_items', 'orders', 'restaurants'];

    for (const tableName of tableNames) {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✅ Table "${tableName}" exists (${count || 0} rows)`);
      } else if (error.code === 'PGRST116') {
        console.log(`❌ Table "${tableName}" not found`);
      } else {
        console.log(`⚠️  Table "${tableName}": ${error.message}`);
      }
    }
  } else {
    console.log('Schema info:', data);
  }

  // Try to get a sample menu item to confirm DB connection
  console.log('\n🍔 Checking for menu items...');
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, name, restaurant_id')
    .limit(5);

  if (menuError) {
    console.error('❌ Menu items query failed:', menuError.message);
  } else {
    console.log(`✅ Found ${menuItems?.length || 0} menu items`);
    if (menuItems && menuItems.length > 0) {
      console.log('   Sample:', menuItems[0].name);
      console.log('   Restaurant ID:', menuItems[0].restaurant_id);
    }
  }

  // Try orders
  console.log('\n📦 Checking for orders...');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_number, restaurant_id')
    .limit(5);

  if (ordersError) {
    console.error('❌ Orders query failed:', ordersError.message);
  } else {
    console.log(`✅ Found ${orders?.length || 0} orders`);
    if (orders && orders.length > 0) {
      console.log('   Sample order:', orders[0].order_number);
      console.log('   Restaurant ID:', orders[0].restaurant_id);
    }
  }
}

checkSchema().catch(console.error);
