# WebSocket API Reference

## Overview

The Restaurant OS WebSocket API provides real-time bidirectional communication for order management, kitchen displays, and system notifications.

## Connection

### Endpoint
- **Development**: `ws://localhost:3001`
- **Production**: `wss://api.your-domain.com`

### Connection Example

```javascript
import io from 'socket.io-client'

const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
})

// Join restaurant room
socket.emit('join:restaurant', restaurantId)
```

## Authentication

WebSocket connections require JWT authentication:

```javascript
const socket = io(url, {
  auth: {
    token: localStorage.getItem('auth-token')
  }
})
```

## Events

### Client → Server Events

#### join:restaurant
Join a restaurant-specific room for targeted updates.

```javascript
socket.emit('join:restaurant', '11111111-1111-1111-1111-111111111111')
```

**Payload:**
- `restaurantId` (string): UUID of the restaurant

---

#### orders:sync
Request full synchronization of active orders.

```javascript
socket.emit('orders:sync', {
  restaurantId: '11111111-1111-1111-1111-111111111111',
  statuses: ['new', 'pending', 'confirmed', 'preparing', 'ready']
})
```

**Payload:**
- `restaurantId` (string): Restaurant UUID
- `statuses` (string[]): Optional status filter

**Response Event:** `orders:sync:complete`

---

#### order:update_status
Update the status of an order.

```javascript
socket.emit('order:update_status', {
  orderId: 'order-123',
  status: 'preparing',
  restaurantId: '11111111-1111-1111-1111-111111111111'
})
```

**Payload:**
- `orderId` (string): Order ID
- `status` (OrderStatus): New status
- `restaurantId` (string): Restaurant context

**Response Event:** `order:status_changed`

---

#### table:complete
Mark all orders for a table as completed.

```javascript
socket.emit('table:complete', {
  tableNumber: '5',
  restaurantId: '11111111-1111-1111-1111-111111111111'
})
```

**Payload:**
- `tableNumber` (string): Table identifier
- `restaurantId` (string): Restaurant context

**Response Event:** `table:completed`

---

### Server → Client Events

#### order:created
New order has been created.

```javascript
socket.on('order:created', (order) => {
  console.log('New order:', order)
})
```

**Payload:**
```typescript
{
  id: string
  order_number: string
  status: OrderStatus
  type: OrderType
  table_number?: string
  items: OrderItem[]
  total: number
  created_at: string
  restaurant_id: string
}
```

---

#### order:updated
Order details have been modified.

```javascript
socket.on('order:updated', (data) => {
  console.log('Order updated:', data.order)
})
```

**Payload:**
```typescript
{
  order: Order
  changes: string[]  // Fields that changed
  updatedBy?: string // User who made the update
}
```

---

#### order:status_changed
Order status has been updated.

```javascript
socket.on('order:status_changed', (data) => {
  console.log(`Order ${data.orderId} status: ${data.status}`)
})
```

**Payload:**
```typescript
{
  orderId: string
  previousStatus: OrderStatus
  status: OrderStatus
  timestamp: string
  restaurant_id: string
}
```

---

#### order:deleted
Order has been cancelled or removed.

```javascript
socket.on('order:deleted', (data) => {
  console.log('Order deleted:', data.orderId)
})
```

**Payload:**
```typescript
{
  orderId: string
  reason?: string
  timestamp: string
}
```

---

#### table:ready
All orders for a table are ready.

```javascript
socket.on('table:ready', (data) => {
  console.log(`Table ${data.tableNumber} is ready`)
})
```

**Payload:**
```typescript
{
  tableNumber: string
  orderIds: string[]
  readyAt: string
}
```

---

#### kitchen:alert
Urgent kitchen notification.

```javascript
socket.on('kitchen:alert', (alert) => {
  console.log('Kitchen alert:', alert.message)
})
```

**Payload:**
```typescript
{
  type: 'urgent' | 'warning' | 'info'
  message: string
  orderId?: string
  tableNumber?: string
  severity: number  // 1-5, 5 being most urgent
}
```

---

#### connection:status
Connection state changes.

```javascript
socket.on('connection:status', (status) => {
  console.log('Connection:', status.state)
})
```

**Payload:**
```typescript
{
  state: 'connected' | 'disconnected' | 'reconnecting'
  attempt?: number
  maxAttempts?: number
  nextRetry?: number  // Milliseconds until next attempt
}
```

---

## Room Management

### Restaurant Rooms

Each restaurant has its own room for isolated communication:

```javascript
// Server-side room management
io.on('connection', (socket) => {
  socket.on('join:restaurant', (restaurantId) => {
    // Leave previous rooms
    socket.rooms.forEach(room => {
      if (room.startsWith('restaurant:')) {
        socket.leave(room)
      }
    })
    
    // Join new restaurant room
    socket.join(`restaurant:${restaurantId}`)
  })
})
```

### Station Rooms

Kitchen stations can join specific rooms:

```javascript
socket.emit('join:station', {
  restaurantId: '11111111-1111-1111-1111-111111111111',
  station: 'expo'  // 'kitchen', 'expo', 'bar', 'pos'
})
```

## Error Handling

### Error Events

```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error)
})

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message)
})

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason)
  // Reasons: 'io server disconnect', 'ping timeout', 'transport close'
})
```

### Error Responses

```typescript
{
  success: false,
  error: {
    code: string
    message: string
    details?: any
  }
}
```

Common error codes:
- `AUTH_FAILED`: Authentication failure
- `INVALID_RESTAURANT`: Restaurant not found
- `PERMISSION_DENIED`: Insufficient permissions
- `INVALID_PAYLOAD`: Malformed event data
- `RATE_LIMIT`: Too many requests

## Reconnection Strategy

### Automatic Reconnection

```javascript
const socket = io(url, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5
})

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts')
  // Re-join rooms and sync state
  socket.emit('join:restaurant', restaurantId)
  socket.emit('orders:sync')
})
```

### Manual Reconnection

```javascript
socket.on('disconnect', () => {
  setTimeout(() => {
    socket.connect()
  }, 1000)
})
```

## Performance Considerations

### Event Batching

For high-frequency updates, events are batched:

```javascript
// Server batches updates every 100ms
const batch = []
setInterval(() => {
  if (batch.length > 0) {
    io.emit('orders:batch_update', batch)
    batch.length = 0
  }
}, 100)
```

### Message Compression

Enable compression for large payloads:

```javascript
const socket = io(url, {
  perMessageDeflate: {
    threshold: 1024  // Compress messages > 1KB
  }
})
```

## Testing

### Mock Server

```javascript
// test-server.js
const io = require('socket.io')(3001)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  // Simulate order creation
  setInterval(() => {
    socket.emit('order:created', {
      id: `order-${Date.now()}`,
      status: 'new',
      total: Math.random() * 100
    })
  }, 5000)
})
```

### Client Testing

```javascript
// test-client.js
import { io } from 'socket.io-client'

describe('WebSocket Events', () => {
  let socket
  
  beforeEach(() => {
    socket = io('http://localhost:3001', {
      autoConnect: false
    })
  })
  
  afterEach(() => {
    socket.disconnect()
  })
  
  test('should receive order updates', (done) => {
    socket.on('order:created', (order) => {
      expect(order).toHaveProperty('id')
      done()
    })
    socket.connect()
  })
})
```

## Security

### Authentication Required

All WebSocket connections must provide a valid JWT token:

```javascript
// Server-side authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    const user = await verifyJWT(token)
    socket.data.user = user
    next()
  } catch (err) {
    next(new Error('Authentication error'))
  }
})
```

### Rate Limiting

Prevent abuse with rate limiting:

```javascript
const rateLimiter = new Map()

socket.use(([event, ...args], next) => {
  const key = `${socket.id}:${event}`
  const count = rateLimiter.get(key) || 0
  
  if (count > 10) {  // Max 10 events per second
    return next(new Error('Rate limit exceeded'))
  }
  
  rateLimiter.set(key, count + 1)
  setTimeout(() => rateLimiter.delete(key), 1000)
  next()
})
```

### Data Validation

Validate all incoming events:

```javascript
socket.on('order:update_status', async (data) => {
  const schema = Joi.object({
    orderId: Joi.string().uuid().required(),
    status: Joi.string().valid(...ORDER_STATUSES).required(),
    restaurantId: Joi.string().uuid().required()
  })
  
  const { error, value } = schema.validate(data)
  if (error) {
    return socket.emit('error', {
      code: 'VALIDATION_ERROR',
      message: error.details[0].message
    })
  }
  
  // Process valid data
})
```

## Monitoring

### Connection Metrics

Track WebSocket connections:

```javascript
let connections = 0

io.on('connection', (socket) => {
  connections++
  metrics.gauge('websocket.connections', connections)
  
  socket.on('disconnect', () => {
    connections--
    metrics.gauge('websocket.connections', connections)
  })
})
```

### Event Metrics

Monitor event rates:

```javascript
socket.onAny((event) => {
  metrics.increment(`websocket.events.${event}`)
})
```

## Migration Guide

### From REST Polling to WebSocket

Before (REST Polling):
```javascript
// Inefficient polling every 5 seconds
setInterval(async () => {
  const orders = await fetch('/api/v1/orders')
  updateUI(orders)
}, 5000)
```

After (WebSocket):
```javascript
// Real-time updates
socket.on('order:created', addOrder)
socket.on('order:updated', updateOrder)
socket.on('order:deleted', removeOrder)
```

## Troubleshooting

### Common Issues

**Connection Refused**
- Verify server is running
- Check firewall settings
- Ensure correct port

**Authentication Failures**
- Verify JWT token is valid
- Check token expiration
- Ensure token has required scopes

**Missing Events**
- Confirm room membership
- Check event names (case-sensitive)
- Verify restaurant context

**Performance Issues**
- Enable compression
- Implement event batching
- Use rooms for targeted messaging
- Monitor connection count

## Related Documentation

- [REST API Reference](../rest/)
- [Authentication Guide](../../05-operations/authentication.md)
- [Real-time Architecture](../../02-architecture/realtime.md)
- [KDS WebSocket Integration](../../03-features/kds-revolution.md#websocket-events)