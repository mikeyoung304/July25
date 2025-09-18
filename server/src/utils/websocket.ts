import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';
import { verifyWebSocketAuth } from '../middleware/auth';

interface ExtendedWebSocket extends WebSocket {
  restaurantId?: string;
  userId?: string;
  isAlive?: boolean;
}

const wsLogger = logger.child({ module: 'websocket' });

export function setupWebSocketHandlers(wss: WebSocketServer): void {
  // Heartbeat to detect broken connections
  const interval = setInterval(() => {
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
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      wsLogger.info(`WebSocket disconnected: ${ws.userId}`);
    });

    ws.on('error', async (error: any) => {
      wsLogger.error('WebSocket error:', error);

      // Handle reconnection auth for connection reset errors
      if (error && error.message && error.message.includes('ECONNRESET')) {
        try {
          const auth = await verifyWebSocketAuth(request);
          if (!auth) {
            wsLogger.warn('Reconnection auth failed, closing connection');
            ws.close(1008, 'Unauthorized');
            return;
          }
          ws.userId = auth.userId;
          ws.restaurantId = auth.restaurantId;
          wsLogger.info('WebSocket re-authenticated after reconnection');
        } catch (authError) {
          wsLogger.error('Reconnection auth error:', authError);
          ws.close(1008, 'Authentication failed');
        }
      }
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
    }));
  });

  wss.on('close', () => {
    clearInterval(interval);
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

// Broadcast to all clients in a restaurant
export function broadcastToRestaurant(
  wss: WebSocketServer,
  restaurantId: string,
  message: any
): void {
  const payload = JSON.stringify(message);
  let count = 0;

  wss.clients.forEach((client: ExtendedWebSocket) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.restaurantId === restaurantId
    ) {
      client.send(payload);
      count++;
    }
  });

  wsLogger.info(`Broadcast to ${count} clients in restaurant ${restaurantId}`);
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