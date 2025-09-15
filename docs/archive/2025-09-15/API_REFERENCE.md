# API Reference - Restaurant OS v6.0.4

## Base URL
- Development: `http://localhost:3001/api/v1`
- Production: `https://{your-domain}/api/v1`

## Authentication
All endpoints except public ones require JWT authentication via Authorization header:
```
Authorization: Bearer <token>
```

**Role Hierarchy (v6.0.4)**: Higher roles automatically inherit permissions from lower roles. See [AUTHENTICATION_MASTER.md](./AUTHENTICATION_MASTER.md) for complete authentication documentation including the role hierarchy system.

## API Endpoints

### Authentication (`/auth`)

#### POST `/auth/kiosk`
Create anonymous session for customer self-service
- **Auth**: None
- **Body**: `{ restaurant_id: string }`
- **Returns**: `{ token: string, user: { role: 'customer' } }`
- **Token**: HS256 signed, 1 hour expiry

#### POST `/auth/login`
Email/password authentication for managers and staff
- **Auth**: None
- **Body**: `{ email: string, password: string, restaurant_id: string }`
- **Returns**: `{ token: string, user: User, restaurant: Restaurant }`

#### POST `/auth/pin-login`
PIN-based authentication for service staff
- **Auth**: None
- **Body**: `{ pin: string, restaurant_id: string }`
- **Returns**: `{ token: string, user: User }`

#### POST `/auth/station-login`
Create station token for shared devices (kitchen/expo)
- **Auth**: Required (manager role)
- **Body**: `{ station_type: 'kitchen' | 'expo', restaurant_id: string }`
- **Returns**: `{ token: string, station: Station }`

#### POST `/auth/logout`
Invalidate current session
- **Auth**: Required
- **Returns**: `{ success: true }`

#### GET `/auth/me`
Get current user information
- **Auth**: Required
- **Returns**: `{ user: User, restaurant: Restaurant }`

#### POST `/auth/refresh`
Refresh authentication token
- **Auth**: None (uses refresh token)
- **Body**: `{ refresh_token: string }`
- **Returns**: `{ token: string, refresh_token: string }`

#### POST `/auth/set-pin`
Set or update user PIN
- **Auth**: Required
- **Body**: `{ pin: string }`
- **Returns**: `{ success: true }`

#### POST `/auth/revoke-stations`
Revoke all station tokens for restaurant
- **Auth**: Required (manager role)
- **Returns**: `{ revoked: number }`

### Orders (`/orders`)

#### GET `/orders`
List orders for restaurant
- **Auth**: Required
- **Query**: `{ status?: string, limit?: number, offset?: number }`
- **Returns**: `{ orders: Order[], total: number }`

#### POST `/orders`
Create new order
- **Auth**: Required
- **Body**: `{ items: OrderItem[], type: OrderType, table_id?: string }`
- **Returns**: `{ order: Order }`

#### POST `/orders/voice`
Create order from voice input
- **Auth**: Required
- **Body**: `{ transcription: string, menu_context?: any }`
- **Returns**: `{ order: Order, parsed_items: ParsedItem[] }`

#### GET `/orders/:id`
Get order details
- **Auth**: Required
- **Returns**: `{ order: Order }`

#### PATCH `/orders/:id/status`
Update order status
- **Auth**: Required
- **Body**: `{ status: OrderStatus }`
- **Returns**: `{ order: Order }`

#### DELETE `/orders/:id`
Cancel order
- **Auth**: Required
- **Returns**: `{ success: true }`

### Menu (`/menu`)

#### GET `/menu`
Get full menu for restaurant
- **Auth**: Optional
- **Query**: `{ restaurant_id: string }`
- **Returns**: `{ categories: Category[], items: MenuItem[] }`

#### GET `/menu/items`
List menu items
- **Auth**: Optional
- **Query**: `{ restaurant_id: string, category?: string }`
- **Returns**: `{ items: MenuItem[] }`

#### GET `/menu/items/:id`
Get menu item details
- **Auth**: Optional
- **Returns**: `{ item: MenuItem }`

#### GET `/menu/categories`
List menu categories
- **Auth**: Optional
- **Query**: `{ restaurant_id: string }`
- **Returns**: `{ categories: Category[] }`

#### POST `/menu/sync-ai`
Sync menu with AI service
- **Auth**: Optional
- **Body**: `{ restaurant_id: string }`
- **Returns**: `{ success: true, items_synced: number }`

#### POST `/menu/cache/clear`
Clear menu cache
- **Auth**: Optional
- **Returns**: `{ success: true }`

### Payments (`/payments`)

#### POST `/payments/create`
Create payment intent
- **Auth**: Required
- **Body**: `{ amount: number, order_id: string, payment_method: string }`
- **Returns**: `{ payment: Payment, client_secret?: string }`

#### GET `/payments/:paymentId`
Get payment details
- **Auth**: Required
- **Returns**: `{ payment: Payment }`

#### POST `/payments/:paymentId/refund`
Process refund
- **Auth**: Required (manager role)
- **Body**: `{ amount?: number, reason?: string }`
- **Returns**: `{ refund: Refund }`

### Terminal (`/terminal`)

#### POST `/terminal/checkout`
Create terminal checkout
- **Auth**: Required
- **Body**: `{ amount: number, device_id: string, order_id: string }`
- **Returns**: `{ checkout: Checkout }`

#### GET `/terminal/checkout/:checkoutId`
Get checkout status
- **Auth**: Required
- **Returns**: `{ checkout: Checkout }`

#### POST `/terminal/checkout/:checkoutId/cancel`
Cancel checkout
- **Auth**: Required
- **Returns**: `{ success: true }`

#### POST `/terminal/checkout/:checkoutId/complete`
Complete checkout
- **Auth**: Required
- **Returns**: `{ checkout: Checkout, payment: Payment }`

#### GET `/terminal/devices`
List payment terminals
- **Auth**: Required
- **Returns**: `{ devices: Device[] }`

### Tables (`/tables`)

#### GET `/tables`
List restaurant tables
- **Auth**: Required
- **Query**: `{ restaurant_id: string }`
- **Returns**: `{ tables: Table[] }`

#### GET `/tables/:id`
Get table details
- **Auth**: Required
- **Returns**: `{ table: Table }`

#### POST `/tables`
Create table
- **Auth**: Required (manager role)
- **Body**: `{ number: string, capacity: number, section?: string }`
- **Returns**: `{ table: Table }`

#### PUT `/tables/batch`
Batch update tables
- **Auth**: Required (manager role)
- **Body**: `{ tables: TableUpdate[] }`
- **Returns**: `{ updated: number }`

#### PUT `/tables/:id`
Update table
- **Auth**: Required (manager role)
- **Body**: `{ number?: string, capacity?: number, status?: string }`
- **Returns**: `{ table: Table }`

#### DELETE `/tables/:id`
Delete table
- **Auth**: Required (manager role)
- **Returns**: `{ success: true }`

#### PATCH `/tables/:id/status`
Update table status
- **Auth**: Required
- **Body**: `{ status: 'available' | 'occupied' | 'reserved' | 'cleaning' }`
- **Returns**: `{ table: Table }`

### AI Services (`/ai`)

#### POST `/ai/menu`
Upload menu for AI processing
- **Auth**: Required (manager role)
- **Body**: `{ menu_data: any, restaurant_id: string }`
- **Returns**: `{ processed: number, items: ProcessedItem[] }`

#### GET `/ai/menu`
Get AI-processed menu
- **Auth**: Required
- **Query**: `{ restaurant_id: string }`
- **Returns**: `{ menu: AIMenu }`

#### POST `/ai/transcribe`
Transcribe audio
- **Auth**: None
- **Body**: FormData with audio file
- **Returns**: `{ transcription: string }`

#### POST `/ai/transcribe-with-metadata`
Transcribe with context
- **Auth**: None
- **Body**: FormData with audio file and metadata
- **Returns**: `{ transcription: string, confidence: number }`

#### POST `/ai/parse-order`
Parse order from text
- **Auth**: Required
- **Body**: `{ text: string, menu_context?: any }`
- **Returns**: `{ items: ParsedItem[], confidence: number }`

#### POST `/ai/voice-chat`
Process voice chat
- **Auth**: Required
- **Body**: FormData with audio file
- **Returns**: `{ response: string, audio_url?: string }`

#### POST `/ai/chat`
Text chat with AI
- **Auth**: Required
- **Body**: `{ message: string, context?: any }`
- **Returns**: `{ response: string }`

#### GET `/ai/health`
Check AI service health
- **Auth**: None
- **Returns**: `{ status: 'healthy' | 'degraded', providers: ProviderStatus[] }`

### Realtime Voice (`/realtime`)

#### POST `/realtime/session`
Create WebRTC session for voice ordering
- **Auth**: Required
- **Returns**: `{ session_id: string, token: string, ice_servers: IceServer[] }`

#### GET `/realtime/health`
Check realtime service health
- **Auth**: None
- **Returns**: `{ status: 'healthy', active_sessions: number }`

### Health (`/health`)

#### GET `/health`
Basic health check
- **Auth**: None
- **Returns**: `{ status: 'healthy', timestamp: string }`

#### GET `/health/status`
Detailed status
- **Auth**: None
- **Returns**: `{ status: string, services: ServiceStatus[] }`

#### GET `/health/ready`
Readiness probe
- **Auth**: None
- **Returns**: `{ ready: boolean, checks: Check[] }`

#### GET `/health/live`
Liveness probe
- **Auth**: None
- **Returns**: `{ alive: true }`

### Security (`/security`)

#### GET `/security/events`
Get security events
- **Auth**: Required (admin role)
- **Query**: `{ limit?: number, type?: string }`
- **Returns**: `{ events: SecurityEvent[] }`

#### GET `/security/stats`
Get security statistics
- **Auth**: Required (admin role)
- **Returns**: `{ stats: SecurityStats }`

#### POST `/security/test`
Test security configuration
- **Auth**: Required (admin role)
- **Returns**: `{ passed: boolean, issues: Issue[] }`

#### GET `/security/config`
Get security configuration
- **Auth**: Required (admin role)
- **Returns**: `{ config: SecurityConfig }`

### Restaurant (`/restaurants`)

#### GET `/restaurants/:id`
Get restaurant details
- **Auth**: Optional
- **Returns**: `{ restaurant: Restaurant }`

## WebSocket Events

### Order Events
- `order:created` - New order created
- `order:updated` - Order status/details updated
- `order:completed` - Order completed
- `order:cancelled` - Order cancelled

### Kitchen Events
- `kitchen:new_order` - New order for kitchen
- `kitchen:order_ready` - Order ready for pickup
- `kitchen:order_update` - Kitchen status update

### Table Events
- `table:status_changed` - Table status updated
- `table:order_added` - Order added to table

## Error Responses

All errors follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Rate Limiting

- AI endpoints: 10 requests per minute
- Auth endpoints: 5 attempts per 15 minutes
- General API: 100 requests per minute

## Response Headers

- `X-Request-Id` - Unique request identifier
- `X-Rate-Limit-Remaining` - Remaining requests
- `X-Rate-Limit-Reset` - Reset timestamp