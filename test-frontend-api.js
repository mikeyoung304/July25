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
  
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      headers: {
        'x-restaurant-id': RESTAURANT_ID,
        'Origin': FRONTEND_URL,
        'Authorization': 'Bearer test-token'
      }
    });
    
    
    if (!response.ok) {
      const errorText = await response.text();
      return null;
    }
    
    const data = await response.json();
    
    // Show first few items for verification
    if (Array.isArray(data) && data.length > 0) {
      data.slice(0, 3).forEach((item, i) => {
      });
    }
    
    return data;
  } catch (error) {
    return null;
  }
}

async function runTests() {
  
  // Test 1: Menu items endpoint (what the frontend uses)
  const menuItems = await testAPIEndpoint('/api/v1/menu/items', 'Menu Items (Frontend Primary)');
  
  // Test 2: Full menu endpoint (fallback)
  const fullMenu = await testAPIEndpoint('/api/v1/menu', 'Full Menu (Fallback)');
  
  // Test 3: Categories endpoint
  const categories = await testAPIEndpoint('/api/v1/menu/categories', 'Menu Categories');
  
  
  if (menuItems) {
    
    // Check for specific items mentioned by user
    const expectedItems = ['Black Eyed Peas', 'BLT Sandwich', 'Chicken Fajita Keto'];
    const foundItems = expectedItems.filter(itemName => 
      menuItems.some(item => item.name === itemName)
    );
    
    expectedItems.forEach(itemName => {
      const found = menuItems.find(item => item.name === itemName);
      if (found) {
      } else {
      }
    });
    
    // Check for mock data indicators
    const mockIndicators = ['Classic Burger', 'Caesar Salad'];
    const mockFound = mockIndicators.filter(itemName => 
      menuItems.some(item => item.name === itemName)
    );
    
    if (mockFound.length > 0) {
    } else {
    }
  } else {
  }
  
  // Environment check
  
  // What the user should check in browser
}

// Run the tests
runTests().catch(console.error);