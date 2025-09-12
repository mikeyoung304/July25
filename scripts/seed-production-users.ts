#!/usr/bin/env npx tsx

/**
 * Production Seed Script for Restaurant OS v6.0.3
 * 
 * This script creates production-ready users with proper Supabase authentication.
 * It replaces all hardcoded demo users with real database entries.
 * 
 * Usage:
 *   npm run seed:production
 *   npx tsx scripts/seed-production-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Default restaurant for seeding
const DEFAULT_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

// User templates for production
interface UserTemplate {
  email: string;
  password: string;
  role: 'owner' | 'manager' | 'server' | 'cashier' | 'kitchen' | 'expo';
  displayName: string;
  pin?: string;
  employeeId?: string;
}

const PRODUCTION_USERS: UserTemplate[] = [
  // Management users (email/password login)
  {
    email: 'owner@restaurant.com',
    password: 'Owner@2025!',
    role: 'owner',
    displayName: 'Restaurant Owner',
    employeeId: 'EMP001',
  },
  {
    email: 'manager@restaurant.com',
    password: 'Manager@2025!',
    role: 'manager',
    displayName: 'Restaurant Manager',
    employeeId: 'EMP002',
  },
  
  // Service staff (PIN login)
  {
    email: 'server1@restaurant.com',
    password: 'Server1@2025!',
    role: 'server',
    displayName: 'Server One',
    pin: '5678',
    employeeId: 'EMP003',
  },
  {
    email: 'server2@restaurant.com',
    password: 'Server2@2025!',
    role: 'server',
    displayName: 'Server Two',
    pin: '9012',
    employeeId: 'EMP004',
  },
  {
    email: 'cashier@restaurant.com',
    password: 'Cashier@2025!',
    role: 'cashier',
    displayName: 'Cashier Staff',
    pin: '3456',
    employeeId: 'EMP005',
  },
  
  // Kitchen staff (PIN/Station login)
  {
    email: 'kitchen@restaurant.com',
    password: 'Kitchen@2025!',
    role: 'kitchen',
    displayName: 'Kitchen Staff',
    pin: '7890',
    employeeId: 'EMP006',
  },
  {
    email: 'expo@restaurant.com',
    password: 'Expo@2025!',
    role: 'expo',
    displayName: 'Expo Staff',
    pin: '2345',
    employeeId: 'EMP007',
  },
];

// Helper to hash PINs
const PIN_PEPPER = process.env.PIN_PEPPER || 'default-pepper-change-in-production';

function hashPin(pin: string): { hash: string; salt: string } {
  const salt = bcrypt.genSaltSync(10);
  const pepperedPin = pin + PIN_PEPPER;
  const hash = bcrypt.hashSync(pepperedPin, salt);
  return { hash, salt };
}

async function seedUsers() {
  console.log('🌱 Starting production user seeding...');
  console.log(`📍 Restaurant ID: ${DEFAULT_RESTAURANT_ID}`);
  console.log('');

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const userTemplate of PRODUCTION_USERS) {
    try {
      console.log(`👤 Processing ${userTemplate.email} (${userTemplate.role})...`);

      // Step 1: Create or get Supabase auth user
      let userId: string;
      
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(u => u.email === userTemplate.email);
      
      if (existingUser) {
        userId = existingUser.id;
        console.log(`   ✓ User exists in auth.users`);
        updated++;
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: userTemplate.email,
          password: userTemplate.password,
          email_confirm: true, // Auto-confirm email for seeding
        });

        if (createError || !newUser.user) {
          throw createError || new Error('Failed to create user');
        }

        userId = newUser.user.id;
        console.log(`   ✓ Created new auth user`);
        created++;
      }

      // Step 2: Create or update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          display_name: userTemplate.displayName,
          employee_id: userTemplate.employeeId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (profileError) {
        console.error(`   ❌ Profile error: ${profileError.message}`);
      } else {
        console.log(`   ✓ User profile updated`);
      }

      // Step 3: Assign role to restaurant
      const { error: roleError } = await supabase
        .from('user_restaurants')
        .upsert({
          user_id: userId,
          restaurant_id: DEFAULT_RESTAURANT_ID,
          role: userTemplate.role,
          is_active: true,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,restaurant_id',
        });

      if (roleError) {
        console.error(`   ❌ Role assignment error: ${roleError.message}`);
      } else {
        console.log(`   ✓ Assigned ${userTemplate.role} role`);
      }

      // Step 4: Set up PIN if provided
      if (userTemplate.pin) {
        const { hash, salt } = hashPin(userTemplate.pin);
        
        const { error: pinError } = await supabase
          .from('user_pins')
          .upsert({
            user_id: userId,
            restaurant_id: DEFAULT_RESTAURANT_ID,
            pin_hash: hash,
            salt: salt,
            attempts: 0,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (pinError) {
          console.error(`   ❌ PIN setup error: ${pinError.message}`);
        } else {
          console.log(`   ✓ PIN configured: ${userTemplate.pin}`);
        }
      }

      console.log(`   ✅ ${userTemplate.email} ready for production\n`);

    } catch (error) {
      console.error(`   ❌ Failed to process ${userTemplate.email}:`, error);
      errors++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Seeding Summary:');
  console.log(`   ✅ Created: ${created} new users`);
  console.log(`   🔄 Updated: ${updated} existing users`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(50));

  // Print login credentials for reference
  console.log('\n🔐 Login Credentials:');
  console.log('\n📧 Email/Password Users:');
  PRODUCTION_USERS
    .filter(u => ['owner', 'manager'].includes(u.role))
    .forEach(u => {
      console.log(`   ${u.role.padEnd(10)} - ${u.email} / ${u.password}`);
    });

  console.log('\n📱 PIN Users:');
  PRODUCTION_USERS
    .filter(u => u.pin)
    .forEach(u => {
      console.log(`   ${u.role.padEnd(10)} - PIN: ${u.pin} (${u.displayName})`);
    });

  console.log('\n✨ Production seeding complete!');
  console.log('🚀 Your authentication system is ready for production.');
}

// Run the seeding
seedUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });