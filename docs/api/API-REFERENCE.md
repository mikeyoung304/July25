# Restaurant OS API Reference

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication

Most endpoints require authentication via JWT Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

Restaurant context is provided via the `x-restaurant-id` header:
```
x-restaurant-id: 11111111-1111-1111-1111-111111111111
```

## API Endpoints

---

## Health & Monitoring

### GET /api/v1/
**Purpose**: Basic health check  
**Authentication**: Not required  
**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-26T00:00:00.000Z",
  "uptime": 123456,
  "environment": "development"
}
```

### GET /api/v1/status
**Purpose**: Detailed system health status including all services  
**Authentication**: Not required  
**Response**:
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "ISO8601",
  "uptime": 123456,
  "environment": "string",
  "version": "string",
  "services": {
    "database": {
      "status": "connected|disconnected|error",
      "latency": 123
    },
    "cache": {
      "status": "active|inactive",
      "keys": 10,
      "hits": 100,
      "misses": 5
    },
    "ai": {
      "status": "healthy|degraded|unhealthy",
      "provider": "openai|stubs"
    }
  }
}
```

### GET /api/v1/ready
**Purpose**: Kubernetes readiness probe  
**Authentication**: Not required  
**Response**: 200 OK if ready, 503 if not ready

### GET /api/v1/live
**Purpose**: Kubernetes liveness probe  
**Authentication**: Not required  
**Response**: 200 OK if alive

### POST /api/v1/metrics
**Purpose**: Receive client performance metrics  
**Authentication**: Not required  
**Request Body**:
```json
{
  "timestamp": "ISO8601",
  "slowRenders": 5,
  "slowAPIs": 2,
  "stats": {}
}
```

---

## Authentication

### POST /api/v1/auth/kiosk
**Purpose**: Issue short-lived JWT for kiosk demo sessions  
**Authentication**: Not required  
**Request Body**:
```json
{
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```
**Response**:
```json
{
  "token": "jwt-token",
  "expiresIn": 3600
}
```
**Notes**: Only works with allowed demo restaurant IDs

---

## Restaurant Information

### GET /api/v1/restaurants/:id
**Purpose**: Get restaurant basic information  
**Authentication**: Optional  
**Parameters**:
- `id` (path): Restaurant UUID
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Restaurant Name",
    "timezone": "UTC",
    "currency": "USD",
    "taxRate": 0.08,
    "defaultTipPercentages": [15, 18, 20],
    "logoUrl": "string",
    "address": "string",
    "phone": "string",
    "businessHours": {},
    "description": "string"
  }
}
```

---

## Menu Management

### GET /api/v1/menu
**Purpose**: Get full menu with categories  
**Authentication**: Optional  
**Headers**: `x-restaurant-id`  
**Response**:
```json
{
  "categories": [...],
  "items": [...],
  "lastUpdated": "ISO8601"
}
```

### GET /api/v1/menu/items
**Purpose**: Get all menu items  
**Authentication**: Optional  
**Headers**: `x-restaurant-id`  
**Response**: Array of menu items

### GET /api/v1/menu/items/:id
**Purpose**: Get single menu item  
**Authentication**: Optional  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `id` (path): Item ID
**Response**: Menu item object

### GET /api/v1/menu/categories
**Purpose**: Get menu categories  
**Authentication**: Optional  
**Headers**: `x-restaurant-id`  
**Response**: Array of categories

### POST /api/v1/menu/sync-ai
**Purpose**: Sync menu to AI Gateway  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Response**:
```json
{
  "success": true,
  "message": "Menu synced to AI service",
  "timestamp": "ISO8601"
}
```

### POST /api/v1/menu/cache/clear
**Purpose**: Clear menu cache  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Response**:
```json
{
  "success": true,
  "message": "Menu cache cleared",
  "timestamp": "ISO8601"
}
```

---

## Order Management

### GET /api/v1/orders
**Purpose**: List orders with filters  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Query Parameters**:
- `status`: OrderStatus (new|pending|confirmed|preparing|ready|completed|cancelled)
- `type`: OrderType (online|pickup|delivery)
- `startDate`: ISO8601 date string
- `endDate`: ISO8601 date string
- `limit`: number (default: 50)
- `offset`: number (default: 0)
**Response**: Array of orders

### POST /api/v1/orders
**Purpose**: Create new order  
**Authentication**: Required (roles: admin, manager, user, kiosk_demo)  
**Scopes**: orders:create  
**Headers**: `x-restaurant-id`  
**Request Body**:
```json
{
  "items": [
    {
      "menuItemId": "string",
      "quantity": 1,
      "modifications": [],
      "specialInstructions": "string"
    }
  ],
  "type": "online|pickup|delivery",
  "customerInfo": {}
}
```
**Response**: Created order object

### POST /api/v1/orders/voice
**Purpose**: Process voice order  
**Authentication**: Required (roles: admin, manager, user, kiosk_demo)  
**Scopes**: orders:create  
**Headers**: `x-restaurant-id`  
**Request Body**:
```json
{
  "transcription": "I'd like a Soul Bowl",
  "audioUrl": "optional-url",
  "metadata": {}
}
```
**Response**:
```json
{
  "success": true,
  "order": {},
  "confidence": 0.85,
  "message": "Perfect! Your Soul Bowl will be ready in about 10 minutes."
}
```

### GET /api/v1/orders/:id
**Purpose**: Get single order  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `id` (path): Order ID
**Response**: Order object

### PATCH /api/v1/orders/:id/status
**Purpose**: Update order status  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `id` (path): Order ID
**Request Body**:
```json
{
  "status": "new|pending|confirmed|preparing|ready|completed|cancelled",
  "notes": "optional notes"
}
```
**Response**: Updated order object

### DELETE /api/v1/orders/:id
**Purpose**: Cancel order  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `id` (path): Order ID
**Request Body**:
```json
{
  "reason": "Cancellation reason"
}
```
**Response**: Updated order with cancelled status

---

## Payment Processing

### POST /api/v1/payments/create
**Purpose**: Process payment  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Request Body**:
```json
{
  "orderId": "uuid",
  "token": "payment-token",
  "amount": 25.99,
  "idempotencyKey": "optional-unique-key",
  "verificationToken": "optional-3d-secure-token"
}
```
**Response**:
```json
{
  "success": true,
  "paymentId": "payment-id",
  "status": "COMPLETED",
  "receiptUrl": "url",
  "order": {}
}
```

### GET /api/v1/payments/:paymentId
**Purpose**: Get payment details  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `paymentId` (path): Payment ID
**Response**:
```json
{
  "success": true,
  "payment": {}
}
```

### POST /api/v1/payments/:paymentId/refund
**Purpose**: Refund payment  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `paymentId` (path): Payment ID
**Request Body**:
```json
{
  "amount": 10.00,
  "reason": "Refund reason"
}
```
**Response**:
```json
{
  "success": true,
  "refund": {}
}
```

---

## Terminal Payments

### POST /api/v1/terminal/checkout
**Purpose**: Create terminal checkout  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Request Body**:
```json
{
  "orderId": "uuid",
  "deviceId": "terminal-device-id"
}
```
**Response**:
```json
{
  "success": true,
  "checkout": {
    "id": "checkout-id",
    "status": "IN_PROGRESS",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

### GET /api/v1/terminal/checkout/:checkoutId
**Purpose**: Get terminal checkout status  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `checkoutId` (path): Checkout ID
**Response**: Checkout details with payment info if completed

### POST /api/v1/terminal/checkout/:checkoutId/cancel
**Purpose**: Cancel terminal checkout  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `checkoutId` (path): Checkout ID
**Response**: Updated checkout status

### POST /api/v1/terminal/checkout/:checkoutId/complete
**Purpose**: Complete order after successful terminal payment  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `checkoutId` (path): Checkout ID
**Response**: Updated order with payment confirmation

### GET /api/v1/terminal/devices
**Purpose**: List available terminal devices  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Response**:
```json
{
  "success": true,
  "devices": [
    {
      "id": "device-id",
      "name": "Terminal 1",
      "deviceId": "uuid",
      "status": "PAIRED"
    }
  ]
}
```

---

## Table Management

### GET /api/v1/tables
**Purpose**: Get all tables for a restaurant  
**Authentication**: Not required in development  
**Headers**: `x-restaurant-id`  
**Response**: Array of table objects with x, y positions and shape

### GET /api/v1/tables/:id
**Purpose**: Get single table  
**Authentication**: Not required in development  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `id` (path): Table ID
**Response**: Table object

### POST /api/v1/tables
**Purpose**: Create new table  
**Authentication**: Not required in development  
**Headers**: `x-restaurant-id`  
**Request Body**:
```json
{
  "x": 100,
  "y": 200,
  "type": "rectangle|circle",
  "label": "Table 1",
  "seats": 4,
  "width": 100,
  "height": 100
}
```
**Response**: Created table object

### PUT /api/v1/tables/:id
**Purpose**: Update table  
**Authentication**: Not required in development  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `id` (path): Table ID
**Request Body**: Table update fields
**Response**: Updated table object

### PUT /api/v1/tables/batch
**Purpose**: Batch update multiple tables  
**Authentication**: Not required in development  
**Headers**: `x-restaurant-id`  
**Request Body**:
```json
{
  "tables": [
    {
      "id": "uuid",
      "x": 100,
      "y": 200,
      "...other fields"
    }
  ]
}
```
**Response**: Array of updated tables

### DELETE /api/v1/tables/:id
**Purpose**: Soft delete table  
**Authentication**: Not required in development  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `id` (path): Table ID
**Response**: Success confirmation

### PATCH /api/v1/tables/:id/status
**Purpose**: Update table status  
**Authentication**: Not required in development  
**Headers**: `x-restaurant-id`  
**Parameters**:
- `id` (path): Table ID
**Request Body**:
```json
{
  "status": "available|occupied|reserved",
  "orderId": "optional-order-id"
}
```
**Response**: Updated table object

---

## AI Services

### POST /api/v1/ai/menu
**Purpose**: Upload menu data for AI parsing  
**Authentication**: Required (roles: admin, manager)  
**Headers**: `x-restaurant-id`  
**Response**:
```json
{
  "success": true,
  "message": "Menu loaded for AI processing successfully",
  "restaurantId": "uuid"
}
```

### GET /api/v1/ai/menu
**Purpose**: Get current AI menu  
**Authentication**: Required  
**Response**: Current menu loaded in AI service

### POST /api/v1/ai/transcribe
**Purpose**: Transcribe audio file  
**Authentication**: Not required  
**Headers**: `x-restaurant-id`  
**Request**: multipart/form-data with 'audio' file  
**Response**: audio/mpeg audio response

### POST /api/v1/ai/transcribe-with-metadata
**Purpose**: Transcribe audio with metadata  
**Authentication**: Not required  
**Headers**: `x-restaurant-id`  
**Request**: multipart/form-data with 'audio' file  
**Response**:
```json
{
  "success": true,
  "text": "transcribed text",
  "transcript": "transcribed text",
  "duration": 5.2,
  "restaurantId": "uuid"
}
```

### POST /api/v1/ai/parse-order
**Purpose**: Parse order from text using OpenAI  
**Authentication**: Required  
**Request Body**:
```json
{
  "text": "I want a Soul Bowl with extra greens"
}
```
**Response**:
```json
{
  "success": true,
  "items": [...],
  "confidence": 0.85,
  "restaurantId": "uuid"
}
```

### POST /api/v1/ai/voice-chat
**Purpose**: Process voice audio and return response  
**Authentication**: Required (roles: admin, manager, user, kiosk_demo)  
**Scopes**: ai.voice:chat  
**Headers**: 
- `x-restaurant-id`
- `Accept: audio/mpeg` (for audio response)
**Request**: multipart/form-data with 'audio' file  
**Response**: Either audio/mpeg or JSON with transcript and response

### POST /api/v1/ai/chat
**Purpose**: Chat with AI assistant using OpenAI  
**Authentication**: Required  
**Request Body**:
```json
{
  "message": "What sandwiches do you have?"
}
```
**Response**:
```json
{
  "success": true,
  "message": "We've got awesome sandwiches like the BLT and Italian Sub!",
  "restaurantId": "uuid"
}
```

### GET /api/v1/ai/health
**Purpose**: Check AI service health  
**Authentication**: Not required  
**Response**:
```json
{
  "ok": true
}
```

### POST /api/v1/ai/test-tts
**Purpose**: Test text-to-speech (development)  
**Authentication**: Not required  
**Request Body**:
```json
{
  "text": "Hello, this is a test"
}
```
**Response**: audio/mpeg audio file

### POST /api/v1/ai/test-transcribe
**Purpose**: Test transcription (development)  
**Authentication**: Not required  
**Request**: multipart/form-data with 'audio' file  
**Response**:
```json
{
  "success": true,
  "text": "transcribed text",
  "duration": 3.5
}
```

---

## Real-time Voice (WebRTC)

### POST /api/v1/realtime/session
**Purpose**: Create ephemeral token for WebRTC real-time voice  
**Authentication**: Required  
**Headers**: `x-restaurant-id`  
**Response**:
```json
{
  "id": "session-id",
  "client_secret": {
    "value": "ephemeral-token",
    "expires_at": 1234567890
  },
  "restaurant_id": "uuid",
  "menu_context": "formatted menu text",
  "expires_at": 1234567890
}
```

### GET /api/v1/realtime/health
**Purpose**: Check real-time service health  
**Authentication**: Not required  
**Response**:
```json
{
  "status": "healthy|unhealthy",
  "checks": {
    "api_key": true,
    "model_configured": true,
    "model": "gpt-4o-realtime-preview-2025-06-03"
  },
  "timestamp": "ISO8601"
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

## Rate Limiting

The API implements rate limiting on various endpoints:
- AI endpoints: Limited requests per minute
- Transcription endpoints: Limited requests per minute
- Health checks: Limited to prevent abuse

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

## WebSocket Events

The server also supports WebSocket connections for real-time updates:
- Order status updates
- Kitchen display updates
- Table status changes

WebSocket endpoint: `ws://localhost:3001/ws`

## Notes

1. All timestamps are in ISO 8601 format
2. All monetary values are in the restaurant's configured currency
3. UUIDs are used for all entity IDs
4. The API supports multi-tenancy via restaurant context
5. Development mode may have relaxed authentication requirements
6. Square payment integration requires proper environment variables
7. OpenAI integration requires API key configuration