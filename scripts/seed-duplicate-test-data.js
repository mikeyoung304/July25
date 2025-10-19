#!/usr/bin/env node
/**
 * Seed Test Data for Duplicate Names Investigation
 * Creates tables with potential duplicate scenarios
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
const restaurantId = process.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTestData() {
  console.log('🌱 Seeding Test Data for Duplicate Investigation\n');
  console.log(`🏪 Using Restaurant ID: ${restaurantId}\n`);

  // Scenario 1: Active table + Inactive table with same name (normalized)
  console.log('📝 Scenario 1: Active + Inactive with same normalized name');

  const testTables = [
    {
      label: 'Table 1',
      seats: 4,
      x_pos: 100,
      y_pos: 100,
      width: 120,
      height: 120,
      shape: 'circle',
      rotation: 0,
      status: 'available',
      z_index: 1,
      active: true,
      restaurant_id: restaurantId
    },
    {
      label: 'Test-E2',
      seats: 4,
      x_pos: 200,
      y_pos: 100,
      width: 120,
      height: 120,
      shape: 'square',
      rotation: 0,
      status: 'available',
      z_index: 1,
      active: true,
      restaurant_id: restaurantId
    },
    {
      label: 'test-e2',  // DUPLICATE (normalized) - but INACTIVE
      seats: 4,
      x_pos: 300,
      y_pos: 100,
      width: 120,
      height: 120,
      shape: 'rectangle',
      rotation: 0,
      status: 'available',
      z_index: 1,
      active: false,  // SOFT DELETED
      restaurant_id: restaurantId
    },
    {
      label: 'Round Table 1',
      seats: 6,
      x_pos: 100,
      y_pos: 200,
      width: 140,
      height: 140,
      shape: 'circle',
      rotation: 0,
      status: 'available',
      z_index: 1,
      active: true,
      restaurant_id: restaurantId
    },
    {
      label: 'ROUND TABLE 1',  // DUPLICATE (case different) - INACTIVE
      seats: 6,
      x_pos: 200,
      y_pos: 200,
      width: 140,
      height: 140,
      shape: 'circle',
      rotation: 0,
      status: 'available',
      z_index: 1,
      active: false,  // SOFT DELETED
      restaurant_id: restaurantId
    }
  ];

  console.log(`   Creating ${testTables.length} test tables...`);

  for (const table of testTables) {
    const { data, error } = await supabase
      .from('tables')
      .insert([table])
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Failed to create "${table.label}" (active: ${table.active}):`, error.message);
    } else {
      const status = table.active ? '✅ Active' : '🗑️  Inactive';
      console.log(`   ${status}: "${table.label}" (${data.id.substring(0, 8)}...)`);
    }
  }

  // Now run diagnostic
  console.log('\n🔍 Running diagnostic on seeded data...\n');

  const { data: allTables } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('label');

  const { data: activeTables } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('active', true)
    .order('label');

  console.log(`📊 Total tables: ${allTables?.length || 0}`);
  console.log(`✅ Active: ${activeTables?.length || 0}`);
  console.log(`🗑️  Inactive: ${(allTables?.length || 0) - (activeTables?.length || 0)}\n`);

  // Check for conflicts
  const normalize = (label) => label?.trim().toLowerCase();
  const activeLabels = new Set(activeTables?.map(t => normalize(t.label)) || []);
  const conflicts = allTables?.filter(t =>
    !t.active && activeLabels.has(normalize(t.label))
  ) || [];

  if (conflicts.length > 0) {
    console.log('⚠️  CONFLICTS DETECTED:\n');
    conflicts.forEach(inactive => {
      const active = activeTables?.find(a =>
        normalize(a.label) === normalize(inactive.label)
      );
      console.log(`   Active: "${active?.label}" vs Inactive: "${inactive.label}"`);
      console.log(`   Normalized: "${normalize(active?.label)}"`);
      console.log('');
    });

    console.log('💡 This demonstrates the root cause:');
    console.log('   - Client only sees active tables (no duplicates in UI)');
    console.log('   - Database may have UNIQUE constraint on ALL tables');
    console.log('   - Saving a new active table conflicts with inactive one\n');
  }

  console.log('✅ Test data seeded successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Run: node scripts/diagnose-duplicate-tables.js');
  console.log('   2. Try to create a table named "test-e2" or "Round Table 1" in the UI');
  console.log('   3. Observe the duplicate error even though UI shows unique names\n');
}

seedTestData().catch(console.error);
