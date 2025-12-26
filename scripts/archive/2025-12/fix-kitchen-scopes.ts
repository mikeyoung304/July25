#!/usr/bin/env tsx
/**
 * Fix Kitchen & Expo Scopes
 * Adds missing orders.write scope to kitchen and expo roles
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixKitchenScopes() {
  console.log('🔧 Fixing Kitchen & Expo Scopes\n');

  // Check current scopes
  console.log('1️⃣ Current scopes:');
  const { data: currentScopes } = await supabase
    .from('role_scopes')
    .select('role, scope')
    .in('role', ['kitchen', 'expo'])
    .order('role');

  console.table(currentScopes);

  // Add orders.write scope to kitchen role (allows modifying orders)
  console.log('\n2️⃣ Adding orders.write to kitchen role...');
  const { error: kitchenError } = await supabase
    .from('role_scopes')
    .upsert({
      role: 'kitchen',
      scope: 'orders.write'
    }, {
      onConflict: 'role,scope'
    });

  if (kitchenError) {
    console.error('❌ Failed to add scope to kitchen:', kitchenError);
  } else {
    console.log('✅ Added orders.write to kitchen role');
  }

  // Add orders.write scope to expo role (allows modifying orders)
  console.log('\n3️⃣ Adding orders.write to expo role...');
  const { error: expoError } = await supabase
    .from('role_scopes')
    .upsert({
      role: 'expo',
      scope: 'orders.write'
    }, {
      onConflict: 'role,scope'
    });

  if (expoError) {
    console.error('❌ Failed to add scope to expo:', expoError);
  } else {
    console.log('✅ Added orders.write to expo role');
  }

  // Verify updated scopes
  console.log('\n4️⃣ Updated scopes:');
  const { data: updatedScopes } = await supabase
    .from('role_scopes')
    .select('role, scope')
    .in('role', ['kitchen', 'expo'])
    .order('role');

  console.table(updatedScopes);

  console.log('\n✅ Kitchen & Expo roles now have permission to update order status!');
}

fixKitchenScopes().catch(console.error);
