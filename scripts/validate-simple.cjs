#!/usr/bin/env node

/**
 * Simple validation script for critical paths
 * No external dependencies required
 */

const http = require('http');

// Simple HTTP request helper
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n🔍 Restaurant OS - Quick Validation\n');
  
  const tests = [];
  
  // 1. Backend Health
  try {
    const res = await httpRequest('http://localhost:3001/health');
    tests.push(`✅ Backend Health: ${res.status}`);
  } catch (e) {
    tests.push(`❌ Backend Health: ${e.message}`);
  }
  
  // 2. Frontend
  try {
    const res = await httpRequest('http://localhost:5173');
    tests.push(`✅ Frontend: ${res.status}`);
  } catch (e) {
    tests.push(`❌ Frontend: ${e.message}`);
  }
  
  // 3. Auth endpoint
  try {
    const res = await httpRequest('http://localhost:3001/api/v1/auth/demo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: { role: 'server' }
    });
    tests.push(`✅ Auth Demo: ${res.status}`);
  } catch (e) {
    tests.push(`❌ Auth Demo: ${e.message}`);
  }
  
  // Print results
  console.log('Test Results:');
  tests.forEach(t => console.log(t));
  
  const passed = tests.filter(t => t.startsWith('✅')).length;
  const failed = tests.filter(t => t.startsWith('❌')).length;
  
  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);
  
  if (passed >= 2) {
    console.log('✅ Basic services are running');
    process.exit(0);
  } else {
    console.log('❌ Critical services not available');
    console.log('Run: npm run dev');
    process.exit(1);
  }
}

runTests().catch(console.error);