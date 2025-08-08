#!/usr/bin/env node

/**
 * Browser Console Error Test
 * Tests each page for JavaScript console errors
 */

const http = require('http');

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

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          html: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function checkPageForErrors() {
  console.log('🌐 Testing Frontend Pages for Console Errors...\n');
  
  const results = [];
  
  for (const page of PAGES_TO_TEST) {
    try {
      console.log(`📄 Testing ${page.name} (${page.path})...`);
      
      const response = await makeRequest(`http://localhost:5173${page.path}`);
      
      if (response.statusCode !== 200) {
        console.log(`❌ HTTP ${response.statusCode}`);
        results.push({
          page: page.name,
          status: 'error',
          error: `HTTP ${response.statusCode}`
        });
        continue;
      }
      
      // Check for common error patterns in HTML
      const html = response.html;
      const errors = [];
      
      // Check for React error boundaries
      if (html.includes('Something went wrong') || html.includes('Error Boundary')) {
        errors.push('React Error Boundary triggered');
      }
      
      // Check for missing scripts or CSS
      if (html.includes('404') || html.includes('Cannot GET')) {
        errors.push('Missing static assets');
      }
      
      // Check for uncaught exceptions in inline scripts
      if (html.includes('Uncaught') || html.includes('TypeError') || html.includes('ReferenceError')) {
        errors.push('JavaScript runtime errors detected');
      }
      
      // Check if the page has basic React structure
      if (!html.includes('id="root"') && !html.includes('class="App"')) {
        errors.push('Missing React app structure');
      }
      
      if (errors.length === 0) {
        console.log(`✅ No obvious errors detected`);
        results.push({
          page: page.name,
          status: 'ok',
          error: null
        });
      } else {
        console.log(`⚠️  Potential issues: ${errors.join(', ')}`);
        results.push({
          page: page.name,
          status: 'warning',
          error: errors.join(', ')
        });
      }
      
    } catch (error) {
      console.log(`❌ Failed to test: ${error.message}`);
      results.push({
        page: page.name,
        status: 'error',
        error: error.message
      });
    }
    
    console.log(); // Add spacing
  }
  
  return results;
}

// Also test common API endpoints from the browser perspective
async function testAPIsFromBrowser() {
  console.log('🔌 Testing API Endpoints (Browser Perspective)...\n');
  
  const endpoints = [
    '/api/v1/health',
    '/api/v1/menu',
    '/api/v1/tables'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`http://localhost:3001${endpoint}`);
      const status = response.statusCode < 400 ? '✅' : '❌';
      console.log(`${status} ${endpoint} - HTTP ${response.statusCode}`);
      
      // Check for CORS headers
      const corsHeader = response.headers['access-control-allow-origin'];
      if (!corsHeader) {
        console.log(`⚠️  Missing CORS headers for ${endpoint}`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} - ${error.message}`);
    }
  }
  
  console.log();
}

async function runBrowserDiagnostic() {
  console.log('🔍 Starting Browser Console Error Diagnostic...\n');
  
  const startTime = Date.now();
  
  const pageResults = await checkPageForErrors();
  await testAPIsFromBrowser();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Summary
  console.log('📊 BROWSER DIAGNOSTIC SUMMARY');
  console.log('==============================\n');
  
  const okPages = pageResults.filter(r => r.status === 'ok');
  const warningPages = pageResults.filter(r => r.status === 'warning');
  const errorPages = pageResults.filter(r => r.status === 'error');
  
  console.log(`✅ Pages without issues: ${okPages.length}`);
  okPages.forEach(page => console.log(`  • ${page.page}`));
  
  if (warningPages.length > 0) {
    console.log(`\n⚠️  Pages with potential issues: ${warningPages.length}`);
    warningPages.forEach(page => console.log(`  • ${page.page}: ${page.error}`));
  }
  
  if (errorPages.length > 0) {
    console.log(`\n❌ Pages with errors: ${errorPages.length}`);
    errorPages.forEach(page => console.log(`  • ${page.page}: ${page.error}`));
  }
  
  const healthScore = Math.round((okPages.length / pageResults.length) * 100);
  console.log(`\n📈 Browser Health Score: ${healthScore}%`);
  console.log(`⏱️  Completed in ${duration} seconds`);
  
  return {
    pages: pageResults,
    summary: {
      total: pageResults.length,
      ok: okPages.length,
      warnings: warningPages.length,
      errors: errorPages.length,
      healthScore
    }
  };
}

if (require.main === module) {
  runBrowserDiagnostic().catch(console.error);
}

module.exports = { runBrowserDiagnostic };