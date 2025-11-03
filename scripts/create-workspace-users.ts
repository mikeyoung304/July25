/**
 * Create Workspace Users Script
 * Creates real Supabase users for workspace roles (server, kitchen, expo, manager, customer)
 *
 * This replaces the demo-session fake JWT pattern with production-ready real users.
 * These users are tied to the default restaurant and work exactly like customer accounts.
 *
 * Usage: npx tsx scripts/create-workspace-users.ts
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

// Workspace user definitions
const WORKSPACE_USERS = [
  {
    email: 'server@restaurant.com',
    password: 'ServerPass123!',
    displayName: 'Server Workspace',
    role: 'server'
  },
  {
    email: 'kitchen@restaurant.com',
    password: 'KitchenPass123!',
    displayName: 'Kitchen Workspace',
    role: 'kitchen'
  },
  {
    email: 'expo@restaurant.com',
    password: 'ExpoPass123!',
    displayName: 'Expo Workspace',
    role: 'expo'
  },
  {
    email: 'manager@restaurant.com',
    password: 'ManagerPass123!',
    displayName: 'Manager Workspace',
    role: 'manager'
  },
  {
    email: 'customer@restaurant.com',
    password: 'CustomerPass123!',
    displayName: 'Customer Workspace',
    role: 'customer'
  }
] as const;

async function createWorkspaceUser(
  supabase: ReturnType<typeof createClient>,
  userData: typeof WORKSPACE_USERS[number]
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const { email, password, displayName, role } = userData;

  try {
    console.log(`\n📝 Processing ${email} (${role})...`);

    // Step 1: Check if user already exists
    const { data: existingUser, error: checkError } = await supabase.auth.admin.listUsers();

    if (checkError) {
      return { success: false, error: `Failed to check existing users: ${checkError.message}` };
    }

    const userExists = existingUser.users.find(u => u.email === email);

    if (userExists) {
      console.log(`   ⚠️  User already exists (ID: ${userExists.id})`);
      console.log('   Updating role if needed...');

      // Update user_restaurants to ensure correct role
      const { error: updateError } = await supabase
        .from('user_restaurants')
        .upsert({
          user_id: userExists.id,
          restaurant_id: DEFAULT_RESTAURANT_ID,
          role: role,
          is_active: true
        }, {
          onConflict: 'user_id,restaurant_id'
        });

      if (updateError) {
        return { success: false, error: `Failed to update user role: ${updateError.message}` };
      }

      console.log(`   ✅ Updated role to ${role}`);
      return { success: true, userId: userExists.id };
    }

    // Step 2: Create user in Supabase Auth
    console.log(`   Creating user in Supabase Auth...`);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for workspace accounts
      user_metadata: {
        display_name: displayName,
        role
      }
    });

    if (authError) {
      return { success: false, error: `Failed to create user: ${authError.message}` };
    }

    if (!authData.user) {
      return { success: false, error: 'User creation succeeded but no user data returned' };
    }

    const userId = authData.user.id;
    console.log(`   ✓ User created with ID: ${userId}`);

    // Step 3: Add user to user_restaurants table
    console.log(`   Assigning ${role} role...`);

    const { error: restaurantError } = await supabase
      .from('user_restaurants')
      .insert({
        user_id: userId,
        restaurant_id: DEFAULT_RESTAURANT_ID,
        role,
        is_active: true
      });

    if (restaurantError) {
      return {
        success: false,
        error: `Failed to add user to restaurant: ${restaurantError.message}`,
        userId
      };
    }

    console.log(`   ✓ User assigned to restaurant as ${role}`);

    // Step 4: Add user profile (optional)
    console.log(`   Creating user profile...`);

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        display_name: displayName
      });

    if (profileError) {
      console.warn(`   ⚠️  Warning: Could not create user profile: ${profileError.message}`);
      console.warn('   (non-critical, can be added later)');
    } else {
      console.log(`   ✓ User profile created`);
    }

    // Step 5: Verify user setup
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_restaurants')
      .select('role, is_active')
      .eq('user_id', userId)
      .eq('restaurant_id', DEFAULT_RESTAURANT_ID)
      .single();

    if (verifyError) {
      console.warn(`   ⚠️  Could not verify user setup: ${verifyError.message}`);
    } else {
      console.log(`   ✓ Verified: role=${verifyData.role}, active=${verifyData.is_active}`);
    }

    console.log(`   ✅ ${email} created successfully!`);
    return { success: true, userId };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function createAllWorkspaceUsers() {
  console.log('🚀 Creating Workspace Users for Production-Ready Auth\n');
  console.log('This script creates REAL Supabase users to replace demo-session fake JWTs.');
  console.log('These users work exactly like customer accounts.\n');

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
    console.error('\nMake sure these are set in your .env file.');
    process.exit(1);
  }

  console.log('Environment:');
  console.log(`   SUPABASE_URL: ${SUPABASE_URL}`);
  console.log(`   DEFAULT_RESTAURANT_ID: ${DEFAULT_RESTAURANT_ID}\n`);

  // Create Supabase client with service key (admin privileges)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const results = {
    created: [] as string[],
    updated: [] as string[],
    failed: [] as { email: string; error: string }[]
  };

  // Process each workspace user
  for (const userData of WORKSPACE_USERS) {
    const result = await createWorkspaceUser(supabase, userData);

    if (result.success) {
      if (result.userId) {
        // Check if it was a new creation or update
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const wasExisting = existingUser?.users.some(u => u.email === userData.email);

        if (wasExisting) {
          results.updated.push(userData.email);
        } else {
          results.created.push(userData.email);
        }
      }
    } else {
      results.failed.push({
        email: userData.email,
        error: result.error || 'Unknown error'
      });
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(80));

  if (results.created.length > 0) {
    console.log(`\n✅ Created ${results.created.length} new user(s):`);
    results.created.forEach(email => console.log(`   - ${email}`));
  }

  if (results.updated.length > 0) {
    console.log(`\n🔄 Updated ${results.updated.length} existing user(s):`);
    results.updated.forEach(email => console.log(`   - ${email}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed ${results.failed.length} user(s):`);
    results.failed.forEach(({ email, error }) => {
      console.log(`   - ${email}: ${error}`);
    });
  }

  console.log('\n' + '═'.repeat(80));
  console.log('📧 WORKSPACE USER CREDENTIALS');
  console.log('═'.repeat(80));
  console.log('\nThese credentials are for auto-fill when VITE_DEMO_PANEL=1:');
  console.log('(In production with VITE_DEMO_PANEL=0, auto-fill is disabled)\n');

  WORKSPACE_USERS.forEach(({ email, password, role }) => {
    console.log(`${role.toUpperCase().padEnd(10)} | ${email.padEnd(30)} | ${password}`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('🎯 NEXT STEPS');
  console.log('═'.repeat(80));
  console.log('\n1. Update workspaceCredentials.ts with these credentials');
  console.log('2. Update WorkspaceAuthModal to use login() instead of loginAsDemo()');
  console.log('3. Remove demo-session endpoint from server');
  console.log('4. Test workspace logins on dashboard');
  console.log('5. Verify WebSocket connections work\n');

  console.log('⚠️  SECURITY NOTE:');
  console.log('These are shared workspace accounts (like station PINs).');
  console.log('Passwords are visible in client code when VITE_DEMO_PANEL=1.');
  console.log('Rotate passwords periodically if needed.\n');

  if (results.failed.length > 0) {
    console.error('❌ Some users failed to create. See errors above.');
    process.exit(1);
  }

  console.log('✨ All workspace users ready!');
  console.log('🎉 Demo debt elimination: Phase 1 complete!\n');
}

// Run the script
createAllWorkspaceUsers()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
