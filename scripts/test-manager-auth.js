#!/usr/bin/env node

/**
 * Test script to verify manager authentication and order submission
 * Tests the complete authentication flow with the new AuthenticationService
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3001';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

// Test credentials
const MANAGER_EMAIL = 'manager@test.com';
const MANAGER_PASSWORD = 'TestManager123!';

async function testManagerAuth() {
  console.log('🔐 Testing Manager Authentication Flow\n');
  console.log('============================================\n');

  try {
    // Step 1: Login as manager
    console.log('1️⃣  Logging in as manager...');
    const loginResponse = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-restaurant-id': RESTAURANT_ID
      },
      body: JSON.stringify({
        email: MANAGER_EMAIL,
        password: MANAGER_PASSWORD,
        restaurantId: RESTAURANT_ID
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      throw new Error(`Login failed: ${JSON.stringify(error)}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token || loginData.access_token || loginData.session?.access_token;
    
    if (!token) {
      throw new Error(`No token in response: ${JSON.stringify(loginData)}`);
    }
    
    console.log('✅ Login successful');
    console.log(`   - User ID: ${loginData.user?.id || loginData.user_id}`);
    console.log(`   - Role in JWT: ${loginData.user?.role || loginData.role || 'authenticated'}`);
    console.log(`   - Token type: ${token.split('.').length === 3 ? 'JWT' : 'Unknown'}`);
    console.log('');

    // Step 2: Verify authentication with /me endpoint
    console.log('2️⃣  Verifying authentication with /me endpoint...');
    const meResponse = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-restaurant-id': RESTAURANT_ID
      }
    });

    if (!meResponse.ok) {
      const error = await meResponse.json();
      throw new Error(`/me endpoint failed: ${JSON.stringify(error)}`);
    }

    const meData = await meResponse.json();
    console.log('✅ Authentication verified');
    console.log(`   - User role from DB: ${meData.role}`);
    console.log(`   - Scopes: ${meData.scopes?.join(', ') || 'none'}`);
    console.log('');

    // Step 3: Test order submission
    console.log('3️⃣  Testing order submission...');
    const orderData = {
      type: 'dine-in',
      tableNumber: 'A1',
      customerName: 'Test Manager Order',
      items: [{
        menuItemId: '1', // Use a valid menu item ID from your database
        name: 'Test Item',
        quantity: 1,
        price: 10.99,
        modifiers: []
      }],
      subtotal: 10.99,
      tax: 0.88,
      tip: 0,
      total: 11.87,
      notes: 'Test order from manager auth script'
    };

    const orderResponse = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-restaurant-id': RESTAURANT_ID
      },
      body: JSON.stringify(orderData)
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.json();
      throw new Error(`Order submission failed: ${JSON.stringify(error)}`);
    }

    const order = await orderResponse.json();
    console.log('✅ Order submitted successfully!');
    console.log(`   - Order ID: ${order.id}`);
    console.log(`   - Order Number: ${order.order_number}`);
    console.log(`   - Status: ${order.status}`);
    console.log('');

    // Step 4: Test WebSocket authentication
    console.log('4️⃣  Testing WebSocket authentication...');
    const wsUrl = `ws://localhost:3001?token=${token}&restaurant_id=${RESTAURANT_ID}`;
    
    const ws = new WebSocket(wsUrl);
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });
      
      ws.on('error', (error) => {
        console.log('❌ WebSocket error:', error.message);
        reject(error);
      });
      
      ws.on('close', (code, reason) => {
        if (code === 1008) {
          console.log('❌ WebSocket closed: Unauthorized');
        }
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          console.log('   - Received welcome message');
        }
      });
    });
    
    // Clean up WebSocket
    ws.close();
    console.log('');

    console.log('============================================');
    console.log('🎉 All authentication tests passed!');
    console.log('Manager can successfully:');
    console.log('  ✓ Login with email/password');
    console.log('  ✓ Get proper role from database');
    console.log('  ✓ Submit orders');
    console.log('  ✓ Connect via WebSocket');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testManagerAuth().catch(console.error);