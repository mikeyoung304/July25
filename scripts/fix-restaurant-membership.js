#!/usr/bin/env node

/**
 * Fix Restaurant Membership for Staff Users
 *
 * This script ensures all staff users have proper restaurant membership entries
 * in the user_restaurants table. This is required after the September 11-14 auth
 * changes that enforce strict membership checks.
 *
 * Run with: node scripts/fix-restaurant-membership.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const DEFAULT_RESTAURANT_ID = process.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEMO_USERS = [
  { email: 'owner@restaurantos.com', role: 'owner' },
  { email: 'manager@restaurantos.com', role: 'manager' },
  { email: 'server@restaurantos.com', role: 'server' },
  { email: 'cashier@restaurantos.com', role: 'cashier' },
  { email: 'kitchen@restaurantos.com', role: 'kitchen' },
  { email: 'expo@restaurantos.com', role: 'expo' }
];

async function fixRestaurantMemberships() {
  console.log('🔧 Fixing Restaurant Memberships...\n');
  console.log(`📍 Default Restaurant ID: ${DEFAULT_RESTAURANT_ID}\n`);

  try {
    // First, check if user_restaurants table exists
    const { data: tables, error: tableError } = await supabase
      .from('user_restaurants')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('⚠️  user_restaurants table does not exist. Creating it...');

      // Create the table
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS user_restaurants (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            restaurant_id UUID NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, restaurant_id)
          );
          CREATE INDEX IF NOT EXISTS idx_user_restaurants_user_id ON user_restaurants(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);
        `
      });

      if (createError) {
        console.error('❌ Failed to create user_restaurants table:', createError);
        return;
      }
      console.log('✅ user_restaurants table created successfully\n');
    }

    // Get all users with staff roles using Supabase Admin API
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    // Filter to only demo users
    const demoEmails = DEMO_USERS.map(u => u.email);
    const staffUsers = users?.filter(u => demoEmails.includes(u.email)) || [];

    console.log(`Found ${staffUsers.length} staff users to process\n`);

    // Process each user
    let fixed = 0;
    let existing = 0;

    for (const user of staffUsers) {
      const userRole = user.user_metadata?.role ||
                      DEMO_USERS.find(u => u.email === user.email)?.role ||
                      'customer';

      // Check if membership already exists
      const { data: existingMembership } = await supabase
        .from('user_restaurants')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('restaurant_id', DEFAULT_RESTAURANT_ID)
        .single();

      if (existingMembership) {
        console.log(`✓ ${user.email} already has membership (role: ${existingMembership.role})`);
        existing++;

        // Update role if it doesn't match
        if (existingMembership.role !== userRole) {
          const { error: updateError } = await supabase
            .from('user_restaurants')
            .update({ role: userRole, updated_at: new Date().toISOString() })
            .eq('id', existingMembership.id);

          if (updateError) {
            console.error(`  ⚠️ Failed to update role: ${updateError.message}`);
          } else {
            console.log(`  → Updated role from ${existingMembership.role} to ${userRole}`);
          }
        }
      } else {
        // Create new membership
        const { error: insertError } = await supabase
          .from('user_restaurants')
          .insert({
            user_id: user.id,
            restaurant_id: DEFAULT_RESTAURANT_ID,
            role: userRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`❌ Failed to create membership for ${user.email}:`, insertError.message);
        } else {
          console.log(`✅ Created membership for ${user.email} (role: ${userRole})`);
          fixed++;
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  - ${fixed} new memberships created`);
    console.log(`  - ${existing} existing memberships verified`);

    // Verify the fix
    const { data: finalCount, error: countError } = await supabase
      .from('user_restaurants')
      .select('id', { count: 'exact' })
      .eq('restaurant_id', DEFAULT_RESTAURANT_ID);

    if (!countError) {
      console.log(`  - Total memberships for default restaurant: ${finalCount?.length || 0}`);
    }

    console.log('\n✨ Restaurant membership fix complete!');
    console.log('You should now be able to create orders as a server user.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the fix
fixRestaurantMemberships().catch(console.error);