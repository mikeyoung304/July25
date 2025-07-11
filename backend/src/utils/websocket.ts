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
  }, 30000);

  wss.on('connection', async (ws: ExtendedWebSocket, request) => {
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
        ws.close(1008, 'Unauthorized');
        return;
      }
      
      ws.userId = auth.userId;
      wsLogger.info(`WebSocket authenticated for user: ${auth.userId}`);
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

    ws.on('error', (error) => {
      wsLogger.error('WebSocket error:', error);
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
  wss: WebSocketServer
): void {
  const { type, data } = message;

  switch (type) {
    case 'join-restaurant':
      ws.restaurantId = data.restaurantId;
      wsLogger.info(`Client joined restaurant: ${data.restaurantId}`);
      ws.send(JSON.stringify({
        type: 'joined',
        restaurantId: data.restaurantId,
      }));
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    default:
      ws.send(JSON.stringify({
        error: 'Unknown message type',
        type,
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
  broadcastToRestaurant(wss, order.restaurant_id, {
    type: 'order-updated',
    order,
    timestamp: new Date().toISOString(),
  });
}

// Broadcast new order
export function broadcastNewOrder(
  wss: WebSocketServer,
  order: any
): void {
  broadcastToRestaurant(wss, order.restaurant_id, {
    type: 'new-order',
    order,
    timestamp: new Date().toISOString(),
  });
}