#!/usr/bin/env tsx
/**
 * Test Kitchen User Authentication & Permissions
 * Tests if kitchen users can update order status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env' });

const DEMO_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function testKitchenAuth() {
  console.log('🔍 Testing Kitchen User Authentication & Permissions\n');

  // 1. Login as kitchen user
  console.log('1️⃣ Logging in as kitchen@restaurant.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'kitchen@restaurant.com',
    password: 'Demo123!'
  });

  if (authError || !authData.session) {
    console.error('❌ Login failed:', authError);
    return;
  }

  console.log('✅ Login successful');
  console.log('   User ID:', authData.user.id);
  console.log('   Access Token:', authData.session.access_token.substring(0, 20) + '...');

  // 2. Fetch user details from backend
  console.log('\n2️⃣ Fetching user details from /api/v1/auth/me...');
  try {
    const meResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'x-restaurant-id': DEMO_RESTAURANT_ID
      }
    });

    const meData = await meResponse.json();
    console.log('✅ User details:', JSON.stringify(meData, null, 2));
    console.log('   Role:', meData.user?.role);
    console.log('   Scopes:', meData.user?.scopes);
  } catch (error: any) {
    console.error('❌ Failed to fetch user details:', error.message);
  }

  // 3. Fetch orders
  console.log('\n3️⃣ Fetching orders...');
  try {
    const ordersResponse = await fetch(`${API_BASE_URL}/api/v1/orders`, {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'x-restaurant-id': DEMO_RESTAURANT_ID
      }
    });

    const orders = await ordersResponse.json();
    console.log(`✅ Found ${Array.isArray(orders) ? orders.length : 0} orders`);

    if (Array.isArray(orders) && orders.length > 0) {
      const testOrder = orders[0];
      console.log('   Test Order ID:', testOrder.id);
      console.log('   Order Number:', testOrder.order_number);
      console.log('   Current Status:', testOrder.status);

      // 4. Try to update order status
      console.log('\n4️⃣ Testing order status update...');
      try {
        const updateResponse = await fetch(`${API_BASE_URL}/api/v1/orders/${testOrder.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authData.session.access_token}`,
            'x-restaurant-id': DEMO_RESTAURANT_ID,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'ready' })
        });

        if (!updateResponse.ok) {
          const errorBody = await updateResponse.text();
          console.error('❌ Update failed:', updateResponse.status, updateResponse.statusText);
          console.error('   Response:', errorBody);
        } else {
          const updatedOrder = await updateResponse.json();
          console.log('✅ Order status updated successfully');
          console.log('   New Status:', updatedOrder.status);
        }
      } catch (error: any) {
        console.error('❌ Update request failed:', error.message);
      }
    } else {
      console.log('⚠️  No orders found to test with');
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch orders:', error.message);
  }

  // 5. Sign out
  await supabase.auth.signOut();
  console.log('\n✅ Signed out');
}

testKitchenAuth().catch(console.error);
