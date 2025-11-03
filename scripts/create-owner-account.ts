/**
 * Create Owner Account Script
 * Creates a production owner account for mikeyoung304@gmail.com
 *
 * Usage: npx tsx scripts/create-owner-account.ts
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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DEFAULT_RESTAURANT_ID = process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

// Owner account details
const OWNER_EMAIL = 'mikeyoung304@gmail.com';
const OWNER_PASSWORD = 'TempPassword123!'; // User should change on first login
const OWNER_DISPLAY_NAME = 'Mike Young';

async function createOwnerAccount() {
  console.log('🚀 Creating owner account...\n');

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
    process.exit(1);
  }

  // Create Supabase client with service key (admin privileges)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Check if user already exists
    console.log('1️⃣  Checking if user already exists...');
    const { data: existingUser, error: checkError } = await supabase.auth.admin.listUsers();

    if (checkError) {
      throw new Error(`Failed to check existing users: ${checkError.message}`);
    }

    const userExists = existingUser.users.find(u => u.email === OWNER_EMAIL);

    if (userExists) {
      console.log(`⚠️  User ${OWNER_EMAIL} already exists (ID: ${userExists.id})`);
      console.log('   Updating role to owner if needed...\n');

      // Update user_restaurants to ensure owner role
      const { error: updateError } = await supabase
        .from('user_restaurants')
        .upsert({
          user_id: userExists.id,
          restaurant_id: DEFAULT_RESTAURANT_ID,
          role: 'owner',
          is_active: true
        }, {
          onConflict: 'user_id,restaurant_id'
        });

      if (updateError) {
        throw new Error(`Failed to update user role: ${updateError.message}`);
      }

      console.log('✅ User role updated to owner');
      console.log(`\n📧 Email: ${OWNER_EMAIL}`);
      console.log(`🔑 User ID: ${userExists.id}`);
      console.log(`🏪 Restaurant: ${DEFAULT_RESTAURANT_ID}`);
      console.log(`👤 Role: owner\n`);
      return;
    }

    // Step 2: Create user in Supabase Auth
    console.log(`2️⃣  Creating user in Supabase Auth: ${OWNER_EMAIL}`);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
      email_confirm: true, // Skip email verification
      user_metadata: {
        display_name: OWNER_DISPLAY_NAME,
        role: 'owner'
      }
    });

    if (authError) {
      throw new Error(`Failed to create user in Supabase Auth: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation succeeded but no user data returned');
    }

    const userId = authData.user.id;
    console.log(`   ✓ User created with ID: ${userId}\n`);

    // Step 3: Add user to user_restaurants table
    console.log('3️⃣  Assigning owner role in user_restaurants table...');

    const { error: restaurantError } = await supabase
      .from('user_restaurants')
      .insert({
        user_id: userId,
        restaurant_id: DEFAULT_RESTAURANT_ID,
        role: 'owner',
        is_active: true
      });

    if (restaurantError) {
      console.error(`❌ Failed to add user to restaurant: ${restaurantError.message}`);
      console.error('   User was created in auth.users but role assignment failed!');
      console.error(`   User ID: ${userId}`);
      console.error('   You may need to manually add this user to user_restaurants table.\n');
      process.exit(1);
    }

    console.log(`   ✓ User assigned to restaurant ${DEFAULT_RESTAURANT_ID} as owner\n`);

    // Step 4: Add user profile (optional extended info)
    console.log('4️⃣  Creating user profile...');

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        display_name: OWNER_DISPLAY_NAME
      });

    if (profileError) {
      console.warn(`   ⚠️  Warning: Could not create user profile: ${profileError.message}`);
      console.warn('   This is non-critical and can be added later.\n');
    } else {
      console.log(`   ✓ User profile created\n`);
    }

    // Step 5: Verify user creation
    console.log('5️⃣  Verifying user setup...');

    const { data: verifyData, error: verifyError } = await supabase
      .from('user_restaurants')
      .select('role, is_active')
      .eq('user_id', userId)
      .eq('restaurant_id', DEFAULT_RESTAURANT_ID)
      .single();

    if (verifyError) {
      console.warn(`   ⚠️  Could not verify user setup: ${verifyError.message}\n`);
    } else {
      console.log(`   ✓ Verified: role=${verifyData.role}, active=${verifyData.is_active}\n`);
    }

    // Success summary
    console.log('🎉 Owner account created successfully!\n');
    console.log('─'.repeat(60));
    console.log('Account Details:');
    console.log('─'.repeat(60));
    console.log(`📧 Email:        ${OWNER_EMAIL}`);
    console.log(`🔑 Password:     ${OWNER_PASSWORD}`);
    console.log(`🆔 User ID:      ${userId}`);
    console.log(`🏪 Restaurant:   ${DEFAULT_RESTAURANT_ID}`);
    console.log(`👤 Role:         owner (full access)`);
    console.log(`✅ Status:       Active`);
    console.log('─'.repeat(60));
    console.log('\n⚠️  IMPORTANT: Change your password on first login!\n');
    console.log('Next steps:');
    console.log('1. Visit your production site');
    console.log('2. Click "Login" or navigate to /login');
    console.log(`3. Enter email: ${OWNER_EMAIL}`);
    console.log(`4. Enter password: ${OWNER_PASSWORD}`);
    console.log('5. Change your password immediately after login\n');

  } catch (error) {
    console.error('\n❌ Error creating owner account:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
createOwnerAccount()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
