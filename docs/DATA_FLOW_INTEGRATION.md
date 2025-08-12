# Data Flow & Integration Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [End-to-End Order Flow](#end-to-end-order-flow)
3. [Data Transformation Layers](#data-transformation-layers)
4. [Shared Types Architecture](#shared-types-architecture)
5. [Multi-Tenancy Implementation](#multi-tenancy-implementation)
6. [Authentication & Authorization Flow](#authentication--authorization-flow)
7. [ID Mapping System](#id-mapping-system)
8. [Real-Time Integration](#real-time-integration)
9. [System Integration Points](#system-integration-points)

## Architecture Overview

The Rebuild 6.0 system uses a **Unified Backend Architecture** with **OpenAI Integration** for AI processing. The Rebuild backend (port 3001) acts as a proxy to OpenAI (port 3003) for AI operations.

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│                         Port: 5173                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/WS
┌──────────────────────▼──────────────────────────────────────┐
│                  Unified Backend (Express.js)                │
│                         Port: 3001                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   API       │  │ OpenAI  │  │   WebSocket      │   │
│  │  Routes     │  │   Proxy     │  │    Server        │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
└──────────────────────┬──────────────────┬──────────────────┘
                       │                  │ HTTP Proxy
                       │           ┌──────▼──────┐
                       │           │ OpenAI  │
                       │           │   Port:     │
                       │           │    3003     │
                       │           └─────────────┘
┌──────────────────────▼──────────────────────────────────────┐
│                    Supabase (PostgreSQL)                     │
└─────────────────────────────────────────────────────────────┘
```

## End-to-End Order Flow

### 1. Voice Order Flow (via OpenAI)

```mermaid
sequenceDiagram
    participant Customer
    participant Frontend
    participant Backend
    participant OpenAI
    participant Database
    participant WebSocket
    
    Customer->>Frontend: Speaks order
    Frontend->>Frontend: Capture audio (WebRTC)
    Frontend->>Backend: Stream audio (WebSocket)
    Backend->>Backend: Buffer audio chunks
    Backend->>OpenAI: POST /api/voice-chat (FormData)
    OpenAI->>OpenAI: Transcribe (Whisper)
    OpenAI->>OpenAI: Parse order (GPT-4)
    OpenAI->>OpenAI: Generate audio response
    OpenAI-->>Backend: Return {transcription, response, orderData, audioBuffer}
    Backend->>Database: Create order from orderData
    Backend->>WebSocket: Broadcast order:created
    Backend->>Frontend: Send transcription + audio response
    WebSocket-->>Frontend: Real-time order update
    Frontend->>Customer: Play audio response & show order
```

### 2. Text Chat Order Flow (via OpenAI)

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant OpenAI
    participant Database
    participant WebSocket
    
    User->>Frontend: Types order message
    Frontend->>Backend: POST /api/v1/ai/chat
    Backend->>OpenAI: POST /api/chatbot {message, context}
    OpenAI->>OpenAI: Parse order (GPT-4)
    OpenAI-->>Backend: Return {message, suggestions, orderData}
    Backend->>Database: Create order from orderData (if provided)
    Backend->>WebSocket: Broadcast order:created (if order created)
    Backend-->>Frontend: Return chat response
    WebSocket-->>Frontend: Real-time order update (if applicable)
    Frontend->>User: Show chat response & order confirmation
```

### 3. Direct UI Order Flow (Kiosk/POS)

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant RestaurantContext
    participant Backend
    participant Database
    participant WebSocket
    
    User->>Frontend: Select menu items directly
    Frontend->>RestaurantContext: Get restaurant_id
    Frontend->>Backend: POST /api/v1/orders
    Note over Backend: Headers: {<br/>x-restaurant-id: "rest-1",<br/>Authorization: "Bearer token"<br/>}
    Backend->>Backend: Validate auth & restaurant
    Backend->>Database: Insert order
    Backend->>WebSocket: Broadcast order:created
    WebSocket-->>Frontend: Real-time update
    Frontend->>User: Order confirmation
```

## Data Transformation Layers

### 1. OpenAI → Backend Transformation

```typescript
// OpenAI Response Format
interface OpenAIOrderData {
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    modifiers?: any[];
    notes?: string;
  }>;
  customerInfo?: {
    name?: string;
    phone?: string;
  };
  totalAmount: number;
  restaurantId: string;
}

// Backend transforms to database format
// server/src/services/buildpanel.service.ts
const orderRequest: OrderRequest = {
  items: buildPanelData.items,
  customerInfo: buildPanelData.customerInfo,
  totalAmount: buildPanelData.totalAmount,
  restaurantId: restaurantId,
  userId: userId
}

// Create order via OpenAI
const orderResponse = await buildPanel.createOrder(orderRequest)
```

### 2. Frontend → Backend Transformation (Direct Orders)

```typescript
// Frontend Service Layer (client/src/services/api.ts)
const orderData = {
  restaurant_id: restaurantContext.restaurant.id,
  type: 'kiosk' as OrderType,
  items: cartItems.map(item => ({
    menu_item_id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    modifiers: item.modifiers
  }))
}

// Backend receives and transforms
// server/src/services/orders.service.ts
const newOrder = {
  restaurant_id: restaurantId,
  order_number: generateOrderNumber(),
  type: orderData.type,
  status: 'pending',
  items: transformItems(orderData.items), // UUID mapping
  subtotal: calculateSubtotal(),
  tax: calculateTax(),
  total_amount: calculateTotal()
}
```

### 2. Database → Frontend Transformation

```typescript
// Database Schema (snake_case)
{
  id: "uuid",
  restaurant_id: "rest-1",
  order_number: "20250130-0001",
  customer_name: "John Doe",
  created_at: "2025-01-30T10:00:00Z"
}

// Service Layer Transform (camelCase)
{
  id: "uuid",
  restaurantId: "rest-1",
  orderNumber: "20250130-0001",
  customerName: "John Doe",
  createdAt: "2025-01-30T10:00:00Z"
}

// Shared Type (consistent interface)
interface Order {
  id: string;
  restaurant_id: string;
  order_number: string;
  customer_name?: string;
  created_at: string;
}
```

## Shared Types Architecture

The shared types module (`shared/types/*`) provides a single source of truth for data structures across the entire system.

### Benefits

1. **Type Safety**: Consistent types across frontend and backend
2. **Maintainability**: Single location for type updates
3. **Developer Experience**: IntelliSense and type checking everywhere
4. **Contract Enforcement**: API contracts are typed

### Structure

```
shared/
├── types/
│   ├── index.ts          # Main export
│   ├── order.types.ts    # Order-related types
│   ├── menu.types.ts     # Menu-related types
│   ├── customer.types.ts # Customer types
│   ├── table.types.ts    # Table management
│   └── websocket.types.ts # Real-time events
└── cart.ts               # Shared cart logic
```

### Usage Example

```typescript
// Import in frontend
import { Order, OrderStatus } from '@rebuild/shared';

// Import in backend
import type { Order, CreateOrderDTO } from '@rebuild/shared';

// Type is identical in both environments
const processOrder = (order: Order): void => {
  // Type-safe operations
}
```

## Multi-Tenancy Implementation

Every API request includes restaurant context for data isolation:

### 1. Frontend Context

```typescript
// RestaurantContext provides restaurant_id
const { restaurant } = useRestaurant();

// Automatically included in API calls
api.defaults.headers.common['x-restaurant-id'] = restaurant.id;
```

### 2. Backend Validation

```typescript
// Middleware validates restaurant access
export function validateRestaurantAccess(req, res, next) {
  const restaurantId = req.headers['x-restaurant-id'] || 
                       req.user.restaurant_id ||
                       config.restaurant.defaultId;
  
  if (!restaurantId) {
    throw Unauthorized('Restaurant ID required');
  }
  
  req.restaurantId = restaurantId;
  next();
}
```

### 3. Database Queries

```typescript
// All queries filtered by restaurant_id
const orders = await supabase
  .from('orders')
  .select('*')
  .eq('restaurant_id', restaurantId);
```

## Authentication & Authorization Flow

### 1. Login Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Supabase Auth
    participant Backend
    
    User->>Frontend: Enter credentials
    Frontend->>Supabase Auth: signIn()
    Supabase Auth-->>Frontend: JWT token
    Frontend->>Frontend: Store token
    Frontend->>Backend: API request + token
    Backend->>Backend: Verify JWT
    Backend-->>Frontend: Authorized response
```

### 2. JWT Structure

```typescript
// Decoded JWT contains:
{
  sub: "user-uuid",           // User ID
  email: "user@example.com",
  role: "admin",              // User role
  restaurant_id: "rest-1",    // Restaurant association
  exp: 1234567890,           // Expiration
  iat: 1234567890            // Issued at
}
```

### 3. WebSocket Authentication

```typescript
// WebSocket connection with auth
const ws = new WebSocket(
  `ws://localhost:3001?token=${authToken}`
);

// Server verification
const auth = await verifyWebSocketAuth(request);
if (auth) {
  ws.userId = auth.userId;
  ws.restaurantId = auth.restaurantId;
}
```

## ID Mapping System

The system handles both internal UUIDs and external IDs for menu items:

### 1. Menu Item Structure

```typescript
interface MenuItem {
  id: string;              // UUID (internal)
  external_id?: string;    // External system ID
  name: string;
  description?: string;    // May contain [ID:123]
}
```

### 2. ID Resolution Flow

```typescript
// Voice order with external ID
"I want a number 42" → external_id: "42"

// ID mapper resolves to UUID
const uuid = await menuIdMapper.getUuid("42");
// Returns: "550e8400-e29b-41d4-a716-446655440000"

// Order stored with UUID
order.items[0].menu_item_id = uuid;
```

### 3. Legacy Support

```typescript
// Supports old format in descriptions
description: "Delicious burger [ID:42]"

// Extracted by mapper
const externalId = extractExternalId(item);
// Returns: "42"
```

## Real-Time Integration

### 1. WebSocket Event Types

```typescript
type WebSocketEventType = 
  | 'order:created'      // New order
  | 'order:updated'      // Order modified
  | 'order:status_changed' // Status change
  | 'table:updated'      // Table status
  | 'menu:updated'       // Menu changes
  | 'notification';      // System notifications
```

### 2. Event Flow

```typescript
// Backend broadcasts event
broadcastOrderUpdate(wss, {
  type: 'order:status_changed',
  payload: {
    order_id: order.id,
    previous_status: 'pending',
    new_status: 'preparing',
    order: fullOrderObject
  },
  timestamp: new Date().toISOString(),
  restaurant_id: order.restaurant_id
});

// Frontend receives and processes
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'order:status_changed') {
    updateOrderInUI(message.payload.order);
  }
};
```

### 3. Connection Management

```typescript
// Automatic reconnection
const connectWebSocket = () => {
  ws = new WebSocket(wsUrl);
  
  ws.onclose = () => {
    setTimeout(connectWebSocket, 5000); // Retry after 5s
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
};
```

## System Integration Points

### 1. API Endpoints

All endpoints follow RESTful conventions under `/api/v1/*`:

```
Standard API:
- GET    /api/v1/orders
- POST   /api/v1/orders
- PATCH  /api/v1/orders/:id
- GET    /api/v1/menu
- GET    /api/v1/tables

AI Integration (OpenAI Proxy):
- POST   /api/v1/ai/transcribe    → Transcribe audio via OpenAI
- POST   /api/v1/ai/parse-order   → Parse text order via OpenAI
- POST   /api/v1/ai/chat          → Chat with AI via OpenAI
- POST   /api/v1/ai/menu          → Sync menu from OpenAI
- GET    /api/v1/ai/menu          → Get current menu
- GET    /api/v1/ai/health        → Check AI service status

OpenAI Direct Endpoints:
- POST   /api/chatbot             → OpenAI chat endpoint
- POST   /api/voice-chat          → OpenAI voice processing
- GET    /api/menu                → OpenAI menu endpoint
- POST   /api/orders              → OpenAI order creation

WebSocket:
- ws://localhost:3001/voice-stream → Voice streaming to AI service
- ws://localhost:3001             → General real-time updates
```

### 2. Service Dependencies

```
Frontend Services:
├── api.ts           → HTTP client
├── websocket.ts     → Real-time updates
├── auth.ts          → Authentication
├── orders.ts        → Order management
└── orderIntegration.ts → Voice order parsing

Backend Services:
├── orders.service.ts    → Order logic
├── ai.service.ts        → AI coordination & WebSocket handling
├── buildpanel.service.ts → OpenAI API client
├── menu.service.ts      → Menu management
└── websocket.ts         → Real-time broadcast

OpenAI Integration:
├── /api/chatbot         → Text-based order processing
├── /api/voice-chat      → Voice order processing
├── /api/menu            → Menu synchronization
└── /api/orders          → Order creation
```

### 3. Environment Configuration

All configuration centralized in root `.env`:

```bash
# Frontend-safe (VITE_ prefix)
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Backend-only (no prefix)
DATABASE_URL=postgresql://...
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE  # Required for AI features
JWT_SECRET=xxx
SERVICE_KEY=xxx

# OpenAI Integration
OPENAI_URL=http://localhost:3003     # OpenAI service URL
USE_OPENAI=true                      # Enable OpenAI integration
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

## OpenAI Integration Sequence Diagrams

### Menu Synchronization Flow

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant OpenAI
    participant Database
    
    Admin->>Frontend: POST /api/v1/ai/menu (upload menu)
    Frontend->>Backend: Authenticated request with restaurant context
    Backend->>OpenAI: GET /api/menu (sync menu)
    OpenAI-->>Backend: Return menu items with IDs
    Backend->>Database: Update/insert menu items
    Backend->>Backend: Update internal menu cache
    Backend-->>Frontend: Success response
    Frontend->>Admin: Menu sync confirmation
```

### Voice Processing Detailed Flow

```mermaid
sequenceDiagram
    participant Customer
    participant Frontend
    participant WebSocket
    participant AI_Service
    participant OpenAI
    participant Database
    participant KDS
    
    Customer->>Frontend: Hold mic button (start recording)
    Frontend->>WebSocket: Connect to /voice-stream
    WebSocket->>AI_Service: handleVoiceConnection()
    AI_Service->>AI_Service: startRecording(connectionId)
    
    loop Audio Chunks
        Customer->>Frontend: Speaks continuously
        Frontend->>WebSocket: Send audio chunks (binary)
        WebSocket->>AI_Service: processAudioStream(chunks)
        AI_Service->>AI_Service: Buffer audio data
    end
    
    Customer->>Frontend: Release mic button (stop recording)
    Frontend->>WebSocket: stop_recording message
    WebSocket->>AI_Service: stopRecording(connectionId, restaurantId)
    AI_Service->>AI_Service: Combine buffered audio chunks
    AI_Service->>OpenAI: POST /api/voice-chat (FormData)
    
    Note over OpenAI: - Transcribe with Whisper<br/>- Parse order with GPT-4<br/>- Generate audio response
    
    OpenAI-->>AI_Service: {transcription, response, orderData, audioBuffer}
    
    alt Order Data Present
        AI_Service->>Database: Create order from orderData
        AI_Service->>KDS: Broadcast order:created (WebSocket)
    end
    
    AI_Service->>WebSocket: Send transcription + audio response
    WebSocket->>Frontend: Display transcription + play audio
    Frontend->>Customer: Show order confirmation + audio response
```

### Chat Order Processing Flow

```mermaid
sequenceDiagram
    participant Customer
    participant Frontend
    participant Backend
    participant OpenAI
    participant Database
    participant WebSocket
    participant KDS
    
    Customer->>Frontend: Types: "I want 2 soul bowls and a greek salad"
    Frontend->>Backend: POST /api/v1/ai/chat
    Backend->>Backend: Extract restaurant context from auth
    Backend->>OpenAI: POST /api/chatbot
    
    Note over OpenAI: {<br/>  message: "I want 2 soul bowls...",<br/>  context: {<br/>    restaurantId: "rest-1",<br/>    userId: "user-123"<br/>  }<br/>}
    
    OpenAI->>OpenAI: Parse message with GPT-4
    OpenAI->>OpenAI: Map items to menu IDs
    OpenAI->>OpenAI: Calculate totals
    
    OpenAI-->>Backend: {message, suggestions, orderData}
    
    Note over Backend: orderData: {<br/>  items: [{id, name, qty, price}],<br/>  totalAmount: 42.00,<br/>  restaurantId: "rest-1"<br/>}
    
    alt Order Data Present
        Backend->>Database: Create order record
        Backend->>WebSocket: Broadcast order:created
        WebSocket->>KDS: Update kitchen display
    end
    
    Backend-->>Frontend: Chat response + order confirmation
    Frontend->>Customer: Show chat response + order summary
```

### Error Handling & Fallback Flow

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend
    participant OpenAI
    participant Fallback
    
    Frontend->>Backend: AI processing request
    Backend->>OpenAI: Forward request
    
    alt OpenAI Available
        OpenAI-->>Backend: Success response
        Backend-->>Frontend: Process response
    else OpenAI Timeout
        Backend->>Backend: Log error
        Backend->>Fallback: Use local parsing (if available)
        Fallback-->>Backend: Basic response
        Backend-->>Frontend: Limited functionality response
    else OpenAI Error
        Backend->>Backend: Log error details
        Backend-->>Frontend: Error response with fallback message
    end
    
    Note over Backend: Health check endpoint monitors<br/>OpenAI status continuously
```

## Data Flow Best Practices

1. **Always use shared types** for consistency
2. **Include restaurant_id** in all multi-tenant operations
3. **Transform at service boundaries** (snake_case ↔ camelCase)
4. **Validate data at entry points** (API routes)
5. **Use WebSocket for real-time updates** instead of polling
6. **Handle ID mapping** in service layer, not in routes
7. **Log all critical operations** with context
8. **Gracefully handle disconnections** in real-time connections
9. **Monitor OpenAI health** and implement fallback strategies
10. **Buffer audio efficiently** to prevent WebSocket overrun
11. **Preserve restaurant context** through all OpenAI calls
12. **Handle OpenAI timeouts** gracefully with user feedback