---
status: pending
priority: p2
issue_id: "092"
tags: [code-review, testing, multi-tenancy]
dependencies: []
---

# Missing Multi-Tenant Tests in Kitchen Components

## Problem Statement

Kitchen component tests do not verify `restaurant_id` filtering, creating a risk that multi-tenancy violations could go undetected. A bug could allow Restaurant A to see Restaurant B's orders, which would be a critical data leak in production.

## Findings

**Location:** `client/src/components/kitchen/__tests__/*.tsx`

```typescript
// Example from KitchenDisplay.test.tsx
describe('KitchenDisplay', () => {
  it('should display orders', () => {
    const orders = [
      { id: '1', status: 'preparing', items: [...] },
      { id: '2', status: 'ready', items: [...] }
    ];

    render(<KitchenDisplay orders={orders} />);

    expect(screen.getByText('Order #1')).toBeInTheDocument();
    expect(screen.getByText('Order #2')).toBeInTheDocument();
  });
});
```

**Missing Test Coverage:**
1. ❌ No verification that orders from other restaurants are filtered out
2. ❌ No tests for `restaurant_id` in API requests
3. ❌ No tests for context provider tenant isolation
4. ❌ No tests for WebSocket event filtering by tenant
5. ❌ No tests for shared device scenarios (multiple restaurants on same device)

**Critical Gaps:**

```typescript
// What SHOULD be tested but ISN'T:
describe('Multi-Tenant Isolation', () => {
  it('should only show orders for current restaurant');
  it('should filter WebSocket events by restaurant_id');
  it('should include restaurant_id in all API requests');
  it('should prevent cross-tenant order updates');
  it('should handle restaurant switching correctly');
});
```

**Real-World Risk:**

If a developer accidentally removes the `restaurant_id` filter from an API call:
```typescript
// Before (correct):
const orders = await httpClient.get('/orders', {
  params: { restaurant_id: currentRestaurant }
});

// After bug (incorrect):
const orders = await httpClient.get('/orders');
// ^ Returns ALL orders from ALL restaurants!
```

**Current test suite would NOT catch this bug** because tests don't verify tenant filtering.

## Examples of Multi-Tenant Violations

From the codebase audit, these patterns are NOT tested:

### 1. Kitchen Display Orders
```typescript
// File: client/src/components/kitchen/KitchenDisplay.tsx
// Risk: Could display orders from wrong restaurant
useEffect(() => {
  const fetchOrders = async () => {
    const orders = await httpClient.get('/orders/kitchen');
    setOrders(orders);
  };
  fetchOrders();
}, []);

// ❌ No test verifies restaurant_id is in the request
// ❌ No test verifies only current restaurant's orders shown
```

### 2. WebSocket Events
```typescript
// File: client/src/hooks/useKitchenWebSocket.ts
// Risk: Could receive order updates from other restaurants
socket.on('order:updated', (order) => {
  updateOrder(order);
});

// ❌ No test verifies events filtered by restaurant_id
// ❌ No test verifies wrong restaurant's events are ignored
```

### 3. Order Status Updates
```typescript
// File: client/src/components/kitchen/OrderCard.tsx
// Risk: Could update orders from other restaurants
const handleStatusChange = async (orderId, newStatus) => {
  await httpClient.put(`/orders/${orderId}/status`, { status: newStatus });
};

// ❌ No test verifies restaurant_id validation
// ❌ No test verifies 403 error if wrong restaurant
```

## Proposed Solutions

### Option 1: Add Multi-Tenant Test Utilities
```typescript
// client/src/test/multi-tenant-utils.ts
export const MOCK_RESTAURANTS = {
  RESTAURANT_A: '11111111-1111-1111-1111-111111111111',
  RESTAURANT_B: '22222222-2222-2222-2222-222222222222'
};

export function createOrderForRestaurant(restaurantId: string, overrides = {}) {
  return {
    id: `order-${Math.random()}`,
    restaurant_id: restaurantId,
    status: 'preparing',
    items: [],
    created_at: new Date().toISOString(),
    ...overrides
  };
}

export function setupMultiTenantTest() {
  const mockHttpClient = jest.fn();
  const restaurantContext = {
    currentRestaurant: MOCK_RESTAURANTS.RESTAURANT_A,
    setRestaurant: jest.fn()
  };

  return {
    mockHttpClient,
    restaurantContext,
    switchRestaurant: (restaurantId: string) => {
      restaurantContext.currentRestaurant = restaurantId;
    }
  };
}
```

### Option 2: Add Required Multi-Tenant Tests
```typescript
// client/src/components/kitchen/__tests__/KitchenDisplay.test.tsx
import { MOCK_RESTAURANTS, createOrderForRestaurant } from '@/test/multi-tenant-utils';

describe('KitchenDisplay - Multi-Tenant Isolation', () => {
  it('should only display orders for current restaurant', async () => {
    const restaurantA = MOCK_RESTAURANTS.RESTAURANT_A;
    const restaurantB = MOCK_RESTAURANTS.RESTAURANT_B;

    const ordersFromA = [
      createOrderForRestaurant(restaurantA, { id: '1' }),
      createOrderForRestaurant(restaurantA, { id: '2' })
    ];

    const ordersFromB = [
      createOrderForRestaurant(restaurantB, { id: '3' }),
      createOrderForRestaurant(restaurantB, { id: '4' })
    ];

    // Mock API returns orders from both restaurants (simulating bug)
    mockHttpClient.get.mockResolvedValue([...ordersFromA, ...ordersFromB]);

    render(
      <RestaurantContext.Provider value={{ currentRestaurant: restaurantA }}>
        <KitchenDisplay />
      </RestaurantContext.Provider>
    );

    await waitFor(() => {
      // Should only show Restaurant A orders
      expect(screen.getByText('Order #1')).toBeInTheDocument();
      expect(screen.getByText('Order #2')).toBeInTheDocument();

      // Should NOT show Restaurant B orders
      expect(screen.queryByText('Order #3')).not.toBeInTheDocument();
      expect(screen.queryByText('Order #4')).not.toBeInTheDocument();
    });
  });

  it('should include restaurant_id in API request', async () => {
    const restaurantId = MOCK_RESTAURANTS.RESTAURANT_A;

    render(
      <RestaurantContext.Provider value={{ currentRestaurant: restaurantId }}>
        <KitchenDisplay />
      </RestaurantContext.Provider>
    );

    await waitFor(() => {
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/orders/kitchen',
        expect.objectContaining({
          params: expect.objectContaining({
            restaurant_id: restaurantId
          })
        })
      );
    });
  });

  it('should filter WebSocket events by restaurant_id', async () => {
    const restaurantA = MOCK_RESTAURANTS.RESTAURANT_A;
    const restaurantB = MOCK_RESTAURANTS.RESTAURANT_B;

    const { result } = renderHook(() => useKitchenWebSocket(), {
      wrapper: ({ children }) => (
        <RestaurantContext.Provider value={{ currentRestaurant: restaurantA }}>
          {children}
        </RestaurantContext.Provider>
      )
    });

    // Emit order update for Restaurant B
    mockSocket.emit('order:updated', createOrderForRestaurant(restaurantB, {
      id: 'wrong-restaurant-order'
    }));

    // Should NOT update state
    expect(result.current.orders).not.toContainEqual(
      expect.objectContaining({ id: 'wrong-restaurant-order' })
    );

    // Emit order update for Restaurant A
    mockSocket.emit('order:updated', createOrderForRestaurant(restaurantA, {
      id: 'correct-restaurant-order'
    }));

    // Should update state
    await waitFor(() => {
      expect(result.current.orders).toContainEqual(
        expect.objectContaining({ id: 'correct-restaurant-order' })
      );
    });
  });

  it('should prevent status updates for other restaurants', async () => {
    const restaurantA = MOCK_RESTAURANTS.RESTAURANT_A;
    const restaurantB = MOCK_RESTAURANTS.RESTAURANT_B;

    const orderFromB = createOrderForRestaurant(restaurantB);

    render(
      <RestaurantContext.Provider value={{ currentRestaurant: restaurantA }}>
        <OrderCard order={orderFromB} />
      </RestaurantContext.Provider>
    );

    // Try to update status
    const statusButton = screen.getByRole('button', { name: /mark ready/i });
    fireEvent.click(statusButton);

    await waitFor(() => {
      // Should either:
      // 1. Not send request (client-side prevention)
      // 2. Send request and handle 403 error
      expect(mockHttpClient.put).not.toHaveBeenCalled();
      // OR
      expect(screen.getByText(/cannot update order from different restaurant/i))
        .toBeInTheDocument();
    });
  });

  it('should handle restaurant switching', async () => {
    const restaurantA = MOCK_RESTAURANTS.RESTAURANT_A;
    const restaurantB = MOCK_RESTAURANTS.RESTAURANT_B;

    const { rerender } = render(
      <RestaurantContext.Provider value={{ currentRestaurant: restaurantA }}>
        <KitchenDisplay />
      </RestaurantContext.Provider>
    );

    // Initially shows Restaurant A orders
    await waitFor(() => {
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/orders/kitchen',
        expect.objectContaining({
          params: expect.objectContaining({ restaurant_id: restaurantA })
        })
      );
    });

    // Switch to Restaurant B
    rerender(
      <RestaurantContext.Provider value={{ currentRestaurant: restaurantB }}>
        <KitchenDisplay />
      </RestaurantContext.Provider>
    );

    // Should fetch Restaurant B orders
    await waitFor(() => {
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/orders/kitchen',
        expect.objectContaining({
          params: expect.objectContaining({ restaurant_id: restaurantB })
        })
      );
    });
  });
});
```

### Option 3: Add MSW Handlers for Multi-Tenant Tests
```typescript
// client/src/test/msw-multi-tenant-handlers.ts
import { rest } from 'msw';

const ordersDB = new Map<string, Order[]>([
  [MOCK_RESTAURANTS.RESTAURANT_A, [...]],
  [MOCK_RESTAURANTS.RESTAURANT_B, [...]]
]);

export const multiTenantHandlers = [
  rest.get('/api/orders/kitchen', (req, res, ctx) => {
    const restaurantId = req.url.searchParams.get('restaurant_id');

    if (!restaurantId) {
      // Simulate server requiring restaurant_id
      return res(ctx.status(400), ctx.json({ error: 'restaurant_id required' }));
    }

    const orders = ordersDB.get(restaurantId) || [];
    return res(ctx.json(orders));
  }),

  rest.put('/api/orders/:orderId/status', (req, res, ctx) => {
    const { orderId } = req.params;
    const restaurantId = req.headers.get('X-Restaurant-Id');

    // Find order's actual restaurant
    const order = findOrderById(orderId);

    if (order.restaurant_id !== restaurantId) {
      // Simulate server rejecting cross-tenant update
      return res(ctx.status(403), ctx.json({
        error: 'Cannot update order from different restaurant'
      }));
    }

    return res(ctx.json({ success: true }));
  })
];
```

## Implementation Checklist

- [ ] Create multi-tenant test utilities file
- [ ] Add MOCK_RESTAURANTS constants
- [ ] Add helper functions for creating test data with restaurant_id
- [ ] Write tests for KitchenDisplay multi-tenant filtering
- [ ] Write tests for OrderCard restaurant_id validation
- [ ] Write tests for WebSocket event filtering
- [ ] Write tests for restaurant switching
- [ ] Add MSW handlers that enforce tenant isolation
- [ ] Add tests to CI that fail if restaurant_id missing from requests
- [ ] Document multi-tenant testing patterns
- [ ] Apply same tests to other multi-tenant components (OrderManagement, etc.)
- [ ] Add E2E tests for multi-restaurant scenarios

## Files Requiring Tests

- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/__tests__/KitchenDisplay.test.tsx`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/__tests__/OrderCard.test.tsx`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/hooks/__tests__/useKitchenWebSocket.test.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/orders/__tests__/*.tsx`
- Any component that displays or modifies restaurant-specific data

## Success Criteria

- [ ] Every kitchen component has multi-tenant test coverage
- [ ] Tests verify restaurant_id in ALL API requests
- [ ] Tests verify filtering of data from other restaurants
- [ ] Tests verify WebSocket events filtered by restaurant_id
- [ ] Tests verify 403 errors when trying to access other restaurant's data
- [ ] CI fails if restaurant_id missing from request
- [ ] Code coverage for multi-tenant paths > 90%

## Related Documentation

- **Global Rules:** `~/.claude/CLAUDE.md` - Multi-tenant isolation requirement
- **Project Rules:** `CLAUDE.md` - Multi-tenancy section
- **ADR:** Architecture Decision Records on tenant isolation
- **Test Restaurant IDs:**
  - `11111111-1111-1111-1111-111111111111`
  - `22222222-2222-2222-2222-222222222222`

## Priority Justification

**Why P2:**
- Critical for data security in multi-tenant system
- Current gap could hide serious bugs
- High impact if bug reaches production (data leak)
- Moderate effort to implement (test infrastructure needed)
- No immediate production issue (RLS provides database-level protection)
- Important for long-term code quality and confidence
- Should be fixed before adding new multi-tenant features

**Note:** While database RLS policies provide a safety net, client-side filtering is still essential for:
1. Performance (reduce data transfer)
2. User experience (no flashing of wrong data)
3. Defense in depth (multiple layers of protection)
4. Early bug detection (fail fast in development)
