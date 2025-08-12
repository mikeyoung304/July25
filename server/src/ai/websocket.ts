import { WebSocketServer, WebSocket } from 'ws';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

// Declare global metrics interface
declare global {
  var voiceMetrics: {
    voiceChunksTotal: { inc: () => void };
    voiceOverrunTotal: { inc: () => void };
    voiceActiveConnections: { inc: () => void; dec: () => void };
  } | undefined;
}

const wsLogger = logger.child({ module: 'ai-websocket' });

// Connection limits
const MAX_CONNECTIONS_PER_IP = 2;
const MAX_TOTAL_CONNECTIONS = 100;
const connectionsByIP = new Map<string, Set<string>>();

interface ExtendedWebSocket extends WebSocket {
  connectionId?: string;
  isAlive?: boolean;
  unacknowledgedChunks?: number;
  totalChunksReceived?: number;
  totalBytesReceived?: number;
  clientIP?: string;
}

export function setupAIWebSocket(wss: WebSocketServer): void {
  // Handle AI-specific WebSocket connections on /voice-stream path
  wss.on('connection', (ws: ExtendedWebSocket, request) => {
    // Only handle voice connections
    if (!request.url?.includes('/voice-stream')) {
      return;
    }

    // Get client IP
    const forwardedFor = request.headers['x-forwarded-for'];
    const clientIP = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.toString())?.split(',')[0]?.trim() ||
                     request.socket?.remoteAddress || 
                     'unknown';

    // Check total connection limit
    if (wss.clients.size > MAX_TOTAL_CONNECTIONS) {
      wsLogger.warn(`Connection rejected: Total connection limit exceeded (${wss.clients.size}/${MAX_TOTAL_CONNECTIONS})`);
      ws.close(1008, 'Server at capacity');
      return;
    }

    // Check per-IP connection limit
    const ipConnections = connectionsByIP.get(clientIP) || new Set();
    if (ipConnections.size >= MAX_CONNECTIONS_PER_IP) {
      wsLogger.warn(`Connection rejected: IP ${clientIP} has ${ipConnections.size} connections (max ${MAX_CONNECTIONS_PER_IP})`);
      ws.close(1008, 'Too many connections from this IP');
      return;
    }

    const connectionId = randomUUID();
    ws.connectionId = connectionId;
    ws.clientIP = clientIP;
    ws.isAlive = true;
    ws.unacknowledgedChunks = 0;
    ws.totalChunksReceived = 0;
    ws.totalBytesReceived = 0;

    // Track connection by IP
    ipConnections.add(connectionId);
    connectionsByIP.set(clientIP, ipConnections);

    wsLogger.info(`AI WebSocket connected: ${connectionId} from ${clientIP}`);

    // Initialize connection in AI service
    aiService.handleVoiceConnection(ws, connectionId);
    
    // Track active connections in metrics
    if (global.voiceMetrics) {
      global.voiceMetrics.voiceActiveConnections.inc();
    }

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
          // Handle binary audio data with flow control
          const buffer = Buffer.isBuffer(data) 
            ? data 
            : data instanceof ArrayBuffer 
              ? Buffer.from(new Uint8Array(data))
              : Buffer.from(data as unknown as Buffer);
          
          // Check for overrun
          if (ws.unacknowledgedChunks && ws.unacknowledgedChunks >= 3) {
            wsLogger.warn(`Audio overrun for ${connectionId}: ${ws.unacknowledgedChunks} unacknowledged chunks`);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'overrun',
              unacknowledgedChunks: ws.unacknowledgedChunks
            }));
            // Track overrun in metrics
            if (global.voiceMetrics) {
              global.voiceMetrics.voiceOverrunTotal.inc();
            }
            return;
          }
          
          // Process audio and track metrics
          await aiService.processAudioStream(connectionId, buffer);
          
          // Update metrics
          ws.unacknowledgedChunks = (ws.unacknowledgedChunks || 0) + 1;
          ws.totalChunksReceived = (ws.totalChunksReceived || 0) + 1;
          ws.totalBytesReceived = (ws.totalBytesReceived || 0) + buffer.length;
          
          // Send progress acknowledgment
          ws.send(JSON.stringify({
            type: 'progress',
            bytesReceived: buffer.length,
            totalBytesReceived: ws.totalBytesReceived
          }));
          
          // Decrement unacknowledged chunks after sending progress
          ws.unacknowledgedChunks = Math.max(0, ws.unacknowledgedChunks - 1);
          
          // Track chunks in metrics
          if (global.voiceMetrics) {
            global.voiceMetrics.voiceChunksTotal.inc();
          }
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
      wsLogger.info(`AI WebSocket disconnected: ${connectionId} from ${ws.clientIP}`);
      
      // Clean up IP tracking
      if (ws.clientIP && ws.connectionId) {
        const ipConnections = connectionsByIP.get(ws.clientIP);
        if (ipConnections) {
          ipConnections.delete(ws.connectionId);
          if (ipConnections.size === 0) {
            connectionsByIP.delete(ws.clientIP);
          }
        }
      }
      
      // Update active connections metric
      if (global.voiceMetrics) {
        global.voiceMetrics.voiceActiveConnections.dec();
      }
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
    connectionsByIP.clear();
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

    case 'stop_recording': {
      // Extract restaurant ID from message or use default
      const restaurantId = message.restaurantId || 'default';
      const result = await aiService.stopRecording(connectionId, restaurantId);
      
      // If OpenAI TTS returned audio, include it in response
      ws.send(JSON.stringify({
        type: 'transcription_result',
        ...result,
        restaurantId
      }));
      break;
    }

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