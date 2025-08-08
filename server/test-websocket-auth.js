#!/usr/bin/env node

/**
 * WebSocket Connection Test with Authentication
 */

const WebSocket = require('ws');

function testWebSocketWithAuth() {
  console.log('🔌 Testing WebSocket connection with auth token...');
  
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket('ws://localhost:3001?token=test-token');
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout after 10 seconds'));
      }, 10000);
      
      ws.on('open', () => {
        console.log('✅ Authenticated WebSocket connection established');
        clearTimeout(timeout);
        
        // Test sending a voice order request
        ws.send(JSON.stringify({
          type: 'voice_order',
          data: {
            transcription: 'I would like a Greek Bowl please',
            confidence: 0.9
          }
        }));
        
        setTimeout(() => {
          ws.close();
          resolve(true);
        }, 2000);
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

if (require.main === module) {
  testWebSocketWithAuth().catch(console.error);
}

module.exports = { testWebSocketWithAuth };