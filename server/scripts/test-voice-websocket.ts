#!/usr/bin/env tsx
import WebSocket from 'ws';

console.log('🎤 Testing Voice WebSocket Connection...\n');

const ws = new WebSocket('ws://localhost:3001/voice-stream');

ws.on('open', () => {
  console.log('✅ Connected to voice WebSocket');
  
  // Test start recording
  console.log('📤 Sending start_recording message...');
  ws.send(JSON.stringify({ type: 'start_recording' }));
  
  // Simulate sending audio data
  setTimeout(() => {
    console.log('📤 Sending simulated audio data...');
    const audioData = Buffer.from('simulated audio chunk');
    ws.send(audioData);
  }, 500);
  
  // Test stop recording
  setTimeout(() => {
    console.log('📤 Sending stop_recording message...');
    ws.send(JSON.stringify({ type: 'stop_recording' }));
  }, 1000);
  
  // Test ping/pong
  setTimeout(() => {
    console.log('📤 Testing ping/pong...');
    ws.send(JSON.stringify({ type: 'ping' }));
  }, 1500);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📥 Received:', message);
  
  if (message.type === 'ping') {
    console.log('🏓 Responding to ping with pong...');
    ws.send(JSON.stringify({ type: 'pong' }));
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});

// Close connection after 5 seconds
setTimeout(() => {
  console.log('\n✅ Test completed, closing connection...');
  ws.close();
}, 5000);