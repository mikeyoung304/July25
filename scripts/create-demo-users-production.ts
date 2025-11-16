#!/usr/bin/env tsx

/**
 * Create Demo Users in Production Supabase
 *
 * This script creates real Supabase users that can be used with the
 * "Demo Mode" quick login buttons in the application.
 *
 * Run: npm run tsx scripts/create-demo-users-production.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

console.log('🔑 Connecting to Supabase...');
console.log('   URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

// These match the frontend config in client/src/config/demoCredentials.ts
const demoUsers = [
  {
    email: 'server@restaurant.com',
    password: 'Demo123!',
    metadata: {
      display_name: 'Demo Server',
      role: 'server'
    }
  },
  {
    email: 'kitchen@restaurant.com',
    password: 'Demo123!',
    metadata: {
      display_name: 'Demo Kitchen',
      role: 'kitchen'
    }
  },
  {
    email: 'manager@restaurant.com',
    password: 'Demo123!',
    metadata: {
      display_name: 'Demo Manager',
      role: 'manager'
    }
  },
  {
    email: 'expo@restaurant.com',
    password: 'Demo123!',
    metadata: {
      display_name: 'Demo Expo',
      role: 'expo'
    }
  },
  {
    email: 'cashier@restaurant.com',
    password: 'Demo123!',
    metadata: {
      display_name: 'Demo Cashier',
      role: 'cashier'
    }
  }
];

async function createDemoUsers() {
  console.log('\n📋 Creating/updating demo users...\n');

  // First, check if the restaurant exists
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('id', DEMO_RESTAURANT_ID)
    .single();

  if (restaurantError || !restaurant) {
    console.log('🏢 Restaurant not found, creating demo restaurant...');

    const { error: createRestaurantError } = await supabase
      .from('restaurants')
      .upsert({
        id: DEMO_RESTAURANT_ID,
        name: 'Demo Restaurant',
        timezone: 'America/New_York',
        currency: 'USD',
        tax_rate: 0.08,
        default_tip_percentages: [15, 18, 20],
        description: 'Demo restaurant for testing'
      });

    if (createRestaurantError) {
      console.error('❌ Failed to create restaurant:', createRestaurantError);
      return;
    }
    console.log('✅ Demo restaurant created');
  } else {
    console.log('✅ Restaurant exists:', restaurant.name);
  }

  console.log('\n👥 Processing users...\n');

  for (const user of demoUsers) {
    console.log(`\n🔄 Processing ${user.email}...`);

    try {
      // First, try to get existing users
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

      if (listError) {
        console.error(`❌ Failed to list users:`, listError);
        continue;
      }

      const existingUser = existingUsers?.users?.find(u => u.email === user.email);

      if (existingUser) {
        console.log(`   👤 User exists, updating password...`);

        // Update existing user's password and metadata
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            password: user.password,
            user_metadata: user.metadata,
            email_confirm: true
          }
        );

        if (updateError) {
          console.error(`   ❌ Failed to update:`, updateError.message);
        } else {
          console.log(`   ✅ Password updated`);
        }

        // Ensure user is in user_restaurants table
        await ensureUserRestaurant(existingUser.id, user.metadata.role);

      } else {
        console.log(`   ➕ Creating new user...`);

        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: user.metadata
        });

        if (createError) {
          console.error(`   ❌ Failed to create:`, createError.message);
        } else {
          console.log(`   ✅ User created`);

          if (newUser?.user) {
            await ensureUserRestaurant(newUser.user.id, user.metadata.role);
          }
        }
      }

    } catch (error) {
      console.error(`❌ Error processing ${user.email}:`, error);
    }
  }

  console.log('\n✅ Demo user setup complete!\n');
  console.log('📝 You can now use these credentials:');
  console.log('   Email: server@restaurant.com');
  console.log('   Password: Demo123!');
  console.log('\n   (Same password for all demo users)');
}

async function ensureUserRestaurant(userId: string, role: string) {
  console.log(`   🏢 Adding to restaurant with role: ${role}`);

  const { error } = await supabase
    .from('user_restaurants')
    .upsert({
      user_id: userId,
      restaurant_id: DEMO_RESTAURANT_ID,
      role: role,
      is_active: true
    }, {
      onConflict: 'user_id,restaurant_id'
    });

  if (error) {
    console.error(`   ❌ Failed to add to restaurant:`, error.message);
  } else {
    console.log(`   ✅ Added to restaurant`);
  }
}

// Run the script
createDemoUsers()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });