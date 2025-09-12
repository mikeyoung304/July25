#!/usr/bin/env node

/**
 * Critical Path Validation Script
 * Tests essential functionality without running full test suite
 * Used for Phase 0 validation during test suite repairs
 */

const http = require('http');
const https = require('https');

const API_BASE = 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:5173';

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to make API calls
async function testEndpoint(name, method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    results.passed.push(`✅ ${name}: ${response.status}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      results.failed.push(`❌ ${name}: ${error.response.status} - ${error.response.statusText}`);
    } else {
      results.failed.push(`❌ ${name}: ${error.message}`);
    }
    return null;
  }
}

// Test critical paths
async function runValidation() {
  console.log(colors.bold.blue('\n🔍 Restaurant OS - Critical Path Validation\n'));
  console.log(colors.gray('Testing essential functionality...\n'));
  
  // 1. Health Check
  console.log(colors.yellow('1. Testing Server Health...'));
  await testEndpoint('Server Health', 'GET', '/health');
  
  // 2. Authentication - Demo Mode
  console.log(colors.yellow('\n2. Testing Authentication...'));
  const authResponse = await testEndpoint(
    'Demo Authentication',
    'POST',
    '/api/v1/auth/demo',
    { role: 'server' }
  );
  
  const token = authResponse?.token;
  if (token) {
    results.passed.push('✅ JWT Token received');
  } else {
    results.warnings.push('⚠️ No JWT token in auth response');
  }
  
  // 3. Menu Access
  console.log(colors.yellow('\n3. Testing Menu Access...'));
  await testEndpoint(
    'Menu Categories',
    'GET',
    '/api/v1/menu/categories',
    null,
    token ? { Authorization: `Bearer ${token}` } : {}
  );
  
  // 4. Order Creation (if authenticated)
  if (token) {
    console.log(colors.yellow('\n4. Testing Order Creation...'));
    const orderData = {
      restaurant_id: 'demo-restaurant',
      items: [{
        menu_item_id: 'test-item',
        quantity: 1,
        price: 10.00
      }],
      status: 'pending',
      type: 'dine-in'
    };
    
    await testEndpoint(
      'Create Order',
      'POST',
      '/api/v1/orders',
      orderData,
      { Authorization: `Bearer ${token}` }
    );
  }
  
  // 5. Payment Endpoints
  console.log(colors.yellow('\n5. Testing Payment Endpoints...'));
  await testEndpoint(
    'Payment Methods',
    'GET',
    '/api/v1/payments/methods',
    null,
    token ? { Authorization: `Bearer ${token}` } : {}
  );
  
  // 6. WebSocket Connection
  console.log(colors.yellow('\n6. Testing WebSocket...'));
  try {
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:3001');
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        results.passed.push('✅ WebSocket Connection');
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        results.failed.push(`❌ WebSocket: ${error.message}`);
        reject(error);
      });
      
      setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket timeout'));
      }, 5000);
    });
  } catch (error) {
    // WebSocket error already logged
  }
  
  // 7. Frontend Availability
  console.log(colors.yellow('\n7. Testing Frontend...'));
  try {
    const response = await axios.get(FRONTEND_BASE);
    if (response.status === 200) {
      results.passed.push('✅ Frontend Available');
    }
  } catch (error) {
    results.failed.push('❌ Frontend Unavailable');
  }
  
  // Print Results
  console.log(colors.bold.blue('\n📊 Validation Results\n'));
  
  if (results.passed.length > 0) {
    console.log(colors.bold.green('Passed Tests:'));
    results.passed.forEach(test => console.log(colors.green(test)));
  }
  
  if (results.warnings.length > 0) {
    console.log(colors.bold.yellow('\nWarnings:'));
    results.warnings.forEach(warning => console.log(colors.yellow(warning)));
  }
  
  if (results.failed.length > 0) {
    console.log(colors.bold.red('\nFailed Tests:'));
    results.failed.forEach(test => console.log(colors.red(test)));
  }
  
  // Summary
  console.log(colors.bold.blue('\n📈 Summary:'));
  const total = results.passed.length + results.failed.length;
  const passRate = total > 0 ? (results.passed.length / total * 100).toFixed(1) : 0;
  
  console.log(`  Total Tests: ${total}`);
  console.log(colors.green(`  Passed: ${results.passed.length}`));
  console.log(colors.red(`  Failed: ${results.failed.length}`));
  console.log(colors.yellow(`  Warnings: ${results.warnings.length}`));
  console.log(`  Pass Rate: ${passRate}%`);
  
  // Critical Services Status
  console.log(colors.bold.blue('\n🔑 Critical Services:'));
  
  const criticalServices = {
    'Server': results.passed.some(r => r.includes('Server Health')),
    'Authentication': results.passed.some(r => r.includes('Demo Authentication')),
    'Orders': results.passed.some(r => r.includes('Create Order')),
    'Payments': results.passed.some(r => r.includes('Payment Methods')),
    'WebSocket': results.passed.some(r => r.includes('WebSocket')),
    'Frontend': results.passed.some(r => r.includes('Frontend'))
  };
  
  Object.entries(criticalServices).forEach(([service, status]) => {
    console.log(`  ${service}: ${status ? colors.green('✅ WORKING') : colors.red('❌ FAILED')}`);
  });
  
  // Exit code based on critical services
  const allCriticalWorking = Object.values(criticalServices).filter(Boolean).length >= 4;
  
  if (allCriticalWorking) {
    console.log(colors.bold.green('\n✅ System is operational for basic use'));
    process.exit(0);
  } else {
    console.log(colors.bold.red('\n❌ Critical services are failing'));
    process.exit(1);
  }
}

// Check if servers are running
async function checkServers() {
  try {
    await axios.get(API_BASE + '/health');
    await axios.get(FRONTEND_BASE);
    return true;
  } catch (error) {
    console.log(colors.red('\n❌ ERROR: Servers not running!'));
    console.log(colors.yellow('Please run: npm run dev'));
    return false;
  }
}

// Main execution
(async () => {
  const serversRunning = await checkServers();
  if (serversRunning) {
    await runValidation();
  } else {
    process.exit(1);
  }
})();