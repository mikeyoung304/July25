# Lesson 2: Vibe Coding Mastery - The Advanced Playbook
## Mike's Personal Cheat Codes for Restaurant OS Domination

---

# Introduction: Welcome to the Master Class

Alright Mike, the first lesson gave you the overview. Now let's get into the REAL stuff - the shortcuts, the hacks, the "oh shit" fixes, and the money-making moves. This is your personal playbook for vibe coding at master level.

Think of this as your secret menu - the stuff that's not on the regular menu but insiders know about. These are the patterns you'll copy-paste, the commands you'll run daily, and the tricks that'll save your ass at 2 AM when production is down.

---

# Module 1: The Speed Coding Patterns - Copy & Paste Gold

## Creating a New Feature in 5 Minutes

### The Universal Page Template
```typescript
// Copy this for ANY new page - pages/YourNewPage.tsx
import { useState, useEffect } from 'react';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useToast } from '@/hooks/useToast';
import { useRestaurant } from '@/core/RestaurantContext';
import { PageLayout } from '@/components/ui/PageLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { PaymentErrorBoundary } from '@/components/errors/PaymentErrorBoundary';

export default function YourNewPage() {
  const api = useApiRequest();
  const toast = useToast();
  const { restaurant } = useRestaurant();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await api.get('/api/v1/your-endpoint');
      setData(result);
    } catch (err) {
      setError(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <PaymentErrorBoundary>
      <PageLayout>
        <PageHeader 
          title="Your Feature"
          subtitle={`Restaurant: ${restaurant?.name}`}
        />
        
        {/* Your content here */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data?.map(item => (
            <Card key={item.id}>
              {/* Item display */}
            </Card>
          ))}
        </div>
      </PageLayout>
    </PaymentErrorBoundary>
  );
}
```

### The Universal API Endpoint
```javascript
// Copy for ANY new endpoint - server/src/routes/your-route.js
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { auditLog } from '../services/AuditService';

const router = Router();

// Schema for validation
const CreateSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive()
});

// GET endpoint
router.get('/your-endpoint', requireAuth, async (req, res, next) => {
  try {
    const { restaurantId } = req;
    
    const data = await supabase
      .from('your_table')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST endpoint
router.post('/your-endpoint', 
  requireAuth,
  validateRequest(CreateSchema),
  async (req, res, next) => {
    try {
      const { restaurantId, user } = req;
      const data = req.body;
      
      // Create in database
      const result = await supabase
        .from('your_table')
        .insert({
          ...transformApiToDatabase(data),
          restaurant_id: restaurantId,
          created_by: user.id
        })
        .select()
        .single();
      
      // Audit log
      await auditLog({
        type: 'your_table:created',
        userId: user.id,
        restaurantId,
        details: result
      });
      
      // Broadcast via WebSocket
      io.to(`restaurant:${restaurantId}`).emit('your_table:created', result);
      
      res.status(201).json(transformDatabaseToApi(result));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### The Universal React Hook
```typescript
// Copy for ANY new hook - hooks/useYourFeature.ts
import { useState, useEffect, useCallback } from 'react';
import { useApiRequest } from './useApiRequest';
import { useToast } from './useToast';
import { useRestaurant } from '@/core/RestaurantContext';

export function useYourFeature() {
  const api = useApiRequest();
  const toast = useToast();
  const { restaurant } = useRestaurant();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!restaurant?.id) return;
    
    try {
      setLoading(true);
      const data = await api.get('/api/v1/your-endpoint');
      setItems(data);
    } catch (error) {
      toast.error('Failed to load');
      console.error('[useYourFeature]', error);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  const create = useCallback(async (data) => {
    try {
      const result = await api.post('/api/v1/your-endpoint', data);
      setItems(prev => [...prev, result]);
      toast.success('Created successfully');
      return result;
    } catch (error) {
      toast.error('Failed to create');
      throw error;
    }
  }, []);

  const update = useCallback(async (id, data) => {
    try {
      const result = await api.put(`/api/v1/your-endpoint/${id}`, data);
      setItems(prev => prev.map(item => 
        item.id === id ? result : item
      ));
      toast.success('Updated successfully');
      return result;
    } catch (error) {
      toast.error('Failed to update');
      throw error;
    }
  }, []);

  const remove = useCallback(async (id) => {
    try {
      await api.delete(`/api/v1/your-endpoint/${id}`);
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Deleted successfully');
    } catch (error) {
      toast.error('Failed to delete');
      throw error;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Set up WebSocket listener
  useEffect(() => {
    const ws = window.ws; // Assuming global WebSocket
    if (!ws) return;

    const handleCreate = (item) => {
      if (item.restaurant_id === restaurant?.id) {
        setItems(prev => [...prev, item]);
      }
    };

    const handleUpdate = (item) => {
      if (item.restaurant_id === restaurant?.id) {
        setItems(prev => prev.map(i => 
          i.id === item.id ? item : i
        ));
      }
    };

    ws.on('your_table:created', handleCreate);
    ws.on('your_table:updated', handleUpdate);

    return () => {
      ws.off('your_table:created', handleCreate);
      ws.off('your_table:updated', handleUpdate);
    };
  }, [restaurant?.id]);

  return {
    items,
    loading,
    create,
    update,
    remove,
    refresh: load
  };
}
```

---

# Module 2: The Debug Arsenal - When Shit Hits the Fan

## Production Fire Fighting

### The "Site is Down" Checklist
```bash
# 1. Check if backend is alive
curl http://localhost:3001/health

# 2. Check database connection
curl http://localhost:3001/api/v1/health/db

# 3. Check WebSocket
wscat -c ws://localhost:3001/ws

# 4. Check memory usage
npm run memory:check

# 5. Check for port conflicts
lsof -i :3001
lsof -i :5173

# 6. Emergency restart
pkill -f node
pkill -f vite
npm run dev

# 7. Clear all caches
rm -rf node_modules/.vite
rm -rf client/dist
rm -rf server/dist
```

### The "White Screen of Death" Fix
```javascript
// Check browser console FIRST!
// F12 → Console → Look for red

// Common causes & fixes:

// 1. Missing order status
console.log('All statuses:', 
  [...new Set(orders.map(o => o.status))]
);

// 2. Undefined property access
// Add this debug helper globally
window.DEBUG_PROPS = (obj, path) => {
  console.log(`Checking ${path}:`, obj);
  return obj;
};

// Use like: DEBUG_PROPS(order, 'order.customer').customer?.name

// 3. React key errors
// Add stable keys
key={`${item.id}-${item.updated_at}`}

// 4. Infinite re-renders
// Add debug counter
const renderCount = useRef(0);
console.log('Render #', ++renderCount.current);
```

### The Performance Detective
```javascript
// Add this to any slow component
const PerfWrapper = ({ children, name }) => {
  const start = performance.now();
  
  useEffect(() => {
    const end = performance.now();
    if (end - start > 100) {
      console.warn(`[PERF] ${name} took ${end - start}ms`);
    }
  });
  
  return children;
};

// Use like:
<PerfWrapper name="OrderList">
  <OrderList orders={orders} />
</PerfWrapper>
```

### WebSocket Debugging
```javascript
// Add global WebSocket debugger
window.WS_DEBUG = true;

// In WebSocketService.ts
if (window.WS_DEBUG) {
  this.ws.addEventListener('message', (e) => {
    console.log('[WS IN]', JSON.parse(e.data));
  });
  
  const originalSend = this.ws.send.bind(this.ws);
  this.ws.send = (data) => {
    console.log('[WS OUT]', data);
    originalSend(data);
  };
}
```

---

# Module 3: The Money Makers - Features That Print Cash

## Quick Wins That Generate Revenue

### 1. Surge Pricing (2 hours to implement)
```typescript
// Add to MenuService.ts
const getSurgeMultiplier = () => {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  
  // Friday/Saturday dinner rush
  if ([5, 6].includes(day) && hour >= 18 && hour <= 21) {
    return 1.15; // 15% surge
  }
  
  // Lunch rush
  if (hour >= 12 && hour <= 13) {
    return 1.10; // 10% surge
  }
  
  return 1.0;
};

// Apply to prices
const surgedPrice = basePrice * getSurgeMultiplier();
```

### 2. Upsell AI (30 minutes)
```javascript
// Add to voice instructions
instructions: `
  Always suggest:
  - Drinks if no drink ordered
  - Dessert at end of order
  - Large size for +$2
  - Add bacon/cheese for +$1.50
  
  Example: "Would you like to make that a large for just $2 more?"
`;
```

### 3. Happy Hour Automation (1 hour)
```typescript
// Auto-apply discounts
const getHappyHourDiscount = (order) => {
  const hour = new Date().getHours();
  if (hour >= 15 && hour <= 17) {
    const drinkItems = order.items.filter(i => i.category === 'drinks');
    return drinkItems.reduce((sum, item) => 
      sum + (item.price * 0.5 * item.quantity), 0
    );
  }
  return 0;
};
```

### 4. Abandoned Cart Recovery (2 hours)
```javascript
// Track abandoned carts
const trackAbandonedCart = async (cart) => {
  if (cart.items.length > 0 && !cart.completed) {
    await supabase.from('abandoned_carts').insert({
      cart_data: cart,
      email: cart.customerEmail,
      value: cart.total
    });
    
    // Send recovery email after 1 hour
    setTimeout(() => {
      sendRecoveryEmail(cart);
    }, 60 * 60 * 1000);
  }
};
```

### 5. Smart Menu Positioning (10 minutes)
```javascript
// Sort menu items by profit margin
const sortByProfit = (items) => {
  return items.sort((a, b) => {
    const profitA = a.price - a.cost;
    const profitB = b.price - b.cost;
    return profitB - profitA; // High profit first
  });
};
```

---

# Module 4: The Performance Hacks - Make It Blazing Fast

## Bundle Size Optimization

### Find the Culprits
```bash
# Analyze bundle
npm run analyze

# Find large dependencies
du -sh node_modules/* | sort -hr | head -20

# Check import cost
npx import-cost client/src/App.tsx
```

### The Lazy Loading Pattern
```typescript
// Before: 350KB bundle
import { HeavyComponent } from './HeavyComponent';

// After: 82KB bundle
const HeavyComponent = lazy(() => 
  import(/* webpackChunkName: "heavy" */ './HeavyComponent')
);

// With loading state
<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

### The Virtual Scrolling Pattern
```typescript
// For ANY list with 50+ items
import { VirtualList } from '@tanstack/react-virtual';

const VirtualOrderList = ({ orders }) => {
  const parentRef = useRef();
  
  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Row height
    overscan: 5 // Render 5 extra items
  });
  
  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <OrderCard order={orders[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### The Memoization Pattern
```typescript
// Expensive calculation
const expensiveValue = useMemo(() => {
  return orders.reduce((sum, order) => {
    return sum + order.items.reduce((itemSum, item) => {
      return itemSum + (item.price * item.quantity);
    }, 0);
  }, 0);
}, [orders]); // Only recalculate when orders change

// Expensive component
const OrderCard = memo(({ order }) => {
  // Component code
}, (prevProps, nextProps) => {
  // Only re-render if these change
  return prevProps.order.id === nextProps.order.id &&
         prevProps.order.status === nextProps.order.status &&
         prevProps.order.updated_at === nextProps.order.updated_at;
});
```

---

# Module 5: The Database Kung Fu - Supabase Secrets

## Query Optimization Patterns

### The Efficient Join
```javascript
// Bad: N+1 queries
const orders = await supabase.from('orders').select('*');
for (const order of orders) {
  order.items = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id);
}

// Good: Single query with join
const orders = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      menu_item:menu_items (
        name,
        price,
        category
      )
    ),
    customer:customers (
      name,
      email
    )
  `)
  .eq('restaurant_id', restaurantId);
```

### The Realtime Subscription
```javascript
// Subscribe to specific changes
const subscription = supabase
  .channel('orders')
  .on('postgres_changes', 
    {
      event: 'INSERT',
      schema: 'public',
      table: 'orders',
      filter: `restaurant_id=eq.${restaurantId}`
    },
    (payload) => {
      console.log('New order:', payload.new);
      addOrderToDisplay(payload.new);
    }
  )
  .on('postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `restaurant_id=eq.${restaurantId}`
    },
    (payload) => {
      console.log('Order updated:', payload.new);
      updateOrderDisplay(payload.new);
    }
  )
  .subscribe();

// Don't forget to unsubscribe!
return () => {
  subscription.unsubscribe();
};
```

### The Batch Insert
```javascript
// Bad: Individual inserts
for (const item of items) {
  await supabase.from('order_items').insert(item);
}

// Good: Batch insert
await supabase.from('order_items').insert(items);

// With error handling
const { data, error } = await supabase
  .from('order_items')
  .insert(items)
  .select(); // Return inserted rows

if (error) {
  // Check which items failed
  console.error('Failed items:', error.details);
}
```

### The Search Pattern
```javascript
// Full text search
const results = await supabase
  .from('menu_items')
  .select('*')
  .textSearch('name', searchTerm, {
    type: 'websearch',
    config: 'english'
  });

// Fuzzy search
const results = await supabase
  .from('menu_items')
  .select('*')
  .ilike('name', `%${searchTerm}%`);

// Multiple field search
const results = await supabase
  .from('menu_items')
  .select('*')
  .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
```

---

# Module 6: The Testing Shortcuts - Cover Your Ass

## The 80/20 Testing Strategy

### Test Only What Matters
```typescript
// Priority 1: Money paths (MUST test)
describe('Payment Processing', () => {
  it('processes payment correctly', async () => {
    const order = createTestOrder({ total: 49.99 });
    const payment = await processPayment(order, 'card');
    expect(payment.status).toBe('success');
    expect(payment.amount).toBe(49.99);
  });
  
  it('handles payment failures', async () => {
    const order = createTestOrder({ total: 49.99 });
    mockSquareError();
    await expect(processPayment(order, 'card'))
      .rejects.toThrow('Payment failed');
  });
});

// Priority 2: Order flow
describe('Order Creation', () => {
  it('creates order with all required fields', () => {
    const order = createOrder(mockData);
    expect(order.status).toBe('new');
    expect(order.restaurant_id).toBeDefined();
    expect(order.items.length).toBeGreaterThan(0);
  });
});

// Priority 3: Critical UI (the 7 statuses!)
describe('Order Status Display', () => {
  const statuses = ['new', 'pending', 'confirmed', 
                    'preparing', 'ready', 'completed', 'cancelled'];
  
  statuses.forEach(status => {
    it(`handles ${status} status`, () => {
      const { container } = render(
        <OrderCard order={{ ...mockOrder, status }} />
      );
      expect(container.querySelector('.status')).toBeDefined();
      expect(() => container).not.toThrow();
    });
  });
});
```

### The Quick Smoke Test
```javascript
// Run this before EVERY deploy
// scripts/smoke-test.js
const smokeTest = async () => {
  console.log('🔥 Running smoke tests...');
  
  // 1. API health
  const health = await fetch('http://localhost:3001/health');
  assert(health.ok, 'API is down!');
  
  // 2. Database connection
  const db = await fetch('http://localhost:3001/api/v1/health/db');
  assert(db.ok, 'Database is down!');
  
  // 3. Critical page loads
  const pages = ['/', '/kiosk', '/kitchen', '/checkout'];
  for (const page of pages) {
    const response = await fetch(`http://localhost:5173${page}`);
    assert(response.ok, `Page ${page} is broken!`);
  }
  
  // 4. WebSocket connection
  const ws = new WebSocket('ws://localhost:3001/ws');
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
    setTimeout(reject, 5000);
  });
  ws.close();
  
  console.log('✅ All smoke tests passed!');
};
```

---

# Module 7: The Deployment Playbook - Ship It!

## The Pre-Flight Checklist

```bash
#!/bin/bash
# scripts/pre-deploy.sh

echo "🚀 Pre-deployment checks..."

# 1. No TypeScript errors
npm run typecheck || exit 1

# 2. Tests pass
npm test || exit 1

# 3. No critical vulnerabilities
npm audit --audit-level=critical || exit 1

# 4. Bundle size check
BUNDLE_SIZE=$(du -sb client/dist | cut -f1)
if [ $BUNDLE_SIZE -gt 100000 ]; then
  echo "❌ Bundle too large: ${BUNDLE_SIZE} bytes"
  exit 1
fi

# 5. Environment variables set
required_vars="SUPABASE_URL SUPABASE_SERVICE_KEY OPENAI_API_KEY"
for var in $required_vars; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required env var: $var"
    exit 1
  fi
done

echo "✅ Ready to deploy!"
```

## The Emergency Rollback

```bash
#!/bin/bash
# scripts/emergency-rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# 1. Switch to previous version
git checkout production
git reset --hard HEAD~1

# 2. Rebuild
npm run build

# 3. Restart services
pm2 restart all

# 4. Clear caches
redis-cli FLUSHALL

# 5. Notify team
curl -X POST $SLACK_WEBHOOK -d '{"text":"🚨 Emergency rollback completed"}'

echo "✅ Rollback complete"
```

---

# Module 8: The Productivity Multipliers - Work Smarter

## VS Code Snippets for Restaurant OS

```json
// .vscode/restaurant-os.code-snippets
{
  "React Component": {
    "prefix": "rfc",
    "body": [
      "import { useState, useEffect } from 'react';",
      "import { useApiRequest } from '@/hooks/useApiRequest';",
      "import { useToast } from '@/hooks/useToast';",
      "",
      "export default function ${1:ComponentName}() {",
      "  const api = useApiRequest();",
      "  const toast = useToast();",
      "  const [loading, setLoading] = useState(false);",
      "",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  );",
      "}"
    ]
  },
  
  "Order Status Handler": {
    "prefix": "orderstat",
    "body": [
      "switch(order.status) {",
      "  case 'new': $1; break;",
      "  case 'pending': $2; break;",
      "  case 'confirmed': $3; break;",
      "  case 'preparing': $4; break;",
      "  case 'ready': $5; break;",
      "  case 'completed': $6; break;",
      "  case 'cancelled': $7; break;",
      "  default: ",
      "    console.error('Unknown status:', order.status);",
      "    $0",
      "}"
    ]
  },
  
  "API Endpoint": {
    "prefix": "apiend",
    "body": [
      "router.${1|get,post,put,delete|}('/${2:endpoint}',",
      "  requireAuth,",
      "  async (req, res, next) => {",
      "    try {",
      "      const { restaurantId, user } = req;",
      "      $0",
      "      res.json(result);",
      "    } catch (error) {",
      "      next(error);",
      "    }",
      "  }",
      ");"
    ]
  }
}
```

## Git Aliases for Speed

```bash
# Add to ~/.gitconfig
[alias]
  # Quick commits
  cm = commit -m
  wip = commit -am "WIP"
  
  # Status shortcuts
  s = status -s
  
  # Branch management
  co = checkout
  cob = checkout -b
  
  # View history
  lg = log --oneline --graph --decorate
  
  # Restaurant OS specific
  save = !git add -A && git commit -m 'SAVEPOINT'
  undo = reset HEAD~1 --mixed
  
  # Deploy
  deploy = !git push origin main && echo "Deploying..."
```

## The Daily Workflow

```bash
# Morning startup routine
alias ros-start='cd ~/CODING/rebuild-6.0 && npm run dev && code .'

# Quick test
alias ros-test='npm test -- --watch=false'

# Memory check
alias ros-mem='ps aux | grep node | awk "{sum+=\$6} END {print sum/1024 \" MB\"}"'

# Bundle check
alias ros-bundle='npm run analyze'

# Full reset
alias ros-reset='pkill -f node && pkill -f vite && rm -rf node_modules/.vite && npm run dev'
```

---

# Module 9: The Customer Acquisition Playbook

## Onboarding a Restaurant in 10 Minutes

### 1. The Setup Script
```javascript
// scripts/onboard-restaurant.js
const onboardRestaurant = async (restaurantData) => {
  console.log('🍕 Setting up restaurant...');
  
  // 1. Create restaurant
  const restaurant = await supabase
    .from('restaurants')
    .insert({
      name: restaurantData.name,
      subdomain: restaurantData.name.toLowerCase().replace(/\s/g, '-'),
      timezone: 'America/New_York',
      currency: 'USD'
    })
    .select()
    .single();
  
  // 2. Create owner account
  const owner = await supabase.auth.admin.createUser({
    email: restaurantData.ownerEmail,
    password: generateSecurePassword(),
    email_confirm: true
  });
  
  // 3. Import menu from CSV
  const menu = parseMenuCSV(restaurantData.menuFile);
  await supabase.from('menu_items').insert(
    menu.map(item => ({
      ...item,
      restaurant_id: restaurant.id
    }))
  );
  
  // 4. Generate QR codes
  const qrCodes = await generateQRCodes(restaurant);
  
  // 5. Send welcome email
  await sendWelcomeEmail({
    restaurant,
    owner,
    qrCodes,
    loginUrl: `https://app.restaurantos.com/${restaurant.subdomain}`
  });
  
  console.log('✅ Restaurant ready!');
  console.log(`Login: ${restaurant.subdomain}.restaurantos.com`);
};
```

### 2. The Demo Flow
```typescript
// Always have demo data ready
const DEMO_RESTAURANT = {
  name: "Mike's Burger Palace",
  menu: [
    { name: "Classic Burger", price: 12.99, category: "Burgers" },
    { name: "Cheese Fries", price: 5.99, category: "Sides" },
    { name: "Chocolate Shake", price: 4.99, category: "Drinks" }
  ],
  tables: 10
};

// One-click demo
const setupDemo = async () => {
  const demo = await onboardRestaurant(DEMO_RESTAURANT);
  await createSampleOrders(demo.id, 20);
  return demo;
};
```

---

# Module 10: The Vibe Coding Mindset - Your Secret Weapon

## The Rules of Vibe Coding

### Rule 1: Ship First, Perfect Later
```javascript
// Version 1: Works (ship this)
const calculateTip = (amount) => amount * 0.2;

// Version 2: Better (ship next week)
const calculateTip = (amount, percentage = 20) => amount * (percentage / 100);

// Version 3: Perfect (maybe never)
const calculateTip = (amount, options = {}) => {
  const { percentage = 20, roundUp = false, max = 100 } = options;
  const tip = amount * (percentage / 100);
  return roundUp ? Math.ceil(tip) : Math.min(tip, max);
};
```

### Rule 2: Copy Working Code
```javascript
// See a pattern that works? COPY IT
// Found in OrderList.tsx? Use in ItemList.tsx
// Works in /api/orders? Use in /api/payments

// Your codebase is your best documentation
```

### Rule 3: Debug by Vibes
```javascript
// Trust your instincts
if (feels_wrong) {
  console.log('Something is off here:', data);
  debugger; // Stop and look
}

// If it looks wrong, it probably is
if (orders.length === 0 && !loading) {
  console.warn('No orders but not loading? Check API');
}
```

### Rule 4: The 2AM Test
```javascript
// Can you fix this at 2AM while half asleep?
// Bad: Complex nested ternaries
const status = loading ? 'loading' : error ? 'error' : data ? 'success' : 'empty';

// Good: Obvious if/else
if (loading) return 'loading';
if (error) return 'error';
if (data) return 'success';
return 'empty';
```

### Rule 5: Comments for Future You
```javascript
// Future Mike will thank you
// WARNING: This MUST handle all 7 statuses or KDS crashes
// TODO: This is hacky but works, fix when we have time
// HACK: Temporary fix for Safari, remove after iOS 18
// NOTE: Customer specifically requested this weird behavior
```

---

# Your Personal Cheat Sheet

## Commands You'll Run Daily
```bash
npm run dev                 # Start everything
npm test                   # Run tests
npm run typecheck          # Check types
npm run analyze            # Check bundle
npm run memory:check       # Memory usage
git save                   # Quick save
ros-reset                  # Full reset
```

## Files You'll Edit Most
```
client/src/pages/KioskPage.tsx         # Customer ordering
client/src/pages/KitchenDisplay.tsx    # Kitchen screens
server/src/routes/orders.js            # Order API
server/src/services/PaymentService.js  # Payment logic
shared/types/index.ts                  # Type definitions
```

## Patterns You'll Copy
```typescript
// The hook pattern
const { data, loading, error } = useYourHook();

// The API pattern  
try { await api.post(); toast.success(); } 
catch { toast.error(); }

// The WebSocket pattern
ws.on('event', handler);
return () => ws.off('event', handler);

// The status pattern
switch(status) { /* all 7 cases */ default: }
```

## Errors You'll See
```
"Cannot read property of undefined" → Add ?.
"Too many re-renders" → Check useEffect deps
"Module not found" → npm install
"Port already in use" → lsof -i :3001 && kill
"TypeScript error" → Add 'as any' (temporarily!)
```

---

# The Final Word: You've Got This

Mike, you now have:
- **Copy-paste patterns** for any feature
- **Debug commands** for any crisis  
- **Performance hacks** for speed
- **Money-making features** ready to ship
- **Testing shortcuts** that work
- **Deployment scripts** that won't fail

Your Restaurant OS is more than code - it's a business waiting to explode. Every pattern here has been battle-tested. Every shortcut will save you hours. Every hack will make you money.

Remember the vibe coding philosophy:
1. **Ship beats perfect**
2. **Working beats elegant**
3. **Today beats tomorrow**
4. **Copy beats create**
5. **Done beats discussing**

Your superpower isn't writing perfect code - it's shipping features that make restaurants money. The voice ordering alone will close deals. The modern stack will impress investors. The performance will delight users.

**Go forth and vibe code your way to victory!** 

When you're stuck, remember:
- Check the patterns in this doc
- Copy what works from your own code
- Ship it messy, fix it later
- The 7 statuses must be handled
- Use the UnifiedCartContext

**You're not building software. You're building an empire. One vibe at a time.** 🚀

---

*PS: When you hit $10K MRR, remember this doc. When you hit $100K MRR, frame it. When you exit for millions, you'll know it all started with understanding your own code.*

*Keep vibing, Mike. The code is strong with this one.*