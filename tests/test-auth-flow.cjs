#!/usr/bin/env node

// Test script to verify authentication flow
const fetch = require('node-fetch');

async function testAuthFlow() {
  console.log('🔐 Testing Authentication Flow\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Test login with demo credentials
    console.log('\n1️⃣ Testing login with demo credentials...');
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'server@restaurant.com',
        password: 'Demo123!',
        restaurantId: '11111111-1111-1111-1111-111111111111'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('❌ Login failed:', loginResponse.status, error);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('   User:', loginData.user?.email);
    console.log('   Role:', loginData.user?.role);
    console.log('   Has token:', !!loginData.session?.access_token);

    const token = loginData.session?.access_token;
    if (!token) {
      console.error('❌ No access token received');
      return;
    }

    // Step 2: Decode the token to check its structure
    console.log('\n2️⃣ Analyzing token structure...');
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token, { complete: true });
    
    console.log('   Algorithm:', decoded?.header?.alg);
    console.log('   Issuer:', decoded?.payload?.iss);
    console.log('   Subject:', decoded?.payload?.sub?.substring(0, 36));
    console.log('   Role:', decoded?.payload?.role);

    // Step 3: Test authenticated endpoint
    console.log('\n3️⃣ Testing authenticated endpoint...');
    const meResponse = await fetch('http://localhost:3001/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Restaurant-Id': '11111111-1111-1111-1111-111111111111'
      }
    });

    if (!meResponse.ok) {
      const error = await meResponse.text();
      console.error('❌ Auth verification failed:', meResponse.status, error);
      return;
    }

    const meData = await meResponse.json();
    console.log('✅ Token verified successfully!');
    console.log('   User ID:', meData.user?.id);
    console.log('   Email:', meData.user?.email);

    // Step 4: Test WebSocket connection
    console.log('\n4️⃣ Testing WebSocket connection...');
    const WebSocket = require('ws');
    const wsUrl = `ws://localhost:3001/?token=${token}&restaurant_id=11111111-1111-1111-1111-111111111111`;
    
    const ws = new WebSocket(wsUrl);
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('✅ WebSocket connected successfully!');
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });
      
      ws.on('close', (code, reason) => {
        if (code === 1008) {
          console.error('❌ WebSocket closed: Unauthorized');
          reject(new Error('WebSocket authentication failed'));
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
    }).catch(err => {
      console.error('   WebSocket test failed:', err.message);
    });

    // Step 5: Test voice endpoint
    console.log('\n5️⃣ Testing voice/realtime endpoint...');
    const voiceResponse = await fetch('http://localhost:3001/api/v1/realtime/session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restaurant-Id': '11111111-1111-1111-1111-111111111111'
      },
      body: JSON.stringify({})
    });

    if (!voiceResponse.ok) {
      const error = await voiceResponse.text();
      console.error('❌ Voice endpoint failed:', voiceResponse.status, error);
    } else {
      const voiceData = await voiceResponse.json();
      console.log('✅ Voice endpoint accessible!');
      console.log('   Has client secret:', !!voiceData.client_secret);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Authentication flow test complete!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testAuthFlow().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});