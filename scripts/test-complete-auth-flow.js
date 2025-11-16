#!/usr/bin/env node

/**
 * Complete Authentication and Order Flow Test
 * Tests the entire flow from login to order submission
 */

const API_BASE = 'https://july25.onrender.com';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';  // UUID required for auth
const RESTAURANT_SLUG = 'grow';  // Slug for other endpoints

// Test credentials
const TEST_USER = {
  email: 'server@restaurant.com',
  password: 'Demo123!'
};

// Test order data
const TEST_ORDER = {
  items: [
    {
      id: '1',
      name: 'Test Item',
      price: 10.00,
      quantity: 1,
      modifiers: []
    }
  ],
  subtotal: 10.00,
  tax: 0.80,
  total: 10.80,
  payment_method: 'cash',
  customer_name: 'Test Customer',
  order_type: 'dine_in',
  table_number: '1'
};

async function testAuthFlow() {
  console.log('🚀 Starting Complete Authentication & Order Flow Test\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Test Backend Health
    console.log('\n📍 Step 1: Testing Backend Health');
    console.log('   Endpoint: GET /api/v1/health');
    console.log(`   URL: ${API_BASE}/api/v1/health`);

    let healthRes;
    try {
      healthRes = await fetch(`${API_BASE}/api/v1/health`);
    } catch (fetchError) {
      console.log('   ❌ Network error fetching health endpoint');
      console.log(`   Error: ${fetchError.message}`);
      return false;
    }

    if (!healthRes.ok) {
      console.log(`   ❌ Backend health check failed: HTTP ${healthRes.status}`);
      const errorText = await healthRes.text();
      console.log(`   Error: ${errorText}`);
      return false;
    }

    const healthData = await healthRes.json();

    if (healthData.status === 'healthy') {
      console.log('   ✅ Backend is healthy');
      console.log(`   Version: ${healthData.version}`);
      console.log(`   Database: ${healthData.services?.database?.status || 'unknown'}`);
    } else {
      console.log('   ❌ Backend health check failed');
      console.log('   Response:', JSON.stringify(healthData, null, 2));
      return false;
    }

    // Step 2: Login and Get JWT Token
    console.log('\n📍 Step 2: Testing Authentication');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log('   Endpoint: POST /api/v1/auth/login');

    const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...TEST_USER,
        restaurantId: RESTAURANT_ID  // Note: camelCase required
      })
    });

    if (!loginRes.ok) {
      const error = await loginRes.text();
      console.log(`   ❌ Login failed: ${loginRes.status}`);
      console.log(`   Error: ${error}`);
      return false;
    }

    const loginData = await loginRes.json();
    const token = loginData.token || loginData.access_token || loginData.session?.access_token;

    if (!token) {
      console.log('   ❌ No token received from login');
      console.log('   Response:', JSON.stringify(loginData, null, 2));
      return false;
    }

    console.log('   ✅ Login successful, token received');

    // Step 3: Decode and Verify JWT Token
    console.log('\n📍 Step 3: Verifying JWT Token Structure');

    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('   ❌ Invalid JWT structure');
      return false;
    }

    // Decode payload
    let payload = parts[1];
    while (payload.length % 4 !== 0) {
      payload += '=';
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());

    console.log('   JWT Payload:');
    console.log(`   - User ID: ${decoded.sub}`);
    console.log(`   - Email: ${decoded.email}`);
    console.log(`   - Role: ${decoded.role}`);
    console.log(`   - Restaurant: ${decoded.restaurant_id}`);
    console.log(`   - Scope: ${JSON.stringify(decoded.scope)}`);

    // Check for scope field
    if (!decoded.scope) {
      console.log('\n   ❌❌❌ CRITICAL: JWT missing scope field!');
      console.log('   The JWT scope fix is NOT working');
      return false;
    }

    if (!Array.isArray(decoded.scope) || decoded.scope.length === 0) {
      console.log('\n   ❌ JWT scope field is empty or invalid');
      return false;
    }

    console.log('\n   ✅ JWT has valid scope field with permissions:');
    decoded.scope.forEach(s => console.log(`      - ${s}`));

    // Check for critical scopes
    const hasOrderCreate = decoded.scope.includes('orders:create');
    const hasOrderRead = decoded.scope.includes('orders:read');

    if (!hasOrderCreate) {
      console.log('   ⚠️  Missing orders:create scope');
    }

    // Step 4: Test Menu API with Authentication
    console.log('\n📍 Step 4: Testing Authenticated API Access');
    console.log('   Endpoint: GET /api/v1/menu');

    const menuRes = await fetch(`${API_BASE}/api/v1/menu`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-restaurant-id': RESTAURANT_SLUG  // Menu endpoint accepts slug
      }
    });

    if (!menuRes.ok) {
      console.log(`   ❌ Menu API failed: ${menuRes.status}`);
      const error = await menuRes.text();
      console.log(`   Error: ${error}`);
    } else {
      const menuData = await menuRes.json();
      console.log(`   ✅ Menu API successful, ${menuData.length || 0} items returned`);
    }

    // Step 5: Test Order Submission
    console.log('\n📍 Step 5: Testing Order Submission');
    console.log('   Endpoint: POST /api/v1/orders');

    const orderRes = await fetch(`${API_BASE}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-restaurant-id': RESTAURANT_SLUG  // Orders endpoint accepts slug
      },
      body: JSON.stringify(TEST_ORDER)
    });

    if (!orderRes.ok) {
      const error = await orderRes.text();
      console.log(`   ❌ Order submission failed: ${orderRes.status}`);
      console.log(`   Error: ${error}`);

      // Analyze the error
      if (orderRes.status === 401) {
        if (error.includes('scope')) {
          console.log('\n   🔍 DIAGNOSIS: JWT scope not working properly');
        } else {
          console.log('\n   🔍 DIAGNOSIS: Authentication issue');
        }
      } else if (orderRes.status === 400) {
        console.log('\n   🔍 DIAGNOSIS: Order validation issue (auth is working!)');
      }
    } else {
      const orderData = await orderRes.json();
      console.log('   ✅ Order submitted successfully!');
      console.log(`   Order ID: ${orderData.id || orderData.order_id}`);
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 TEST SUMMARY:\n');

    const results = {
      'Backend Health': healthRes.ok ? '✅ PASS' : '❌ FAIL',
      'Authentication': token ? '✅ PASS' : '❌ FAIL',
      'JWT Scope Field': decoded.scope ? '✅ PASS' : '❌ FAIL',
      'Scope Permissions': hasOrderCreate ? '✅ PASS' : '⚠️  PARTIAL',
      'Menu API Access': menuRes.ok ? '✅ PASS' : '❌ FAIL',
      'Order Submission': orderRes.ok ? '✅ PASS' : orderRes.status === 400 ? '⚠️  VALIDATION' : '❌ FAIL'
    };

    Object.entries(results).forEach(([test, result]) => {
      console.log(`   ${test}: ${result}`);
    });

    // Overall verdict
    const criticalPassed = healthRes.ok && token && decoded.scope;

    console.log('\n' + '═'.repeat(60));
    if (criticalPassed) {
      console.log('\n✅✅✅ AUTHENTICATION SYSTEM WORKING!');
      console.log('The JWT scope fix is deployed and functional.');
      if (!orderRes.ok && orderRes.status === 400) {
        console.log('\n⚠️  Note: Order failed due to validation, not auth.');
        console.log('This means authentication is working correctly!');
      }
    } else {
      console.log('\n❌❌❌ AUTHENTICATION SYSTEM HAS ISSUES');
      if (!decoded.scope) {
        console.log('Critical: JWT scope field is missing');
      }
    }

    return criticalPassed;

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testAuthFlow().then(success => {
  console.log('\n✨ Test completed\n');
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});