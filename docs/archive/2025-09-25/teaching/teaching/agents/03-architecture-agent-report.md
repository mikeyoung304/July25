# Architecture Agent Report: The Restaurant OS Blueprint

## Executive Summary for Mike
Hey Mike! Your Restaurant OS is like a well-designed restaurant building with three main areas:
- **Frontend (Dining Room)**: Where customers interact - React 19.1.0
- **Backend (Kitchen)**: Where orders are processed - Express on port 3001  
- **Database (Pantry)**: Where all data is stored - Supabase/PostgreSQL

Everything is unified now - one backend server instead of three! It's like consolidating the kitchen, bar, and bakery into one efficient space.

## The Restaurant Building Analogy

```
┌─────────────────────────────────────────────────────────┐
│                    RESTAURANT OS                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  DINING ROOM (Frontend - Port 5173)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React 19.1.0 + TypeScript + Vite               │   │
│  │  • Customer Ordering (Kiosk)                    │   │
│  │  • Server Stations (POS)                        │   │
│  │  • Display Screens (KDS)                        │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↕                              │
│                     API WINDOW                          │
│                   (REST + WebSocket)                    │
│                          ↕                              │
│  KITCHEN (Backend - Port 3001)                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Express 4.18.2 + Node.js                       │   │
│  │  • Order Processing                             │   │
│  │  • Payment Handling                             │   │
│  │  • AI Voice Service                             │   │
│  │  • WebSocket Broadcasting                       │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↕                              │
│  PANTRY (Database)                                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Supabase (PostgreSQL 14+)                      │   │
│  │  • Orders, Menus, Customers                     │   │
│  │  • Real-time subscriptions                      │   │
│  │  • Row-level security                           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack Decisions (Why These Tools?)

### Frontend Stack
- **React 19.1.0**: Latest features, better performance
- **TypeScript 5.8.3**: Catches bugs before runtime (like spell-check for code)
- **Vite 5.4.19**: Lightning fast builds (4 seconds vs 40 seconds with Webpack)
- **TailwindCSS**: Rapid UI development (like LEGO blocks for styling)

### Backend Stack
- **Express 4.18.2**: Battle-tested, simple, fast
- **Node.js 20+**: JavaScript everywhere (same language front and back)
- **WebSocket (ws)**: Real-time updates (like intercoms in the kitchen)

### Database Stack
- **Supabase**: PostgreSQL + Real-time + Auth built-in
- **PostgreSQL 14+**: Rock-solid relational database
- **Row-Level Security**: Each restaurant sees only their data

## Directory Structure Explained

```
rebuild-6.0/
├── client/          # The Dining Room (what customers see)
│   ├── src/
│   │   ├── components/   # Reusable UI pieces (like plates and silverware)
│   │   ├── contexts/     # Shared state (like the order clipboard all waiters see)
│   │   ├── pages/        # Different screens (menu board, checkout, kitchen display)
│   │   ├── hooks/        # Smart behaviors (like "auto-refill drinks")
│   │   └── services/     # API connections (like the ordering system)
│   │
├── server/          # The Kitchen (where the magic happens)
│   ├── src/
│   │   ├── routes/       # API endpoints (like different cooking stations)
│   │   ├── services/     # Business logic (recipes and procedures)
│   │   ├── middleware/   # Request filters (like checking IDs at the door)
│   │   └── ai/          # Voice AI (like a smart order-taker)
│   │
├── shared/          # Shared Supplies (used by both front and back)
│   ├── types/           # TypeScript definitions (the restaurant manual)
│   └── utils/           # Helper functions (like cooking timers)
│   
└── docs/           # Restaurant Operations Manual
```

## The Unified Backend (Port 3001)

### Before (Version 5.x) - Three Separate Servers
```
:3000 - Main API (Kitchen)
:3002 - WebSocket (Intercom)
:3003 - AI Gateway (Smart Assistant)

Problems: Like having three separate kitchens - chaos!
```

### Now (Version 6.x) - One Unified Server
```
:3001 - Everything!
  ├── /api/v1/*        - REST APIs
  ├── /ws              - WebSocket connections
  └── /api/v1/realtime - AI Voice sessions

Benefits: One kitchen, better coordination!
```

## API Architecture (The Order Window)

### RESTful Endpoints
```javascript
// Like a menu of available services
GET    /api/v1/orders      // View orders
POST   /api/v1/orders      // Create order
PUT    /api/v1/orders/:id  // Update order
DELETE /api/v1/orders/:id  // Cancel order

// Headers required (like showing ID to enter)
{
  'Authorization': 'Bearer <token>',
  'X-Restaurant-ID': '<restaurant-id>',
  'X-CSRF-Token': '<csrf-token>'
}
```

### WebSocket Events
```javascript
// Real-time updates (like kitchen announcements)
ws.on('order:created', (order) => {})
ws.on('order:updated', (order) => {})
ws.on('order:ready', (order) => {})
```

## Case Transformation Magic

The database speaks `snake_case`, the API speaks `camelCase`:

```javascript
// Database (PostgreSQL)
{
  restaurant_id: "123",
  order_number: 456,
  created_at: "2025-01-30"
}

// ↓ Automatic transformation at API boundary ↓

// Frontend (JavaScript)
{
  restaurantId: "123",
  orderNumber: 456,
  createdAt: "2025-01-30"
}
```

## Context System (Shared Clipboards)

```typescript
// UnifiedCartContext - THE shopping cart everyone shares
<UnifiedCartContext.Provider>
  {/* All components inside can access the cart */}
</UnifiedCartContext.Provider>

// RestaurantContext - Which restaurant are we in?
<RestaurantContext.Provider value={currentRestaurant}>
  {/* All components know which restaurant */}
</RestaurantContext.Provider>

// AuthContext - Who's logged in?
<AuthContext.Provider>
  {/* All components know the user */}
</AuthContext.Provider>
```

## Build & Bundle Architecture

### Development Mode
```bash
npm run dev
  ├── Vite Dev Server (:5173) - Hot reload frontend
  └── Nodemon (:3001) - Auto-restart backend
```

### Production Build
```bash
npm run build
  ├── client/dist/ - Optimized static files (82KB main chunk!)
  └── server/dist/ - Compiled TypeScript → JavaScript
```

### Memory Optimization
```javascript
// Before: 12GB RAM needed
// After: 4GB RAM max

// How? 
NODE_OPTIONS="--max-old-space-size=4096"
// Plus: Code splitting, lazy loading, tree shaking
```

## Multi-Tenancy Architecture

Every piece of data is scoped to a restaurant:

```sql
-- Database level
CREATE POLICY restaurant_isolation ON orders
  FOR ALL
  USING (restaurant_id = current_restaurant_id());

-- API level
app.use((req, res, next) => {
  req.restaurantId = req.headers['x-restaurant-id'];
  // All queries filtered by this ID
});

-- Frontend level
const orders = useOrders(); // Automatically filtered!
```

## Error Handling Architecture

```
┌─────────────┐
│   Browser   │ ← ErrorBoundary (React)
└──────┬──────┘
       ↓
┌─────────────┐
│   Frontend  │ ← Try/Catch + Toast notifications
└──────┬──────┘
       ↓
┌─────────────┐
│     API     │ ← Express error middleware
└──────┬──────┘
       ↓
┌─────────────┐
│   Database  │ ← Transaction rollback
└─────────────┘
```

## Performance Architecture

### Bundle Optimization
- **Code Splitting**: Load only what's needed
- **Lazy Loading**: `React.lazy(() => import('./Page'))`
- **Tree Shaking**: Remove unused code
- **Compression**: Gzip everything

### Runtime Optimization
- **Virtual Scrolling**: Render only visible items
- **React.memo**: Prevent unnecessary re-renders
- **Debouncing**: Limit API calls
- **Caching**: `ResponseCache` for repeated requests

## Deployment Architecture

```yaml
# Docker Container Structure
restaurant-os:6.0.3
  ├── nginx (Static files + proxy)
  ├── node (Express server)
  └── postgres (Via Supabase connection)

# Environment-based config
NODE_ENV=production
  ├── Minified code
  ├── No source maps
  ├── Aggressive caching
  └── Error reporting
```

## Key Architectural Decisions

1. **Unified Backend**: Simplicity > Microservices (for now)
2. **TypeScript Everywhere**: Type safety > Flexibility
3. **Supabase**: Managed infrastructure > Self-hosted
4. **React 19**: Latest features > Stability (calculated risk)
5. **Vite**: Speed > Webpack ecosystem
6. **WebRTC for Voice**: Quality > Simplicity

## Architecture Rules & Gotchas

### The Golden Rules
1. **Always use UnifiedCartContext** (never create duplicate carts)
2. **All 7 order statuses must be handled** (or KDS crashes)
3. **Never put .js files in /shared** (breaks browser imports)
4. **Always include restaurant_id** (multi-tenancy)
5. **Clean up WebSocket connections** (memory leaks)

### Common Architectural Mistakes
```javascript
// BAD - Creating new context
const MyCartContext = createContext();

// GOOD - Use existing
import { UnifiedCartContext } from '@/contexts/UnifiedCartContext';

// BAD - Direct database connection
const db = new PostgresClient();

// GOOD - Through API
const orders = await api.get('/api/v1/orders');
```

## Mike's Architecture Cheat Sheet

```bash
# Check architecture health
npm run analyze           # Bundle analysis
npm run typecheck        # Type safety check
npm run memory:check     # Memory usage

# Debug architecture issues
# 1. Port conflicts
lsof -i :3001           # What's using the port?

# 2. Module resolution
npm ls @rebuild/shared   # Check shared module

# 3. WebSocket issues
# Chrome DevTools → Network → WS → Check frames
```

## Summary for Course Creation

The Restaurant OS architecture is like a well-designed restaurant:
- **Frontend (Dining Room)**: Beautiful, responsive, customer-facing
- **Backend (Kitchen)**: Efficient, organized, handles all processing
- **Database (Pantry)**: Secure, organized, stores everything
- **Shared (Supplies)**: Common tools used everywhere

The key insight is **unification**: Instead of multiple servers (like multiple kitchens), everything runs through one efficient backend. This makes development easier, deployment simpler, and debugging straightforward.

The architecture prioritizes:
1. **Developer Experience**: Same language everywhere, hot reload, TypeScript
2. **Performance**: 82KB bundles, 4GB RAM max, <2s load times
3. **Maintainability**: Clear structure, shared types, error boundaries
4. **Scalability**: Multi-tenant ready, WebSocket broadcasting, caching

Think of it as building a restaurant that can start as a food truck and grow into a chain without changing the fundamental architecture!