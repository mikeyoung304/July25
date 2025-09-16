#!/usr/bin/env node

/**
 * Simple verification that payment gate is working
 * Run with: node tests/payment-gate-verification.js
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

async function getCustomerToken() {
  const response = await fetch(`${BASE_URL}/api/v1/auth/kiosk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId: RESTAURANT_ID })
  });

  if (!response.ok) {
    throw new Error(`Kiosk auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

async function testCustomerOrderWithoutPayment() {
  console.log('\n🔍 Test 1: Customer order WITHOUT payment token...');

  const token = await getCustomerToken();
  console.log('✅ Got customer token');

  const orderData = {
    items: [{
      menuItemId: 'test-item',
      name: 'Test Item',
      quantity: 1,
      price: 10.00
    }],
    customerName: 'Test Customer',
    type: 'voice',
    subtotal: 10.00,
    tax: 0.70,
    tip: 0,
    total: 10.70
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

  console.log(`Response status: ${response.status}`);
  const body = await response.json();

  if (response.status === 402) {
    console.log('✅ PASS: Got 402 Payment Required');
    console.log(`Message: ${body.message}`);
    return true;
  } else {
    console.log('❌ FAIL: Expected 402, got', response.status);
    console.log('Response:', body);
    return false;
  }
}

async function testCustomerOrderWithPayment() {
  console.log('\n🔍 Test 2: Customer order WITH payment token...');

  const token = await getCustomerToken();
  console.log('✅ Got customer token');

  const orderData = {
    items: [{
      menuItemId: 'test-item',
      name: 'Test Item',
      quantity: 1,
      price: 10.00
    }],
    customerName: 'Test Customer',
    type: 'voice',
    payment_token: 'test-payment-123', // Include payment token
    subtotal: 10.00,
    tax: 0.70,
    tip: 0,
    total: 10.70
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

  console.log(`Response status: ${response.status}`);

  if (response.status !== 402) {
    console.log('✅ PASS: Order not rejected for payment (status', response.status, ')');
    return true;
  } else {
    console.log('❌ FAIL: Should not get 402 with payment token');
    const body = await response.json();
    console.log('Response:', body);
    return false;
  }
}

async function main() {
  console.log('=== Payment Gate Verification ===');
  console.log('Server:', BASE_URL);
  console.log('Restaurant:', RESTAURANT_ID);

  // Check if server is running
  try {
    const health = await fetch(`${BASE_URL}/health`);
    if (!health.ok) {
      console.error('❌ Server not responding at', BASE_URL);
      console.error('Please start the server with: npm run dev:server');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Cannot connect to server at', BASE_URL);
    console.error('Please start the server with: npm run dev:server');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Customer without payment
    if (await testCustomerOrderWithoutPayment()) {
      passed++;
    } else {
      failed++;
    }

    // Test 2: Customer with payment
    if (await testCustomerOrderWithPayment()) {
      passed++;
    } else {
      failed++;
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    failed++;
  }

  console.log('\n=== Results ===');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 Payment gate is working correctly!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Payment gate has issues!');
    process.exit(1);
  }
}

main().catch(console.error);