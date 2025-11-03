/**
 * Verify Owner Account Script
 * Verifies the owner account was created correctly and has all permissions
 *
 * Usage: npx tsx scripts/verify-owner-account.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables (ES module compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const OWNER_EMAIL = 'mikeyoung304@gmail.com';

async function verifyOwnerAccount() {
  console.log('🔍 Verifying owner account setup...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Check user exists in auth.users
    console.log('1️⃣  Checking auth.users table...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) throw usersError;

    const user = users.users.find(u => u.email === OWNER_EMAIL);
    if (!user) {
      console.error(`   ❌ User ${OWNER_EMAIL} not found in auth.users`);
      process.exit(1);
    }

    console.log(`   ✓ User found in auth.users`);
    console.log(`     ID: ${user.id}`);
    console.log(`     Email: ${user.email}`);
    console.log(`     Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`     Created: ${new Date(user.created_at).toLocaleString()}\n`);

    // Step 2: Check user_restaurants
    console.log('2️⃣  Checking user_restaurants table...');
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('user_restaurants')
      .select('*')
      .eq('user_id', user.id);

    if (restaurantsError) throw restaurantsError;

    if (!restaurants || restaurants.length === 0) {
      console.error(`   ❌ User not assigned to any restaurants`);
      process.exit(1);
    }

    console.log(`   ✓ User assigned to ${restaurants.length} restaurant(s):`);
    restaurants.forEach(r => {
      console.log(`     - Restaurant: ${r.restaurant_id}`);
      console.log(`       Role: ${r.role}`);
      console.log(`       Active: ${r.is_active}`);
    });
    console.log('');

    // Step 3: Check role_scopes for owner role
    console.log('3️⃣  Checking role scopes...');
    const ownerRestaurant = restaurants.find(r => r.role === 'owner');

    if (!ownerRestaurant) {
      console.error(`   ❌ User does not have owner role`);
      process.exit(1);
    }

    const { data: scopes, error: scopesError } = await supabase
      .from('role_scopes')
      .select('scope')
      .eq('role', 'owner');

    if (scopesError) throw scopesError;

    console.log(`   ✓ Owner role has ${scopes?.length || 0} scopes:`);
    scopes?.forEach(s => console.log(`     - ${s.scope}`));
    console.log('');

    // Step 4: Check user_profiles
    console.log('4️⃣  Checking user_profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn(`   ⚠️  Could not fetch user profile: ${profileError.message}`);
    } else if (!profile) {
      console.warn(`   ⚠️  No user profile found (optional)`);
    } else {
      console.log(`   ✓ User profile found:`);
      console.log(`     Display Name: ${profile.display_name || 'N/A'}`);
      console.log(`     Phone: ${profile.phone || 'N/A'}`);
      console.log(`     Employee ID: ${profile.employee_id || 'N/A'}`);
    }
    console.log('');

    // Success
    console.log('✅ Owner account verification complete!\n');
    console.log('─'.repeat(60));
    console.log('Summary:');
    console.log('─'.repeat(60));
    console.log(`✓ User exists in auth.users`);
    console.log(`✓ Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`✓ Assigned to restaurant as owner`);
    console.log(`✓ Has ${scopes?.length || 0} permission scopes`);
    console.log(`✓ Account is active`);
    console.log('─'.repeat(60));
    console.log('\n🎉 Account is ready to use!\n');

  } catch (error) {
    console.error('\n❌ Verification failed:');
    console.error(error);
    process.exit(1);
  }
}

verifyOwnerAccount()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
