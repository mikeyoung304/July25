#!/usr/bin/env node
/**
 * Seed demo users into Supabase Auth
 * This ensures RLS policies work correctly with demo PIN logins
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

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

const DEMO_USERS = [
  {
    email: 'admin@demo.com',
    password: 'demo123',
    role: 'owner',
    metadata: {
      display_name: 'Demo Admin',
      restaurant_id: '11111111-1111-1111-1111-111111111111',
    },
  },
  {
    email: 'server@demo.com',
    password: 'server2468',
    role: 'server',
    metadata: {
      display_name: 'Demo Server',
      pin: '2468',
      restaurant_id: '11111111-1111-1111-1111-111111111111',
    },
  },
  {
    email: 'kitchen@demo.com',
    password: 'kitchen1357',
    role: 'kitchen',
    metadata: {
      display_name: 'Demo Kitchen',
      pin: '1357',
      restaurant_id: '11111111-1111-1111-1111-111111111111',
    },
  },
  {
    email: 'expo@demo.com',
    password: 'expo3691',
    role: 'expo',
    metadata: {
      display_name: 'Demo Expo',
      pin: '3691',
      restaurant_id: '11111111-1111-1111-1111-111111111111',
    },
  },
  {
    email: 'cashier@demo.com',
    password: 'cashier4802',
    role: 'cashier',
    metadata: {
      display_name: 'Demo Cashier',
      pin: '4802',
      restaurant_id: '11111111-1111-1111-1111-111111111111',
    },
  },
];

async function seedDemoUsers() {
  console.log('🌱 Seeding demo users...');

  for (const user of DEMO_USERS) {
    try {
      // Try to create user (will fail if exists)
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.metadata,
      });
        
      
      if (error) {
        if (error.message?.includes('already been registered')) {
          console.log(`✓ User ${user.email} already exists`);
        } else {
          console.error(`❌ Failed to create ${user.email}:`, error.message);
        }
      } else if (data) {
        console.log(`✅ Created user ${user.email}`);
        
        // Also insert into user_roles table
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: data.user.id,
            restaurant_id: user.metadata.restaurant_id,
            role: user.role,
            permissions: getPermissionsForRole(user.role),
          });
        
        if (roleError) {
          console.error(`❌ Failed to set role for ${user.email}:`, roleError.message);
        } else {
          console.log(`✓ Set role ${user.role} for ${user.email}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${user.email}:`, error);
    }
  }
  
  console.log('\n✨ Demo user seeding complete!');
}

function getPermissionsForRole(role: string): string[] {
  const permissions: Record<string, string[]> = {
    owner: ['*'],
    manager: ['orders:*', 'menu:*', 'tables:*', 'staff:*', 'reports:*'],
    server: ['orders:create', 'orders:read', 'orders:update', 'tables:read', 'tables:update', 'menu:read'],
    kitchen: ['orders:read', 'orders:update', 'menu:read'],
    expo: ['orders:read', 'orders:update'],
    cashier: ['orders:read', 'orders:update', 'payments:*'],
  };
  
  return permissions[role] || [];
}

// Run the seeding
seedDemoUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });