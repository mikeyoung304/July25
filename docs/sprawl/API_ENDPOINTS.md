# API Endpoints Reference

**Base URL**: `http://localhost:3001` (development) | `https://api.growfresh.com` (production)

## 🔐 Authentication

All API endpoints require:
- **Authorization Header**: `Bearer <supabase-jwt-token>`
- **Restaurant ID Header**: `X-Restaurant-ID: <restaurant-uuid>`

## 📊 Health & Monitoring

### Health Check
```http
GET /health
```
Returns basic server health status.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-07-13T10:00:00Z"
}
```

### Detailed Status
```http
GET /api/v1/status
```
Returns detailed system status including database connectivity.

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "ai": "ready",
    "websocket": "active"
  }
}
```

## 🍔 Menu Management

### Get Full Menu
```http
GET /api/v1/menu
```
Returns complete menu with categories and items.

**Response**:
```json
{
  "categories": [
    {
      "id": "123",
      "name": "Burgers",
      "items": [
        {
          "id": "456",
          "name": "Bacon Burger",
          "price": 12.00,
          "description": "Juicy burger with crispy bacon"
        }
      ]
    }
  ]
}
```

### Get All Menu Items
```http
GET /api/v1/menu/items
```
Returns flat list of all menu items.

### Get Single Menu Item
```http
GET /api/v1/menu/items/:id
```
Returns details for a specific menu item.

### Get Menu Categories
```http
GET /api/v1/menu/categories
```
Returns all menu categories.

### Sync Menu to AI
```http
POST /api/v1/menu/sync-ai
```
Uploads current menu to AI service for voice ordering.

## 📝 Order Management

### List Orders
```http
GET /api/v1/orders
```

**Query Parameters**:
- `status`: Filter by order status (new, in_progress, ready, completed)
- `date`: Filter by date (YYYY-MM-DD)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset

**Response**:
```json
{
  "orders": [
    {
      "id": "789",
      "order_number": "A001",
      "status": "new",
      "total_amount": 25.50,
      "created_at": "2025-07-13T10:00:00Z",
      "items": [...]
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### Create Order
```http
POST /api/v1/orders
```

**Request Body**:
```json
{
  "order_type": "dine_in",
  "table_id": "table-123",
  "items": [
    {
      "menu_item_id": "456",
      "quantity": 2,
      "modifiers": ["no pickles", "extra cheese"],
      "special_instructions": "Well done"
    }
  ]
}
```

### Get Single Order
```http
GET /api/v1/orders/:id
```
Returns complete order details including all items.

### Update Order Status
```http
PATCH /api/v1/orders/:id/status
```

**Request Body**:
```json
{
  "status": "in_progress"
}
```

**Valid Status Values**:
- `new` - Just created
- `in_progress` - Kitchen preparing
- `ready` - Ready for pickup/serve
- `completed` - Delivered/picked up
- `cancelled` - Order cancelled

### Process Voice Order
```http
POST /api/v1/orders/voice
```
Creates order from voice transcript.

**Request Body**:
```json
{
  "transcript": "I'll have two bacon burgers and a large coke",
  "order_type": "drive_thru"
}
```

## 🪑 Table Management

### List Tables
```http
GET /api/v1/tables
```
Returns all tables for the restaurant.

### Get Table
```http
GET /api/v1/tables/:id
```
Returns specific table details.

### Update Table
```http
PATCH /api/v1/tables/:id
```

**Request Body**:
```json
{
  "status": "occupied",
  "current_order_id": "order-123"
}
```

## 🏢 Floor Plan

### Get Floor Plan
```http
GET /api/v1/floor-plan
```
Returns saved floor plan layout.

### Save Floor Plan
```http
PUT /api/v1/floor-plan
```

**Request Body**:
```json
{
  "tables": [
    {
      "id": "table-1",
      "name": "Table 1",
      "type": "round",
      "seats": 4,
      "position": { "x": 100, "y": 200 },
      "rotation": 0
    }
  ]
}
```

## 🤖 AI/Voice Services

### Transcribe Audio
```http
POST /api/v1/ai/transcribe
```
Converts audio to text using Whisper.

**Request**: Multipart form data with audio file

**Response**:
```json
{
  "transcript": "I'll have a bacon burger please",
  "confidence": 0.95
}
```

### Chat Completion
```http
POST /api/v1/ai/chat
```
Natural language processing for orders.

**Request Body**:
```json
{
  "message": "What desserts do you have?",
  "context": "ordering"
}
```

### Parse Order
```http
POST /api/v1/ai/parse-order
```
Extracts structured order from natural language.

**Request Body**:
```json
{
  "transcript": "Two burgers, one with no pickles, and a large fries"
}
```

**Response**:
```json
{
  "items": [
    {
      "name": "Burger",
      "quantity": 2,
      "modifiers": ["no pickles (1)"]
    },
    {
      "name": "Fries",
      "quantity": 1,
      "size": "large"
    }
  ]
}
```

### Upload Menu to AI
```http
POST /api/v1/ai/menu-upload
```
Updates AI service with current menu for accurate voice ordering.

## 🔄 WebSocket Events

**Connection URL**: `ws://localhost:3001` (development)

### Client → Server Events

#### Join Restaurant
```json
{
  "type": "join-restaurant",
  "restaurantId": "11111111-1111-1111-1111-111111111111"
}
```

#### Voice Stream Start
```json
{
  "type": "voice-start",
  "mode": "kiosk"
}
```

#### Voice Audio Data
Binary audio data chunks sent during recording.

### Server → Client Events

#### Order Updated
```json
{
  "type": "order-updated",
  "order": {
    "id": "123",
    "status": "ready",
    "order_number": "A001"
  }
}
```

#### New Order
```json
{
  "type": "new-order",
  "order": {
    "id": "456",
    "order_number": "A002",
    "items": [...]
  }
}
```

#### Voice Response
```json
{
  "type": "voice-response",
  "transcript": "I'll have a burger",
  "response": "Great! I've added a burger to your order.",
  "items": [
    {
      "name": "Burger",
      "price": 9.00,
      "quantity": 1
    }
  ]
}
```

## 📊 Analytics (Coming Soon)

### Order Analytics
```http
GET /api/v1/analytics/orders
```

### Revenue Reports
```http
GET /api/v1/analytics/revenue
```

### Popular Items
```http
GET /api/v1/analytics/popular-items
```

## 🔒 Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid order data",
    "details": {
      "field": "items",
      "issue": "Items array cannot be empty"
    }
  }
}
```

**Common Error Codes**:
- `UNAUTHORIZED` - Missing or invalid auth token
- `FORBIDDEN` - No access to resource
- `NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Invalid request data
- `INTERNAL_ERROR` - Server error

## 📈 Rate Limits

- **General API**: 100 requests per minute
- **AI Endpoints**: 20 requests per minute
- **WebSocket**: 1 connection per client

---

**Note**: All endpoints return JSON with `Content-Type: application/json` unless otherwise specified.