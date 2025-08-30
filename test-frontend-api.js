#!/usr/bin/env node

/**
 * Frontend API Integration Test
 * Tests the exact same flow that the React frontend uses to fetch menu data
 */

const { default: fetch } = require('node-fetch');

const BACKEND_URL = 'http://localhost:3001';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
const FRONTEND_URL = 'http://localhost:5173';

async function testAPIEndpoint(endpoint, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`   URL: ${BACKEND_URL}${endpoint}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      headers: {
        'x-restaurant-id': RESTAURANT_ID,
        'Origin': FRONTEND_URL,
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`   ✅ Success: ${Array.isArray(data) ? data.length + ' items' : 'Object'}`);
    
    // Show first few items for verification
    if (Array.isArray(data) && data.length > 0) {
      console.log(`   📋 Sample items:`);
      data.slice(0, 3).forEach((item, i) => {
        console.log(`      ${i + 1}. ${item.name} - $${item.price}`);
      });
    }
    
    return data;
  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Frontend API Integration Test');
  console.log('=================================');
  
  // Test 1: Menu items endpoint (what the frontend uses)
  const menuItems = await testAPIEndpoint('/api/v1/menu/items', 'Menu Items (Frontend Primary)');
  
  // Test 2: Full menu endpoint (fallback)
  const fullMenu = await testAPIEndpoint('/api/v1/menu', 'Full Menu (Fallback)');
  
  // Test 3: Categories endpoint
  const categories = await testAPIEndpoint('/api/v1/menu/categories', 'Menu Categories');
  
  console.log('\n📊 Summary:');
  console.log('===========');
  
  if (menuItems) {
    console.log(`✅ Menu Items: ${menuItems.length} items loaded`);
    
    // Check for specific items mentioned by user
    const expectedItems = ['Black Eyed Peas', 'BLT Sandwich', 'Chicken Fajita Keto'];
    const foundItems = expectedItems.filter(itemName => 
      menuItems.some(item => item.name === itemName)
    );
    
    console.log(`🎯 Expected items found: ${foundItems.length}/${expectedItems.length}`);
    expectedItems.forEach(itemName => {
      const found = menuItems.find(item => item.name === itemName);
      if (found) {
        console.log(`   ✅ ${itemName} - $${found.price}`);
      } else {
        console.log(`   ❌ ${itemName} - NOT FOUND`);
      }
    });
    
    // Check for mock data indicators
    const mockIndicators = ['Classic Burger', 'Caesar Salad'];
    const mockFound = mockIndicators.filter(itemName => 
      menuItems.some(item => item.name === itemName)
    );
    
    if (mockFound.length > 0) {
      console.log(`⚠️  MOCK DATA DETECTED: Found ${mockFound.join(', ')}`);
    } else {
      console.log(`✅ Real data confirmed (no mock indicators found)`);
    }
  } else {
    console.log(`❌ Menu Items: Failed to load`);
  }
  
  // Environment check
  console.log('\n🌍 Environment Check:');
  console.log('====================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Restaurant ID: ${RESTAURANT_ID}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  
  // What the user should check in browser
  console.log('\n🖥️  Browser Testing Instructions:');
  console.log('==================================');
  console.log('1. Open Chrome DevTools (F12)');
  console.log('2. Go to Network tab');
  console.log('3. Navigate to: http://localhost:5173/kiosk');
  console.log('4. Click "Browse Menu" button');
  console.log('5. Check Network tab for:');
  console.log('   - Request to: /api/v1/menu/items');
  console.log('   - Status: 200 (success) or error');
  console.log('   - Response body contains real data');
  console.log('6. Check Console tab for JavaScript errors');
  console.log('7. Check localStorage: localStorage.getItem("VITE_USE_MOCK_DATA")');
}

// Run the tests
runTests().catch(console.error);