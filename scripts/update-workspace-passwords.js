#!/usr/bin/env node

/**
 * Update Workspace User Passwords
 *
 * This script updates passwords for all workspace users to match the documented credentials.
 * Uses Supabase Admin API with service role key.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Workspace user credentials (matching documentation)
const WORKSPACE_CREDENTIALS = [
  { email: 'server@restaurant.com', password: 'ServerPass123!' },
  { email: 'manager@restaurant.com', password: 'ManagerPass123!' },
  { email: 'kitchen@restaurant.com', password: 'KitchenPass123!' },
  { email: 'expo@restaurant.com', password: 'ExpoPass123!' },
  { email: 'cashier@restaurant.com', password: 'CashierPass123!' },
  { email: 'owner@restaurant.com', password: 'OwnerPass123!' },
];

async function updateUserPassword(email, password) {
  try {
    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.log(`⚠️  User not found: ${email}`);
      return false;
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Updated password for ${email}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to update ${email}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔐 Updating workspace user passwords...\n');

  let successCount = 0;
  let failCount = 0;

  for (const { email, password } of WORKSPACE_CREDENTIALS) {
    const success = await updateUserPassword(email, password);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Total: ${WORKSPACE_CREDENTIALS.length}`);

  if (failCount === 0) {
    console.log('\n✨ All passwords updated successfully!');
    console.log('\nWorkspace credentials:');
    WORKSPACE_CREDENTIALS.forEach(({ email, password }) => {
      console.log(`   ${email} / ${password}`);
    });
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
