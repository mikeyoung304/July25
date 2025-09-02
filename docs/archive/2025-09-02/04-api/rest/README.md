# REST API Reference

## Base URL

- **Development**: `http://localhost:3001/api/v1`
- **Production**: `https://api.your-domain.com/api/v1`

## Authentication

Most endpoints require JWT authentication:

```http
Authorization: Bearer {jwt-token}
```

Get a token via:
1. Supabase Auth (production)
2. Demo endpoint `/api/v1/auth/demo` (development)

## Common Headers

```http
Content-Type: application/json
x-restaurant-id: 11111111-1111-1111-1111-111111111111
Authorization: Bearer {token}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## Endpoints

### Health & Monitoring

#### GET /health
System health check

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-26T12:00:00Z",
  "version": "6.0.0"
}
```

#### GET /metrics
System metrics (Prometheus format)

**Response:**
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
```

### Authentication

#### GET /auth/demo
Get demo JWT token for testing

**Response:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": "demo-kiosk-user",
    "role": "kiosk_demo"
  }
}
```

### Menu Management

#### GET /menu
Get all menu items for restaurant

**Headers:**
- `x-restaurant-id`: Required

**Query Parameters:**
- `category`: Filter by category
- `active`: Filter active items (true/false)

**Response:**
```json
{
  "categories": [
    {
      "id": "bowls",
      "name": "Bowls",
      "items": [
        {
          "id": "123",
          "name": "Soul Bowl",
          "price": 18.00,
          "description": "Rice, black beans, chicken...",
          "category": "bowls"
        }
      ]
    }
  ]
}
```

#### GET /menu/:id
Get specific menu item

**Response:**
```json
{
  "id": "123",
  "name": "Soul Bowl",
  "price": 18.00,
  "description": "Rice, black beans, chicken...",
  "category": "bowls",
  "modifiers": []
}
```

#### POST /menu
Create menu item

**Auth Required:** Yes
**Role:** admin, manager

**Request Body:**
```json
{
  "name": "New Item",
  "price": 15.99,
  "category": "entrees",
  "description": "Description here"
}
```

#### PUT /menu/:id
Update menu item

**Auth Required:** Yes
**Role:** admin, manager

**Request Body:**
```json
{
  "price": 16.99,
  "description": "Updated description"
}
```

#### DELETE /menu/:id
Delete menu item

**Auth Required:** Yes
**Role:** admin

### Order Management

#### GET /orders
Get orders for restaurant

**Headers:**
- `x-restaurant-id`: Required

**Auth Required:** Yes

**Query Parameters:**
- `status`: Filter by status (new, pending, confirmed, preparing, ready, completed, cancelled)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset

**Response:**
```json
{
  "orders": [
    {
      "id": "456",
      "order_number": "A001",
      "status": "preparing",
      "items": [...],
      "total": 45.50,
      "created_at": "2025-01-26T12:00:00Z"
    }
  ],
  "total": 125
}
```

#### GET /orders/:id
Get specific order

**Auth Required:** Yes

**Response:**
```json
{
  "id": "456",
  "order_number": "A001",
  "status": "preparing",
  "customer_name": "John Doe",
  "items": [
    {
      "id": "789",
      "menu_item_id": "123",
      "name": "Soul Bowl",
      "quantity": 2,
      "price": 18.00,
      "modifiers": []
    }
  ],
  "subtotal": 36.00,
  "tax": 3.60,
  "total": 39.60
}
```

#### POST /orders
Create new order

**Headers:**
- `x-restaurant-id`: Required

**Auth Required:** Yes
**Scope:** orders:create

**Request Body:**
```json
{
  "items": [
    {
      "menu_item_id": "123",
      "quantity": 2,
      "modifiers": ["extra-chicken"]
    }
  ],
  "customer_name": "John Doe",
  "type": "dine-in",
  "table_id": "table-1"
}
```

#### POST /orders/voice
Create order from voice input

**Auth Required:** Yes
**Scope:** ai.voice:transcribe

**Request Body:**
```json
{
  "transcript": "I'd like two Soul Bowls with extra chicken",
  "context": {
    "customer_id": "cust-123"
  }
}
```

#### PUT /orders/:id/status
Update order status

**Auth Required:** Yes

**Request Body:**
```json
{
  "status": "ready",
  "notes": "Order ready for pickup"
}
```

### Payment Processing

#### POST /payments/process
Process payment via Square

**Auth Required:** Yes

**Request Body:**
```json
{
  "order_id": "456",
  "source_id": "cnon:card-nonce-from-square",
  "amount": 39.60,
  "tip_amount": 5.00,
  "idempotency_key": "unique-key-123"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "payment-123",
    "status": "COMPLETED",
    "receipt_url": "https://..."
  }
}
```

#### POST /payments/refund
Process refund

**Auth Required:** Yes
**Role:** manager, admin

**Request Body:**
```json
{
  "payment_id": "payment-123",
  "amount": 39.60,
  "reason": "Customer complaint"
}
```

### Table Management

#### GET /tables
Get all tables

**Headers:**
- `x-restaurant-id`: Required

**Response:**
```json
{
  "tables": [
    {
      "id": "table-1",
      "number": 1,
      "seats": 4,
      "status": "occupied",
      "section": "main",
      "position": { "x": 100, "y": 200 }
    }
  ]
}
```

#### PUT /tables/:id
Update table status

**Auth Required:** Yes

**Request Body:**
```json
{
  "status": "available",
  "server_id": "staff-123"
}
```

### AI Services

#### POST /ai/transcribe
Transcribe audio to text

**Auth Required:** Yes
**Scope:** ai.voice:transcribe

**Request Body (multipart/form-data):**
- `audio`: Audio file (wav, mp3, webm)

**Response:**
```json
{
  "transcript": "I would like to order a Soul Bowl"
}
```

#### POST /ai/tts
Text to speech

**Auth Required:** Yes

**Request Body:**
```json
{
  "text": "Your order total is $39.60",
  "voice": "alloy"
}
```

**Response:** Audio stream (audio/mpeg)

#### POST /realtime/session
Create WebRTC session for voice

**Auth Required:** Yes

**Response:**
```json
{
  "client_secret": {
    "value": "eph_token_xxx",
    "expires_at": 1234567890
  }
}
```

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per user
- **Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## WebSocket Events

Connect to `ws://localhost:3001` for real-time updates.

### Events

#### orderUpdate
```json
{
  "type": "orderUpdate",
  "data": {
    "order_id": "456",
    "status": "ready",
    "updated_at": "2025-01-26T12:00:00Z"
  }
}
```

#### kitchenAlert
```json
{
  "type": "kitchenAlert",
  "data": {
    "message": "Order A001 is delayed",
    "severity": "warning"
  }
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTH_REQUIRED` | Authentication required | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Invalid request data | 400 |
| `RATE_LIMIT` | Too many requests | 429 |
| `SERVER_ERROR` | Internal server error | 500 |

## Development Notes

- Demo mode available without Square credentials
- Mock data endpoints available in development
- CORS enabled for localhost:5173 in development
- Debug logging available with `DEBUG=api:*` env var