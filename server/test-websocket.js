#!/usr/bin/env node

/**
 * WebSocket Connection Test
 */

const WebSocket = require('ws');

function testWebSocket() {
  console.log('🔌 Testing WebSocket connection to ws://localhost:3001...');
  
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket('ws://localhost:3001');
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout after 10 seconds'));
      }, 10000);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connection established');
        clearTimeout(timeout);
        
        // Test sending a message
        ws.send(JSON.stringify({
          type: 'test',
          message: 'Hello WebSocket!'
        }));
        
        setTimeout(() => {
          ws.close();
          resolve(true);
        }, 1000);
      });
      
      ws.on('message', (data) => {
        console.log('📨 Received message:', data.toString());
      });
      
      ws.on('error', (error) => {
        console.log('❌ WebSocket error:', error.message);
        clearTimeout(timeout);
        reject(error);
      });
      
      ws.on('close', (code, reason) => {
        console.log('🔌 WebSocket closed:', code, reason.toString());
        clearTimeout(timeout);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Test different WebSocket endpoints
async function testAllWebSocketEndpoints() {
  console.log('🧪 Testing WebSocket endpoints...\n');
  
  // Test main WebSocket
  try {
    await testWebSocket();
  } catch (error) {
    console.log('❌ Main WebSocket failed:', error.message);
  }
  
  // Test AI WebSocket if it exists on different path
  console.log('\n🤖 Testing AI WebSocket at ws://localhost:3001/ai...');
  try {
    const ws = new WebSocket('ws://localhost:3001/ai');
    
    const timeout = setTimeout(() => {
      ws.close();
      console.log('❌ AI WebSocket timeout');
    }, 5000);
    
    ws.on('open', () => {
      console.log('✅ AI WebSocket connection established');
      clearTimeout(timeout);
      ws.close();
    });
    
    ws.on('error', (error) => {
      console.log('❌ AI WebSocket error:', error.message);
      clearTimeout(timeout);
    });
    
  } catch (error) {
    console.log('❌ AI WebSocket failed:', error.message);
  }
  
  console.log('\n✅ WebSocket testing complete');
}

if (require.main === module) {
  testAllWebSocketEndpoints().catch(console.error);
}

module.exports = { testWebSocket, testAllWebSocketEndpoints };