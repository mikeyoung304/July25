import { WebSocketServer, WebSocket } from 'ws';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

const wsLogger = logger.child({ module: 'ai-websocket' });

interface ExtendedWebSocket extends WebSocket {
  connectionId?: string;
  isAlive?: boolean;
}

export function setupAIWebSocket(wss: WebSocketServer): void {
  // Handle AI-specific WebSocket connections on /voice-stream path
  wss.on('connection', (ws: ExtendedWebSocket, request) => {
    // Only handle voice connections
    if (!request.url?.includes('/voice-stream')) {
      return;
    }

    const connectionId = randomUUID();
    ws.connectionId = connectionId;
    ws.isAlive = true;

    wsLogger.info(`AI WebSocket connected: ${connectionId}`);

    // Initialize connection in AI service
    aiService.handleVoiceConnection(ws, connectionId);

    // Handle messages
    ws.on('message', async (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        // Try to parse as JSON first
        let isJson = false;
        let message;
        
        try {
          const dataStr = data.toString();
          if (dataStr.startsWith('{')) {
            message = JSON.parse(dataStr);
            isJson = true;
          }
        } catch {
          // Not JSON, treat as binary audio
        }
        
        if (isJson) {
          await handleControlMessage(ws, connectionId, message);
        } else {
          // Handle binary audio data
          const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
          await aiService.processAudioStream(connectionId, buffer);
        }
      } catch (error) {
        wsLogger.error('Message handling error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
      }
    });

    // Note: pong is now handled in the message handler above

    // Handle disconnect
    ws.on('close', () => {
      wsLogger.info(`AI WebSocket disconnected: ${connectionId}`);
    });

    ws.on('error', (error) => {
      wsLogger.error(`WebSocket error for ${connectionId}:`, error);
    });
  });

  // Heartbeat interval using JSON messages
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) {
        wsLogger.info('Terminating dead AI connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      // Send JSON ping instead of binary ping
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });
}

async function handleControlMessage(
  ws: ExtendedWebSocket,
  connectionId: string,
  message: any
): Promise<void> {
  switch (message.type) {
    case 'start_recording':
      aiService.startRecording(connectionId);
      ws.send(JSON.stringify({
        type: 'recording_started',
        timestamp: Date.now()
      }));
      break;

    case 'stop_recording':
      const result = await aiService.stopRecording(connectionId);
      ws.send(JSON.stringify({
        type: 'transcription_result',
        ...result
      }));
      break;

    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now()
      }));
      break;
      
    case 'pong':
      // Handle pong response from client
      ws.isAlive = true;
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        error: `Unknown message type: ${message.type}`
      }));
  }
}