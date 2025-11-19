# WebSocket Events Documentation

**Last Updated:** 2025-11-18
**Status:** ⚠️ Partial Implementation
**Version:** 6.0.14

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Order Events (`order:created`, `order:updated`, `order:status`) | ✅ Working | Fully implemented |
| Payment Events (`payment:processed`) | ✅ Working | Fully implemented |
| KDS Updates (`kds:update`) | ✅ Working | Batch updates implemented |
| Table Events (`table:updated`) | ⚠️ **PLANNED** | Event schema defined, broadcasting NOT implemented |
| Notification Events (kitchen, customer, refund) | ⚠️ **PLANNED (Phase 3)** | See outstanding work: notifications are stubbed |

## Overview

Restaurant OS uses WebSockets for real-time communication between server and clients. The WebSocket server handles order updates, kitchen display synchronization, and payment processing events.

**Note:** Some features documented below are planned for future releases. Check the Implementation Status table above for current availability.

**WebSocket URLs:**
- Development: `ws://localhost:3001`
- Production: `wss://your-production-url.com`

## Connection

### Establishing Connection

```javascript
const ws = new WebSocket('ws://localhost:3001');

// Include authentication
const ws = new WebSocket('ws://localhost:3001', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Connection Lifecycle

1. **Authentication**: Connection requires valid JWT token
2. **Restaurant Context**: Automatically scoped to user's restaurant (multi-tenant isolation)
3. **Heartbeat**: 30-second ping/pong to detect broken connections
4. **Auto-reconnect**: Clients should implement exponential backoff

**Implementation:** `server/src/utils/websocket.ts`

## Event Types

### Server → Client Events

#### `connected`
Initial connection confirmation.

```json
{
  "type": "connected",
  "timestamp": "2025-11-06T10:00:00Z"
}
```

#### `order:created`
New order created.

```json
{
  "type": "order:created",
  "data": {
    "order": {
      "id": "uuid",
      "status": "pending",
      "items": [...],
      "total": 2500,
      "table_number": "T5",
      "seat_number": 2
    }
  },
  "timestamp": "2025-11-06T10:00:00Z"
}
```

#### `order:updated`
Order status or details changed.

```json
{
  "type": "order:updated",
  "data": {
    "order": {
      "id": "uuid",
      "status": "preparing",
      "updated_at": "2025-11-06T10:00:00Z"
    }
  },
  "timestamp": "2025-11-06T10:00:00Z"
}
```

#### `order:status`
Order status change specifically (optimized for KDS).

```json
{
  "type": "order:status",
  "data": {
    "order_id": "uuid",
    "status": "ready",
    "previous_status": "preparing"
  },
  "timestamp": "2025-11-06T10:00:00Z"
}
```

**Status values:** `pending`, `confirmed`, `preparing`, `ready`, `served`, `completed`, `cancelled`

#### `table:updated`
Table status changed (floor plan management).

```json
{
  "type": "table:updated",
  "data": {
    "table": {
      "id": "uuid",
      "label": "T12",
      "status": "occupied",
      "current_order_id": "uuid"
    }
  },
  "timestamp": "2025-11-06T10:00:00Z"
}
```

#### `payment:processed`
Payment completed.

```json
{
  "type": "payment:processed",
  "data": {
    "payment": {
      "id": "uuid",
      "order_id": "uuid",
      "amount": 2500,
      "payment_method": "card",
      "payment_status": "paid"
    }
  },
  "timestamp": "2025-11-06T10:00:00Z"
}
```

**Payment methods:** `cash`, `card`, `house_account`, `gift_card`, `other`

#### `kds:update`
Kitchen display system update (batch updates for performance).

```json
{
  "type": "kds:update",
  "data": {
    "orders": [
      {
        "id": "uuid",
        "status": "preparing",
        "items": [...],
        "prep_time": 12,
        "table_number": "T5"
      }
    ]
  },
  "timestamp": "2025-11-06T10:00:00Z"
}
```

#### `error`
Error notification.

```json
{
  "type": "error",
  "data": {
    "code": "INVALID_MESSAGE",
    "message": "Invalid message format"
  },
  "timestamp": "2025-11-06T10:00:00Z"
}
```

### Client → Server Messages

#### `subscribe`
Subscribe to specific event types.

```json
{
  "type": "subscribe",
  "events": ["order:created", "order:updated"],
  "filters": {
    "table_number": "T5"
  }
}
```

#### `unsubscribe`
Unsubscribe from events.

```json
{
  "type": "unsubscribe",
  "events": ["order:created"]
}
```

#### `ping`
Client heartbeat (server responds with `pong`).

```json
{
  "type": "ping"
}
```

## Authentication

WebSocket connections require authentication:

1. **JWT Token**: Passed in connection headers or first message
2. **Validation**: Server validates token on connection
3. **Restaurant Context**: Extracted from token (multi-tenant isolation)
4. **User Context**: User ID and role from token

**Failed authentication** results in connection closure with code `1008` (Policy violation).

## Error Codes

| Code | Description |
|------|-------------|
| 1000 | Normal closure |
| 1008 | Policy violation (authentication failed) |
| 1009 | Message too big (>64KB) |
| 1011 | Server error |

## Client Implementation

### TypeScript Example

```typescript
class RestaurantWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000; // 30 seconds

  connect(token: string) {
    this.ws = new WebSocket('ws://localhost:3001');

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.authenticate(token);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.reconnect(token);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private authenticate(token: string) {
    this.send({
      type: 'auth',
      token: token
    });
  }

  private handleMessage(message: any) {
    switch(message.type) {
      case 'order:created':
        // Handle new order
        break;
      case 'order:updated':
        // Handle order update
        break;
      case 'kds:update':
        // Handle KDS batch update
        break;
      // ... handle other events
    }
  }

  private reconnect(token: string) {
    // Exponential backoff with max delay
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }
}
```

### React Hook Example

See implementation: `client/src/hooks/useKitchenOrdersRealtime.ts`

```typescript
import { useEffect, useState } from 'react';

export function useWebSocket(url: string, token: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
      setLastMessage(JSON.parse(event.data));
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [url, token]);

  return { isConnected, lastMessage };
}
```

## Rate Limiting

WebSocket messages are rate-limited to prevent abuse:

- **Regular messages**: 100/minute per connection
- **Subscriptions**: Maximum 10 active subscriptions per connection

Exceeding limits results in temporary throttling or connection closure.

## Performance Considerations

1. **Message Size**: Keep messages under 64KB (larger messages may be rejected)
2. **Batching**: Group related updates (see `kds:update` for batch pattern)
3. **Throttling**: Limit update frequency for high-volume events
4. **Cleanup**: Unsubscribe from events when components unmount
5. **Selective Subscriptions**: Only subscribe to needed events

## Security

1. **Authentication Required**: All connections must authenticate with valid JWT
2. **Restaurant Isolation**: Events automatically scoped to user's restaurant (RLS)
3. **Input Validation**: All messages validated before processing
4. **Rate Limiting**: Prevents abuse and DoS attacks
5. **SSL/TLS**: Use `wss://` in production (required)

## Multi-Tenancy

WebSocket events respect Restaurant OS multi-tenancy:

- All events include `restaurant_id` context
- Users only receive events for their restaurant
- Attempting to access other restaurant data results in connection closure

## Debugging

### Enable Debug Logging

**Client-side:**
```javascript
localStorage.setItem('DEBUG_WS', 'true');
```

**Server-side:**
```bash
LOG_LEVEL=debug npm run dev
```

### Chrome DevTools

1. Open DevTools → Network tab
2. Filter by "WS"
3. Click connection to see messages
4. Use "Messages" tab for real-time message view

## Monitoring

Key metrics to monitor:

- Active connections count per restaurant
- Message throughput (messages/second)
- Authentication failures
- Reconnection rate
- Message processing time
- Error rates by event type

## Related Documentation

- [API Documentation](README.md)
- [Kitchen Display System](../../how-to/operations/KDS-BIBLE.md)
- [Deployment Guide](../../how-to/operations/DEPLOYMENT.md)
- [Authentication Architecture](../../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md)

## Implementation Files

- Server WebSocket: `server/src/utils/websocket.ts`
- Voice WebSocket: `server/src/voice/websocket-server.ts`
- Client Hook: `client/src/hooks/useKitchenOrdersRealtime.ts`

---

*For historical event catalog, see archived version: `docs/archive/2025-10/2025-10-15_WEBSOCKET_EVENTS.md`*
