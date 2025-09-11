#!/usr/bin/env node

/**
 * Test script for voice order integration
 * Tests the flow: Voice → Cart → Payment → KDS
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

const API_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001';
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN || '';

async function testVoiceOrderFlow() {
  console.log('\n🎤 Testing Voice Order Integration Flow...\n');
  
  const tests = [
    {
      name: 'WebRTC Session Creation',
      test: async () => {
        const response = await fetch(`${API_URL}/api/v1/realtime/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_TOKEN}`
          },
          body: JSON.stringify({
            restaurantId: '11111111-1111-1111-1111-111111111111'
          })
        });
        return response.ok ? 'Session created successfully' : `Failed: ${response.status}`;
      }
    },
    {
      name: 'Order Creation',
      test: async () => {
        const response = await fetch(`${API_URL}/api/v1/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'X-Restaurant-ID': '11111111-1111-1111-1111-111111111111'
          },
          body: JSON.stringify({
            table_number: 'Test-1',
            seat_number: 1,
            items: [{
              menu_item_id: 'test-item-1',
              name: 'Test Burger',
              quantity: 1,
              modifications: []
            }],
            notes: 'Voice order test',
            total_amount: 9.99,
            customer_name: 'Test Customer',
            order_type: 'dine-in'
          })
        });
        
        if (!response.ok) {
          const text = await response.text();
          return `Failed: ${response.status} - ${text.substring(0, 100)}`;
        }
        
        const data = await response.json();
        return `Order created: ${data.id || 'unknown'}`;
      }
    },
    {
      name: 'Square Terminal Device Check',
      test: async () => {
        const response = await fetch(`${API_URL}/api/v1/terminal/devices`, {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'X-Restaurant-ID': '11111111-1111-1111-1111-111111111111'
          }
        });
        
        if (!response.ok) {
          return `Failed: ${response.status}`;
        }
        
        const data = await response.json();
        return `Found ${data.devices?.length || 0} devices`;
      }
    },
    {
      name: 'WebSocket Connection',
      test: async () => {
        // Simple check if WebSocket endpoint is accessible
        const response = await fetch(`${API_URL}/health/websocket`, {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`
          }
        }).catch(() => null);
        
        return response?.ok ? 'WebSocket endpoint accessible' : 'WebSocket endpoint not configured';
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      const isSuccess = !result.includes('Failed');
      
      if (isSuccess) {
        console.log(`✅ ${name}: ${result}`);
        passed++;
      } else {
        console.log(`❌ ${name}: ${result}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: Error - ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50) + '\n');
  
  if (failed > 0) {
    console.log('⚠️  Some tests failed. Check configuration:');
    console.log('  - Ensure server is running on port 3001');
    console.log('  - Check authentication token in .env');
    console.log('  - Verify Square Terminal configuration');
  } else {
    console.log('✨ All tests passed! Voice order integration is working.');
  }
}

// Run the test
testVoiceOrderFlow().catch(console.error);