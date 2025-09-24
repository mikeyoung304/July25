import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';
import { verifyWebSocketAuth } from '../middleware/auth';
import { transformWebSocketMessage } from '../middleware/responseTransform';

interface ExtendedWebSocket extends WebSocket {
  restaurantId?: string | undefined;
  userId?: string | undefined;
  isAlive?: boolean | undefined;
}

const wsLogger = logger.child({ module: 'websocket' });

// Store interval at module level to ensure proper cleanup
let heartbeatInterval: NodeJS.Timeout | null = null;

export function setupWebSocketHandlers(wss: WebSocketServer): void {
  // Clear any existing interval to prevent memory leaks
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  // Heartbeat to detect broken connections
  heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) {
        wsLogger.info('Terminating dead connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 60000); // Increased from 30s to 60s for more stability

  wss.on('connection', async (ws: ExtendedWebSocket, request) => {
    // Skip voice connections - they're handled by AI WebSocket
    if (request.url?.includes('/voice-stream')) {
      return;
    }
    
    wsLogger.info('New WebSocket connection');
    
    // Set up heartbeat
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Authenticate connection
    try {
      const auth = await verifyWebSocketAuth(request);
      if (!auth) {
        wsLogger.warn('WebSocket authentication failed - no auth returned');
        ws.close(1008, 'Unauthorized');
        return;
      }
      
      ws.userId = auth.userId;
      ws.restaurantId = auth.restaurantId;
      wsLogger.info(`WebSocket authenticated for user: ${auth.userId} in restaurant: ${auth.restaurantId}`);
    } catch (error) {
      wsLogger.error('WebSocket authentication failed:', error);
      ws.close(1008, 'Authentication failed');
      return;
    }

    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleWebSocketMessage(ws, message, wss);
      } catch (error) {
        wsLogger.error('Invalid WebSocket message:', error);
        ws.send(JSON.stringify(transformWebSocketMessage({ error: 'Invalid message format' })));
      }
    });

    ws.on('close', () => {
      wsLogger.info(`WebSocket disconnected: ${ws.userId}`);
    });

    ws.on('error', (error) => {
      wsLogger.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify(transformWebSocketMessage({
      type: 'connected',
      timestamp: new Date().toISOString(),
    })));
  });

  wss.on('close', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
      wsLogger.info('WebSocket server closed, heartbeat interval cleared');
    }
  });
}

// Export cleanup function for graceful shutdown
export function cleanupWebSocketServer(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    wsLogger.info('WebSocket heartbeat interval cleaned up');
  }
}

/**
 * Broadcast message to all clients in a restaurant
 * Automatically transforms payload to camelCase
 */
export function broadcastToRestaurant(
  wss: WebSocketServer,
  restaurantId: string,
  message: any
): void {
  const transformedMessage = transformWebSocketMessage(message);
  const messageStr = JSON.stringify(transformedMessage);

  wss.clients.forEach((client: ExtendedWebSocket) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.restaurantId === restaurantId
    ) {
      client.send(messageStr);
    }
  });

  wsLogger.debug('Broadcast to restaurant', {
    restaurantId,
    type: message.type,
    clientCount: Array.from(wss.clients).filter(
      (c: ExtendedWebSocket) => c.restaurantId === restaurantId
    ).length
  });
}

function handleWebSocketMessage(
  ws: ExtendedWebSocket,
  message: any,
  _wss: WebSocketServer
): void {
  const { type, payload } = message;

  switch (type) {
    case 'orders:sync':
      wsLogger.info(`Client requested order sync for restaurant: ${ws.restaurantId}`);
      ws.send(JSON.stringify(transformWebSocketMessage({
        type: 'sync_complete',
        payload: { status: 'synced' },
        timestamp: new Date().toISOString(),
      })));
      break;

    case 'order:update_status':
      wsLogger.info(`Order status update: ${JSON.stringify(payload)}`);
      // Handle status update logic here
      break;

    case 'order:update_item_status':
      wsLogger.info(`Order item status update: ${JSON.stringify(payload)}`);
      // Handle item status update logic here
      break;

    case 'ping':
      ws.send(JSON.stringify(transformWebSocketMessage({ type: 'pong' })));
      break;

    default:
      wsLogger.warn(`Unknown message type: ${type}`);
      ws.send(JSON.stringify(transformWebSocketMessage({
        type: 'error',
        payload: { message: 'Unknown message type', type },
        timestamp: new Date().toISOString(),
      })));
  }
}

// Broadcast order update
export function broadcastOrderUpdate(
  wss: WebSocketServer,
  order: any
): void {
  // Order is in snake_case from database
  const restaurantId = order.restaurant_id;
  broadcastToRestaurant(wss, restaurantId, {
    type: 'order:updated',
    payload: { order },  // Wrap order in payload for client compatibility
    timestamp: new Date().toISOString(),
  });
}

// Broadcast new order
export function broadcastNewOrder(
  wss: WebSocketServer,
  order: any
): void {
  // Order is in snake_case from database
  const restaurantId = order.restaurant_id;
  
  const message = {
    type: 'order:created',
    payload: { order },  // Wrap order in payload for client compatibility
    timestamp: new Date().toISOString(),
  };
  
  broadcastToRestaurant(wss, restaurantId, message);
}