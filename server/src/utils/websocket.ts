import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';
import { verifyWebSocketAuth, verifyWebSocketToken } from '../middleware/auth';

// ADR-001: No transformation needed - all layers use snake_case

interface ExtendedWebSocket extends WebSocket {
  restaurantId?: string | undefined;
  userId?: string | undefined;
  isAlive?: boolean | undefined;
  isAuthenticated?: boolean | undefined;
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
    ws.isAuthenticated = false;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Try URL-based auth first (backward compatible, but logs warning)
    // Prefer first-message auth for security (no token in URL/logs)
    try {
      const auth = await verifyWebSocketAuth(request);
      if (auth) {
        // URL-based auth succeeded (legacy mode)
        wsLogger.warn('WebSocket using URL token auth (deprecated) - consider upgrading to first-message auth', {
          userId: auth.userId
        });
        ws.userId = auth.userId;
        ws.restaurantId = auth.restaurantId;
        ws.isAuthenticated = true;
        wsLogger.info(`WebSocket authenticated via URL for user: ${auth.userId}`);
      }
    } catch (error) {
      wsLogger.error('WebSocket URL auth check failed:', error);
    }

    // Handle messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // If not authenticated, first message must be auth
        if (!ws.isAuthenticated) {
          if (message.type === 'auth' && message.token) {
            // First-message authentication (preferred, no token in URL)
            const auth = await verifyWebSocketToken(message.token, message.restaurant_id);
            if (auth) {
              ws.userId = auth.userId;
              ws.restaurantId = auth.restaurantId;
              ws.isAuthenticated = true;
              wsLogger.info(`WebSocket authenticated via first-message for user: ${auth.userId}`);
              ws.send(JSON.stringify({
                type: 'auth:success',
                timestamp: new Date().toISOString(),
              }));
            } else {
              wsLogger.warn('WebSocket first-message auth failed');
              ws.send(JSON.stringify({
                type: 'auth:failed',
                error: 'Authentication failed',
                timestamp: new Date().toISOString(),
              }));
              ws.close(1008, 'Authentication failed');
            }
          } else {
            // First message is not auth - reject
            wsLogger.warn('WebSocket received non-auth message before authentication');
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Authentication required',
              timestamp: new Date().toISOString(),
            }));
            ws.close(1008, 'Authentication required');
          }
          return;
        }

        // Authenticated - handle normal messages
        handleWebSocketMessage(ws, message, wss);
      } catch (error) {
        wsLogger.error('Invalid WebSocket message:', error);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      wsLogger.info(`WebSocket disconnected: ${ws.userId || 'unauthenticated'}`);
    });

    ws.on('error', (error) => {
      wsLogger.error('WebSocket error:', error);
    });

    // Send welcome message (before auth - just indicates connection is open)
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      // Hint to client that auth is expected
      auth_required: !ws.isAuthenticated,
    }));
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
 * ADR-001: Messages use snake_case, no transformation needed
 */
export function broadcastToRestaurant(
  wss: WebSocketServer,
  restaurantId: string,
  message: any
): void {
  const messageStr = JSON.stringify(message);

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
      ws.send(JSON.stringify({
        type: 'sync_complete',
        payload: { status: 'synced' },
        timestamp: new Date().toISOString(),
      }));
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
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    default:
      wsLogger.warn(`Unknown message type: ${type}`);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Unknown message type', type },
        timestamp: new Date().toISOString(),
      }));
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