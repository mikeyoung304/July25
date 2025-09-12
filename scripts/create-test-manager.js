#!/usr/bin/env node

/**
 * Create a test manager user in Supabase for authentication testing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const restaurantId = process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestManager() {
  console.log('🔐 Creating test manager user...\n');

  try {
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'manager@test.com',
      password: 'TestManager123!',
      email_confirm: true,
      user_metadata: {
        name: 'Test Manager'
      }
    });

    if (authError) {
      // Check if user already exists
      if (authError.message?.includes('already been registered')) {
        console.log('ℹ️  User already exists, retrieving...');
        
        // Get existing user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = users.find(u => u.email === 'manager@test.com');
        if (!existingUser) throw new Error('Could not find existing user');
        
        console.log('✅ Found existing user:', existingUser.id);
        
        // Check if user already has manager role
        const { data: existingRole, error: roleCheckError } = await supabase
          .from('user_restaurants')
          .select('*')
          .eq('user_id', existingUser.id)
          .eq('restaurant_id', restaurantId)
          .single();
        
        if (!roleCheckError && existingRole) {
          console.log('✅ User already has role:', existingRole.role);
          console.log('\n📝 Test credentials:');
          console.log('   Email: manager@test.com');
          console.log('   Password: TestManager123!');
          console.log('   Restaurant ID:', restaurantId);
          return;
        }
        
        // Add manager role if not exists
        await addManagerRole(existingUser.id);
        return;
      }
      throw authError;
    }

    console.log('✅ User created:', authData.user.id);
    
    // Add manager role
    await addManagerRole(authData.user.id);
    
  } catch (error) {
    console.error('❌ Failed to create test manager:', error.message);
    process.exit(1);
  }
}

async function addManagerRole(userId) {
  // Add user to user_restaurants with manager role
  const { data: roleData, error: roleError } = await supabase
    .from('user_restaurants')
    .upsert({
      user_id: userId,
      restaurant_id: restaurantId,
      role: 'manager'
    }, {
      onConflict: 'user_id,restaurant_id'
    })
    .select()
    .single();

  if (roleError) {
    throw roleError;
  }

  console.log('✅ Manager role assigned');
  console.log('\n============================================');
  console.log('📝 Test Manager Credentials:');
  console.log('   Email: manager@test.com');
  console.log('   Password: TestManager123!');
  console.log('   Role: manager');
  console.log('   Restaurant ID:', restaurantId);
  console.log('============================================\n');
  console.log('You can now run: node scripts/test-manager-auth.js');
}

// Run the script
createTestManager().catch(console.error);