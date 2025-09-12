#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

interface DemoUser {
  email: string;
  password?: string;
  pin?: string;
  role: string;
  display_name: string;
  employee_id: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    email: 'server@demo.com',
    pin: '2468',
    role: 'server',
    display_name: 'Demo Server',
    employee_id: 'EMP001'
  },
  {
    email: 'kitchen@demo.com',
    pin: '1357',
    role: 'kitchen',
    display_name: 'Demo Kitchen',
    employee_id: 'EMP002'
  },
  {
    email: 'expo@demo.com',
    pin: '3691',
    role: 'expo',
    display_name: 'Demo Expo',
    employee_id: 'EMP003'
  },
  {
    email: 'cashier@demo.com',
    pin: '4802',
    role: 'cashier',
    display_name: 'Demo Cashier',
    employee_id: 'EMP004'
  },
  {
    email: 'admin@demo.com',
    password: 'demo123',
    role: 'owner',
    display_name: 'Demo Admin',
    employee_id: 'EMP000'
  }
];

async function seedDemoUsers() {
  console.log('🌱 Seeding demo users...');
  
  try {
    // First, ensure the restaurant exists
    const { error: restaurantError } = await supabase
      .from('restaurants')
      .upsert({
        id: RESTAURANT_ID,
        name: 'Grow Fresh Local Food',
        slug: 'grow-fresh-local-food'
      });
    
    if (restaurantError) {
      console.error('❌ Failed to ensure restaurant exists:', restaurantError);
      return;
    }

    console.log('✅ Restaurant verified');

    // Create users
    for (const user of DEMO_USERS) {
      try {
        // Create auth user if using email/password
        if (user.password) {
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true
          });

          if (authError) {
            console.log(`⚠️  Auth user ${user.email} may already exist:`, authError.message);
          } else {
            console.log(`✅ Created auth user: ${user.email}`);
          }
        }

        // Check if user profile exists in users table
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          console.log(`ℹ️  User profile already exists: ${user.email}`);
        } else {
          // Create user profile in users table
          const newUserId = crypto.randomUUID();
          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
              id: newUserId,
              email: user.email,
              display_name: user.display_name,
              employee_id: user.employee_id,
              phone: '555-0100',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (userError) {
            console.error(`❌ Failed to create user profile for ${user.email}:`, userError.message || JSON.stringify(userError));
            continue;
          }

          userId = newUser?.id || newUserId;
          console.log(`✅ Created user profile: ${user.email}`);
        }

        // Create or update user role in user_restaurants table
        const { error: roleError } = await supabase
          .from('user_restaurants')
          .upsert({
            user_id: userId,
            restaurant_id: RESTAURANT_ID,
            role: user.role,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,restaurant_id'
          });

        if (roleError) {
          console.error(`❌ Failed to set role for ${user.email}:`, roleError);
        } else {
          console.log(`✅ Set role ${user.role} for ${user.email}`);
        }

        // Create PIN if provided
        if (user.pin) {
          const hashedPin = await bcrypt.hash(user.pin, 10);
          
          const { error: pinError } = await supabase
            .from('user_pins')
            .upsert({
              user_id: userId,
              restaurant_id: RESTAURANT_ID,
              pin_hash: hashedPin,
              is_active: true
            }, {
              onConflict: 'user_id,restaurant_id'
            });

          if (pinError) {
            console.error(`❌ Failed to set PIN for ${user.email}:`, pinError);
          } else {
            console.log(`✅ Set PIN ${user.pin} for ${user.email}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error);
      }
    }

    console.log('\n📋 Demo Users Summary:');
    console.log('========================');
    DEMO_USERS.forEach(user => {
      if (user.pin) {
        console.log(`${user.role.padEnd(10)} - PIN: ${user.pin}`);
      } else if (user.password) {
        console.log(`${user.role.padEnd(10)} - Email: ${user.email} / Password: ${user.password}`);
      }
    });
    console.log('========================\n');
    console.log('✨ Demo users seeding complete!');
    
  } catch (error) {
    console.error('❌ Error seeding demo users:', error);
  }
}

// Run the seed function
seedDemoUsers();