#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  console.log('🌱 Creating admin user...');
  
  try {
    // Create auth user for admin
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@demo.com',
      password: 'demo123',
      email_confirm: true,
      user_metadata: {
        display_name: 'Demo Admin',
        role: 'owner'
      }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log('✅ Admin user already exists');
        
        // Try to update the password
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find(u => u.email === 'admin@demo.com');
        
        if (existingUser) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: 'demo123' }
          );
          
          if (!updateError) {
            console.log('✅ Admin password updated to demo123');
          }
        }
      } else {
        console.error('❌ Failed to create admin user:', authError.message);
        return;
      }
    } else {
      console.log('✅ Created admin user: admin@demo.com');
    }

    console.log('\n📋 Admin Login Credentials:');
    console.log('========================');
    console.log('Email: admin@demo.com');
    console.log('Password: demo123');
    console.log('========================\n');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

// Run the function
createAdminUser();