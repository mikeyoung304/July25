# API Reference

## Base Configuration

- **Base URL**: `http://localhost:3001/api/v1`
- **Format**: JSON
- **Naming**: camelCase for all fields
- **Authentication**: Bearer token (JWT) + CSRF token
- **Rate Limiting**: Endpoint-specific (see limits below)

## Authentication

### Required Headers

```javascript
{
  "Authorization": "Bearer <jwt-token>",
  "X-Restaurant-ID": "<restaurant-id>",
  "X-CSRF-Token": "<csrf-token>",
  "Content-Type": "application/json"
}
```

### CSRF Token

CSRF tokens are stored in httpOnly cookies and must be included in the `X-CSRF-Token` header for all non-GET requests.

## Endpoints

### Orders

#### Create Order
```http
POST /api/v1/orders
```

**Request Body:**
```json
{
  "tableNumber": "5",
  "type": "dine-in",
  "items": [
    {
      "menuItemId": "item-123",
      "quantity": 2,
      "modifiers": ["No onions", "Extra sauce"],
      "specialInstructions": "Well done"
    }
  ],
  "customerName": "John Doe",
  "customerPhone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-456",
    "orderNumber": "ORD-2025-001",
    "restaurantId": "rest-123",
    "status": "new",
    "items": [...],
    "subtotal": 25.98,
    "tax": 2.27,
    "totalAmount": 28.25,
    "createdAt": "2025-01-30T10:00:00Z"
  }
}
```

#### Get Orders
```http
GET /api/v1/orders?status=new,preparing&limit=20&page=1
```

**Query Parameters:**
- `status`: Filter by status (comma-separated)
- `limit`: Results per page (default: 20, max: 100)
- `page`: Page number (default: 1)
- `startDate`: ISO date string
- `endDate`: ISO date string

#### Update Order Status
```http
PATCH /api/v1/orders/:orderId/status
```

**Request Body:**
```json
{
  "status": "preparing",
  "notes": "Started cooking"
}
```

**Valid Status Transitions:**
- `new` → `pending`, `confirmed`, `cancelled`
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `preparing`, `cancelled`
- `preparing` → `ready`, `cancelled`
- `ready` → `completed`
- Any → `cancelled` (except `completed`)

### Menu

#### Get Menu Items
```http
GET /api/v1/menu/items?categoryId=cat-123&available=true
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "item-123",
      "restaurantId": "rest-123",
      "categoryId": "cat-456",
      "name": "Georgia Soul Bowl",
      "description": "Smoked sausage, field peas, collards",
      "price": 14.99,
      "isAvailable": true,
      "modifierGroups": [
        {
          "id": "mod-group-1",
          "name": "Add-ons",
          "required": false,
          "maxSelections": 3,
          "options": [
            {
              "id": "mod-1",
              "name": "Extra collards",
              "price": 2.00
            }
          ]
        }
      ],
      "imageUrl": "https://...",
      "preparationTime": 15,
      "dietaryFlags": ["gluten-free"],
      "createdAt": "2025-01-30T10:00:00Z"
    }
  ]
}
```

#### Create Menu Item
```http
POST /api/v1/menu/items
```

**Request Body:**
```json
{
  "categoryId": "cat-456",
  "name": "New Dish",
  "description": "Delicious new item",
  "price": 12.99,
  "isAvailable": true,
  "preparationTime": 20,
  "dietaryFlags": ["vegetarian"],
  "modifierGroups": []
}
```

#### Update Menu Item
```http
PUT /api/v1/menu/items/:itemId
```

### Tables

#### Get Tables
```http
GET /api/v1/tables
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "table-1",
      "restaurantId": "rest-123",
      "tableNumber": "5",
      "capacity": 4,
      "status": "available",
      "currentOrderId": null,
      "x": 100,
      "y": 200,
      "type": "square",
      "createdAt": "2025-01-30T10:00:00Z"
    }
  ]
}
```

#### Update Table Status
```http
PATCH /api/v1/tables/:tableId
```

**Request Body:**
```json
{
  "status": "occupied",
  "currentOrderId": "order-456"
}
```

### Payments

#### Process Payment
```http
POST /api/v1/payments
```

**Request Body:**
```json
{
  "orderId": "order-456",
  "amount": 28.25,
  "method": "card",
  "paymentMethodId": "pm_stripe_123",
  "tip": 5.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pay-789",
    "orderId": "order-456",
    "amount": 28.25,
    "tip": 5.00,
    "totalAmount": 33.25,
    "status": "succeeded",
    "method": "card",
    "transactionId": "ch_stripe_456",
    "createdAt": "2025-01-30T10:00:00Z"
  }
}
```

### Voice/AI

#### Create Realtime Session
```http
POST /api/v1/realtime/session
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess-123",
    "token": "ephemeral-token",
    "expiresAt": "2025-01-30T11:00:00Z",
    "iceServers": [
      {
        "urls": "stun:stun.l.google.com:19302"
      }
    ]
  }
}
```

#### Process Voice Order
```http
POST /api/v1/voice/process-order
```

**Request Body:**
```json
{
  "transcript": "I'd like two soul bowls with extra collards",
  "sessionId": "sess-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "interpretation": {
      "items": [
        {
          "menuItemId": "item-123",
          "quantity": 2,
          "modifiers": ["Extra collards"]
        }
      ],
      "confidence": 0.95
    },
    "suggestedResponse": "I've added 2 Georgia Soul Bowls with extra collards. Would you like anything else?"
  }
}
```

### WebSocket Events

Connect to: `ws://localhost:3001`

#### Authentication
```javascript
// After connection
socket.send(JSON.stringify({
  type: 'auth',
  token: 'jwt-token',
  restaurantId: 'rest-123'
}));
```

#### Order Events

**Subscribe to order updates:**
```javascript
socket.send(JSON.stringify({
  type: 'subscribe',
  channel: 'orders',
  restaurantId: 'rest-123'
}));
```

**Receive order events:**
```javascript
// Order created
{
  "type": "order:created",
  "data": { /* order object */ },
  "timestamp": "2025-01-30T10:00:00Z"
}

// Order status changed
{
  "type": "order:status_changed",
  "data": {
    "orderId": "order-456",
    "previousStatus": "new",
    "status": "preparing"
  },
  "timestamp": "2025-01-30T10:00:00Z"
}

// Order item status changed
{
  "type": "order:item_status_changed",
  "data": {
    "orderId": "order-456",
    "itemId": "item-123",
    "status": "ready"
  },
  "timestamp": "2025-01-30T10:00:00Z"
}
```

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "tableNumber": ["Table number is required"],
      "items": ["At least one item is required"]
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions or CSRF failure |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

## Rate Limits

| Endpoint | Limit | Window | Headers |
|----------|-------|--------|---------|
| Auth endpoints | 5 | 15 min | `X-RateLimit-*` |
| Order creation | 100 | 1 min | `X-RateLimit-*` |
| Voice processing | 30 | 1 min | `X-RateLimit-*` |
| Menu queries | 50 | 1 min | `X-RateLimit-*` |
| Default | 100 | 15 min | `X-RateLimit-*` |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706611200
```

## Pagination

All list endpoints support pagination:

```http
GET /api/v1/orders?page=2&limit=20
```

**Response includes:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 145,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Data Types

### Order Types
- `dine-in`: In-restaurant dining
- `takeout`: Customer pickup
- `delivery`: Delivery order
- `drive-thru`: Drive-through order

### Order Status
- `new`: Just created
- `pending`: Awaiting confirmation
- `confirmed`: Confirmed by kitchen
- `preparing`: Being prepared
- `ready`: Ready for pickup/service
- `completed`: Delivered/served
- `cancelled`: Cancelled

### Payment Methods
- `cash`: Cash payment
- `card`: Credit/debit card
- `mobile`: Mobile payment (Apple Pay, etc.)
- `terminal`: POS terminal

### Table Status
- `available`: Ready for seating
- `occupied`: Currently in use
- `reserved`: Reserved for future
- `cleaning`: Being cleaned
- `unavailable`: Out of service

## Testing

### Test Endpoints

In development mode, test endpoints are available:

```http
POST /api/v1/test/reset-db
POST /api/v1/test/seed-data
GET /api/v1/test/health
```

### Example cURL Commands

```bash
# Create order
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "X-Restaurant-ID: rest-123" \
  -H "X-CSRF-Token: <csrf>" \
  -H "Content-Type: application/json" \
  -d '{"tableNumber":"5","type":"dine-in","items":[...]}'

# Get orders
curl http://localhost:3001/api/v1/orders?status=new \
  -H "Authorization: Bearer <token>" \
  -H "X-Restaurant-ID: rest-123"
```

---

**Last Updated**: January 30, 2025  
**API Version**: v1  
**Application Version**: 6.0.2