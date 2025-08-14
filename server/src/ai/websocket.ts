import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { initializeVoiceServer } from '../voice/voice-routes';

const wsLogger = logger.child({ module: 'ai-websocket' });

export function setupAIWebSocket(wss: WebSocketServer): void {
  // Initialize the voice WebSocket server
  const voiceServer = initializeVoiceServer();
  
  // Handle voice-stream connections with the new voice server
  wss.on('connection', (ws: WebSocket, request) => {
    // Only handle voice connections
    if (!request.url?.includes('/voice-stream')) {
      return;
    }
    
    wsLogger.info('Voice WebSocket connection received, delegating to voice server');
    voiceServer.handleConnection(ws, request);
  });
}

