#!/usr/bin/env node

/**
 * Voice Payment Integration Test
 * Verifies that voice customer orders require payment tokens
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

// Test utilities
async function getCustomerToken() {
  const response = await fetch(`${BASE_URL}/api/v1/auth/kiosk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId: RESTAURANT_ID })
  });
  const data = await response.json();
  return data.token;
}

async function getEmployeeToken() {
  // Mock employee token for test - in production would use PIN auth
  return 'mock-employee-token';
}

// Test 1: Voice customer order without payment token -> 402
async function testVoiceCustomerNoPayment() {
  console.log('\n🔍 Test 1: Voice customer order WITHOUT payment token...');

  const token = await getCustomerToken();

  const orderData = {
    items: [{
      id: 'test-item',
      menuItemId: 'test-menu-item',
      name: 'Soul Bowl',
      quantity: 1,
      price: 14.00
    }],
    customerName: 'Voice Customer',
    tableNumber: 'K1',
    type: 'voice',
    subtotal: 14.00,
    tax: 0.98,
    tip: 0,
    total: 14.98
  };

  const response = await fetch(`${BASE_URL}/api/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Restaurant-Id': RESTAURANT_ID
    },
    body: JSON.stringify(orderData)
  });

  const body = await response.json();

  if (response.status === 402) {
    console.log('✅ PASS: Got 402 Payment Required as expected');
    console.log(`   Message: ${body.message}`);
    return true;
  } else {
    console.log('❌ FAIL: Voice customer order should require payment');
    console.log(`   Got status: ${response.status}`);
    console.log(`   Response:`, body);
    return false;
  }
}

// Test 2: Voice customer order with payment token -> Success
async function testVoiceCustomerWithPayment() {
  console.log('\n🔍 Test 2: Voice customer order WITH payment token...');

  const token = await getCustomerToken();

  const orderData = {
    items: [{
      id: 'test-item',
      menuItemId: 'test-menu-item',
      name: 'Soul Bowl',
      quantity: 1,
      price: 14.00
    }],
    customerName: 'Voice Customer',
    tableNumber: 'K1',
    type: 'voice',
    paymentToken: 'test-payment-token-123', // Include payment token
    subtotal: 14.00,
    tax: 0.98,
    tip: 0,
    total: 14.98
  };

  const response = await fetch(`${BASE_URL}/api/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Restaurant-Id': RESTAURANT_ID
    },
    body: JSON.stringify(orderData)
  });

  if (response.status !== 402) {
    console.log('✅ PASS: Order with payment token not rejected');
    console.log(`   Status: ${response.status}`);
    return true;
  } else {
    console.log('❌ FAIL: Should not reject order with payment token');
    const body = await response.json();
    console.log(`   Response:`, body);
    return false;
  }
}

// Main test runner
async function main() {
  console.log('=== Voice Payment Integration Test ===');
  console.log('Server:', BASE_URL);
  console.log('Testing: Customer voice orders require payment');

  // Check server health
  try {
    const health = await fetch(`${BASE_URL}/health`);
    if (!health.ok) {
      console.error('❌ Server not healthy');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Cannot connect to server');
    console.error('Please start server with: cd server && npm run dev');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  try {
    // Run tests
    if (await testVoiceCustomerNoPayment()) passed++; else failed++;
    if (await testVoiceCustomerWithPayment()) passed++; else failed++;

  } catch (error) {
    console.error('❌ Test error:', error);
    failed++;
  }

  // Results
  console.log('\n=== Test Results ===');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 Voice payment gate working correctly!');
    console.log('Customer voice orders are protected by payment requirement.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Voice payment gate has issues!');
    process.exit(1);
  }
}

main().catch(console.error);