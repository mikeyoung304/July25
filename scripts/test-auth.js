#!/usr/bin/env node

/**
 * Test authentication flow for all demo PIN codes
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

const DEMO_PINS = [
  { role: 'Server', pin: '2468', endpoint: '/server' },
  { role: 'Kitchen', pin: '1357', endpoint: '/kitchen' },
  { role: 'Expo', pin: '3691', endpoint: '/expo' },
  { role: 'Cashier', pin: '4802', endpoint: '/checkout' }
];

async function testPinLogin(role, pin) {
  try {
    console.log(`\n🔐 Testing ${role} login with PIN: ${pin}`);
    
    const response = await axios.post(`${API_BASE}/api/v1/auth/pin-login`, {
      pin,
      restaurantId: RESTAURANT_ID
    });
    
    const { token, user, expiresIn } = response.data;
    
    console.log(`✅ ${role} login successful!`);
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Token: ${token.substring(0, 20)}...`);
    console.log(`   - Expires in: ${expiresIn / 3600} hours`);
    
    // Test authenticated request
    const meResponse = await axios.get(`${API_BASE}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Restaurant-ID': RESTAURANT_ID
      }
    });
    
    console.log(`   - /auth/me verified: ${meResponse.data.user.role}`);
    
    return { success: true, token, user };
  } catch (error) {
    console.error(`❌ ${role} login failed:`, error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Authentication System');
  console.log('================================');
  
  const results = [];
  
  for (const demo of DEMO_PINS) {
    const result = await testPinLogin(demo.role, demo.pin);
    results.push({ ...demo, ...result });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.map(f => f.role).join(', ')}`);
  }
  
  process.exit(failed.length > 0 ? 1 : 0);
}

// Check if server is running
axios.get(`${API_BASE}/health`)
  .then(() => {
    console.log('✅ Server is running on', API_BASE);
    runTests();
  })
  .catch(() => {
    console.error('❌ Server is not running on', API_BASE);
    console.error('Please start the server with: npm run dev');
    process.exit(1);
  });