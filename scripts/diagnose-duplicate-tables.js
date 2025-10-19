#!/usr/bin/env node
/**
 * Diagnostic Script: Duplicate Table Names Investigation
 * Purpose: Check for duplicate table names in database and identify root cause
 * Usage: node scripts/diagnose-duplicate-tables.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables - try multiple locations
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(__dirname, '../server/.env') });
dotenv.config({ path: join(__dirname, '../client/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseDuplicates() {
  console.log('🔍 Investigating Duplicate Table Names Issue\n');

  // Check what restaurant_id we're using
  const restaurantId = process.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';
  console.log(`🏪 Restaurant ID: ${restaurantId}\n`);

  // 1. Get all tables (including inactive) - without restaurant filter first
  console.log('📡 Fetching all tables from database...');
  const { data: allTables, error: allError } = await supabase
    .from('tables')
    .select('*')
    .order('label');

  if (allError) {
    console.error('❌ Failed to fetch all tables:', allError);
    console.error('   Error details:', JSON.stringify(allError, null, 2));
    return;
  }

  console.log(`📊 Total tables in database (all restaurants): ${allTables?.length || 0}`);

  // Show restaurant distribution
  if (allTables && allTables.length > 0) {
    const byRestaurant = {};
    allTables.forEach(t => {
      const rid = t.restaurant_id || 'null';
      byRestaurant[rid] = (byRestaurant[rid] || 0) + 1;
    });
    console.log('   Tables by restaurant:');
    Object.entries(byRestaurant).forEach(([rid, count]) => {
      console.log(`     - ${rid.substring(0, 8)}...: ${count} tables`);
    });
  }
  console.log('');

  // 2. Get only active tables
  const { data: activeTables, error: activeError } = await supabase
    .from('tables')
    .select('*')
    .eq('active', true)
    .order('label');

  if (activeError) {
    console.error('❌ Failed to fetch active tables:', activeError);
    return;
  }

  console.log(`✅ Active tables: ${activeTables.length}`);
  console.log(`🗑️  Inactive tables: ${allTables.length - activeTables.length}\n`);

  // 3. Normalize function (same as client-side)
  const normalize = (label) => label?.trim().toLowerCase() || '';

  // 4. Check for duplicates among ALL tables
  const allLabelsMap = new Map();
  allTables.forEach(table => {
    const normalized = normalize(table.label);
    if (!allLabelsMap.has(normalized)) {
      allLabelsMap.set(normalized, []);
    }
    allLabelsMap.get(normalized).push(table);
  });

  const allDuplicates = Array.from(allLabelsMap.entries())
    .filter(([_, tables]) => tables.length > 1);

  if (allDuplicates.length > 0) {
    console.log('⚠️  DUPLICATES FOUND (including inactive tables):\n');
    allDuplicates.forEach(([normalized, tables]) => {
      console.log(`   "${normalized}" (${tables.length} tables):`);
      tables.forEach(t => {
        console.log(`      - ${t.label} (id: ${t.id.substring(0, 8)}..., active: ${t.active})`);
      });
      console.log('');
    });
  }

  // 5. Check for duplicates among ACTIVE tables only
  const activeLabelsMap = new Map();
  activeTables.forEach(table => {
    const normalized = normalize(table.label);
    if (!activeLabelsMap.has(normalized)) {
      activeLabelsMap.set(normalized, []);
    }
    activeLabelsMap.get(normalized).push(table);
  });

  const activeDuplicates = Array.from(activeLabelsMap.entries())
    .filter(([_, tables]) => tables.length > 1);

  if (activeDuplicates.length > 0) {
    console.log('🚨 DUPLICATES FOUND (active tables only):\n');
    activeDuplicates.forEach(([normalized, tables]) => {
      console.log(`   "${normalized}" (${tables.length} active tables):`);
      tables.forEach(t => {
        console.log(`      - ${t.label} (id: ${t.id.substring(0, 8)}...)`);
      });
      console.log('');
    });
  } else {
    console.log('✅ No duplicates found among active tables\n');
  }

  // 6. Check for conflicts between active and inactive tables
  const conflicts = [];
  activeTables.forEach(activeTable => {
    const normalized = normalize(activeTable.label);
    const matchingInactive = allTables.filter(t =>
      !t.active &&
      normalize(t.label) === normalized &&
      t.id !== activeTable.id
    );
    if (matchingInactive.length > 0) {
      conflicts.push({ active: activeTable, inactive: matchingInactive });
    }
  });

  if (conflicts.length > 0) {
    console.log('⚠️  ACTIVE/INACTIVE CONFLICTS FOUND:\n');
    conflicts.forEach(({ active, inactive }) => {
      console.log(`   Active table: "${active.label}" (${active.id.substring(0, 8)}...)`);
      inactive.forEach(t => {
        console.log(`      ⚠️  Conflicts with inactive: "${t.label}" (${t.id.substring(0, 8)}...)`);
      });
      console.log('');
    });
  }

  // 7. Output normalized names for debugging
  console.log('\n📋 All Active Table Names (Normalized):');
  const uniqueNormalized = new Set();
  activeTables.forEach(t => {
    const normalized = normalize(t.label);
    console.log(`   ${t.label.padEnd(30)} → "${normalized}"`);
    if (uniqueNormalized.has(normalized)) {
      console.log(`      ⚠️  DUPLICATE NORMALIZED NAME!`);
    }
    uniqueNormalized.add(normalized);
  });

  // 8. Summary and recommendations
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY\n');
  console.log(`Total tables: ${allTables.length}`);
  console.log(`Active tables: ${activeTables.length}`);
  console.log(`Inactive tables: ${allTables.length - activeTables.length}`);
  console.log(`Duplicates (all): ${allDuplicates.length}`);
  console.log(`Duplicates (active only): ${activeDuplicates.length}`);
  console.log(`Active/Inactive conflicts: ${conflicts.length}`);
  console.log('='.repeat(60));

  if (allDuplicates.length > 0 && activeDuplicates.length === 0) {
    console.log('\n💡 ROOT CAUSE IDENTIFIED:');
    console.log('   Inactive (soft-deleted) tables have the same normalized names');
    console.log('   as active tables. This may cause database constraint violations.\n');
    console.log('🔧 RECOMMENDED FIX:');
    console.log('   1. Add a unique constraint that only applies to active tables:');
    console.log('      CREATE UNIQUE INDEX unique_active_table_labels');
    console.log('      ON tables(restaurant_id, LOWER(TRIM(label)))');
    console.log('      WHERE active = true;\n');
    console.log('   2. Or append timestamp to labels when soft-deleting:');
    console.log('      UPDATE table SET label = label || \'_deleted_\' || NOW()');
  }
}

diagnoseDuplicates().catch(console.error);
