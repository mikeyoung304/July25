# Full-Stack Architecture Overview

## 🌐 System Evolution

### From Microservices to Unified Architecture

**Previous State**: Separate AI Gateway (port 3002) + API Backend (port 3001)  
**Current State**: Unified backend architecture - single service on port 3001  
**Decision**: "For simplicity, let's put it all in the same backend" - Luis

## 🏗️ Architecture Components

### Frontend Layer (React + TypeScript)
```
client/src/
├── components/           # Reusable UI components
├── modules/             # Feature-based modules
│   ├── menu/            # Menu management
│   ├── orders/          # Order processing
│   ├── voice/           # Voice ordering
│   └── kitchen/         # Kitchen display
├── services/            # API integration layer
├── contexts/            # React context providers
└── pages/               # Route components
```

**Key Features**:
- Modular component architecture
- Voice-driven ordering interface
- Real-time kitchen display
- Multi-tenant restaurant support

### Unified Backend Layer (Express.js + TypeScript)
```
server/
├── src/
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic
│   ├── middleware/      # Auth & validation
│   ├── models/          # TypeScript interfaces
│   ├── ai/              # AI/Voice processing
│   ├── utils/           # WebSocket, helpers
│   └── server.ts        # Main entry point
├── tests/               # Test suites
└── scripts/             # Utility scripts
```

**Key Features**:
- Unified API + AI + WebSocket on port 3001
- JWT-based authentication
- Multi-tenant data isolation
- Integrated voice processing
- Cloud-only Supabase

### Database Layer (Cloud Supabase)
```
Tables:
├── restaurants          # Multi-tenant isolation
├── users               # Authentication
├── menu_items          # Restaurant menus
├── orders              # Order management
├── order_items         # Order line items
└── floor_plans         # Table layouts
```

**Key Features**:
- Cloud-only Supabase (no local/Docker)
- Row-level security (RLS)
- Real-time subscriptions
- Built-in authentication
- Direct connection from backend

## 🔄 Data Flow Architecture

### Request Lifecycle

1. **Frontend Request**:
   ```typescript
   // Service layer call
   const orders = await OrderService.getOrders();
   ```

2. **HTTP Client Processing**:
   ```typescript
   // Automatic JWT + restaurant ID injection
   headers: {
     'Authorization': 'Bearer <supabase-jwt>',
     'X-Restaurant-ID': '<restaurant-id>',
     'Content-Type': 'application/json'
   }
   ```

3. **Backend Processing**:
   ```typescript
   // Controller → Service → Database
   app.get('/api/orders', authenticate, async (req, res) => {
     const restaurantId = req.headers['x-restaurant-id'];
     const orders = await OrderService.getOrders(restaurantId);
     res.json(orders);
   });
   ```

4. **Database Query**:
   ```sql
   SELECT * FROM orders 
   WHERE restaurant_id = $1 
   ORDER BY created_at DESC;
   ```

### Real-Time Updates

```typescript
// WebSocket flow for order updates
Frontend (Kitchen Display) ←→ WebSocket ←→ Backend ←→ Database
                             ↓
                      Real-time notifications
```

## 🔐 Security Architecture

### Authentication Flow

1. **User Login**: Supabase handles authentication
2. **JWT Token**: Frontend receives and stores JWT
3. **API Requests**: JWT included in Authorization header
4. **Backend Validation**: Express middleware validates JWT
5. **Database Access**: Row-level security enforces tenant isolation

### Multi-Tenancy Strategy

```typescript
// Every API call includes restaurant context
const restaurantId = useRestaurant().restaurant?.id;

// Backend enforces tenant isolation
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('restaurant_id', restaurantId);
```

## 🚀 Service Layer Pattern

### Mock/Real Data Switching

```typescript
// HttpServiceAdapter enables seamless transition
export class OrderService extends HttpServiceAdapter<Order> {
  protected getEndpoint(): string {
    return '/api/orders';
  }

  // Mock implementation for development
  protected async getMockData(): Promise<Order[]> {
    return mockOrders;
  }

  // Real API implementation
  protected async getRealData(): Promise<Order[]> {
    return this.httpClient.get<Order[]>(this.getEndpoint());
  }
}
```

### Case Transformation

```typescript
// Frontend (camelCase) ↔ Backend (snake_case)
Frontend: { orderId: "123", customerName: "John" }
    ↓ (automatic transformation)
Backend:  { order_id: "123", customer_name: "John" }
```

## 📡 Real-Time Architecture

### WebSocket Integration

```typescript
// Unified backend WebSocket server (same port as API)
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === 'join-restaurant') {
      ws.restaurantId = message.restaurantId;
    }
  });
});

// Broadcast order updates to restaurant clients
wss.clients.forEach((client) => {
  if (client.restaurantId === restaurantId) {
    client.send(JSON.stringify({ type: 'order-updated', order }));
  }
});
```

### Frontend WebSocket Client

```typescript
// Automatic reconnection with exponential backoff
const websocketService = new WebSocketService();
websocketService.connect(restaurantId);

// Listen for real-time updates
websocketService.on('order-updated', (order) => {
  // Update kitchen display in real-time
  updateKitchenDisplay(order);
});
```

## 🎤 Voice Ordering Architecture

### Voice Processing Flow

1. **Audio Capture**: Browser Web Speech API
2. **Speech-to-Text**: Native browser or external service
3. **Natural Language Processing**: AI-powered menu item matching
4. **Order Assembly**: Structured order object creation
5. **Confirmation**: Visual order review before submission
6. **Kitchen Display**: Real-time order appearance

### AI Integration Points

```typescript
// Voice processing pipeline
Audio Input → Speech Recognition → NLP Processing → Order Creation
     ↓                ↓                ↓              ↓
Browser API → Text Transcript → Menu Matching → Database Storage
```

## 🔧 Development Workflow

### Unified Development Commands

```bash
# Start everything with one command
npm run dev              # Starts both frontend (5173) and backend (3001)

# Individual services (if needed)
cd client && npm run dev # Frontend only
cd server && npm run dev # Backend only

# Testing
npm test                 # Run all tests
cd client && npm test    # Frontend tests
cd server && npm test    # Backend tests

# Code quality
npm run lint:fix         # Fix linting issues
npm run typecheck        # TypeScript validation
```

### Integration Testing

```typescript
// E2E test flow
describe('Voice Ordering E2E', () => {
  test('Complete voice order workflow', async () => {
    // 1. Voice input simulation
    await voiceInput('I want two burgers and a coke');
    
    // 2. Verify order appears in kitchen
    await expect(kitchenDisplay).toContainOrder(expectedOrder);
    
    // 3. Confirm database persistence
    const orders = await api.get('/orders');
    expect(orders).toContainEqual(expectedOrder);
  });
});
```

## 📊 Performance Considerations

### Frontend Optimizations
- **React.memo**: Prevent unnecessary re-renders
- **Service Workers**: Offline capabilities
- **Bundle Splitting**: Code splitting by routes
- **Image Optimization**: Lazy loading and compression

### Backend Optimizations
- **Database Indexing**: Optimized queries for restaurant_id
- **Connection Pooling**: Efficient database connections
- **Caching**: Redis for frequently accessed data
- **Rate Limiting**: API protection

### Database Optimizations
- **Row-Level Security**: Automatic tenant filtering
- **Indexes**: Performance optimization
- **Real-time**: Selective subscriptions
- **Backup Strategy**: Automatic daily backups

## 🚀 Deployment Architecture

### Production Stack

```
Load Balancer → Frontend (Vercel/Netlify)
              ↓
           Backend (Railway/Heroku)
              ↓
           Database (Supabase)
              ↓
           File Storage (Supabase Storage)
```

### Environment Configuration

**Frontend (client/.env.local)**:
```env
VITE_API_BASE_URL=https://api.growfresh.com
VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Unified Backend (server/.env)**:
```env
SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
FRONTEND_URL=https://app.growfresh.com
PORT=3001
```

## 🔄 Migration Strategy

### From Mock to Real Data

1. **Phase 1**: Frontend uses mock data via service adapters
2. **Phase 2**: Backend API development with test endpoints
3. **Phase 3**: Service adapter switch to real API calls
4. **Phase 4**: Remove mock data and legacy code

### Backward Compatibility

- Service adapters maintain interface compatibility
- Feature flags enable gradual rollout
- Fallback mechanisms for API failures
- Comprehensive testing at each phase

## 📈 Monitoring & Observability

### Application Monitoring
- **Frontend**: Error tracking with Sentry
- **Backend**: Performance monitoring with New Relic
- **Database**: Supabase built-in monitoring
- **Real-time**: WebSocket connection health

### Key Metrics
- **Performance**: API response times, page load speeds
- **Reliability**: Error rates, uptime monitoring
- **Business**: Order completion rates, voice accuracy
- **User Experience**: Task completion times

---

**This architecture provides complete control over the Restaurant OS technology stack while maintaining the flexibility to evolve and scale as business requirements change.**