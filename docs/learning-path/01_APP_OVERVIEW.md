# Restaurant OS - Application Overview

**Version:** 6.0.14
**Target Audience:** CS Majors Learning the System
**Last Updated:** 2025-11-19

---

## 1. Introduction: What is Restaurant OS?

Restaurant OS is an **intelligent, multi-tenant SaaS restaurant management system** that combines modern web technologies with AI-powered voice ordering capabilities. It provides a complete solution for restaurant operations including:

- Menu management and display
- Order placement and tracking (dine-in, takeout, online)
- Kitchen Display System (KDS) for order fulfillment
- Payment processing via Square
- Real-time updates using WebSockets
- AI-powered voice ordering with OpenAI Realtime API
- Multi-tenant architecture supporting multiple restaurants

**Key Business Value:**
- Reduces order errors through voice AI assistance
- Streamlines kitchen operations with real-time order displays
- Provides seamless payment integration
- Enables flexible ordering channels (kiosk, online, server)

---

## 2. Technical Architecture

### 2.1 Technology Stack

#### Frontend (Client)
- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite (fast development and optimized builds)
- **State Management:** React Context API (UnifiedCartContext)
- **UI Components:** Radix UI, Tailwind CSS
- **Real-time:** WebSocket client for live updates
- **Voice:** WebRTC + OpenAI Realtime API
- **Deployment:** Vercel

#### Backend (Server)
- **Runtime:** Node.js 20.x
- **Framework:** Express 4.21.2
- **Language:** TypeScript
- **Database:** PostgreSQL 15 (via Supabase)
- **Authentication:** Supabase Auth (JWT with RS256)
- **Real-time:** WebSocket server (ws library)
- **Payments:** Square SDK v43
- **AI:** OpenAI API (GPT-4 Turbo, Realtime API)
- **Deployment:** Render

#### Database & Services
- **Database:** PostgreSQL (Supabase Cloud)
- **Row-Level Security:** Enabled for multi-tenancy
- **Payment Gateway:** Square (sandbox + production)
- **AI Provider:** OpenAI
- **Error Tracking:** Sentry (optional)

### 2.2 Monorepo Structure

```
/rebuild-6.0
├── client/               # React frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # State management
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page components (routes)
│   │   └── config/      # Environment configuration
│   └── package.json
├── server/               # Express backend API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth, CORS, validation
│   │   ├── services/    # Business logic
│   │   ├── utils/       # Helper functions
│   │   └── voice/       # Voice ordering system
│   └── package.json
├── shared/               # Shared TypeScript types
│   └── types/           # Common interfaces
├── supabase/            # Database migrations & config
│   └── migrations/      # SQL migration files
├── scripts/             # Automation & drift detection
├── docs/                # Comprehensive documentation
└── package.json         # Root workspace config
```

### 2.3 Architecture Patterns

#### Multi-Tenancy (ADR-002)
Every data access is filtered by `restaurant_id`:
1. **Database Layer:** PostgreSQL Row-Level Security (RLS) policies
2. **Application Layer:** Middleware enforces restaurant context
3. **API Layer:** All queries include `restaurant_id` filter

**Example RLS Policy:**
```sql
CREATE POLICY "Users can only access their restaurant's orders"
ON orders FOR ALL
USING (restaurant_id = auth.restaurant_id());
```

#### Embedded Orders Pattern (ADR-003)
Order items are stored as JSONB arrays within the `orders` table instead of separate `order_items` table:

```typescript
interface Order {
  id: string;
  restaurant_id: string;
  items: OrderItem[];  // JSONB array
  total_amount: number;
  status: OrderStatus;
  // ... other fields
}
```

**Benefits:**
- 5x faster queries (no JOIN required)
- Atomic updates (single row operation)
- Historical immutability (items never change after creation)

#### Dual Authentication (ADR-006)
Supports two authentication patterns:
1. **Supabase JWT:** Production users (email/password, MFA)
2. **localStorage JWT:** Demo/PIN/station authentication

**Authentication Flow:**
```
Client → Login Request → Server validates credentials
       → Server generates JWT → Client stores token
       → Subsequent requests include JWT in Authorization header
       → Middleware validates JWT → Extracts user/restaurant context
```

---

## 3. Core Features

### 3.1 Menu Management

**Capabilities:**
- Create/edit menu categories and items
- Set prices, descriptions, dietary info
- Upload item images
- Mark items as available/unavailable
- Organize items into categories

**Technical Implementation:**
- Menu data stored in `menu_items` and `menu_categories` tables
- Real-time sync to AI service for voice ordering
- Image storage via Supabase Storage
- Caching for performance (5-minute TTL)

**API Endpoints:**
- `GET /api/menu` - Fetch complete menu
- `POST /api/menu/items` - Create menu item
- `PUT /api/menu/items/:id` - Update menu item
- `DELETE /api/menu/items/:id` - Delete menu item
- `POST /api/menu/sync-ai` - Sync menu to AI service

### 3.2 Order Management

**Order Lifecycle:**
```
pending → confirmed → preparing → ready → completed
                     ↓
                  cancelled
```

**Order Types:**
- **Dine-in:** Table service orders
- **Takeout:** Pick-up orders
- **Online:** Delivery or pickup orders
- **Kiosk:** Self-service orders

**Technical Implementation:**
- Orders stored with embedded items (JSONB)
- Optimistic locking with version field prevents race conditions
- Transaction wrapping for atomicity
- WebSocket events for real-time updates

**Key Tables:**
- `orders` - Main order data
- `tables` - Table assignments
- `payment_audit_log` - PCI-compliant audit trail

### 3.3 Kitchen Display System (KDS)

**Purpose:** Real-time order display for kitchen staff

**Features:**
- Live order queue display
- Order status updates (preparing, ready, completed)
- Color-coded priority/timing
- Order details with special instructions
- Audio/visual alerts for new orders

**Technical Implementation:**
- WebSocket connection for real-time updates
- Station-based authentication (device-bound tokens)
- Auto-refresh on connection issues
- Optimized for tablet displays

**See:** `docs/how-to/operations/KDS-BIBLE.md` for complete guide

### 3.4 Payment Processing

**Payment Providers:**
- **Square:** Primary payment processor
- **Demo Mode:** Test payments without real transactions

**Payment Flow:**
```
Client initiates payment
  → Square Web SDK collects card info
  → Client receives nonce from Square
  → Client sends nonce to backend
  → Backend processes payment with Square API
  → Backend records transaction in audit log
  → Backend updates order status
  → Client receives confirmation
```

**Security:**
- Card data never touches our servers (PCI compliance)
- Square handles tokenization
- Audit log for all payment attempts
- Idempotency keys prevent duplicate charges

**API Endpoints:**
- `POST /api/v1/payments/create` - Process card payment
- `POST /api/v1/payments/cash` - Process cash payment
- `POST /api/v1/payments/:paymentId/refund` - Process refund
- `GET /api/v1/payments/terminal/devices` - List Square Terminal devices
- `POST /api/v1/payments/terminal/checkout` - Create Terminal checkout

### 3.5 Voice Ordering

**Architecture:** Client-side WebRTC connection to OpenAI Realtime API

**Voice Ordering Flow:**
```
1. User clicks voice button
2. Client establishes WebRTC connection to OpenAI
3. User speaks their order
4. OpenAI transcribes and interprets order
5. Client receives structured order data
6. Client adds items to cart
7. User confirms and checks out
```

**Components:**
- `WebRTCVoiceClient` - Manages WebRTC connection
- `AudioStreamingService` - Audio capture/playback
- `VoiceOrderProcessor` - Parses AI responses
- `MenuIntegrationService` - Matches items to menu

**Technical Details:**
- Uses OpenAI GPT-4o Realtime model
- WebRTC for low-latency audio streaming
- Hybrid parsing: AI + fallback pattern matching
- Menu context sent to AI for accurate interpretation

**See:** `docs/explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md`

### 3.6 Real-Time Updates (WebSocket)

**Events Published:**
- `order:new` - New order created
- `order:updated` - Order status changed
- `menu:updated` - Menu items changed
- `table:updated` - Table status changed

**Connection Management:**
- Automatic reconnection with exponential backoff
- Heartbeat ping/pong for connection health
- Proper cleanup on client disconnect
- Room-based broadcasting (per restaurant)

**Client Implementation:**
```typescript
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'order:new') {
    // Update UI with new order
  }
};
```

### 3.7 Authentication & Authorization

**Authentication Methods:**

1. **Email/Password (Supabase):**
   - JWT tokens with RS256 signing
   - Multi-factor authentication (MFA) for managers
   - Session management
   - Password reset flow

2. **PIN Authentication:**
   - 4-digit PIN for servers/cashiers
   - bcrypt hashing with pepper
   - No email required

3. **Station Authentication:**
   - Device-bound tokens for KDS
   - No user credentials required
   - Tied to specific device fingerprint

**Roles & Permissions:**
- `admin` - Full system access
- `manager` - Restaurant management, reports
- `server` - Take orders, view tables
- `cashier` - Process payments
- `kitchen` - View KDS orders
- `customer` - Place online orders

**See:** `docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md`

### 3.8 Multi-Tenant Isolation

**Restaurant Isolation Strategy:**
1. Every table has `restaurant_id` column
2. RLS policies enforce restaurant boundaries
3. Application middleware validates restaurant context
4. JWT tokens include restaurant_id claim
5. API queries always filter by restaurant_id

**Example Middleware:**
```typescript
export function requireRestaurantContext(req, res, next) {
  const restaurantId = req.user?.restaurant_id;
  if (!restaurantId) {
    return res.status(403).json({ error: 'No restaurant context' });
  }
  req.restaurantId = restaurantId;
  next();
}
```

**See:** `docs/explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md`

---

## 4. Data Model

### 4.1 Core Tables

#### `restaurants`
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `orders`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  items JSONB NOT NULL,           -- Embedded order items
  total_amount NUMERIC(10,2),
  tax_amount NUMERIC(10,2),
  status TEXT NOT NULL,            -- Order status enum
  order_type TEXT,                 -- dine_in, takeout, online
  table_id UUID REFERENCES tables(id),
  customer_name TEXT,
  special_instructions TEXT,
  payment_status TEXT,
  payment_method TEXT,
  version INTEGER DEFAULT 1,       -- Optimistic locking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `menu_items`
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  dietary_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `tables`
```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  table_number INTEGER NOT NULL,
  capacity INTEGER,
  status TEXT DEFAULT 'available', -- available, occupied, reserved
  current_order_id UUID REFERENCES orders(id),
  UNIQUE(restaurant_id, table_number)
);
```

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  email TEXT UNIQUE,
  role TEXT NOT NULL,              -- admin, manager, server, etc.
  pin_hash TEXT,                   -- For PIN authentication
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Embedded Orders Pattern

**Traditional Approach (avoided):**
```sql
-- Separate order_items table (slower, more complex)
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  menu_item_id UUID REFERENCES menu_items(id),
  quantity INTEGER,
  unit_price NUMERIC(10,2)
);
```

**Restaurant OS Approach:**
```typescript
// Items stored as JSONB in orders.items
const order = {
  id: '123',
  restaurant_id: '456',
  items: [
    {
      id: '789',
      name: 'Burger',
      quantity: 2,
      unit_price: 12.99,
      total_price: 25.98
    }
  ],
  total_amount: 25.98
};
```

**Benefits:**
- Single query to fetch complete order
- Atomic updates (no multi-table transactions)
- Historical immutability (items can't be changed after creation)
- 5x performance improvement in benchmarks

**See:** `docs/explanation/architecture-decisions/ADR-003-embedded-orders-pattern.md`

---

## 5. Getting Started

### 5.1 Prerequisites

- **Node.js:** 20.x (LTS)
- **npm:** 10.7.0+
- **PostgreSQL:** 15+ (or Supabase account)
- **Git:** Latest version
- **Code Editor:** VS Code recommended

### 5.2 First-Time Setup

**1. Clone Repository:**
```bash
git clone https://github.com/your-org/restaurant-os.git
cd restaurant-os
```

**2. Install Dependencies:**
```bash
npm run install:all
```

**3. Configure Environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

**4. Setup Database:**
```bash
# Login to Supabase CLI
npx supabase login

# Link project
npx supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
npx supabase db push
```

**5. Start Development Servers:**
```bash
npm run dev
# Client: http://localhost:5173
# Server: http://localhost:3001
```

### 5.3 Development Workflow

**Running Tests:**
```bash
npm test                 # Run all tests
npm run test:client      # Client tests only
npm run test:server      # Server tests only
npm run test:e2e         # End-to-end tests
```

**Type Checking:**
```bash
npm run typecheck        # Check all TypeScript
```

**Linting:**
```bash
npm run lint             # Check code style
npm run lint:fix         # Auto-fix issues
```

**Database Commands:**
```bash
npm run db:push          # Apply migrations
npm run db:reset         # Reset database
npm run db:migration:new # Create new migration
```

### 5.4 Common Development Tasks

**Create a New Component:**
```bash
cd client/src/components
mkdir MyComponent
touch MyComponent/index.tsx
touch MyComponent/MyComponent.tsx
```

**Add a New API Endpoint:**
```bash
cd server/src/routes
# Edit existing route file or create new one
```

**Create Database Migration:**
```bash
npx supabase migration new add_my_feature
# Edit supabase/migrations/[timestamp]_add_my_feature.sql
npm run db:push
```

---

## 6. Key Concepts for CS Students

### 6.1 Frontend Architecture

**Component Organization:**
- **Pages:** Top-level route components
- **Components:** Reusable UI pieces
- **Contexts:** Global state management
- **Hooks:** Reusable stateful logic
- **Utils:** Pure helper functions

**State Management:**
- React Context API for global state
- `UnifiedCartContext` - Single source of truth for cart
- Local state with `useState` for component-specific state
- Custom hooks for complex state logic

**Example Custom Hook:**
```typescript
function useOrders(restaurantId: string) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders(restaurantId)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [restaurantId]);

  return { orders, loading };
}
```

### 6.2 Backend Architecture

**Layered Design:**
```
Routes → Middleware → Services → Database
```

**Middleware Stack:**
1. CORS configuration
2. Request logging
3. JWT authentication
4. Restaurant context validation
5. Rate limiting
6. Request validation
7. Error handling

**Service Layer Pattern:**
```typescript
// services/orderService.ts
export async function createOrder(data: CreateOrderInput) {
  // Business logic here
  const order = await db.insert(orders).values(data);
  await publishWebSocketEvent('order:new', order);
  return order;
}
```

### 6.3 Database Design

**Normalization vs. Denormalization:**
- Menu items: Normalized (separate table)
- Order items: Denormalized (JSONB in orders table)
- **Why?** Orders are immutable, menus are mutable

**Indexing Strategy:**
```sql
-- Optimize common queries
CREATE INDEX idx_orders_restaurant_status
ON orders(restaurant_id, status);

CREATE INDEX idx_orders_created_at
ON orders(created_at DESC);
```

**Row-Level Security:**
```sql
-- Automatic filtering by restaurant
CREATE POLICY "Restaurant isolation"
ON orders FOR ALL
USING (restaurant_id = current_setting('app.restaurant_id')::uuid);
```

### 6.4 Real-Time Architecture

**WebSocket Pattern:**
- Single WebSocket connection per client
- Server broadcasts to rooms (one per restaurant)
- Automatic reconnection on disconnect
- Heartbeat for connection health

**Event Flow:**
```
Database Change → Application Code → WebSocket Event
  → Server Broadcasts → Connected Clients → UI Update
```

### 6.5 Security Best Practices

**Authentication:**
- Never store passwords in plain text (bcrypt + pepper)
- Use JWT for stateless authentication
- Include expiration times in tokens
- Validate tokens on every request

**Authorization:**
- Check user role before sensitive operations
- Use RLS for defense in depth
- Validate restaurant context
- Never trust client input

**Data Validation:**
```typescript
// Always validate input with Zod
const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  table_id: z.string().uuid().optional(),
  special_instructions: z.string().max(500).optional()
});
```

---

## 7. Common Pitfalls & Solutions

### 7.1 Environment Variables

**Problem:** Client can't access backend
**Cause:** Missing `VITE_` prefix on client variables
**Solution:** All client env vars MUST start with `VITE_`

### 7.2 Multi-Tenancy Bugs

**Problem:** User sees orders from other restaurants
**Cause:** Missing `restaurant_id` filter in query
**Solution:** Always include restaurant context:
```typescript
// ❌ BAD
const orders = await db.select().from(orders);

// ✅ GOOD
const orders = await db.select()
  .from(orders)
  .where(eq(orders.restaurant_id, restaurantId));
```

### 7.3 WebSocket Memory Leaks

**Problem:** Memory usage grows over time
**Cause:** Forgetting to clear intervals/listeners
**Solution:** Proper cleanup in useEffect
```typescript
useEffect(() => {
  const ws = new WebSocket(url);
  const interval = setInterval(ping, 30000);

  return () => {
    ws.close();
    clearInterval(interval);
  };
}, []);
```

### 7.4 Race Conditions

**Problem:** Order gets updated twice, causing conflicts
**Cause:** No optimistic locking
**Solution:** Use version field:
```typescript
// Check version before update
UPDATE orders
SET status = 'preparing', version = version + 1
WHERE id = $1 AND version = $2;
```

---

## 8. Next Steps

After understanding this overview, explore:

1. **Architecture Deep Dive:** `docs/explanation/architecture/ARCHITECTURE.md`
2. **Authentication Guide:** `docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md`
3. **API Reference:** `docs/reference/api/api/README.md`
4. **Development Process:** `docs/how-to/development/DEVELOPMENT_PROCESS.md`

**Hands-On Learning:**
- Set up local environment (`docs/tutorials/GETTING_STARTED.md`)
- Create a simple API endpoint
- Add a new React component
- Write tests for your code
- Deploy to staging environment

---

## 9. Additional Resources

### Documentation
- **Architecture Decisions:** `docs/explanation/architecture-decisions/`
- **API Reference:** `docs/reference/api/`
- **Troubleshooting:** `docs/how-to/troubleshooting/TROUBLESHOOTING.md`
- **Deployment:** `docs/how-to/operations/DEPLOYMENT.md`

### External Resources
- [React Documentation](https://react.dev)
- [Express Guide](https://expressjs.com)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Square Developer](https://developer.squareup.com)

### Community
- GitHub Issues for bug reports
- Pull requests welcome
- Code review process in `docs/how-to/development/CONTRIBUTING.md`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Maintained By:** Restaurant OS Team
