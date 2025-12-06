# Test Utilities

Centralized test mocks and data factories for consistent, maintainable tests.

## Directory Structure

```
client/src/test/
├── mocks/           # Mock utilities for external dependencies
│   ├── react-router.ts    # React Router mocks
│   ├── stripe.ts          # Stripe SDK mocks
│   ├── canvas.ts          # Canvas API mocks
│   ├── window.ts          # Window/browser API mocks
│   └── index.ts           # Barrel export
├── factories/       # Test data factories
│   ├── order.factory.ts      # Order and OrderItem factories
│   ├── menu-item.factory.ts  # MenuItem and Category factories
│   ├── user.factory.ts       # User and auth context factories
│   ├── restaurant.factory.ts # Restaurant config factories
│   └── index.ts              # Barrel export
└── README.md        # This file
```

## Mock Utilities

### React Router

```typescript
import { mockNavigate, setupRouterMocks } from '@/test/mocks';

describe('MyComponent', () => {
  beforeEach(() => {
    setupRouterMocks({ params: { orderId: '123' } });
  });

  it('navigates on click', async () => {
    // ... test code
    expect(mockNavigate).toHaveBeenCalledWith('/orders');
  });
});
```

### Stripe

```typescript
import { mockStripe, setupStripeMocks, setupStripePaymentFailure } from '@/test/mocks';

describe('PaymentForm', () => {
  beforeEach(() => {
    setupStripeMocks();
  });

  it('handles payment failure', async () => {
    setupStripePaymentFailure('Card declined');
    // ... test code
  });
});
```

### Canvas

```typescript
import { setupCanvasMock, mockContext2D } from '@/test/mocks';

describe('FloorPlan', () => {
  beforeEach(() => {
    setupCanvasMock();
  });

  it('draws tables', () => {
    // ... test code
    expect(mockContext2D.fillRect).toHaveBeenCalled();
  });
});
```

### Window

```typescript
import { setViewportSize, setMediaQueryMatch, setupLocalStorageMock } from '@/test/mocks';

describe('ResponsiveLayout', () => {
  beforeEach(() => {
    setViewportSize(1920, 1080);
    setMediaQueryMatch('(min-width: 768px)', true);
  });
});
```

## Data Factories

### Orders

```typescript
import {
  createOrder,
  createOrderWithItems,
  createPaidOrder,
  createOnlineOrder,
} from '@/test/factories';

// Basic order
const order = createOrder();

// Order with specific values
const customOrder = createOrder({
  status: 'preparing',
  total: 49.99,
});

// Order with items
const orderWithItems = createOrderWithItems(3);

// Completed/paid order
const paidOrder = createPaidOrder();

// Online customer order
const onlineOrder = createOnlineOrder({
  customer_email: 'test@example.com',
});
```

### Menu Items

```typescript
import {
  createMenuItem,
  createMenuItemWithModifiers,
  menuItemPresets,
  createFullMenu,
} from '@/test/factories';

// Basic menu item
const item = createMenuItem({ price: 14.99 });

// Item with modifier groups
const itemWithMods = createMenuItemWithModifiers(2);

// Common presets
const burger = menuItemPresets.burger();
const salad = menuItemPresets.salad();

// Full menu structure
const { categories, items } = createFullMenu(3, 5);
```

### Users & Auth

```typescript
import {
  createUser,
  createAuthenticatedUser,
  userPresets,
  authPresets,
} from '@/test/factories';

// Create user
const server = createUser({ role: 'server' });

// Auth context for hooks
const authContext = createAuthenticatedUser({ role: 'manager' });

// Quick presets
const managerAuth = authPresets.manager();
const unauthContext = authPresets.unauthenticated();
```

### Restaurants

```typescript
import {
  createRestaurant,
  createRestaurantContext,
  restaurantPresets,
} from '@/test/factories';

// Basic restaurant
const restaurant = createRestaurant({ name: 'Test Bistro' });

// Restaurant context for hooks
const context = createRestaurantContext();

// Presets
const kioskRestaurant = restaurantPresets.kioskOnly();
```

## Best Practices

### 1. Reset Counters for Deterministic IDs

```typescript
import { resetAllFactoryCounters } from '@/test/factories';

beforeEach(() => {
  resetAllFactoryCounters();
});
```

### 2. Use Presets for Common Scenarios

```typescript
// Instead of:
createUser({ role: 'manager', email: 'manager@restaurant.com' });

// Use:
userPresets.manager();
```

### 3. Override Only What You Test

```typescript
// Good - only override what matters for this test
const order = createOrder({ status: 'preparing' });

// Avoid - don't specify unnecessary fields
const order = createOrder({
  id: 'order-1',
  restaurant_id: '...',
  status: 'preparing',
  // ... lots of fields you don't care about
});
```

### 4. Import from Barrel Exports

```typescript
// Good - uses barrel export
import { createOrder, createMenuItem } from '@/test/factories';

// Avoid - direct file imports
import { createOrder } from '@/test/factories/order.factory';
```

## Test Restaurant IDs

Use these IDs for multi-tenant testing (from CLAUDE.md):

```typescript
import { TEST_RESTAURANT_ID, ALT_RESTAURANT_ID } from '@/test/factories';

// Primary test restaurant
TEST_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'

// Alternative for multi-tenant tests
ALT_RESTAURANT_ID = '22222222-2222-2222-2222-222222222222'
```
