# Backend Agent Report: The Kitchen Operations Manual

## Welcome to the Kitchen, Mike!
Your backend is the kitchen of Restaurant OS - where orders are processed, payments handled, and the real work happens. Running on Express 4.18.2 at port 3001, it's the brain of your operation!

## The Kitchen Layout (Backend Structure)

```
Express Backend (localhost:3001)
│
├── 🚪 Middleware (Security checks at the door)
├── 🛣️ Routes (Different cooking stations)
├── 👨‍🍳 Services (The chefs - business logic)
├── 🤖 AI Services (Smart order-taking)
├── 🔌 WebSocket (Kitchen intercom)
├── 🗄️ Database (The walk-in cooler)
└── 🔐 Auth (Security office)
```

## API Endpoints (The Service Menu)

### Order Management Station
```javascript
// The order ticket system
GET    /api/v1/orders           // View all orders
GET    /api/v1/orders/:id       // View specific order
POST   /api/v1/orders           // Create new order
PUT    /api/v1/orders/:id       // Update order
DELETE /api/v1/orders/:id       // Cancel order
PATCH  /api/v1/orders/:id/status // Update status only
```

### Menu Management Station
```javascript
// The recipe book
GET    /api/v1/menu             // Get full menu
GET    /api/v1/menu/:category   // Get category items
POST   /api/v1/menu/items       // Add menu item
PUT    /api/v1/menu/items/:id   // Update item
DELETE /api/v1/menu/items/:id   // Remove item
```

### Payment Processing Station
```javascript
// The cash register
POST   /api/v1/payments/process  // Process payment
POST   /api/v1/payments/refund   // Issue refund
GET    /api/v1/payments/history  // Payment history
POST   /api/v1/payments/tip      // Add tip
```

### AI Voice Station
```javascript
// The smart order-taker
POST   /api/v1/realtime/session  // Create voice session
GET    /api/v1/ai/voice/handshake // Health check
POST   /api/v1/ai/voice/process  // Process voice input
```

### Restaurant Management
```javascript
// The manager's office
GET    /api/v1/restaurants       // List restaurants
GET    /api/v1/restaurants/:id   // Get restaurant details
PUT    /api/v1/restaurants/:id   // Update settings
GET    /api/v1/restaurants/:id/stats // Analytics
```

## Middleware Stack (Quality Control)

Think of middleware as checkpoints food must pass:

```javascript
// 1. CORS - Who's allowed in?
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// 2. Body Parser - Understanding orders
app.use(express.json());

// 3. CSRF Protection - Anti-forgery
app.use(csrfProtection);

// 4. Rate Limiting - No spam orders
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
}));

// 5. Authentication - Check badges
app.use(authMiddleware);

// 6. Restaurant Context - Which location?
app.use(restaurantMiddleware);

// 7. Error Handler - When things go wrong
app.use(errorHandler);
```

## Service Layer (The Chefs)

### OrderService - Order Management
```typescript
// server/src/services/OrderService.ts
class OrderService {
  async createOrder(data: CreateOrderDto) {
    // Validate items exist
    // Calculate totals
    // Save to database
    // Broadcast via WebSocket
    // Return order
  }
  
  async updateStatus(orderId, newStatus) {
    // Validate status transition
    // Update database
    // Notify kitchen displays
    // Log for analytics
  }
}
```

### PaymentService - Money Handling
```typescript
// server/src/services/PaymentService.ts
class PaymentService {
  async processPayment(order, method, details) {
    // Validate amount
    // Process with provider (Square/Stripe)
    // Record transaction
    // Update order status
    // Send receipt
  }
}
```

### MenuService - Recipe Management
```typescript
// server/src/services/MenuService.ts  
class MenuService {
  async getMenuForRestaurant(restaurantId) {
    // Load menu items
    // Apply availability rules
    // Format for display
    // Cache for performance
  }
}
```

## Database Operations (The Pantry)

### Supabase Integration
```javascript
// Connection setup
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Query with RLS (Row Level Security)
const getOrders = async (restaurantId) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
    
  return data;
};
```

### Case Transformation Layer
```javascript
// Database speaks snake_case
// API speaks camelCase

// Automatic transformation
function transformDatabaseToApi(dbRow) {
  return {
    restaurantId: dbRow.restaurant_id,
    orderNumber: dbRow.order_number,
    createdAt: dbRow.created_at
  };
}

function transformApiToDatabase(apiData) {
  return {
    restaurant_id: apiData.restaurantId,
    order_number: apiData.orderNumber,
    created_at: apiData.createdAt
  };
}
```

## WebSocket Server (The Intercom)

```javascript
// Real-time order updates
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001, path: '/ws' });

// Connection handling
wss.on('connection', (ws, req) => {
  // Extract restaurant from auth
  const restaurantId = extractRestaurantId(req);
  
  // Join restaurant room
  ws.join(`restaurant:${restaurantId}`);
  
  // Handle messages
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch(message.type) {
      case 'order:update':
        broadcastToKitchen(message);
        break;
      case 'subscribe':
        ws.join(`channel:${message.channel}`);
        break;
    }
  });
});

// Broadcasting
function broadcastOrderUpdate(order) {
  wss.to(`restaurant:${order.restaurant_id}`).emit({
    type: 'order:updated',
    order
  });
}
```

## AI Integration (The Smart Assistant)

### OpenAI Realtime Session
```javascript
// Create ephemeral session for voice
app.post('/api/v1/realtime/session', async (req, res) => {
  // Load restaurant menu
  const menu = await MenuService.getMenu(req.restaurantId);
  
  // Create OpenAI session
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-realtime',
      voice: 'sage',
      instructions: `You are a waiter at ${restaurant.name}. 
                    Menu: ${JSON.stringify(menu)}`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'add_to_order',
            description: 'Add items to customer order',
            parameters: {
              type: 'object',
              properties: {
                items: { type: 'array' }
              }
            }
          }
        }
      ]
    })
  });
  
  // Return credentials to frontend
  res.json({
    sessionId: response.id,
    token: response.client_secret.value,
    expires_at: Date.now() + 60000 // 60 seconds
  });
});
```

## Error Handling (When Orders Go Wrong)

### Centralized Error Handler
```javascript
// Catch all errors in one place
app.use((err, req, res, next) => {
  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    restaurantId: req.restaurantId,
    userId: req.user?.id
  });
  
  // Determine response
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Invalid input',
      details: err.details
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }
  
  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### Request Validation
```javascript
// Use Zod for schema validation
import { z } from 'zod';

const CreateOrderSchema = z.object({
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().min(1),
    modifications: z.array(z.string()).optional()
  })),
  orderType: z.enum(['dine-in', 'takeout', 'delivery']),
  tableNumber: z.number().optional()
});

// In route handler
app.post('/api/v1/orders', async (req, res) => {
  try {
    const validated = CreateOrderSchema.parse(req.body);
    // Process order...
  } catch (error) {
    res.status(400).json({ error: error.errors });
  }
});
```

## Performance Optimizations

### Response Caching
```javascript
// Cache frequently accessed data
const cache = new Map();

async function getCachedMenu(restaurantId) {
  const key = `menu:${restaurantId}`;
  
  if (cache.has(key)) {
    const cached = cache.get(key);
    if (cached.expires > Date.now()) {
      return cached.data;
    }
  }
  
  const menu = await MenuService.getMenu(restaurantId);
  cache.set(key, {
    data: menu,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes
  });
  
  return menu;
}
```

### Database Connection Pooling
```javascript
// Reuse connections
const pool = {
  max: 20,        // Maximum connections
  min: 5,         // Minimum connections
  idle: 10000,    // Close after 10s idle
};
```

### Request Batching
```javascript
// Batch multiple operations
const batchProcessor = new BatchProcessor({
  batchSize: 10,
  flushInterval: 100, // ms
  
  async processBatch(items) {
    // Process all at once
    await supabase
      .from('orders')
      .insert(items);
  }
});
```

## Multi-Tenancy (Multiple Restaurants)

```javascript
// Every request scoped to restaurant
app.use((req, res, next) => {
  // Extract from header
  req.restaurantId = req.headers['x-restaurant-id'];
  
  // Validate access
  if (!req.user.restaurants.includes(req.restaurantId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
});

// All queries filtered
const orders = await db.orders.findAll({
  where: { restaurant_id: req.restaurantId }
});
```

## Testing the Backend

```bash
# Start server
npm run dev:server

# Test endpoints
curl http://localhost:3001/api/v1/health

# Test with auth
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
     http://localhost:3001/api/v1/orders

# Run tests
npm run test:server

# Check coverage
npm run test:coverage
```

## Mike's Backend Debug Guide

```javascript
// Enable debug logging
DEBUG=restaurant:* npm run dev:server

// Log all SQL queries
process.env.LOG_SQL = 'true';

// Monitor performance
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url}: ${duration}ms`);
  });
  next();
});

// Check memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log(`Memory: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
}, 60000);
```

## Common Backend Issues & Fixes

### "Cannot connect to database"
```javascript
// Check environment variables
console.log('DB URL:', process.env.SUPABASE_URL);
// Verify network access
// Check service key validity
```

### "Request timeout"
```javascript
// Add timeout handling
const timeout = setTimeout(() => {
  res.status(504).json({ error: 'Request timeout' });
}, 30000);

// Clear on success
clearTimeout(timeout);
```

### "Memory leak detected"
```javascript
// Common causes:
// 1. Unclosed database connections
// 2. WebSocket listeners not cleaned
// 3. Large arrays kept in memory
// 4. Circular references

// Fix: Always clean up
ws.on('close', () => {
  ws.removeAllListeners();
  clearInterval(pingInterval);
});
```

## Summary for Course Creation

The backend is your restaurant's kitchen - where orders are processed, payments handled, and everything coordinates. Built with:
- **Express 4.18.2** for routing and middleware
- **Supabase** for database and real-time
- **WebSocket** for live updates
- **OpenAI** for voice processing

Key patterns:
1. **Middleware pipeline** for request processing
2. **Service layer** for business logic
3. **WebSocket rooms** for real-time updates
4. **Case transformation** at API boundaries
5. **Multi-tenancy** throughout

The backend follows REST principles with real-time enhancements via WebSocket. Every request is authenticated, rate-limited, and scoped to a restaurant. The unified architecture (one server instead of three) makes it easier to maintain and deploy.

Remember: The backend is stateless - don't store data in memory between requests. Use the database for persistence and WebSocket for real-time communication!