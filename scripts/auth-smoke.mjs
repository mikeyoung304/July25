#!/usr/bin/env node

import fetch from 'node-fetch';
import WebSocket from 'ws';
import { createHash } from 'crypto';

const API_BASE = 'http://localhost:3001';
const WS_BASE = 'ws://localhost:3001';
const RESTAURANT_ID = 'test-restaurant-id';

// Test credentials - these should be set up in your test environment
const TEST_USERS = {
  manager: { email: 'manager@test.com', password: 'testpass123' },
  server: { email: 'server@test.com', password: 'testpass123' },
  cashier: { email: 'cashier@test.com', password: 'testpass123' },
  kitchen: { email: 'kitchen@test.com', password: 'testpass123' },
  expo: { email: 'expo@test.com', password: 'testpass123' },
  customer: { email: 'customer@test.com', password: 'testpass123' }
};

// Expected permissions for each role
const ROLE_PERMISSIONS = {
  manager: { canCreateOrder: true, canAccessWS: true },
  server: { canCreateOrder: true, canAccessWS: true },
  cashier: { canCreateOrder: false, canAccessWS: true },
  kitchen: { canCreateOrder: false, canAccessWS: true },
  expo: { canCreateOrder: false, canAccessWS: true },
  customer: { canCreateOrder: true, canAccessWS: true }
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(level, message, details = {}) {
  const timestamp = new Date().toISOString();
  const color = level === 'error' ? colors.red :
                level === 'success' ? colors.green :
                level === 'warn' ? colors.yellow :
                colors.blue;
  
  console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
  if (Object.keys(details).length > 0) {
    console.log('  Details:', JSON.stringify(details, null, 2));
  }
}

// Login and get token
async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Restaurant-ID': RESTAURANT_ID
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `Login failed with status ${response.status}`);
    }

    return data.token || data.access_token;
  } catch (error) {
    log('error', `Login failed for ${email}`, { error: error.message });
    return null;
  }
}

// Test order creation
async function testOrderCreation(role, token) {
  const idempotencyKey = createHash('md5')
    .update(`${role}-${Date.now()}`)
    .digest('hex');

  const orderPayload = {
    items: [{
      id: 'test-item-1',
      name: 'Test Burger',
      quantity: 1,
      price: 12.99,
      modifiers: []
    }],
    customerName: `Test ${role}`,
    type: 'dine-in',
    tableNumber: 'A1',
    subtotal: 12.99,
    tax: 1.04,
    tip: 0,
    total: 14.03
  };

  try {
    const response = await fetch(`${API_BASE}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Restaurant-ID': RESTAURANT_ID,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();
    const expected = ROLE_PERMISSIONS[role].canCreateOrder;
    const success = expected ? response.ok : !response.ok;

    if (success) {
      log('success', `Order creation test passed for ${role}`, {
        expected: expected ? 'allowed' : 'denied',
        actual: response.ok ? 'allowed' : 'denied',
        status: response.status
      });
    } else {
      log('error', `Order creation test failed for ${role}`, {
        expected: expected ? 'allowed' : 'denied',
        actual: response.ok ? 'allowed' : 'denied',
        status: response.status,
        error: data.message
      });
    }

    return { success, orderId: data.id };
  } catch (error) {
    log('error', `Order creation test error for ${role}`, { error: error.message });
    return { success: false };
  }
}

// Test idempotency
async function testIdempotency(token) {
  const idempotencyKey = createHash('md5')
    .update(`idempotency-test-${Date.now()}`)
    .digest('hex');

  const orderPayload = {
    items: [{
      id: 'test-item-2',
      name: 'Test Pizza',
      quantity: 2,
      price: 15.99,
      modifiers: []
    }],
    customerName: 'Idempotency Test',
    type: 'pickup',
    subtotal: 31.98,
    tax: 2.56,
    tip: 0,
    total: 34.54
  };

  try {
    // First request
    const response1 = await fetch(`${API_BASE}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Restaurant-ID': RESTAURANT_ID,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(orderPayload)
    });

    const data1 = await response1.json();

    // Second request with same idempotency key
    const response2 = await fetch(`${API_BASE}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Restaurant-ID': RESTAURANT_ID,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(orderPayload)
    });

    const data2 = await response2.json();

    // Both should succeed and return the same order ID
    const success = response1.ok && response2.ok && data1.id === data2.id;

    if (success) {
      log('success', 'Idempotency test passed', {
        orderId1: data1.id,
        orderId2: data2.id,
        same: data1.id === data2.id
      });
    } else {
      log('error', 'Idempotency test failed', {
        response1Ok: response1.ok,
        response2Ok: response2.ok,
        orderId1: data1.id,
        orderId2: data2.id,
        same: data1.id === data2.id
      });
    }

    return success;
  } catch (error) {
    log('error', 'Idempotency test error', { error: error.message });
    return false;
  }
}

// Test WebSocket connection
async function testWebSocketConnection(role, token) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_BASE}/ws?token=${token}&restaurant_id=${RESTAURANT_ID}`);
    let timeout;

    const cleanup = () => {
      clearTimeout(timeout);
      ws.close();
    };

    timeout = setTimeout(() => {
      log('error', `WebSocket connection timeout for ${role}`);
      cleanup();
      resolve(false);
    }, 5000);

    ws.on('open', () => {
      log('success', `WebSocket connection established for ${role}`);
      cleanup();
      resolve(true);
    });

    ws.on('error', (error) => {
      log('error', `WebSocket connection failed for ${role}`, { error: error.message });
      cleanup();
      resolve(false);
    });

    ws.on('unexpected-response', (req, res) => {
      log('error', `WebSocket unexpected response for ${role}`, { status: res.statusCode });
      cleanup();
      resolve(false);
    });
  });
}

// Test missing restaurant context
async function testMissingRestaurantContext(token) {
  try {
    const response = await fetch(`${API_BASE}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
        // Intentionally missing X-Restaurant-ID
      },
      body: JSON.stringify({
        items: [{ id: 'test', name: 'Test', quantity: 1, price: 10 }],
        subtotal: 10,
        tax: 0.8,
        total: 10.8
      })
    });

    const data = await response.json();
    const success = !response.ok && response.status === 400;

    if (success) {
      log('success', 'Missing restaurant context test passed', {
        status: response.status,
        message: data.message
      });
    } else {
      log('error', 'Missing restaurant context test failed', {
        expectedStatus: 400,
        actualStatus: response.status
      });
    }

    return success;
  } catch (error) {
    log('error', 'Missing restaurant context test error', { error: error.message });
    return false;
  }
}

// Test snake_case rejection
async function testSnakeCaseRejection(token) {
  try {
    const response = await fetch(`${API_BASE}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Restaurant-ID': RESTAURANT_ID
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 'test', name: 'Test', quantity: 1, price: 10 }], // snake_case
        customer_name: 'Test Customer', // snake_case
        table_number: 'A1', // snake_case
        subtotal: 10,
        tax: 0.8,
        total: 10.8
      })
    });

    const data = await response.json();
    const success = !response.ok;

    if (success) {
      log('success', 'Snake_case rejection test passed', {
        status: response.status,
        message: data.message
      });
    } else {
      log('warn', 'Snake_case rejection test failed - API accepted snake_case', {
        status: response.status
      });
    }

    return success;
  } catch (error) {
    log('error', 'Snake_case rejection test error', { error: error.message });
    return false;
  }
}

// Main test runner
async function runTests() {
  log('info', 'Starting auth and orders smoke tests');
  log('info', `API: ${API_BASE}, Restaurant: ${RESTAURANT_ID}`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test each role
  for (const [role, credentials] of Object.entries(TEST_USERS)) {
    log('info', `\nTesting role: ${role}`);
    
    const token = await login(credentials.email, credentials.password);
    if (!token) {
      log('warn', `Skipping tests for ${role} - login failed`);
      results.tests.push({ role, test: 'login', passed: false });
      results.failed++;
      results.total++;
      continue;
    }

    results.tests.push({ role, test: 'login', passed: true });
    results.passed++;
    results.total++;

    // Test order creation
    const orderTest = await testOrderCreation(role, token);
    results.tests.push({ role, test: 'order_creation', passed: orderTest.success });
    results.total++;
    if (orderTest.success) results.passed++; else results.failed++;

    // Test WebSocket
    const wsTest = await testWebSocketConnection(role, token);
    results.tests.push({ role, test: 'websocket', passed: wsTest });
    results.total++;
    if (wsTest) results.passed++; else results.failed++;

    // Additional tests for manager role only
    if (role === 'manager') {
      log('info', '\nRunning additional manager tests');

      const idempotencyTest = await testIdempotency(token);
      results.tests.push({ role, test: 'idempotency', passed: idempotencyTest });
      results.total++;
      if (idempotencyTest) results.passed++; else results.failed++;

      const contextTest = await testMissingRestaurantContext(token);
      results.tests.push({ role, test: 'missing_context', passed: contextTest });
      results.total++;
      if (contextTest) results.passed++; else results.failed++;

      const snakeTest = await testSnakeCaseRejection(token);
      results.tests.push({ role, test: 'snake_case_rejection', passed: snakeTest });
      results.total++;
      if (snakeTest) results.passed++; else results.failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  log('info', 'Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log('error', 'Test runner failed', { error: error.message });
  process.exit(1);
});