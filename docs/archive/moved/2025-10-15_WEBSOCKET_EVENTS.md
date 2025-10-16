# WebSocket Events Documentation

**Correction (2025-10-15):** Heartbeat interval is 30 seconds; earlier draft incorrectly stated 60 seconds. Verified against code.

**Last Updated**: 2025-09-26
**Version**: See [VERSION.md](VERSION.md)
**WebSocket URL**: `ws://localhost:3001` (dev) | `wss://july25.onrender.com` (prod)

## Overview

Restaurant OS uses WebSockets for real-time communication between server and clients. The WebSocket server handles order updates, kitchen display synchronization, and voice streaming.

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
2. **Restaurant Context**: Automatically scoped to user's restaurant
3. **Heartbeat**: 30-second ping/pong to detect broken connections
4. **Auto-reconnect**: Clients should implement exponential backoff

Source: [`server/src/utils/websocket.ts`](../server/src/utils/websocket.ts)

## Event Types

### Server → Client Events

#### connected
Initial connection confirmation.

```json
{
  "type": "connected",
  "timestamp": "2025-09-26T10:00:00Z"
}
```

#### order:created
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
      "table_id": "uuid"
    }
  },
  "timestamp": "2025-09-26T10:00:00Z"
}
```

#### order:updated
Order status or details changed.

```json
{
  "type": "order:updated",
  "data": {
    "order": {
      "id": "uuid",
      "status": "preparing",
      "updated_at": "2025-09-26T10:00:00Z"
    }
  },
  "timestamp": "2025-09-26T10:00:00Z"
}
```

#### order:status
Order status change specifically.

```json
{
  "type": "order:status",
  "data": {
    "order_id": "uuid",
    "status": "ready",
    "previous_status": "preparing"
  },
  "timestamp": "2025-09-26T10:00:00Z"
}
```

#### table:updated
Table status changed.

```json
{
  "type": "table:updated",
  "data": {
    "table": {
      "id": "uuid",
      "number": "12",
      "status": "occupied"
    }
  },
  "timestamp": "2025-09-26T10:00:00Z"
}
```

#### payment:processed
Payment completed.

```json
{
  "type": "payment:processed",
  "data": {
    "payment": {
      "id": "uuid",
      "order_id": "uuid",
      "amount": 2500,
      "method": "card",
      "status": "completed"
    }
  },
  "timestamp": "2025-09-26T10:00:00Z"
}
```

#### kds:update
Kitchen display system update.

```json
{
  "type": "kds:update",
  "data": {
    "orders": [
      {
        "id": "uuid",
        "status": "preparing",
        "items": [...],
        "prep_time": 12
      }
    ]
  },
  "timestamp": "2025-09-26T10:00:00Z"
}
```

#### error
Error notification.

```json
{
  "type": "error",
  "data": {
    "code": "INVALID_MESSAGE",
    "message": "Invalid message format"
  },
  "timestamp": "2025-09-26T10:00:00Z"
}
```

### Client → Server Messages

#### subscribe
Subscribe to specific event types.

```json
{
  "type": "subscribe",
  "events": ["order:created", "order:updated"],
  "filters": {
    "table_id": "uuid"
  }
}
```

#### unsubscribe
Unsubscribe from events.

```json
{
  "type": "unsubscribe",
  "events": ["order:created"]
}
```

#### ping
Client heartbeat.

```json
{
  "type": "ping"
}
```

## Voice Streaming

Separate WebSocket endpoint for voice: `/voice-stream`

### Voice Events

#### voice:start
Begin voice session.

```json
{
  "type": "voice:start",
  "data": {
    "session_id": "uuid",
    "language": "en-US"
  }
}
```

#### voice:audio
Audio data chunk (base64 encoded).

```json
{
  "type": "voice:audio",
  "data": {
    "audio": "base64_encoded_audio_data",
    "sequence": 1
  }
}
```

#### voice:transcript
Transcription result.

```json
{
  "type": "voice:transcript",
  "data": {
    "text": "I'd like to order a burger",
    "confidence": 0.95,
    "is_final": true
  }
}
```

#### voice:end
End voice session.

```json
{
  "type": "voice:end",
  "data": {
    "session_id": "uuid",
    "duration": 30
  }
}
```

## Authentication

WebSocket connections require authentication:

1. **JWT Token**: Passed in connection headers
2. **Validation**: Server validates token on connection
3. **Restaurant Context**: Extracted from token
4. **User Context**: User ID and role from token

Failed authentication results in connection closure with code 1008.

## Error Codes

| Code | Description |
|------|-------------|
| 1000 | Normal closure |
| 1008 | Policy violation (auth failed) |
| 1009 | Message too big |
| 1011 | Server error |

## Client Implementation

### JavaScript/TypeScript Example

```typescript
class RestaurantWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;

  connect(token: string) {
    this.ws = new WebSocket('ws://localhost:3001');

    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
      this.authenticate(token);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('Disconnected');
      this.reconnect();
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
      // ... handle other events
    }
  }

  private reconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect(getToken());
    }, delay);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
```

### React Hook Example

See [`client/src/hooks/useWebSocket.ts`](../client/src/hooks/useWebSocket.ts)

## Rate Limiting

WebSocket messages are rate-limited:
- **Regular messages**: 100/minute
- **Voice streaming**: 1000/minute
- **Subscriptions**: 10 active subscriptions

## Debugging

### Enable Debug Logging

```javascript
// Client-side
localStorage.setItem('DEBUG_WS', 'true');

// Server-side
LOG_LEVEL=debug
```

### Chrome DevTools

1. Open DevTools → Network tab
2. Filter by "WS"
3. Click connection to see messages
4. Use "Messages" tab for real-time view

## Performance Considerations

1. **Message Size**: Keep under 64KB
2. **Compression**: Enable permessage-deflate
3. **Batching**: Group related updates
4. **Throttling**: Limit update frequency
5. **Cleanup**: Unsubscribe when unmounting

## Security

1. **Authentication Required**: All connections must authenticate
2. **Restaurant Isolation**: Events scoped to restaurant
3. **Input Validation**: All messages validated
4. **Rate Limiting**: Prevent abuse
5. **SSL/TLS**: Use wss:// in production

## Monitoring

Key metrics:
- Active connections count
- Message throughput
- Authentication failures
- Reconnection rate
- Message processing time

## Related Documentation

- [API Documentation](api/README.md)
- [Real-time Features](ORDER_FLOW.md)
- [Voice Ordering](voice/VOICE_ORDERING_EXPLAINED.md)