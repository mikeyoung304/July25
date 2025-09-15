# Integration Testing Guide

## Overview

Integration testing is critical for ensuring the Restaurant OS components work together correctly. This guide covers testing strategies for API contracts, order flows, authentication, and voice ordering.

## Test Infrastructure Setup

### Prerequisites

**CRITICAL**: Fix the Vitest migration issue first:

```bash
# Add to client/test/setup.ts
cat >> client/test/setup.ts << 'EOF'
import { vi } from 'vitest';
global.jest = vi;
EOF
```

### Test Environment Configuration

Create `.env.test`:
```bash
NODE_ENV=test
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=test-service-key
SUPABASE_JWT_SECRET=test-jwt-secret
OPENAI_API_KEY=test-openai-key
SQUARE_ACCESS_TOKEN=test-square-token
SQUARE_ENVIRONMENT=sandbox
PIN_PEPPER=test-pepper-12345678901234567890123456789012
DEVICE_FINGERPRINT_SALT=test-salt-123456
```

---

## API Contract Testing

### Strategy

Test that client requests match server expectations exactly, focusing on:
- Field name consistency (camelCase)
- Required fields presence
- Data type validation
- Response structure verification

### Example: Order Submission Contract Test

```typescript
// tests/integration/order-submission.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../server/src/app';

describe('Order Submission API Contract', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Get auth token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@restaurant.com',
        password: 'testpass123'
      });
    authToken = response.body.token;
  });

  it('should accept correctly formatted order', async () => {
    const validOrder = {
      tableNumber: 'A1',        // NOT table_number
      customerName: 'John Doe',  // NOT customer_name
      type: 'dine-in',          // NOT order_type
      items: [{
        menuItemId: 'item-123',
        name: 'Burger',
        quantity: 1,
        price: 12.99,           // REQUIRED
        modifiers: [{           // NOT modifications
          name: 'No onions',
          price: 0
        }]
      }],
      subtotal: 12.99,          // REQUIRED
      tax: 1.04,                // REQUIRED
      tip: 0,                   // REQUIRED
      total: 14.03
    };

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Restaurant-ID', 'test-restaurant')
      .send(validOrder);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('orderNumber');
  });

  it('should reject snake_case fields', async () => {
    const invalidOrder = {
      table_number: 'A1',       // WRONG
      customer_name: 'John Doe', // WRONG
      order_type: 'dine-in',    // WRONG
      // ... rest of order
    };

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidOrder);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required field');
  });

  it('should reject missing required financial fields', async () => {
    const orderMissingFields = {
      tableNumber: 'A1',
      customerName: 'John Doe',
      type: 'dine-in',
      items: [{
        menuItemId: 'item-123',
        name: 'Burger',
        quantity: 1,
        // Missing: price
      }],
      // Missing: subtotal, tax, tip, total
    };

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(orderMissingFields);

    expect(response.status).toBe(400);
    expect(response.body.fields).toContain('items[0].price');
    expect(response.body.fields).toContain('subtotal');
  });
});
```

### Field Mapping Tests

```typescript
// tests/integration/field-mapping.test.ts
describe('Field Name Mapping', () => {
  const testCases = [
    { client: 'table_number', server: 'tableNumber' },
    { client: 'customer_name', server: 'customerName' },
    { client: 'order_type', server: 'type' },
    { client: 'menu_item_id', server: 'menuItemId' },
    { client: 'total_amount', server: 'totalAmount' },
  ];

  testCases.forEach(({ client, server }) => {
    it(`should transform ${client} to ${server}`, () => {
      const input = { [client]: 'value' };
      const output = transformToServerFormat(input);
      expect(output).toHaveProperty(server, 'value');
      expect(output).not.toHaveProperty(client);
    });
  });
});
```

---

## End-to-End Order Flow Testing

### Complete Order Lifecycle Test

```typescript
// tests/e2e/order-lifecycle.test.ts
describe('Order Lifecycle E2E', () => {
  it('should complete full order flow', async () => {
    // 1. Authenticate
    const auth = await authenticateServer();
    
    // 2. Get menu items
    const menu = await getMenuItems(auth.token);
    expect(menu.items.length).toBeGreaterThan(0);
    
    // 3. Create order
    const order = await createOrder(auth.token, {
      tableNumber: 'A1',
      items: [menu.items[0]]
    });
    expect(order.status).toBe('pending');
    
    // 4. Confirm order
    const confirmed = await updateOrderStatus(
      auth.token, 
      order.id, 
      'confirmed'
    );
    expect(confirmed.status).toBe('confirmed');
    
    // 5. Process payment
    const payment = await processPayment(auth.token, {
      orderId: order.id,
      amount: order.total,
      method: 'card'
    });
    expect(payment.status).toBe('completed');
    
    // 6. Complete order
    const completed = await updateOrderStatus(
      auth.token,
      order.id,
      'completed'
    );
    expect(completed.status).toBe('completed');
  });
});
```

### Voice Order Flow Test

```typescript
// tests/e2e/voice-order.test.ts
describe('Voice Order E2E', () => {
  it('should process voice order correctly', async () => {
    // 1. Get WebRTC session token
    const session = await request(app)
      .post('/api/v1/realtime/session')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ mode: 'server' });
    
    expect(session.body.token).toBeDefined();
    expect(session.body.menuContext).toContain('FULL MENU');
    
    // 2. Simulate voice transcript
    const transcript = "I'll have a burger with no onions";
    
    // 3. Parse order locally
    const parser = new OrderParser(menuItems);
    const parsed = parser.parseUserTranscript(transcript);
    
    expect(parsed).toHaveLength(1);
    expect(parsed[0].menuItem.name).toContain('Burger');
    expect(parsed[0].modifications).toContain('no onions');
    
    // 4. Add to cart
    const cartItem = {
      menuItemId: parsed[0].menuItem.id,
      name: parsed[0].menuItem.name,
      quantity: 1,
      price: parsed[0].menuItem.price,
      modifiers: [{
        name: 'No onions',
        price: 0
      }]
    };
    
    // 5. Submit order
    const order = await submitOrder({
      items: [cartItem],
      tableNumber: 'A1',
      customerName: 'Voice Order'
    });
    
    expect(order.id).toBeDefined();
  });
});
```

---

## Authentication Flow Testing

### Multi-Strategy Authentication Tests

```typescript
// tests/integration/auth-flows.test.ts
describe('Authentication Strategies', () => {
  describe('Email/Password Auth', () => {
    it('should authenticate manager with email/password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'manager@restaurant.com',
          password: 'securepass123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('manager');
      expect(response.body.token).toBeDefined();
    });
  });

  describe('PIN Authentication', () => {
    it('should authenticate server with PIN', async () => {
      const response = await request(app)
        .post('/api/v1/auth/pin')
        .send({
          pin: '1234',
          restaurantId: 'test-restaurant'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('server');
    });
  });

  describe('Kiosk Authentication', () => {
    it('should issue limited token for kiosk', async () => {
      const response = await request(app)
        .post('/api/v1/auth/kiosk')
        .send({
          restaurantId: 'test-restaurant'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.role).toBe('kiosk_demo');
      expect(response.body.expiresAt).toBeDefined();
      
      // Verify token expiry is 1 hour
      const expiryTime = response.body.expiresAt - Date.now();
      expect(expiryTime).toBeLessThanOrEqual(3600000); // 1 hour
    });
  });
});
```

### Role-Based Access Tests

```typescript
// tests/integration/rbac.test.ts
describe('Role-Based Access Control', () => {
  const roles = [
    { role: 'owner', canCreateOrder: true, canViewReports: true },
    { role: 'manager', canCreateOrder: true, canViewReports: true },
    { role: 'server', canCreateOrder: true, canViewReports: false },
    { role: 'kitchen', canCreateOrder: false, canViewReports: false },
    { role: 'kiosk_demo', canCreateOrder: true, canViewReports: false }
  ];

  roles.forEach(({ role, canCreateOrder, canViewReports }) => {
    describe(`Role: ${role}`, () => {
      let token: string;
      
      beforeAll(async () => {
        token = await getTokenForRole(role);
      });

      it(`should ${canCreateOrder ? 'allow' : 'deny'} order creation`, async () => {
        const response = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${token}`)
          .send(validOrderPayload);
        
        if (canCreateOrder) {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(403);
        }
      });

      it(`should ${canViewReports ? 'allow' : 'deny'} report access`, async () => {
        const response = await request(app)
          .get('/api/v1/reports/daily')
          .set('Authorization', `Bearer ${token}`);
        
        if (canViewReports) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(403);
        }
      });
    });
  });
});
```

---

## WebSocket Integration Testing

```typescript
// tests/integration/websocket.test.ts
import { io, Socket } from 'socket.io-client';

describe('WebSocket Integration', () => {
  let socket: Socket;
  let authToken: string;

  beforeAll(async () => {
    authToken = await getAuthToken();
  });

  beforeEach((done) => {
    socket = io('http://localhost:3001', {
      auth: { token: authToken },
      query: { restaurantId: 'test-restaurant' }
    });
    socket.on('connect', done);
  });

  afterEach(() => {
    socket.disconnect();
  });

  it('should receive order updates', (done) => {
    socket.on('order.updated', (order) => {
      expect(order.id).toBeDefined();
      expect(order.status).toBeDefined();
      done();
    });

    // Create an order to trigger update
    createOrder(authToken, validOrderPayload);
  });

  it('should handle kitchen display events', (done) => {
    socket.on('order.statusChanged', (event) => {
      expect(event.orderId).toBeDefined();
      expect(event.newStatus).toBe('preparing');
      done();
    });

    // Update order status to trigger event
    updateOrderStatus(authToken, 'order-123', 'preparing');
  });
});
```

---

## Performance Testing

```typescript
// tests/performance/load.test.ts
describe('Performance Tests', () => {
  it('should handle concurrent order submissions', async () => {
    const concurrentOrders = 10;
    const startTime = Date.now();
    
    const promises = Array(concurrentOrders).fill(null).map(() =>
      createOrder(authToken, validOrderPayload)
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    // All should succeed
    results.forEach(result => {
      expect(result.id).toBeDefined();
    });
    
    // Should complete within reasonable time
    const totalTime = endTime - startTime;
    const avgTime = totalTime / concurrentOrders;
    expect(avgTime).toBeLessThan(2000); // <2s per order
  });

  it('should maintain response time under load', async () => {
    const requests = 100;
    const responseTimes: number[] = [];
    
    for (let i = 0; i < requests; i++) {
      const start = Date.now();
      await getMenuItems(authToken);
      responseTimes.push(Date.now() - start);
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b) / requests;
    const maxResponseTime = Math.max(...responseTimes);
    
    expect(avgResponseTime).toBeLessThan(200); // <200ms average
    expect(maxResponseTime).toBeLessThan(2000); // <2s max
  });
});
```

---

## Test Data Management

### Test Data Factory

```typescript
// tests/fixtures/factories.ts
export const OrderFactory = {
  valid: () => ({
    tableNumber: 'A1',
    customerName: 'Test Customer',
    type: 'dine-in' as const,
    items: [{
      menuItemId: 'test-item-1',
      name: 'Test Burger',
      quantity: 1,
      price: 12.99,
      modifiers: []
    }],
    subtotal: 12.99,
    tax: 1.04,
    tip: 0,
    total: 14.03
  }),

  withModifiers: () => ({
    ...OrderFactory.valid(),
    items: [{
      menuItemId: 'test-item-1',
      name: 'Test Burger',
      quantity: 1,
      price: 12.99,
      modifiers: [
        { name: 'No onions', price: 0 },
        { name: 'Extra cheese', price: 1.50 }
      ]
    }]
  }),

  takeout: () => ({
    ...OrderFactory.valid(),
    type: 'takeout' as const,
    tableNumber: 'TAKEOUT'
  })
};
```

### Database Seeding

```typescript
// tests/setup/seed.ts
export async function seedTestDatabase() {
  // Clear existing data
  await db.orders.deleteMany({});
  await db.menuItems.deleteMany({});
  
  // Seed menu items
  const menuItems = [
    { id: 'burger-1', name: 'Classic Burger', price: 12.99, categoryId: 'entrees' },
    { id: 'salad-1', name: 'Greek Salad', price: 8.99, categoryId: 'salads' },
    { id: 'drink-1', name: 'Soda', price: 2.99, categoryId: 'beverages' }
  ];
  
  await db.menuItems.insertMany(menuItems);
  
  // Seed test users
  const users = [
    { email: 'manager@test.com', role: 'manager', pin: '1234' },
    { email: 'server@test.com', role: 'server', pin: '5678' },
    { email: 'kitchen@test.com', role: 'kitchen', pin: '9012' }
  ];
  
  await db.users.insertMany(users);
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Apply Vitest fix
        run: |
          echo "import { vi } from 'vitest'; global.jest = vi;" >> client/test/setup.ts
      
      - name: Run unit tests
        run: npm test
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Debugging Failed Tests

### Common Issues and Solutions

1. **Field Name Mismatches**
   ```javascript
   // Check server logs for exact field names expected
   console.log('Request body:', JSON.stringify(req.body, null, 2));
   ```

2. **Missing Required Fields**
   ```javascript
   // Add validation logging
   const missingFields = requiredFields.filter(f => !req.body[f]);
   console.log('Missing fields:', missingFields);
   ```

3. **Authentication Failures**
   ```javascript
   // Log token details
   console.log('Token payload:', decoded);
   console.log('Token expiry:', new Date(decoded.exp * 1000));
   ```

4. **WebSocket Connection Issues**
   ```javascript
   // Enable debug mode
   socket.on('connect_error', (error) => {
     console.log('WebSocket error:', error.message);
     console.log('Auth:', socket.auth);
   });
   ```

---

## Test Coverage Goals

### Minimum Coverage Requirements

| Test Type | Coverage Target | Priority |
|-----------|-----------------|----------|
| API Contracts | 100% | Critical |
| Authentication | 100% | Critical |
| Order Flow | 90% | High |
| Payment Processing | 95% | High |
| Voice Ordering | 80% | Medium |
| WebSocket Events | 70% | Medium |
| Error Handling | 85% | High |

### Coverage Report Generation

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Check coverage meets requirements
npm run test:coverage:check
```

---

## Continuous Improvement

### Test Metrics to Track

1. **Test Execution Time**: Target <5 minutes for full suite
2. **Flaky Test Rate**: Target <1%
3. **Coverage Trend**: Should increase over time
4. **Defect Escape Rate**: Tests should catch >90% of bugs

### Regular Maintenance

- Review and update tests when API contracts change
- Remove obsolete tests
- Refactor duplicate test code
- Update test data to match production scenarios
- Monitor test performance and optimize slow tests

---

*Last Updated: September 10, 2025*  
*Version: 1.0*