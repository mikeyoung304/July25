#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or service key');
  process.exit(1);
}

// Create admin client for testing
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testManagerWrite() {
  console.log('\n📝 Testing Manager write (menu item)...');
  
  const testItem = {
    restaurant_id: RESTAURANT_ID,
    name: 'Test Item ' + Date.now(),
    external_id: 'TEST-' + Date.now(),
    price: 9.99,
    description: 'Smoke test item',
    active: true,
    available: true
  };
  
  const { data, error } = await supabase
    .from('menu_items')
    .insert([testItem])
    .select()
    .single();
    
  const result = {
    role: 'manager',
    operation: 'insert menu_item',
    success: !error,
    data: data ? { id: data.id, name: data.name } : null,
    error: error?.message
  };
  
  writeFileSync('docs/reports/http/manager_menu_write.json', JSON.stringify(result, null, 2));
  console.log(result.success ? '✅ Manager write succeeded' : '❌ Manager write failed');
  
  return result;
}

async function testServerWrite() {
  console.log('\n📝 Testing Server write (order)...');
  
  const testOrder = {
    restaurant_id: RESTAURANT_ID,
    order_number: 'TEST-' + Date.now(),
    type: 'kiosk',
    status: 'pending',
    items: [{ menu_item_id: '00000000-0000-0000-0000-000000000000', quantity: 1, price: 10 }],
    subtotal: 10,
    tax: 0.8,
    total_amount: 10.8,
    customer_name: 'Test Customer'
  };
  
  const { data, error } = await supabase
    .from('orders')
    .insert([testOrder])
    .select()
    .single();
    
  const result = {
    role: 'server',
    operation: 'create order',
    success: !error,
    data: data ? { id: data.id, order_number: data.order_number } : null,
    error: error?.message
  };
  
  writeFileSync('docs/reports/http/server_order_write.json', JSON.stringify(result, null, 2));
  console.log(result.success ? '✅ Server write succeeded' : '❌ Server write failed');
  
  // Verify via select
  if (data) {
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('id', data.id)
      .limit(5);
      
    writeFileSync('docs/reports/db/verify/server_orders_tail.json', JSON.stringify(orders, null, 2));
  }
  
  return result;
}

async function testTableWrite() {
  console.log('\n📝 Testing Table write (floor plan)...');
  
  const testTable = {
    restaurant_id: RESTAURANT_ID,
    label: 'Test-A2',
    x_pos: 200,
    y_pos: 200,
    width: 100,
    height: 100,
    seats: 4,
    shape: 'rectangle',
    status: 'available',
    active: true
  };
  
  const { data, error } = await supabase
    .from('tables')
    .insert([testTable])
    .select()
    .single();
    
  const result = {
    operation: 'insert table',
    success: !error,
    data: data ? { id: data.id, label: data.label } : null,
    error: error?.message
  };
  
  writeFileSync('docs/reports/http/floorplan_save.json', JSON.stringify(result, null, 2));
  console.log(result.success ? '✅ Table write succeeded' : '❌ Table write failed');
  
  // Verify tail
  if (data) {
    const { data: tables } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('created_at', { ascending: false })
      .limit(5);
      
    writeFileSync('docs/reports/db/verify/tables_tail.json', JSON.stringify(tables, null, 2));
  }
  
  return result;
}

async function testKitchenReads() {
  console.log('\n📝 Testing Kitchen reads (order list)...');
  
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', RESTAURANT_ID)
    .in('status', ['pending', 'preparing'])
    .limit(10);
    
  const result = {
    role: 'kitchen',
    operation: 'list pending orders',
    success: !error,
    count: data?.length || 0,
    error: error?.message
  };
  
  writeFileSync('docs/reports/http/kitchen_reads.json', JSON.stringify({
    ...result,
    orders: data?.map(o => ({ id: o.id, status: o.status, order_number: o.order_number }))
  }, null, 2));
  
  console.log(result.success ? `✅ Kitchen reads succeeded (${result.count} orders)` : '❌ Kitchen reads failed');
  
  return result;
}

async function main() {
  console.log('🚀 Running End-to-End Smoke Tests');
  console.log('Using service role for direct DB access\n');
  
  // Ensure directories
  const { execSync } = await import('child_process');
  execSync('mkdir -p docs/reports/http docs/reports/db/verify');
  
  // Run tests
  await testManagerWrite();
  await testServerWrite();
  await testTableWrite();
  await testKitchenReads();
  
  console.log('\n✅ Smoke tests complete');
}

main().catch(console.error);