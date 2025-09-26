# KDS Agent Report: The Digital Kitchen Display Bible

## ⚠️ CRITICAL WARNING FOR MIKE ⚠️
**Missing even ONE of the 7 order statuses = CRASH!** Your app will show a white screen of death. This is THE #1 cause of KDS failures. Always handle: `new`, `pending`, `confirmed`, `preparing`, `ready`, `completed`, `cancelled`.

## Executive Summary
Mike, your Kitchen Display System is like having TV screens in the kitchen that show orders in real-time. Orders flow through 7 stages (like a factory assembly line), and if you forget to handle even one stage, the whole system crashes. It's built with WebSockets for instant updates and React for the UI.

## The Kitchen Workflow (Restaurant Analogy)

Think of orders like tickets at a restaurant:

1. **NEW** → Waiter just wrote the order
2. **PENDING** → Order slip handed to kitchen
3. **CONFIRMED** → Chef reads and accepts order
4. **PREPARING** → Chef is cooking
5. **READY** → Food is plated, waiting for pickup
6. **COMPLETED** → Food delivered to customer
7. **CANCELLED** → Customer changed mind

```
Customer → POS → NEW → PENDING → CONFIRMED → PREPARING → READY → COMPLETED
                                     ↓
                                 CANCELLED (at any stage)
```

## The 7 Sacred Statuses (MEMORIZE THESE!)

```typescript
// THIS MUST BE COMPLETE - NO EXCEPTIONS!
type OrderStatus = 
  | 'new'       // Just created
  | 'pending'   // Awaiting confirmation
  | 'confirmed' // Kitchen accepted
  | 'preparing' // Being made
  | 'ready'     // Pickup ready
  | 'completed' // Delivered
  | 'cancelled' // Aborted

// ALWAYS include a default case!
switch(order.status) {
  case 'new': // handle
  case 'pending': // handle
  case 'confirmed': // handle
  case 'preparing': // handle
  case 'ready': // handle
  case 'completed': // handle
  case 'cancelled': // handle
  default: 
    // CRITICAL: Always have a fallback!
    console.error('Unknown status:', order.status);
    return <div>Unknown Status</div>;
}
```

## Why Missing Statuses = Catastrophe

```javascript
// BAD - Will crash with runtime error
const statusColors = {
  new: 'blue',
  pending: 'yellow',
  preparing: 'orange',
  ready: 'green'
  // Missing: confirmed, completed, cancelled!
};

// When order.status = 'confirmed':
const color = statusColors[order.status]; // undefined!
style.backgroundColor = color; // CRASH!

// GOOD - Safe with fallback
const statusColors = {
  new: 'blue',
  pending: 'yellow',
  confirmed: 'purple',
  preparing: 'orange',
  ready: 'green',
  completed: 'gray',
  cancelled: 'red'
};

const color = statusColors[order.status] || 'gray'; // Safe!
```

## Core KDS Components

### 1. KitchenDisplayOptimized.tsx
**Purpose**: Main kitchen screen showing all active orders
**Key Features**:
- Virtual scrolling for 50+ orders
- Auto-refresh every 30 seconds
- Color-coded by urgency
- Touch-optimized for tablets

### 2. OrderCard Component
**Purpose**: Individual order display
**Critical Code**:
```typescript
// Must handle all statuses!
const OrderCard = ({ order }) => {
  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      new: '#3B82F6',
      pending: '#F59E0B',
      confirmed: '#8B5CF6',
      preparing: '#F97316',
      ready: '#10B981',
      completed: '#6B7280',
      cancelled: '#EF4444'
    };
    return colors[status] || '#6B7280'; // ALWAYS HAVE DEFAULT!
  };
```

### 3. WebSocket Real-time Updates
**How Orders Flow**:
```javascript
// Order created at POS
POST /api/v1/orders → 

// Server broadcasts
ws.send({
  type: 'order:created',
  order: { id, status: 'new', items, ... }
}) →

// All KDS screens update
useEffect(() => {
  ws.on('order:created', (order) => {
    setOrders(prev => [...prev, order]);
  });
})
```

## Memory Management for Long Sessions

KDS runs 12+ hours, so memory leaks = crashes:

```javascript
// GOOD - Proper cleanup
useEffect(() => {
  const ws = new WebSocket(url);
  
  const handleOrder = (data) => {
    // Process order
  };
  
  ws.on('order:update', handleOrder);
  
  // CRITICAL: Clean up!
  return () => {
    ws.off('order:update', handleOrder);
    ws.close();
  };
}, []);

// Limit stored orders
const MAX_ORDERS = 100;
if (orders.length > MAX_ORDERS) {
  orders = orders.slice(-MAX_ORDERS);
}
```

## Error Boundaries (Your Safety Net)

```typescript
// Wrap EVERY KDS component
<KitchenErrorBoundary>
  <OrderCard order={order} />
</KitchenErrorBoundary>

// The boundary catches crashes
class KitchenErrorBoundary extends Component {
  componentDidCatch(error) {
    console.error('KDS Error:', error);
    // Show fallback UI instead of white screen
    return <div>Order display error - refreshing...</div>;
  }
}
```

## WebSocket Connection Management

```javascript
// Exponential backoff for reconnection
let retryCount = 0;
const MAX_RETRY = 5;

function connectWebSocket() {
  const ws = new WebSocket(url);
  
  ws.onclose = () => {
    if (retryCount < MAX_RETRY) {
      const delay = Math.min(1000 * 2 ** retryCount, 30000);
      setTimeout(() => {
        retryCount++;
        connectWebSocket();
      }, delay);
    }
  };
  
  ws.onopen = () => {
    retryCount = 0; // Reset on success
  };
}
```

## Multi-Restaurant Support

```javascript
// ALWAYS filter by restaurant_id
const kitchenOrders = orders.filter(
  order => order.restaurant_id === currentRestaurant.id
);

// WebSocket must include restaurant context
ws.send({
  type: 'subscribe',
  restaurant_id: '11111111-1111-1111-1111-111111111111'
});
```

## Order Type Mappings (Gotcha!)

```javascript
// Database format
type DbOrderType = 'online' | 'pickup' | 'delivery';

// UI Display format  
type UiOrderType = 'dine-in' | 'takeout' | 'delivery' | 
                   'online' | 'drive-thru' | 'kiosk' | 'voice';

// MUST transform between them!
function mapOrderType(dbType: DbOrderType): UiOrderType {
  const mapping = {
    'online': 'online',
    'pickup': 'takeout',
    'delivery': 'delivery'
  };
  return mapping[dbType] || 'dine-in';
}
```

## Testing Your KDS

### The KDS Checklist
- [ ] All 7 statuses have colors defined
- [ ] All 7 statuses have text labels
- [ ] Switch statements have default cases
- [ ] Error boundaries wrap components
- [ ] WebSocket cleanup in useEffect
- [ ] Restaurant filtering applied
- [ ] Memory limits enforced
- [ ] Reconnection logic implemented

### Test Commands
```bash
# Start the app
npm run dev

# Open KDS
open http://localhost:5173/kitchen

# Create test orders with all statuses
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed", "items": [...]}'

# Monitor memory usage
npm run memory:check

# Check for memory leaks
grep -r "addEventListener" --include="*.tsx" | grep -v "removeEventListener"
```

## Common KDS Bugs & Fixes

### Bug 1: "Cannot read property of undefined"
```javascript
// BAD
<div>{order.customer.name}</div>

// GOOD - Safe navigation
<div>{order?.customer?.name || 'Guest'}</div>
```

### Bug 2: "Maximum update depth exceeded"
```javascript
// BAD - Infinite loop!
useEffect(() => {
  setOrders([...orders, newOrder]);
}); // No dependency array!

// GOOD - Proper dependencies
useEffect(() => {
  setOrders(prev => [...prev, newOrder]);
}, [newOrder.id]); // Only when ID changes
```

### Bug 3: "WebSocket already in CLOSING state"
```javascript
// GOOD - Check state before sending
if (ws.readyState === WebSocket.OPEN) {
  ws.send(data);
}
```

## Performance Optimization

### Virtual Scrolling (>50 orders)
```javascript
import { VirtualizedOrderGrid } from './VirtualizedOrderGrid';

// Only renders visible orders
<VirtualizedOrderGrid 
  orders={orders}
  itemHeight={200}
  containerHeight={800}
/>
```

### React.memo for Order Cards
```javascript
// Prevent unnecessary re-renders
const OrderCard = React.memo(({ order }) => {
  // Component code
}, (prevProps, nextProps) => {
  // Only re-render if these change:
  return prevProps.order.id === nextProps.order.id &&
         prevProps.order.status === nextProps.order.status &&
         prevProps.order.updated_at === nextProps.order.updated_at;
});
```

## Mike's Emergency Debug Guide

```javascript
// When KDS crashes, add this to find the problem:

// 1. Log all statuses
console.log('Unique statuses:', 
  [...new Set(orders.map(o => o.status))]
);

// 2. Find undefined status handlers
Object.entries(statusConfig).forEach(([status, value]) => {
  if (!value) console.error('Missing config for:', status);
});

// 3. Validate order data
orders.forEach(order => {
  if (!['new','pending','confirmed','preparing',
        'ready','completed','cancelled'].includes(order.status)) {
    console.error('Invalid status:', order.status, order);
  }
});

// 4. Check browser console (not server logs!)
// F12 → Console → Look for red errors
```

## Summary for Course Creation

The Kitchen Display System is the heart of restaurant operations. It's a real-time, WebSocket-powered system that MUST handle all 7 order statuses or it crashes. Think of it as a factory assembly line where orders move through stages, and missing any stage breaks the line.

Key insights:
1. **Status Completeness**: All 7 statuses must be handled everywhere
2. **Error Boundaries**: Your safety net against white screens
3. **Memory Management**: Critical for 12+ hour sessions
4. **WebSocket Resilience**: Auto-reconnect is essential
5. **Multi-tenancy**: Always filter by restaurant_id

The #1 rule: **When in doubt, add a default case!** It's better to show "Unknown Status" than crash the entire screen. The KDS is mission-critical - when it fails, the kitchen stops!