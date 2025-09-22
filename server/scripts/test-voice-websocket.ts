#!/usr/bin/env tsx
import WebSocket from 'ws';


const ws = new WebSocket('ws://localhost:3001/voice-stream');

ws.on('open', () => {
  
  // Test start recording
  ws.send(JSON.stringify({ type: 'start_recording' }));
  
  // Simulate sending audio data
  setTimeout(() => {
    const audioData = Buffer.from('simulated audio chunk');
    ws.send(audioData);
  }, 500);
  
  // Test stop recording
  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'stop_recording' }));
  }, 1000);
  
  // Test ping/pong
  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'ping' }));
  }, 1500);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  process.exit(0);
});

// Close connection after 5 seconds
setTimeout(() => {
  ws.close();
}, 5000);