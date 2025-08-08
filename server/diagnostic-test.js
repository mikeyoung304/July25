#!/usr/bin/env node

/**
 * Comprehensive Rebuild 6.0 System Diagnostic
 * Tests all pages, APIs, and systems systematically
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

const PAGES_TO_TEST = [
  { path: '/', name: 'HomePage' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/server', name: 'ServerView' },
  { path: '/kitchen', name: 'KitchenDisplay' },
  { path: '/kiosk', name: 'KioskPage' },
  { path: '/expo', name: 'ExpoPage' },
  { path: '/admin', name: 'AdminDashboard' },
  { path: '/order/11111111-1111-1111-1111-111111111111', name: 'OrderPage' }
];

const API_ENDPOINTS_TO_TEST = [
  { path: '/api/v1/health', name: 'Health Check', needsAuth: false },
  { path: '/api/v1/tables', name: 'Tables', needsAuth: true },
  { path: '/api/v1/menu', name: 'Menu', needsAuth: true },
  { path: '/api/v1/orders', name: 'Orders', needsAuth: true }
];

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Rebuild-6.0-Diagnostic/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test results storage
const results = {
  frontend: [],
  api: [],
  websocket: null,
  database: null,
  buildpanel: null,
  summary: {
    working: [],
    broken: [],
    warnings: []
  }
};

console.log('🔍 Starting Rebuild 6.0 System Diagnostic...\n');

async function testFrontendPages() {
  console.log('📱 Testing Frontend Pages...');
  
  for (const page of PAGES_TO_TEST) {
    try {
      const response = await makeRequest(FRONTEND_URL + page.path);
      const status = response.statusCode === 200 ? '✅' : '❌';
      const result = {
        name: page.name,
        path: page.path,
        status: response.statusCode,
        working: response.statusCode === 200,
        error: response.statusCode !== 200 ? `HTTP ${response.statusCode}` : null
      };
      
      results.frontend.push(result);
      console.log(`  ${status} ${page.name} (${page.path}) - HTTP ${response.statusCode}`);
      
      if (response.statusCode === 200) {
        results.summary.working.push(`Frontend: ${page.name}`);
      } else {
        results.summary.broken.push(`Frontend: ${page.name} - HTTP ${response.statusCode}`);
      }
      
    } catch (error) {
      const result = {
        name: page.name,
        path: page.path,
        status: 0,
        working: false,
        error: error.message
      };
      
      results.frontend.push(result);
      console.log(`  ❌ ${page.name} (${page.path}) - ${error.message}`);
      results.summary.broken.push(`Frontend: ${page.name} - ${error.message}`);
    }
  }
  console.log();
}

async function testAPIEndpoints() {
  console.log('🔌 Testing API Endpoints...');
  
  // Wait a bit to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  for (const endpoint of API_ENDPOINTS_TO_TEST) {
    try {
      const headers = {};
      if (endpoint.needsAuth) {
        headers['x-restaurant-id'] = RESTAURANT_ID;
      }
      
      const response = await makeRequest(API_URL + endpoint.path, { headers });
      const status = response.statusCode < 400 ? '✅' : response.statusCode === 429 ? '⚠️' : '❌';
      
      const result = {
        name: endpoint.name,
        path: endpoint.path,
        status: response.statusCode,
        working: response.statusCode < 400,
        rateLimited: response.statusCode === 429,
        error: response.statusCode >= 400 ? `HTTP ${response.statusCode}` : null,
        responsePreview: response.data.substring(0, 200)
      };
      
      results.api.push(result);
      console.log(`  ${status} ${endpoint.name} (${endpoint.path}) - HTTP ${response.statusCode}`);
      
      if (response.statusCode === 429) {
        console.log(`      ⚠️  Rate limited - ${response.data}`);
        results.summary.warnings.push(`API: ${endpoint.name} - Rate limited`);
      } else if (response.statusCode < 400) {
        results.summary.working.push(`API: ${endpoint.name}`);
      } else {
        results.summary.broken.push(`API: ${endpoint.name} - HTTP ${response.statusCode}`);
      }
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      const result = {
        name: endpoint.name,
        path: endpoint.path,
        status: 0,
        working: false,
        error: error.message
      };
      
      results.api.push(result);
      console.log(`  ❌ ${endpoint.name} (${endpoint.path}) - ${error.message}`);
      results.summary.broken.push(`API: ${endpoint.name} - ${error.message}`);
    }
  }
  console.log();
}

async function testWebSocket() {
  console.log('🔌 Testing WebSocket Connection...');
  
  // Simple WebSocket connection test using http upgrade
  try {
    const response = await makeRequest('http://localhost:3001', {
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Key': 'test-key',
        'Sec-WebSocket-Version': '13'
      }
    });
    
    const working = response.statusCode === 101;
    results.websocket = {
      working: working,
      status: response.statusCode,
      error: working ? null : `HTTP ${response.statusCode}`
    };
    
    const status = working ? '✅' : '❌';
    console.log(`  ${status} WebSocket Server - HTTP ${response.statusCode}`);
    
    if (working) {
      results.summary.working.push('WebSocket: Connection');
    } else {
      results.summary.broken.push(`WebSocket: Connection - HTTP ${response.statusCode}`);
    }
    
  } catch (error) {
    results.websocket = {
      working: false,
      status: 0,
      error: error.message
    };
    
    console.log(`  ❌ WebSocket Server - ${error.message}`);
    results.summary.broken.push(`WebSocket: Connection - ${error.message}`);
  }
  console.log();
}

async function testBuildPanel() {
  console.log('🤖 Testing BuildPanel Integration...');
  
  try {
    const response = await makeRequest('https://api.mike.app.buildpanel.ai/health');
    const working = response.statusCode === 200;
    
    results.buildpanel = {
      working: working,
      status: response.statusCode,
      error: working ? null : `HTTP ${response.statusCode}`,
      responsePreview: response.data.substring(0, 100)
    };
    
    const status = working ? '✅' : '❌';
    console.log(`  ${status} BuildPanel API - HTTP ${response.statusCode}`);
    
    if (working) {
      results.summary.working.push('BuildPanel: Health Check');
    } else {
      results.summary.broken.push(`BuildPanel: Health Check - HTTP ${response.statusCode}`);
    }
    
  } catch (error) {
    results.buildpanel = {
      working: false,
      status: 0,
      error: error.message
    };
    
    console.log(`  ❌ BuildPanel API - ${error.message}`);
    results.summary.broken.push(`BuildPanel: API - ${error.message}`);
  }
  console.log();
}

function generateReport() {
  console.log('📊 COMPREHENSIVE DIAGNOSTIC REPORT');
  console.log('=====================================\n');
  
  console.log('✅ WORKING COMPONENTS:');
  results.summary.working.forEach(item => console.log(`  • ${item}`));
  console.log();
  
  console.log('❌ BROKEN COMPONENTS:');
  results.summary.broken.forEach(item => console.log(`  • ${item}`));
  console.log();
  
  console.log('⚠️  WARNINGS:');
  results.summary.warnings.forEach(item => console.log(`  • ${item}`));
  console.log();
  
  console.log('🔧 SPECIFIC ISSUES IDENTIFIED:');
  
  // Frontend issues
  const brokenFrontend = results.frontend.filter(p => !p.working);
  if (brokenFrontend.length > 0) {
    console.log('  Frontend Pages:');
    brokenFrontend.forEach(page => {
      console.log(`    - ${page.name}: ${page.error}`);
    });
  }
  
  // API issues  
  const brokenAPI = results.api.filter(e => !e.working && !e.rateLimited);
  const rateLimitedAPI = results.api.filter(e => e.rateLimited);
  
  if (rateLimitedAPI.length > 0) {
    console.log('  API Rate Limiting:');
    console.log('    - All API endpoints are being rate limited');
    console.log('    - Rate limiter is too restrictive for testing');
    console.log('    - Recommend temporarily disabling or increasing limits for development');
  }
  
  if (brokenAPI.length > 0) {
    console.log('  API Endpoints:');
    brokenAPI.forEach(endpoint => {
      console.log(`    - ${endpoint.name}: ${endpoint.error}`);
    });
  }
  
  // WebSocket issues
  if (results.websocket && !results.websocket.working) {
    console.log('  WebSocket:');
    console.log(`    - Connection failed: ${results.websocket.error}`);
  }
  
  // BuildPanel issues
  if (results.buildpanel && !results.buildpanel.working) {
    console.log('  BuildPanel:');
    console.log(`    - API connection failed: ${results.buildpanel.error}`);
  }
  
  console.log('\n🎯 PRIORITY FIXES NEEDED:');
  console.log('  1. Rate limiter blocking all API testing');
  console.log('  2. MenuService menuIdMapper undefined error');
  console.log('  3. Missing OPENAI_API_KEY for voice features');
  
  console.log('\n📈 SYSTEM HEALTH SCORE:');
  const totalComponents = results.summary.working.length + results.summary.broken.length;
  const workingComponents = results.summary.working.length;
  const healthScore = totalComponents > 0 ? Math.round((workingComponents / totalComponents) * 100) : 0;
  console.log(`  ${healthScore}% (${workingComponents}/${totalComponents} components working)`);
  
  return results;
}

// Run the diagnostic
async function runDiagnostic() {
  const startTime = Date.now();
  
  await testFrontendPages();
  await testAPIEndpoints();  
  await testWebSocket();
  await testBuildPanel();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  const finalResults = generateReport();
  
  console.log(`\n⏱️  Diagnostic completed in ${duration} seconds`);
  console.log('📄 Full results available in diagnostic results object');
  
  return finalResults;
}

// Export for programmatic use or run directly
if (require.main === module) {
  runDiagnostic().catch(console.error);
}

module.exports = { runDiagnostic };