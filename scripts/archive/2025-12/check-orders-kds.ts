#!/usr/bin/env tsx
/**
 * Check Orders for KDS Display
 * Diagnoses why orders aren't showing on Kitchen Display
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

async function checkOrders() {
  console.log('🔍 Checking Orders for KDS Display\n');
  console.log(`Restaurant: ${RESTAURANT_ID}\n`);

  // Get all non-completed/cancelled orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, type, status, table_number, created_at')
    .eq('restaurant_id', RESTAURANT_ID)
    .not('status', 'in', '(completed,cancelled)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('❌ Error fetching orders:', error);
    return;
  }

  console.log(`📊 Found ${orders?.length || 0} active orders\n`);

  // Analyze orders
  const withTables = orders?.filter(o => o.table_number) || [];
  const withoutTables = orders?.filter(o => !o.table_number) || [];

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 ORDER BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`✅ Orders WITH table numbers: ${withTables.length}`);
  if (withTables.length > 0) {
    console.log('\nTable-assigned orders:');
    withTables.slice(0, 10).forEach(o => {
      console.log(`  - ${o.order_number} | Table: ${o.table_number} | ${o.type} | ${o.status}`);
    });
    if (withTables.length > 10) {
      console.log(`  ... and ${withTables.length - 10} more`);
    }
  }

  console.log(`\n❌ Orders WITHOUT table numbers: ${withoutTables.length}`);
  if (withoutTables.length > 0) {
    console.log('\nNon-table orders (will NOT show in Tables view):');
    withoutTables.slice(0, 10).forEach(o => {
      console.log(`  - ${o.order_number} | Type: ${o.type} | ${o.status} | NO TABLE`);
    });
    if (withoutTables.length > 10) {
      console.log(`  ... and ${withoutTables.length - 10} more`);
    }
  }

  // Status breakdown
  const statusCounts = orders?.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 STATUS BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════════\n');

  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // Type breakdown
  const typeCounts = orders?.reduce((acc, o) => {
    acc[o.type] = (acc[o.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 ORDER TYPE BREAKDOWN');
  console.log('═══════════════════════════════════════════════════════════\n');

  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('💡 KDS DISPLAY EXPLANATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('The Kitchen Display has 2 view modes:\n');

  console.log('1. 📊 TABLES VIEW (current default):');
  console.log('   - Shows ONLY orders with table_number assigned');
  console.log(`   - Will display: ${withTables.length} orders`);
  console.log('   - Groups orders by table for dine-in service\n');

  console.log('2. 🔲 GRID VIEW:');
  console.log('   - Shows ALL active orders regardless of table');
  console.log(`   - Will display: ${orders?.length || 0} orders`);
  console.log('   - Better for takeout/delivery/mixed service\n');

  if (withoutTables.length > withTables.length) {
    console.log('⚠️  RECOMMENDATION:');
    console.log('   Most orders have NO table assignment.');
    console.log('   Switch to GRID VIEW to see all orders, or assign table numbers.\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

checkOrders().catch(console.error);
