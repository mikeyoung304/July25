# Testing Guide

## Overview

This guide covers the testing strategy, tools, and procedures for Restaurant OS 6.0. We use a comprehensive testing approach to ensure system reliability and maintainability.

## Testing Stack

- **Test Runner**: Vitest 3.2.4
- **Testing Library**: @testing-library/react
- **Coverage**: V8 coverage provider
- **Mocking**: Vitest mocks
- **E2E**: Playwright (planned)

## 🚨 CRITICAL: Test Suite Status

**⚠️ WARNING: Test suite is currently broken and cannot provide coverage metrics.**

**Current Issues:**
- Tests timeout after 2+ minutes
- 3 failing tests in last run (WebSocketService, ErrorBoundary)
- Cannot measure actual coverage due to test failures
- WebSocket authentication mocking issues
- ErrorBoundary test spy/mock configuration problems

## Test Coverage Requirements (When Fixed)

| Metric     | Target | Current Status |
| ---------- | ------ | -------------- |
| Statements | 60%    | **UNMEASURABLE** - Tests broken |
| Branches   | 50%    | **UNMEASURABLE** - Tests broken |
| Functions  | 60%    | **UNMEASURABLE** - Tests broken |
| Lines      | 60%    | **UNMEASURABLE** - Tests broken |

## Running Tests

### Basic Commands

**⚠️ WARNING: These commands will timeout or fail until test suite is fixed!**

```bash
# Run all tests (CURRENTLY BROKEN - will timeout after 2+ minutes)
npm test

# Run with coverage (BROKEN - cannot measure due to test failures)
npm run test:coverage

# Run in watch mode (BROKEN - tests will fail)
npm run test:watch

# Run specific test file (May work for some files)
npm test -- OrderCard.test.tsx

# Run with memory monitoring (BROKEN)
npm run test:memory
```

**Known failing tests:**
- `WebSocketService.test.ts` - Auth token mocking issues
- `ErrorBoundary.test.tsx` - Console spy configuration problems

### Test Scripts

```json
{
  "test": "NODE_OPTIONS='--max-old-space-size=4096' npm run test:client && npm run test:server",
  "test:client": "cd client && npm test",
  "test:server": "cd server && npm test",
  "test:coverage": "npm test -- --coverage",
  "test:watch": "npm test -- --watch",
  "test:memory": "NODE_OPTIONS='--expose-gc' npm test"
}
```

## Testing Strategy

### Testing Pyramid

```
         /\
        /E2E\       End-to-End Tests (10%)
       /-----\      - Critical user flows
      /Integr.\     Integration Tests (30%)
     /---------\    - API endpoints
    /   Unit    \   Unit Tests (60%)
   /_____________\  - Components & utilities
```

### What to Test

#### Unit Tests (60%)

- React components
- Custom hooks
- Utility functions
- Service methods
- Reducers/Actions

#### Integration Tests (30%)

- API endpoints
- Database operations
- WebSocket connections
- Authentication flows
- Payment processing

#### E2E Tests (10%)

- Complete order flow
- Payment workflows
- Multi-user scenarios
- Performance testing

## Writing Tests

### Component Testing

```typescript
// OrderCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { OrderCard } from '../OrderCard'

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}))

describe('OrderCard', () => {
  const defaultProps = {
    orderId: '1',
    orderNumber: '001',
    tableNumber: '5',
    items: [],
    status: 'new' as const,
    orderTime: new Date(),
    onStatusChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render order details correctly', () => {
    render(<OrderCard {...defaultProps} />)

    expect(screen.getByText('Order #001')).toBeInTheDocument()
    expect(screen.getByText(/Table.*5/)).toBeInTheDocument()
  })

  it('should call onStatusChange when button clicked', () => {
    render(<OrderCard {...defaultProps} />)

    const button = screen.getByText('Start Preparing')
    fireEvent.click(button)

    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('preparing')
  })
})
```

### Hook Testing

```typescript
// useOrderActions.test.ts
import { renderHook, act } from '@testing-library/react'
import { useOrderActions } from '../useOrderActions'

describe('useOrderActions', () => {
  it('should update order status', async () => {
    const { result } = renderHook(() => useOrderActions())

    await act(async () => {
      const success = await result.current.updateOrderStatus('123', 'ready')
      expect(success).toBe(true)
    })
  })
})
```

### API Testing

```typescript
// orders.test.ts
import request from 'supertest'
import app from '../src/app'

describe('Orders API', () => {
  describe('POST /api/v1/orders', () => {
    it('should create new order', async () => {
      const orderData = {
        restaurant_id: '11111111-1111-1111-1111-111111111111',
        items: [{ menu_item_id: '1', quantity: 2 }],
        type: 'dine-in',
      }

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', 'Bearer test-token')
        .send(orderData)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('order_number')
      expect(response.body.status).toBe('new')
    })
  })
})
```

### WebSocket Testing

```typescript
// websocket.test.ts
import { WebSocketService } from '../WebSocketService'

describe('WebSocket', () => {
  let service: WebSocketService

  beforeEach(() => {
    service = new WebSocketService()
  })

  afterEach(() => {
    service.disconnect()
  })

  it('should connect and authenticate', async () => {
    const connectSpy = vi.fn()
    service.on('connected', connectSpy)

    await service.connect()

    expect(connectSpy).toHaveBeenCalled()
    expect(service.isConnected()).toBe(true)
  })

  it('should handle order events', done => {
    service.subscribe('order:created', order => {
      expect(order).toHaveProperty('id')
      done()
    })

    // Simulate order creation
    service.emit('order:created', { id: '123' })
  })
})
```

## Mocking Strategies

### Mock Files

```typescript
// __mocks__/supabase.ts
export const supabase = {
  auth: {
    getSession: vi.fn(() => ({ data: { session: null } })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ data: [], error: null })),
    })),
  })),
}
```

### Mock Services

```typescript
// Mock HTTP client
vi.mock('@/services/http', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
```

## Test Organization

### Directory Structure

```
src/
├── components/
│   ├── OrderCard/
│   │   ├── OrderCard.tsx
│   │   └── __tests__/
│   │       └── OrderCard.test.tsx
├── hooks/
│   ├── useOrderActions.ts
│   └── __tests__/
│       └── useOrderActions.test.ts
├── services/
│   ├── OrderService.ts
│   └── __tests__/
│       └── OrderService.test.ts
└── __mocks__/
    ├── supabase.ts
    └── httpClient.ts
```

### Test Naming Conventions

```typescript
// Component tests
OrderCard.test.tsx

// Hook tests
useOrderActions.test.ts

// Service tests
OrderService.test.ts

// Integration tests
orders.integration.test.ts

// E2E tests
order - flow.e2e.test.ts
```

## Common Test Patterns

### Testing Async Operations

```typescript
it('should load orders', async () => {
  const { result } = renderHook(() => useOrders())

  // Wait for async operation
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false)
  })

  expect(result.current.orders).toHaveLength(3)
})
```

### Testing Error States

```typescript
it('should handle API errors', async () => {
  // Mock error response
  api.get.mockRejectedValueOnce(new Error('Network error'))

  const { result } = renderHook(() => useOrders())

  await waitFor(() => {
    expect(result.current.error).toBe('Network error')
  })
})
```

### Testing Loading States

```typescript
it('should show loading state', () => {
  const { result } = renderHook(() => useOrders())

  expect(result.current.isLoading).toBe(true)
  expect(result.current.orders).toEqual([])
})
```

## Performance Testing

### Memory Leak Detection

```typescript
// Run with: npm run test:memory
describe('Memory Tests', () => {
  it('should not leak memory on unmount', () => {
    const initialMemory = process.memoryUsage().heapUsed

    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<LargeComponent />)
      unmount()
    }

    global.gc() // Force garbage collection
    const finalMemory = process.memoryUsage().heapUsed

    expect(finalMemory - initialMemory).toBeLessThan(1000000) // 1MB
  })
})
```

### Performance Benchmarks

```typescript
it('should render 1000 orders efficiently', () => {
  const orders = Array.from({ length: 1000 }, (_, i) => ({
    id: String(i),
    // ... order data
  }))

  const start = performance.now()
  render(<OrderList orders={orders} />)
  const end = performance.now()

  expect(end - start).toBeLessThan(100) // 100ms max
})
```

## Debugging Tests

### Debug Output

```bash
# Enable debug mode
DEBUG=true npm test

# Verbose output
npm test -- --reporter=verbose

# Single test with logging
npm test -- --grep="should create order" --bail
```

### Common Issues

#### Issue: Tests Hanging

**Solution**: Check for unresolved promises or timers

```typescript
afterEach(() => {
  vi.clearAllTimers()
  vi.clearAllMocks()
})
```

#### Issue: Mock Not Working

**Solution**: Clear module cache

```typescript
beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})
```

#### Issue: Coverage Not Met

**Solution**: Focus on critical paths

```typescript
// Mark non-critical code
/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info')
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "npm test -- --findRelatedTests"]
  }
}
```

## Best Practices

### DO's

- ✅ Write tests before fixing bugs
- ✅ Test user behavior, not implementation
- ✅ Keep tests simple and readable
- ✅ Use descriptive test names
- ✅ Clean up after tests (timers, mocks)
- ✅ Test edge cases and error states

### DON'Ts

- ❌ Test implementation details
- ❌ Write brittle tests with hardcoded values
- ❌ Skip error handling tests
- ❌ Ignore flaky tests
- ❌ Test third-party libraries
- ❌ Over-mock dependencies

## Test Maintenance

### Regular Tasks

1. **Weekly**: Review and fix flaky tests
2. **Monthly**: Update test dependencies
3. **Quarterly**: Audit test coverage
4. **Yearly**: Refactor test architecture

### Monitoring Test Health

- Track test execution time
- Monitor coverage trends
- Review test failure patterns
- Identify slow tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest/Vitest Matchers](https://vitest.dev/api/expect.html)
