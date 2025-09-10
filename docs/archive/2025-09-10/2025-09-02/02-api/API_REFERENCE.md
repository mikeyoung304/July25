# Restaurant OS API Reference v6.0.3

## Base URL
- Development: `http://localhost:3001/api/v1`
- Production: `https://api.restaurant-os.com/api/v1`

## Authentication

All API endpoints require authentication unless marked as public. The system supports multiple authentication methods:

### Authentication Methods

1. **JWT Token (Managers/Owners)**
   - Header: `Authorization: Bearer <token>`
   - Obtained from `/api/v1/auth/login`
   - 8-hour expiration

2. **PIN Authentication (Staff)**
   - Header: `Authorization: Bearer <token>`
   - Obtained from `/api/v1/auth/pin/login`
   - 12-hour expiration

3. **Station Token (Kitchen/Expo)**
   - Header: `Authorization: Bearer <token>`
   - Obtained from `/api/v1/auth/station/login`
   - Device-bound, no expiration

4. **Session Cookie (Customers)**
   - Cookie: `session_token`
   - Automatic for kiosk/online orders

## Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|---------|
| Authentication | 5 req | 15 min |
| Orders | 100 req | 1 min |
| Voice | 10 req | 1 min |
| General API | 60 req | 1 min |

## API Endpoints

### Health & Monitoring

#### GET /health
Health check endpoint (public)

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-01T00:00:00Z",
  "uptime": 12345.67,
  "environment": "development"
}
```

#### GET /api/v1/metrics
System metrics (requires admin role)

**Response:**
```json
{
  "connections": {
    "websocket": 5,
    "http": 23
  },
  "performance": {
    "avgResponseTime": 45,
    "requestsPerSecond": 12
  }
}
```

### Authentication Endpoints

#### POST /api/v1/auth/login
Email/password login for managers

**Request:**
```json
{
  "email": "manager@restaurant.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "manager@restaurant.com",
    "role": "manager",
    "restaurant_id": "restaurant_id"
  },
  "expiresIn": 28800
}
```

#### POST /api/v1/auth/pin/login
PIN-based login for service staff

**Request:**
```json
{
  "pin": "1234",
  "restaurant_id": "restaurant_id"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Server",
    "role": "server",
    "restaurant_id": "restaurant_id"
  },
  "expiresIn": 43200
}
```

#### POST /api/v1/auth/station/login
Station login for kitchen/expo displays

**Request:**
```json
{
  "station_code": "KITCHEN01",
  "restaurant_id": "restaurant_id"
}
```

**Response:**
```json
{
  "token": "station_token",
  "station": {
    "id": "station_id",
    "type": "kitchen",
    "restaurant_id": "restaurant_id"
  }
}
```

#### POST /api/v1/auth/logout
Logout (invalidates token)

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/v1/auth/refresh
Refresh authentication token

**Request:**
```json
{
  "refresh_token": "refresh_token_here"
}
```

**Response:**
```json
{
  "token": "new_jwt_token",
  "expiresIn": 28800
}
```

### User Management

#### GET /api/v1/users
List users (requires manager role)

**Query Parameters:**
- `restaurant_id` - Filter by restaurant
- `role` - Filter by role
- `active` - Filter active/inactive

**Response:**
```json
{
  "users": [
    {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@restaurant.com",
      "role": "server",
      "active": true
    }
  ],
  "total": 25
}
```

#### POST /api/v1/users
Create new user (requires manager role)

**Request:**
```json
{
  "name": "Jane Server",
  "email": "jane@restaurant.com",
  "role": "server",
  "pin": "5678",
  "restaurant_id": "restaurant_id"
}
```

### Orders

#### GET /api/v1/orders
List orders

**Query Parameters:**
- `restaurant_id` - Required
- `status` - Filter by status (new, pending, confirmed, preparing, ready, completed, cancelled)
- `date_from` - Start date
- `date_to` - End date
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset

**Response:**
```json
{
  "orders": [
    {
      "id": "order_id",
      "order_number": "ORD-001",
      "status": "preparing",
      "items": [...],
      "total": 45.99,
      "created_at": "2025-09-01T00:00:00Z"
    }
  ],
  "total": 150,
  "has_more": true
}
```

#### POST /api/v1/orders
Create new order

**Request:**
```json
{
  "restaurant_id": "restaurant_id",
  "type": "dine-in",
  "table_number": 5,
  "items": [
    {
      "menu_item_id": "item_id",
      "quantity": 2,
      "modifiers": ["no-onions"],
      "special_instructions": "Extra sauce"
    }
  ],
  "customer": {
    "name": "John Doe",
    "phone": "555-0123"
  }
}
```

#### PATCH /api/v1/orders/:id/status
Update order status

**Request:**
```json
{
  "status": "preparing",
  "notes": "Started preparation"
}
```

### Menu Management

#### GET /api/v1/menu
Get menu items

**Query Parameters:**
- `restaurant_id` - Required
- `category_id` - Filter by category
- `active` - Show only active items
- `available` - Show only available items

**Response:**
```json
{
  "categories": [...],
  "items": [...],
  "modifiers": [...]
}
```

#### POST /api/v1/menu/items
Create menu item (requires manager role)

**Request:**
```json
{
  "restaurant_id": "restaurant_id",
  "name": "Cheeseburger",
  "description": "Classic beef burger with cheese",
  "price": 12.99,
  "category_id": "category_id",
  "modifiers": [...],
  "dietary_flags": ["gluten-free-available"]
}
```

### Payment Processing

#### POST /api/v1/payments/process
Process payment

**Request:**
```json
{
  "order_id": "order_id",
  "amount": 45.99,
  "payment_method": "card",
  "payment_details": {
    "source_id": "square_source_id"
  }
}
```

**Response:**
```json
{
  "payment_id": "payment_id",
  "status": "completed",
  "receipt_url": "https://..."
}
```

#### POST /api/v1/payments/refund
Process refund (requires manager role)

**Request:**
```json
{
  "payment_id": "payment_id",
  "amount": 10.00,
  "reason": "Item unavailable"
}
```

### AI & Voice Services

#### POST /api/v1/realtime/session
Create OpenAI Realtime session for voice ordering

**Response:**
```json
{
  "session_token": "ephemeral_token",
  "expires_at": "2025-09-01T01:00:00Z",
  "model": "gpt-4o-realtime-preview-2025-06-03"
}
```

#### POST /api/v1/orders/voice
Create order from voice input

**Request:**
```json
{
  "transcript": "I'd like two cheeseburgers and a large fries",
  "restaurant_id": "restaurant_id",
  "metadata": {
    "session_id": "voice_session_id"
  }
}
```

### Terminal/POS Operations

#### POST /api/v1/terminal/clock-in
Clock in staff member

**Request:**
```json
{
  "pin": "1234",
  "terminal_id": "POS01"
}
```

#### POST /api/v1/terminal/clock-out
Clock out staff member

**Request:**
```json
{
  "user_id": "user_id",
  "terminal_id": "POS01"
}
```

#### GET /api/v1/terminal/drawer/:terminal_id
Get cash drawer status

**Response:**
```json
{
  "terminal_id": "POS01",
  "drawer_open": false,
  "starting_cash": 200.00,
  "current_cash": 456.75,
  "last_opened": "2025-09-01T09:00:00Z"
}
```

## WebSocket Events

### Connection

Connect to WebSocket at: `ws://localhost:3001` (or production URL)

**Authentication:**
Include token in connection headers:
```javascript
const ws = new WebSocket('ws://localhost:3001', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});
```

### Event Types

#### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `order:new` | New order created | Order object |
| `order:status` | Order status changed | `{order_id, status, timestamp}` |
| `order:updated` | Order modified | Order object |
| `kitchen:order_ready` | Order ready for pickup | `{order_id, order_number}` |
| `payment:completed` | Payment processed | `{order_id, payment_id, amount}` |
| `table:status` | Table status changed | `{table_id, status}` |
| `connection:ready` | WebSocket connected | `{client_id}` |

#### Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `subscribe:orders` | Subscribe to order updates | `{restaurant_id}` |
| `subscribe:kitchen` | Subscribe to kitchen events | `{restaurant_id, station_id}` |
| `order:acknowledge` | Acknowledge order receipt | `{order_id}` |
| `ping` | Keep connection alive | `{timestamp}` |

### Example WebSocket Usage

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  // Subscribe to restaurant orders
  ws.send(JSON.stringify({
    type: 'subscribe:orders',
    restaurant_id: 'restaurant_id'
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  
  switch(event.type) {
    case 'order:new':
      console.log('New order:', event.order);
      break;
    case 'order:status':
      console.log('Order status update:', event);
      break;
  }
});
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional context"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `CONFLICT` | 409 | Resource conflict (duplicate) |
| `SERVER_ERROR` | 500 | Internal server error |

## CORS Configuration

Production CORS settings:
- Allowed origins: Configured via environment
- Allowed methods: GET, POST, PUT, PATCH, DELETE
- Allowed headers: Content-Type, Authorization
- Credentials: true (cookies enabled)

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit` - Results per page (max: 100)
- `offset` - Skip N results
- `cursor` - Cursor-based pagination (where supported)

**Response Headers:**
- `X-Total-Count` - Total number of results
- `X-Has-More` - Boolean indicating more results

## Versioning

The API uses URL versioning: `/api/v1/`

Breaking changes will increment the version number. Non-breaking changes and additions can be made to the current version.

## SDK Support

Official SDKs available for:
- TypeScript/JavaScript (included in `/shared`)
- React hooks (`/client/src/hooks`)

## Support

For API support and questions:
- GitHub Issues: https://github.com/mikeyoung304/July25/issues
- Documentation: https://docs.restaurant-os.com