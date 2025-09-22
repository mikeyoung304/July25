/**
 * Seed Demo Users Script
 * Creates demo users in Supabase for development testing
 * Run: node scripts/seed-demo-users.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DEMO_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_PASSWORD = 'Demo123!';

const demoUsers = [
  {
    email: 'manager@restaurant.com',
    password: DEMO_PASSWORD,
    metadata: {
      display_name: 'Demo Manager',
      role: 'manager'
    }
  },
  {
    email: 'server@restaurant.com',
    password: DEMO_PASSWORD,
    metadata: {
      display_name: 'Demo Server',
      role: 'server'
    }
  },
  {
    email: 'kitchen@restaurant.com',
    password: DEMO_PASSWORD,
    metadata: {
      display_name: 'Demo Kitchen',
      role: 'kitchen'
    }
  },
  {
    email: 'expo@restaurant.com',
    password: DEMO_PASSWORD,
    metadata: {
      display_name: 'Demo Expo',
      role: 'expo'
    }
  },
  {
    email: 'cashier@restaurant.com',
    password: DEMO_PASSWORD,
    metadata: {
      display_name: 'Demo Cashier',
      role: 'cashier'
    }
  }
];

async function seedDemoUsers() {
  
  for (const user of demoUsers) {
    try {
      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.metadata
      });

      if (authError) {
        if (authError.message.includes('already exists')) {
          
          // Update existing user's metadata
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingUser = users?.users?.find(u => u.email === user.email);
          
          if (existingUser) {
            await supabase.auth.admin.updateUserById(existingUser.id, {
              user_metadata: user.metadata
            });
          }
        } else {
          console.error(`❌ Failed to create ${user.email}:`, authError);
          continue;
        }
      } else {
      }

      // Get user ID
      const { data: users } = await supabase.auth.admin.listUsers();
      const createdUser = users?.users?.find(u => u.email === user.email);
      
      if (createdUser) {
        // Add user to restaurant
        const { error: restaurantError } = await supabase
          .from('user_restaurants')
          .upsert({
            user_id: createdUser.id,
            restaurant_id: DEMO_RESTAURANT_ID,
            role: user.metadata.role
          }, { 
            onConflict: 'user_id,restaurant_id' 
          });

        if (restaurantError) {
          console.error(`❌ Failed to add ${user.email} to restaurant:`, restaurantError);
        } else {
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${user.email}:`, error);
    }
  }

}

seedDemoUsers().catch(console.error);