#!/usr/bin/env node

/**
 * Test Order Submission to Identify Validation Requirements
 *
 * This script tests various order payloads to understand
 * exactly what validation is failing.
 */

const API_BASE = 'https://july25.onrender.com';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
const RESTAURANT_SLUG = 'grow';

// Test credentials
const LOGIN_CREDS = {
  email: 'server@restaurant.com',
  password: 'Demo123!',
  restaurantId: RESTAURANT_ID
};

// Test various order payloads
const TEST_PAYLOADS = [
  {
    name: 'Minimal Order (Both IDs)',
    payload: {
      items: [{
        id: 'item-1',  // Item UUID
        menu_item_id: 'menu-1',  // Menu item reference (REQUIRED!)
        name: 'Test Item',
        price: 10.00,
        quantity: 1
      }]
    }
  },
  {
    name: 'With Totals',
    payload: {
      items: [{
        id: 'item-1',
        menu_item_id: 'menu-1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1
      }],
      subtotal: 10.00,
      tax: 0.80,
      total: 10.80
    }
  },
  {
    name: 'With Order Type',
    payload: {
      items: [{
        id: 'item-1',
        menu_item_id: 'menu-1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1
      }],
      subtotal: 10.00,
      tax: 0.80,
      total: 10.80,
      type: 'dine_in'  // Order type, not payment_method
    }
  },
  {
    name: 'Complete Order',
    payload: {
      items: [{
        id: 'item-1',
        menu_item_id: 'menu-1',
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
        modifiers: []
      }],
      subtotal: 10.00,
      tax: 0.80,
      total: 10.80,
      type: 'dine_in',
      customer_name: 'Test Customer',
      table_number: '1'
    }
  },
  {
    name: 'Only Menu Item ID (Missing ID)',
    payload: {
      items: [{
        menu_item_id: 'menu-1',  // Missing 'id' field
        name: 'Test Item',
        price: 10.00,
        quantity: 1,
        modifiers: []
      }],
      subtotal: 10.00,
      tax: 0.80,
      total: 10.80,
      type: 'dine_in'
    }
  },
  {
    name: 'Empty Items Array',
    payload: {
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      payment_method: 'cash'
    }
  }
];

async function getAuthToken() {
  console.log('🔐 Getting auth token...\n');

  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(LOGIN_CREDS)
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  const token = data.token || data.access_token || data.session?.access_token;

  if (!token) {
    throw new Error('No token received from login');
  }

  console.log('✅ Auth successful\n');
  console.log('═'.repeat(60) + '\n');

  return token;
}

async function testOrderPayload(token, testCase) {
  console.log(`📦 Testing: ${testCase.name}`);
  console.log('Payload:', JSON.stringify(testCase.payload, null, 2));

  try {
    const response = await fetch(`${API_BASE}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-restaurant-id': RESTAURANT_SLUG
      },
      body: JSON.stringify(testCase.payload)
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (response.ok) {
      console.log(`✅ SUCCESS (${response.status})`);
      console.log('Response:', JSON.stringify(responseData, null, 2));
      return { success: true, status: response.status, data: responseData };
    } else {
      console.log(`❌ FAILED (${response.status})`);
      console.log('Error:', JSON.stringify(responseData, null, 2));
      return { success: false, status: response.status, error: responseData };
    }
  } catch (error) {
    console.log(`❌ NETWORK ERROR`);
    console.log('Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    console.log('\n' + '─'.repeat(60) + '\n');
  }
}

async function runTests() {
  console.log('🚀 Starting Order Submission Tests\n');
  console.log('API:', API_BASE);
  console.log('Restaurant ID:', RESTAURANT_ID);
  console.log('Restaurant Slug:', RESTAURANT_SLUG);
  console.log('\n' + '═'.repeat(60) + '\n');

  try {
    // Get auth token
    const token = await getAuthToken();

    // Test each payload
    const results = [];
    for (const testCase of TEST_PAYLOADS) {
      const result = await testOrderPayload(token, testCase);
      results.push({
        name: testCase.name,
        ...result
      });
    }

    // Summary
    console.log('═'.repeat(60));
    console.log('\n📊 TEST SUMMARY\n');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    successful.forEach(r => {
      console.log(`   - ${r.name}`);
    });

    console.log(`\n❌ Failed: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.name} (${r.status || 'Network Error'})`);
      if (r.error?.details?.fieldErrors) {
        Object.entries(r.error.details.fieldErrors).forEach(([field, errors]) => {
          console.log(`     → ${field}: ${errors}`);
        });
      } else if (r.error?.message) {
        console.log(`     → ${r.error.message}`);
      }
    });

    // Analysis
    console.log('\n' + '═'.repeat(60));
    console.log('\n🔍 VALIDATION REQUIREMENTS DISCOVERED:\n');

    // Analyze error patterns
    const fieldErrors = new Map();
    failed.forEach(r => {
      if (r.error?.details?.fieldErrors) {
        Object.entries(r.error.details.fieldErrors).forEach(([field, errors]) => {
          if (!fieldErrors.has(field)) {
            fieldErrors.set(field, new Set());
          }
          if (Array.isArray(errors)) {
            errors.forEach(e => fieldErrors.get(field).add(e));
          } else {
            fieldErrors.get(field).add(errors);
          }
        });
      }
    });

    if (fieldErrors.size > 0) {
      console.log('Required fields missing or invalid:');
      fieldErrors.forEach((errors, field) => {
        console.log(`   ${field}:`);
        errors.forEach(error => {
          console.log(`      - ${error}`);
        });
      });
    }

    // Check if any succeeded
    if (successful.length > 0) {
      console.log('\n✅ WORKING PAYLOAD STRUCTURE:');
      console.log(JSON.stringify(successful[0].data, null, 2));
    } else {
      console.log('\n❌ NO WORKING PAYLOAD FOUND');
      console.log('All test payloads failed validation.');
      console.log('\nNext steps:');
      console.log('1. Check server logs for detailed validation errors');
      console.log('2. Review order schema in database');
      console.log('3. Check order validation middleware');
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run the tests
runTests().then(() => {
  console.log('\n✨ Order submission tests completed\n');
}).catch(err => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});