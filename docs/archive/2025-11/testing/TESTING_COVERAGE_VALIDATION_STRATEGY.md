# Testing Coverage and Validation Strategy
## Restaurant OS v6.0 - Comprehensive Test Analysis & Recommendations

**Date:** 2025-11-14
**Analyst:** System Quality Assessment
**Priority:** P0 - Critical for Production Stability
**Status:** Complete Analysis with Action Items

---

## Executive Summary

### Current State
- **115 test files** across unit, integration, E2E, and security tests
- **373 source files** requiring coverage
- **Test-to-source ratio:** ~31% (Good baseline, but quality concerns)
- **Recent critical bugs:** JWT scope bug (10 days), React hydration bug (3 days)
- **Primary gap:** Tests exist but use heavy mocking, missing production scenarios

### Key Findings

#### ✅ Strengths
1. **Strong security test coverage** (8 proof tests for CORS, CSRF, RBAC, auth, rate limiting)
2. **Comprehensive CI/CD workflows** (28 GitHub Actions workflows)
3. **Good E2E test foundation** (~13,767 lines of E2E test code)
4. **Pre-commit hooks** enforcing quality gates

#### ⚠️ Critical Gaps
1. **90% mock usage** isolates tests from production reality
2. **No production environment validation** in CI/CD
3. **Tests don't block deployments** (quality gates run but don't prevent merges)
4. **Missing JWT structure validation** (allowed 10-day bug to slip through)
5. **No integration tests with real Supabase** (only mocked auth)

### Testing Health Score: 62/100

| Category | Score | Status | Gap |
|----------|-------|--------|-----|
| Test Coverage | 7/10 | 🟢 Good | Need integration tests |
| Test Quality | 4/10 | 🔴 Critical | Too many mocks |
| CI/CD Integration | 8/10 | 🟢 Good | Missing deployment gates |
| Production Testing | 2/10 | 🔴 Critical | No prod validation |
| E2E Coverage | 6/10 | 🟡 Medium | Demo-only tests |
| Security Testing | 9/10 | 🟢 Excellent | Best coverage area |

---

## 1. Current Test Coverage Analysis

### Test Distribution

```
Total Test Files: 115
├── Server Tests: 45 files
│   ├── Unit Tests: 12 files (~285 test cases)
│   ├── Security Proof Tests: 8 files (CORS, CSRF, RBAC, auth, rate limit, headers, webhook)
│   ├── Integration Tests: 6 files
│   ├── Middleware Tests: 2 files
│   └── Route Tests: 17 files
│
├── Client Tests: 40 files
│   ├── Component Tests: 15 files
│   ├── Hook Tests: 12 files
│   ├── Service Tests: 8 files
│   └── Context Tests: 5 files
│
└── E2E Tests: 30 files (~13,767 lines)
    ├── Auth Tests: 2 files (login.spec, login.smoke.spec)
    ├── Order Tests: 8 files (voice, touch, server flow)
    ├── KDS Tests: 3 files (kitchen display, websocket)
    ├── Payment Tests: 2 files (cash, card)
    ├── Performance Tests: 2 files (lighthouse, ordering)
    ├── Accessibility Tests: 1 file
    └── Visual Regression: 1 file
```

### Coverage by Critical Path

| Critical Path | Unit Tests | Integration Tests | E2E Tests | Coverage Score |
|---------------|------------|-------------------|-----------|----------------|
| **Authentication** | ✅ Good | ❌ Missing | ⚠️ Demo-only | 40% |
| **Order Processing** | ✅ Good | ⚠️ Partial | ✅ Good | 70% |
| **Payment Handling** | ⚠️ Partial | ❌ Missing | ⚠️ Partial | 45% |
| **WebSocket/Realtime** | ✅ Good | ⚠️ Partial | ✅ Good | 65% |
| **Menu Management** | ✅ Good | ❌ Missing | ⚠️ Partial | 50% |
| **Multi-tenancy** | ✅ Excellent | ✅ Good | ⚠️ Partial | 75% |
| **Voice Ordering** | ✅ Good | ❌ Missing | ⚠️ Flaky | 55% |

---

## 2. Priority Bug Identification

### Recent Production Bugs (Last 30 Days)

#### **P0: JWT Scope Field Missing**
- **Duration:** 10 days undetected
- **Impact:** Complete RBAC failure, 100% of users affected
- **Root Cause:** JWT payload missing `scope` field
- **Why Tests Missed It:**
  - ❌ No JWT structure validation tests
  - ❌ Integration tests used mocked auth
  - ❌ E2E tests only used demo mode (which was removed)
  - ❌ Response body had scopes, but JWT didn't (split-brain)

**Prevention Tests Needed:**
```typescript
// server/tests/integration/jwt-structure.test.ts
describe('JWT Structure Validation', () => {
  it('should include scope field in login JWT', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'password' });

    const token = response.body.session.access_token;
    const decoded = jwt.decode(token);

    expect(decoded.scope).toBeDefined();
    expect(Array.isArray(decoded.scope)).toBe(true);
    expect(decoded.scope.length).toBeGreaterThan(0);
  });
});
```

#### **P0: React Hydration Bug**
- **Duration:** 3+ days
- **Impact:** Voice and touch ordering completely broken
- **Root Cause:** Early return before `AnimatePresence` wrapper
- **Why Tests Missed It:**
  - ❌ No hydration-specific E2E tests
  - ❌ Tests run in dev mode (hydration warnings suppressed)
  - ❌ Canvas-based UI difficult to automate

**Prevention Tests Needed:**
```typescript
// tests/e2e/hydration-errors.spec.ts
test('No hydration errors in ServerView modals', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', err => errors.push(err));

  await page.goto('/server');
  // ... interact with modals

  const hydrationErrors = errors.filter(e =>
    e.message.includes('Hydration') ||
    e.message.includes('#318')
  );

  expect(hydrationErrors).toHaveLength(0);
});
```

#### **P1: Touch Ordering Cart Bug**
- **Duration:** Immediate after feature deployment
- **Impact:** Cart showed empty despite "Added!" feedback
- **Root Cause:** Nested `UnifiedCartProvider` with different `persistKey`
- **Why Tests Missed It:**
  - ❌ No integration tests for cart state
  - ❌ Component tests used mocks, didn't test provider hierarchy

**Prevention Tests Needed:**
```typescript
// client/src/contexts/__tests__/UnifiedCartContext.integration.test.tsx
test('Cart state syncs across nested components', async () => {
  const { getByText } = render(
    <UnifiedCartProvider persistKey="cart_current">
      <VoiceOrderModal show={true} table={...} seat={...} />
      <CartDrawer />
    </UnifiedCartProvider>
  );

  await userEvent.click(getByText('Add Burger'));

  expect(screen.getByText('1 item in cart')).toBeInTheDocument();
});
```

### Bug Pattern Analysis

| Bug Type | Frequency | Root Cause | Test Gap |
|----------|-----------|------------|----------|
| Auth/JWT Issues | High (3 incidents) | Implicit contracts | No contract tests |
| State Management | Medium (2 incidents) | Provider nesting | No integration tests |
| Hydration | Low (1 incident) | SSR/CSR mismatch | No prod build tests |
| Environment Config | Medium (ongoing) | Dev/prod differences | No env tests |

---

## 3. Test Strategy Recommendations

### 3.1 Unit Testing Priorities

#### **High Priority: Contract Tests**
Validate API contracts and JWT structures explicitly.

```typescript
// shared/tests/contracts/jwt-payload.contract.test.ts
import { z } from 'zod';

const JWTPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
  scope: z.array(z.string()).min(1), // CRITICAL: Must have scopes
  restaurant_id: z.string().uuid(),
  auth_method: z.enum(['email', 'pin', 'station']),
  iat: z.number(),
  exp: z.number()
});

describe('JWT Payload Contract', () => {
  it('should validate all required fields', () => {
    const payload = createTestJWT();
    const result = JWTPayloadSchema.safeParse(payload);

    expect(result.success).toBe(true);
  });

  it('should reject JWT without scope field', () => {
    const payload = { sub: '123', email: 'test@test.com', role: 'server' };
    const result = JWTPayloadSchema.safeParse(payload);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['scope']);
  });
});
```

**Tools:**
- Zod for schema validation
- TypeScript strict mode
- json-schema-to-typescript for type generation

**Priority Tests:**
1. JWT payload structure (P0)
2. Order DTO validation (P0)
3. Payment request/response contracts (P0)
4. WebSocket message schemas (P1)
5. API response shapes (P1)

#### **Medium Priority: Reducer Logic**
Test state transitions without mocking.

```typescript
// client/src/modules/voice/services/__tests__/VoiceCheckoutOrchestrator.test.ts
describe('VoiceCheckoutOrchestrator', () => {
  it('should transition through checkout states correctly', () => {
    const orchestrator = new VoiceCheckoutOrchestrator();

    orchestrator.startCheckout();
    expect(orchestrator.state).toBe('collecting_payment_info');

    orchestrator.addPaymentMethod('card');
    expect(orchestrator.state).toBe('ready_to_submit');

    orchestrator.submit();
    expect(orchestrator.state).toBe('submitting');
  });
});
```

#### **Low Priority: Pure Functions**
Already well-covered, continue current approach.

### 3.2 Integration Test Scenarios

#### **Critical: Real Supabase Integration**

Replace mocked auth with real Supabase test instance.

```typescript
// server/tests/integration/supabase-auth.integration.test.ts
import { createClient } from '@supabase/supabase-js';

describe('Supabase Authentication Integration', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_ANON_KEY!
    );
  });

  it('should authenticate with email/password', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123'
    });

    expect(error).toBeNull();
    expect(data.session).toBeDefined();
    expect(data.session?.access_token).toBeDefined();
  });

  it('should validate PIN against real database', async () => {
    const { data } = await supabase
      .from('user_pins')
      .select('user_id')
      .eq('pin_hash', hashPin('1234'))
      .eq('restaurant_id', TEST_RESTAURANT_ID)
      .single();

    expect(data).toBeDefined();
    expect(data.user_id).toBeDefined();
  });
});
```

**Setup Requirements:**
- Dedicated test Supabase project
- Seeded test data (users, pins, restaurants)
- Cleanup after tests
- Environment variables for test instance

#### **Critical: Order Processing Flow**

End-to-end order flow with real database.

```typescript
// server/tests/integration/order-flow.integration.test.ts
describe('Order Processing Integration', () => {
  it('should process order from creation to completion', async () => {
    // 1. Create order
    const createResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        type: 'dine_in',
        table_id: TEST_TABLE_ID,
        seat_number: 1,
        items: [{ menu_item_id: TEST_ITEM_ID, quantity: 1 }]
      });

    expect(createResponse.status).toBe(201);
    const orderId = createResponse.body.id;

    // 2. Confirm order
    const confirmResponse = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ status: 'confirmed' });

    expect(confirmResponse.status).toBe(200);

    // 3. Verify WebSocket notification sent
    expect(mockWebSocketBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'order.confirmed' })
    );

    // 4. Mark ready
    const readyResponse = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ status: 'ready' });

    expect(readyResponse.status).toBe(200);

    // 5. Verify database state
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    expect(data.status).toBe('ready');
  });
});
```

#### **Important: Multi-Tenancy Isolation**

Verify data isolation across restaurants.

```typescript
// server/tests/integration/multi-tenancy.integration.test.ts
describe('Multi-Tenancy Data Isolation', () => {
  it('should not allow cross-restaurant data access', async () => {
    // Create order for restaurant A
    const orderA = await createOrder(RESTAURANT_A_ID);

    // Try to access with restaurant B token
    const response = await request(app)
      .get(`/api/v1/orders/${orderA.id}`)
      .set('Authorization', `Bearer ${restaurantBToken}`);

    expect(response.status).toBe(404); // Not found (not 403, to prevent enumeration)
  });

  it('should enforce RLS policies', async () => {
    // Direct database query should respect RLS
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', RESTAURANT_A_ID);

    // All results must belong to correct restaurant
    expect(data?.every(o => o.restaurant_id === RESTAURANT_A_ID)).toBe(true);
  });
});
```

### 3.3 E2E Test Automation

#### **Critical: Production-Like Environment Tests**

Test against staging environment with real services.

```typescript
// tests/e2e/production/manager-login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Manager Login (Production-Like)', () => {
  test.use({
    baseURL: process.env.STAGING_URL || 'https://staging.july25-client.vercel.app'
  });

  test('should login with Supabase email/password', async ({ page }) => {
    await page.goto('/');

    // Wait for Supabase to initialize
    await page.waitForSelector('[data-testid="login-form"]');

    // Fill login form
    await page.fill('[name="email"]', process.env.TEST_MANAGER_EMAIL!);
    await page.fill('[name="password"]', process.env.TEST_MANAGER_PASSWORD!);

    // Submit and wait for navigation
    await Promise.all([
      page.waitForNavigation(),
      page.click('[type="submit"]')
    ]);

    // Verify manager dashboard loaded
    await expect(page).toHaveURL(/\/manager/);
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Verify JWT has correct structure
    const token = await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('auth_session') || '{}');
      return session.access_token;
    });

    expect(token).toBeDefined();

    // Decode and verify JWT structure
    const payload = JSON.parse(atob(token.split('.')[1]));
    expect(payload.scope).toBeDefined();
    expect(Array.isArray(payload.scope)).toBe(true);
  });
});
```

#### **Critical: Voice Ordering Stability**

Replace flaky voice tests with focused unit tests + E2E smoke.

```typescript
// tests/e2e/voice/voice-ordering-smoke.spec.ts
test('Voice ordering WebSocket connection', async ({ page }) => {
  await page.goto('/server');

  // Mock microphone permission
  await page.context().grantPermissions(['microphone']);

  // Select table and seat
  await selectTable(page, 'Table 1');
  await page.click('[data-testid="seat-1"]');

  // Start voice order
  await page.click('[data-testid="voice-order-button"]');

  // Wait for WebRTC connection
  await page.waitForSelector('[data-testid="voice-recording-indicator"]');

  // Verify connection established
  const connectionStatus = await page.textContent('[data-testid="connection-status"]');
  expect(connectionStatus).toContain('Connected');
});
```

**Separate voice recognition testing from E2E:**
- Unit test: OpenAI API mocking
- Integration test: Menu matching logic
- E2E test: Connection + UI states only

#### **Important: Payment Flow Validation**

Test Square integration with sandbox environment.

```typescript
// tests/e2e/payments/square-payment.spec.ts
test('Process payment through Square sandbox', async ({ page }) => {
  // Create test order
  await createTestOrder(page);

  // Navigate to checkout
  await page.click('[data-testid="checkout-button"]');

  // Fill payment form with Square test card
  await page.fill('[data-testid="card-number"]', '4111111111111111');
  await page.fill('[data-testid="card-exp"]', '12/25');
  await page.fill('[data-testid="card-cvv"]', '123');

  // Submit payment
  await page.click('[data-testid="pay-button"]');

  // Wait for Square response
  await page.waitForSelector('[data-testid="payment-success"]');

  // Verify order marked as paid
  const orderStatus = await page.textContent('[data-testid="order-status"]');
  expect(orderStatus).toBe('paid');
});
```

### 3.4 Performance and Load Testing

#### **Performance Benchmarks**

```typescript
// tests/performance/api-response-times.spec.ts
import { test, expect } from '@playwright/test';

test('API endpoints meet performance SLAs', async ({ request }) => {
  const endpoints = [
    { path: '/api/v1/orders', target: 500 },
    { path: '/api/v1/menu', target: 300 },
    { path: '/api/v1/tables', target: 200 }
  ];

  for (const { path, target } of endpoints) {
    const start = Date.now();
    const response = await request.get(path);
    const duration = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(target);
  }
});
```

#### **Load Testing Scenarios**

```bash
# scripts/load-test.sh
#!/bin/bash
# Simulate 100 concurrent users placing orders

artillery run tests/load/order-creation.yml
```

```yaml
# tests/load/order-creation.yml
config:
  target: "https://api.july25.onrender.com"
  phases:
    - duration: 60
      arrivalRate: 5 # 5 users per second
      rampTo: 20    # Ramp up to 20 users/sec

scenarios:
  - name: "Create Order"
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "test@test.com"
            password: "password"
          capture:
            - json: "$.session.access_token"
              as: "token"

      - post:
          url: "/api/v1/orders"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            type: "dine_in"
            table_id: "{{ $randomString() }}"
            items: [{ menu_item_id: "test-item", quantity: 1 }]
```

### 3.5 Security Testing

#### **Maintain Current Security Tests** ✅

Existing security tests are excellent. Continue running:
- CORS proof tests
- CSRF protection tests
- RBAC authorization tests
- Rate limiting tests
- JWT validation tests
- Headers security tests

#### **Add: Penetration Testing**

```typescript
// tests/security/penetration/jwt-tampering.test.ts
describe('JWT Security - Penetration Tests', () => {
  it('should reject JWT with modified payload', async () => {
    const validToken = await createValidToken();
    const [header, payload, signature] = validToken.split('.');

    // Modify payload
    const decoded = JSON.parse(atob(payload));
    decoded.role = 'admin'; // Privilege escalation attempt
    const modifiedPayload = btoa(JSON.stringify(decoded));

    const tamperedToken = `${header}.${modifiedPayload}.${signature}`;

    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Invalid token');
  });
});
```

---

## 4. Validation Checklist for Top Issues

### 4.1 Authentication and Authorization

#### **Manager Email Login (Supabase)**
```markdown
Test Cases:
- [ ] Login with valid email/password
- [ ] Login fails with invalid credentials
- [ ] JWT includes all required fields (sub, email, role, scope, restaurant_id)
- [ ] JWT scope array populated from role_scopes table
- [ ] Session persists across page reload
- [ ] Logout invalidates session
- [ ] Expired JWT rejected
- [ ] Modified JWT rejected
```

**Test Data Requirements:**
- Test Supabase project with seeded users
- Multiple roles (manager, server, kitchen, cashier)
- Role-scope mappings in test database
- Restaurant associations

**Expected Outcomes:**
- 200 response with JWT token
- Token decodes with all required fields
- Protected endpoints accessible with valid token
- 401 for expired/invalid tokens

**Tools:** Playwright, Supertest, jwt-decode

**Priority:** P0 - Must implement before next production deploy

---

#### **PIN Authentication**
```markdown
Test Cases:
- [ ] Valid 4-digit PIN authenticates correctly
- [ ] Invalid PIN rejected
- [ ] PIN locked after 5 failed attempts
- [ ] PIN scoped to correct restaurant
- [ ] JWT issued after PIN validation
- [ ] Station context stored in JWT
```

**Test Data:**
- Test PINs for each role
- Restaurant-scoped PIN assignments
- Failed attempt tracking

**Assertions:**
```typescript
expect(response.status).toBe(200);
expect(response.body.session.access_token).toBeDefined();

const decoded = jwt.decode(response.body.session.access_token);
expect(decoded.auth_method).toBe('pin');
expect(decoded.restaurant_id).toBe(TEST_RESTAURANT_ID);
```

**Priority:** P0

---

#### **Role-Based Access Control**
```markdown
Test Cases:
- [ ] Server role can create orders
- [ ] Kitchen role cannot access payments
- [ ] Manager role can view all sections
- [ ] Cashier role can process payments
- [ ] Expo role can update order status
- [ ] Cross-restaurant access blocked
```

**Test Matrix:**
| Role | orders:create | orders:read | payments:process | admin:users |
|------|---------------|-------------|------------------|-------------|
| server | ✅ | ✅ | ❌ | ❌ |
| kitchen | ❌ | ✅ | ❌ | ❌ |
| manager | ✅ | ✅ | ✅ | ✅ |
| cashier | ❌ | ✅ | ✅ | ❌ |

**Priority:** P0

---

### 4.2 Order Processing and Payment Handling

#### **Order Creation Workflow**
```markdown
Test Cases:
- [ ] Create dine-in order for table/seat
- [ ] Create online order
- [ ] Validate required fields (restaurant_id, items)
- [ ] Reject orders without menu items
- [ ] Calculate totals correctly (subtotal, tax, tip)
- [ ] Emit WebSocket notification on creation
- [ ] Store order with correct status (pending)
```

**Test Scenarios:**
1. **Happy Path:**
   - Valid order → 201 response
   - Order stored in database
   - WebSocket broadcast sent
   - Restaurant scoped correctly

2. **Error Handling:**
   - Missing items → 400 Bad Request
   - Invalid menu_item_id → 404 Not Found
   - Missing restaurant_id → 401 Unauthorized

**Assertions:**
```typescript
const response = await request(app)
  .post('/api/v1/orders')
  .set('Authorization', `Bearer ${token}`)
  .send(orderPayload);

expect(response.status).toBe(201);
expect(response.body.id).toBeDefined();
expect(response.body.status).toBe('pending');

// Verify in database
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('id', response.body.id)
  .single();

expect(data.restaurant_id).toBe(TEST_RESTAURANT_ID);
```

**Priority:** P0

---

#### **Order Status Transitions**
```markdown
Test Cases:
- [ ] pending → confirmed (server action)
- [ ] confirmed → preparing (kitchen action)
- [ ] preparing → ready (kitchen action)
- [ ] ready → served (server action)
- [ ] served → completed (automatic)
- [ ] Any status → cancelled (manager only)
- [ ] Invalid transitions rejected (preparing → served)
```

**State Machine Validation:**
```typescript
const validTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: ['completed'],
  completed: [],
  cancelled: []
};

for (const [from, toStates] of Object.entries(validTransitions)) {
  for (const to of toStates) {
    test(`should allow ${from} → ${to}`, async () => {
      const order = await createOrderWithStatus(from);
      const response = await updateOrderStatus(order.id, to);
      expect(response.status).toBe(200);
    });
  }
}
```

**Priority:** P0

---

#### **Payment Processing (Square Integration)**
```markdown
Test Cases:
- [ ] Card payment succeeds with valid card
- [ ] Card payment fails with invalid card
- [ ] Cash payment records amount
- [ ] Split payments supported
- [ ] Tip calculation accurate
- [ ] Payment receipt generated
- [ ] Failed payment does not mark order paid
```

**Square Sandbox Cards:**
- Success: `4111 1111 1111 1111`
- Decline: `4000 0000 0000 0002`
- Insufficient Funds: `4000 0000 0000 9995`

**Priority:** P1 (use Square sandbox)

---

### 4.3 Real-Time Synchronization and WebSocket Stability

#### **WebSocket Connection Lifecycle**
```markdown
Test Cases:
- [ ] Client connects successfully
- [ ] Authentication via query param token
- [ ] Restaurant context scoped
- [ ] Heartbeat maintains connection
- [ ] Reconnection on disconnect
- [ ] Graceful degradation on connection failure
```

**Connection Test:**
```typescript
test('WebSocket maintains connection', async () => {
  const ws = new WebSocket(`ws://localhost:3001?token=${testToken}`);

  await new Promise(resolve => {
    ws.on('open', resolve);
  });

  // Wait for heartbeat
  await new Promise(resolve => setTimeout(resolve, 35000));

  expect(ws.readyState).toBe(WebSocket.OPEN);
});
```

**Priority:** P1

---

#### **Real-Time Order Updates**
```markdown
Test Cases:
- [ ] Order creation broadcasts to KDS
- [ ] Status change updates all clients
- [ ] Multiple clients receive same update
- [ ] Updates scoped to restaurant
- [ ] Cross-restaurant updates blocked
```

**Priority:** P1

---

### 4.4 Menu Management and Updates

#### **Menu CRUD Operations**
```markdown
Test Cases:
- [ ] Create menu item
- [ ] Read menu by restaurant
- [ ] Update menu item (price, availability)
- [ ] Delete menu item (soft delete)
- [ ] Menu changes invalidate cache
- [ ] Menu filtered by restaurant_id
```

**Priority:** P2

---

### 4.5 Multi-Location Data Isolation

#### **Data Isolation Tests**
```markdown
Test Cases:
- [ ] User cannot access orders from other restaurants
- [ ] Menu items filtered by restaurant
- [ ] Tables scoped to restaurant
- [ ] WebSocket rooms isolated by restaurant
- [ ] Analytics aggregated per restaurant
```

**RLS Policy Validation:**
```sql
-- Test RLS enforcement
SET request.jwt.claims.restaurant_id = '11111111-1111-1111-1111-111111111111';

SELECT * FROM orders WHERE restaurant_id = '22222222-2222-2222-2222-222222222222';
-- Should return 0 rows
```

**Priority:** P0

---

## 5. CI/CD Pipeline Recommendations

### 5.1 Current CI/CD Analysis

**Existing Workflows (28 total):**
- ✅ `ci.yml` - Quality gates (lint, typecheck, tests)
- ✅ `security.yml` - Security proof tests
- ✅ `auth-guards.yml` - Auth integration tests
- ✅ `deploy-client-vercel.yml` - Client deployment
- ✅ `deploy-server-render.yml` - Server deployment
- ⚠️ `deploy-smoke.yml` - Post-deploy smoke (too late)
- ✅ `documentation-validation.yml` - Docs checks
- ✅ `pr-validation.yml` - PR quality gates

**Critical Gap:** Tests run but **don't block deployments**

```yaml
# Current (BROKEN):
on:
  push:
    branches: [main]

jobs:
  deploy:
    steps:
      - name: Deploy to production
        run: vercel deploy --prod

# Tests can fail, but deploy still happens!
```

### 5.2 Recommended CI/CD Pipeline

#### **Stage 1: Pre-Commit (Local)**
```bash
# .husky/pre-commit
- Typecheck (quick mode)
- Lint (fix auto-fixable)
- Check for console.log
- Validate migration files
- Check documentation timestamps
```

#### **Stage 2: Pull Request Validation**
```yaml
# .github/workflows/pr-validation.yml (ENHANCED)
name: PR Validation

on:
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci --workspaces
      - run: npm test -- --coverage
      - run: npm run test:server -- --coverage

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - run: npm ci --workspaces
      - run: npm run test:integration
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - run: npm ci --workspaces
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci --workspaces
      - run: npm run test:security

  pr-checks-passed:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests, e2e-tests, security-tests]
    steps:
      - run: echo "All PR checks passed ✅"
```

#### **Stage 3: Pre-Deploy Validation (NEW)**
```yaml
# .github/workflows/pre-deploy-validation.yml
name: Pre-Deploy Validation

on:
  push:
    branches: [main]

jobs:
  staging-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: vercel deploy --force
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_STAGING_PROJECT_ID }}

  staging-smoke-tests:
    runs-on: ubuntu-latest
    needs: staging-deploy
    steps:
      - uses: actions/checkout@v4
      - run: npm ci --workspaces
      - run: npx playwright install --with-deps
      - name: Run smoke tests against staging
        run: npm run test:e2e:smoke
        env:
          BASE_URL: ${{ needs.staging-deploy.outputs.deployment-url }}

  staging-integration-tests:
    runs-on: ubuntu-latest
    needs: staging-deploy
    steps:
      - uses: actions/checkout@v4
      - name: Test auth flow on staging
        run: node scripts/test-complete-auth-flow.js
        env:
          API_URL: ${{ needs.staging-deploy.outputs.deployment-url }}

  approve-production-deploy:
    runs-on: ubuntu-latest
    needs: [staging-smoke-tests, staging-integration-tests]
    steps:
      - run: echo "Staging validation passed ✅"
      - run: echo "Ready for production deployment"
```

#### **Stage 4: Production Deployment (GATED)**
```yaml
# .github/workflows/deploy-production.yml (FIXED)
name: Deploy to Production

on:
  workflow_run:
    workflows: ["Pre-Deploy Validation"]
    types: [completed]
    branches: [main]

jobs:
  deploy-client:
    runs-on: ubuntu-latest
    # CRITICAL: Only deploy if validation passed
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel Production
        run: vercel deploy --prod --force
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-server:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v4
      - name: Trigger Render Deployment
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}

  production-smoke-tests:
    runs-on: ubuntu-latest
    needs: [deploy-client, deploy-server]
    steps:
      - uses: actions/checkout@v4
      - name: Verify production deployment
        run: npm run test:production:smoke
```

#### **Stage 5: Post-Deploy Monitoring**
```yaml
# .github/workflows/production-monitoring.yml
name: Production Monitoring

on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check API health
        run: |
          response=$(curl -s https://july25.onrender.com/api/v1/health)
          status=$(echo $response | jq -r '.status')

          if [ "$status" != "healthy" ]; then
            echo "❌ Health check failed!"
            exit 1
          fi

  synthetic-transaction:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test critical user flow
        run: node scripts/synthetic-monitoring.js
        env:
          PRODUCTION_URL: https://july25-client.vercel.app
```

### 5.3 Automated Testing Gates

**Quality Gates Matrix:**

| Stage | Blocker | Warning | Info |
|-------|---------|---------|------|
| **Pre-Commit** | TypeScript errors, console.log, migration issues | N/A | Linting |
| **PR** | Unit test failures, security issues | Low coverage | Performance degradation |
| **Pre-Deploy** | E2E failures, integration failures | Flaky tests | N/A |
| **Production Deploy** | Staging validation failure | N/A | N/A |
| **Post-Deploy** | Health check failure | Slow response times | Usage metrics |

### 5.4 Deployment Validation Steps

**Pre-Deploy Checklist (Automated):**
```bash
#!/bin/bash
# scripts/pre-deploy-validation.sh

echo "🔍 Running pre-deploy validation..."

# 1. Verify environment variables
node scripts/verify-env-health.sh || exit 1

# 2. Run smoke tests
npm run test:e2e:smoke || exit 1

# 3. Validate JWT structure
node scripts/test-jwt-scope.cjs || exit 1

# 4. Check API response times
node scripts/test-api-performance.js || exit 1

# 5. Verify database migrations applied
node scripts/verify-migrations.js || exit 1

echo "✅ Pre-deploy validation passed"
```

**Post-Deploy Verification:**
```bash
#!/bin/bash
# scripts/post-deploy-verification.sh

echo "🎯 Verifying production deployment..."

# 1. Health check
curl -f https://july25.onrender.com/api/v1/health || exit 1

# 2. Auth flow test
node scripts/test-complete-auth-flow.js || exit 1

# 3. Order submission test
node scripts/test-order-submission.js || exit 1

# 4. WebSocket connection test
node scripts/test-websocket-connection.js || exit 1

echo "✅ Production deployment verified"
```

### 5.5 Rollback Procedures

**Automated Rollback Triggers:**
```yaml
# .github/workflows/auto-rollback.yml
name: Auto Rollback

on:
  workflow_run:
    workflows: ["Production Monitoring"]
    types: [completed]

jobs:
  check-health:
    runs-on: ubuntu-latest
    steps:
      - name: Check if rollback needed
        run: |
          failures=$(curl -s https://july25.onrender.com/api/v1/metrics | jq '.error_rate')

          if (( $(echo "$failures > 0.05" | bc -l) )); then
            echo "❌ Error rate above 5%, initiating rollback"
            gh workflow run rollback.yml
          fi
```

**Manual Rollback Process:**
```bash
# scripts/rollback.sh
#!/bin/bash
# Emergency rollback to last known good deployment

LAST_GOOD_COMMIT=$(git tag --sort=-version:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1)

echo "🔄 Rolling back to $LAST_GOOD_COMMIT"

git checkout $LAST_GOOD_COMMIT
git push origin HEAD:main --force-with-lease

# Trigger deployment
vercel deploy --prod --force

echo "✅ Rollback complete. Monitor health at:"
echo "   https://july25.onrender.com/api/v1/health"
```

### 5.6 Monitoring and Alerting Setup

**Key Metrics to Track:**
```typescript
// server/src/monitoring/metrics.ts
export const metrics = {
  // Performance
  'api.response.time.p50': 0,
  'api.response.time.p95': 0,
  'api.response.time.p99': 0,

  // Errors
  'errors.5xx.count': 0,
  'errors.4xx.count': 0,
  'errors.auth.rate': 0,

  // Business
  'orders.created.count': 0,
  'payments.processed.count': 0,
  'voice.sessions.started': 0,

  // Infrastructure
  'websocket.connections.active': 0,
  'database.queries.slow': 0,
  'cache.hit.rate': 0
};
```

**Alert Configuration:**
```yaml
# monitoring/alerts.yml
alerts:
  - name: high-error-rate
    condition: errors.5xx.count > 10 per 5m
    severity: critical
    action: slack + pagerduty

  - name: slow-api-responses
    condition: api.response.time.p95 > 1000ms
    severity: warning
    action: slack

  - name: auth-failures
    condition: errors.auth.rate > 0.1
    severity: high
    action: slack + email

  - name: websocket-disconnects
    condition: websocket.connections.active < 5
    severity: warning
    action: slack
```

**Dashboard URLs:**
- Production Health: `https://july25.onrender.com/api/v1/health`
- Metrics: `https://july25.onrender.com/api/v1/metrics`
- Error Logs: Render Dashboard → Logs
- Performance: Vercel Analytics Dashboard

---

## 6. Implementation Roadmap

### Phase 0: Immediate (Week 1) - P0 Issues

**Goal:** Fix critical testing gaps that allowed JWT scope bug

#### Day 1-2: JWT Structure Validation
```markdown
Tasks:
- [ ] Create `server/tests/integration/jwt-structure.test.ts`
- [ ] Add Zod schema for JWT payload validation
- [ ] Test both /login and /pin endpoints
- [ ] Deploy to CI pipeline

Success Criteria:
- JWT scope field validated on every auth test
- Tests fail if scope field missing
```

#### Day 3-4: Deployment Gates
```markdown
Tasks:
- [ ] Create `.github/workflows/pre-deploy-validation.yml`
- [ ] Update deploy workflows to require validation
- [ ] Add staging smoke tests
- [ ] Document rollback procedure

Success Criteria:
- Deployments blocked if tests fail
- Staging validation runs before production
```

#### Day 5: Production Monitoring
```markdown
Tasks:
- [ ] Create `/api/v1/health` endpoint with JWT test
- [ ] Set up 15-minute health check workflow
- [ ] Configure Slack alerts
- [ ] Test manual rollback process

Success Criteria:
- Health checks running every 15 minutes
- Alerts fire on failure
- Rollback tested successfully
```

**Deliverables:**
- ✅ JWT structure tests
- ✅ Deployment gates enforced
- ✅ Production monitoring active
- ✅ Rollback procedure documented

---

### Phase 1: Foundation (Weeks 2-4) - Integration Tests

**Goal:** Replace mocked tests with real service integration

#### Week 2: Supabase Integration Tests
```markdown
Tasks:
- [ ] Set up test Supabase project
- [ ] Seed test data (users, restaurants, menu items)
- [ ] Create integration test suite
- [ ] Add to CI pipeline

Tests to Create:
- Supabase email/password auth (5 tests)
- PIN authentication with real database (8 tests)
- Role-scope lookup (4 tests)
- Multi-tenancy RLS validation (6 tests)

Success Criteria:
- 23 integration tests passing
- Test coverage > 80% for auth flows
```

#### Week 3: Order Processing Integration
```markdown
Tasks:
- [ ] End-to-end order flow tests (create → confirm → ready → served)
- [ ] WebSocket notification validation
- [ ] Payment processing with Square sandbox
- [ ] Multi-restaurant data isolation

Tests to Create:
- Order CRUD operations (10 tests)
- Status state machine (7 tests)
- Payment flows (5 tests)
- Multi-tenancy (4 tests)

Success Criteria:
- 26 integration tests passing
- Order flow validated end-to-end
```

#### Week 4: E2E Production-Like Tests
```markdown
Tasks:
- [ ] Set up Playwright tests against staging
- [ ] Manager login with real Supabase
- [ ] Server order submission flow
- [ ] KDS real-time updates
- [ ] Payment processing UI

Tests to Create:
- Auth flows (3 E2E tests)
- Order creation (4 E2E tests)
- Payment checkout (2 E2E tests)

Success Criteria:
- 9 E2E tests running against staging
- No demo mode dependencies
```

---

### Phase 2: Expansion (Weeks 5-8) - Comprehensive Coverage

**Goal:** Achieve 80%+ coverage on critical paths

#### Week 5-6: Unit Test Enhancement
```markdown
Tasks:
- [ ] Contract tests for all DTOs
- [ ] State machine validation (order, cart, voice)
- [ ] Utility function coverage
- [ ] Reducer logic tests

Target:
- 150 additional unit tests
- Coverage > 75% on utils, services, reducers
```

#### Week 7: Performance & Load Testing
```markdown
Tasks:
- [ ] API response time benchmarks
- [ ] Artillery load test scenarios
- [ ] WebSocket connection stability
- [ ] Database query performance

Tests:
- 10 performance benchmarks
- 5 load test scenarios
- Continuous performance monitoring
```

#### Week 8: Security Enhancement
```markdown
Tasks:
- [ ] Penetration testing for JWT tampering
- [ ] SQL injection testing
- [ ] XSS vulnerability scanning
- [ ] CSRF token validation

Tests:
- 15 additional security tests
- Automated vulnerability scanning
```

---

### Phase 3: Automation (Weeks 9-12) - CI/CD Maturity

**Goal:** Fully automated testing and deployment pipeline

#### Week 9-10: CI/CD Pipeline Hardening
```markdown
Tasks:
- [ ] Implement all recommended workflows
- [ ] Automated rollback on health check failure
- [ ] Synthetic monitoring (every 15 min)
- [ ] Performance regression detection

Deliverables:
- Complete CI/CD pipeline (5 stages)
- Auto-rollback configured
- 24/7 monitoring active
```

#### Week 11: Test Maintenance & Documentation
```markdown
Tasks:
- [ ] Flaky test identification and fixing
- [ ] Test quarantine system
- [ ] Testing best practices documentation
- [ ] Team training sessions

Deliverables:
- Flaky test rate < 2%
- Comprehensive testing guide
- Team onboarded
```

#### Week 12: Retrospective & Optimization
```markdown
Tasks:
- [ ] Measure test suite performance (target: < 10 min)
- [ ] Optimize slow tests
- [ ] Review test coverage gaps
- [ ] Update testing strategy

Target Metrics:
- Test execution time < 10 minutes
- Coverage > 80% on critical paths
- Zero P0 bugs in production (last 30 days)
```

---

## 7. Test Data Requirements

### 7.1 Test Database Setup

**Supabase Test Project:**
```sql
-- Seed script: tests/fixtures/seed-test-data.sql

-- Restaurants
INSERT INTO restaurants (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Restaurant A', 'test-restaurant-a'),
  ('22222222-2222-2222-2222-222222222222', 'Test Restaurant B', 'test-restaurant-b');

-- Users
INSERT INTO auth.users (id, email, encrypted_password) VALUES
  ('user-manager-a', 'manager@test-a.com', crypt('password123', gen_salt('bf'))),
  ('user-server-a', 'server@test-a.com', crypt('password123', gen_salt('bf'))),
  ('user-kitchen-a', 'kitchen@test-a.com', crypt('password123', gen_salt('bf')));

-- User-Restaurant Assignments
INSERT INTO user_restaurants (user_id, restaurant_id, role) VALUES
  ('user-manager-a', '11111111-1111-1111-1111-111111111111', 'manager'),
  ('user-server-a', '11111111-1111-1111-1111-111111111111', 'server'),
  ('user-kitchen-a', '11111111-1111-1111-1111-111111111111', 'kitchen');

-- PINs
INSERT INTO user_pins (user_id, restaurant_id, pin_hash) VALUES
  ('user-server-a', '11111111-1111-1111-1111-111111111111', crypt('1234', gen_salt('bf'))),
  ('user-kitchen-a', '11111111-1111-1111-1111-111111111111', crypt('5678', gen_salt('bf')));

-- Menu Items
INSERT INTO menu_items (id, restaurant_id, name, price, category) VALUES
  ('item-burger', '11111111-1111-1111-1111-111111111111', 'Test Burger', 12.99, 'Entrees'),
  ('item-fries', '11111111-1111-1111-1111-111111111111', 'French Fries', 4.99, 'Sides');

-- Tables
INSERT INTO tables (id, restaurant_id, table_number, seats) VALUES
  ('table-1', '11111111-1111-1111-1111-111111111111', 1, 4),
  ('table-2', '11111111-1111-1111-1111-111111111111', 2, 2);
```

### 7.2 Test Fixtures

```typescript
// tests/fixtures/test-data.ts
export const TEST_DATA = {
  restaurants: {
    testA: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Test Restaurant A',
      slug: 'test-restaurant-a'
    },
    testB: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Test Restaurant B',
      slug: 'test-restaurant-b'
    }
  },

  users: {
    manager: {
      email: 'manager@test-a.com',
      password: 'password123',
      role: 'manager'
    },
    server: {
      email: 'server@test-a.com',
      password: 'password123',
      pin: '1234',
      role: 'server'
    },
    kitchen: {
      email: 'kitchen@test-a.com',
      password: 'password123',
      pin: '5678',
      role: 'kitchen'
    }
  },

  menuItems: {
    burger: {
      id: 'item-burger',
      name: 'Test Burger',
      price: 12.99,
      category: 'Entrees'
    },
    fries: {
      id: 'item-fries',
      name: 'French Fries',
      price: 4.99,
      category: 'Sides'
    }
  },

  tables: {
    table1: {
      id: 'table-1',
      table_number: 1,
      seats: 4
    }
  }
};
```

### 7.3 Environment Variables

```bash
# .env.test
NODE_ENV=test

# Test Supabase Project
TEST_SUPABASE_URL=https://test-project.supabase.co
TEST_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TEST_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Test JWT Secret
TEST_JWT_SECRET=test-jwt-secret-32-characters-long-for-security

# Square Sandbox
TEST_SQUARE_ACCESS_TOKEN=sandbox-sq0atb-...
TEST_SQUARE_LOCATION_ID=sandbox-location-id

# Test Restaurant IDs
TEST_RESTAURANT_A_ID=11111111-1111-1111-1111-111111111111
TEST_RESTAURANT_B_ID=22222222-2222-2222-2222-222222222222
```

---

## 8. Tools and Frameworks

### 8.1 Current Stack ✅
- **Unit Tests:** Vitest (fast, ESM support)
- **E2E Tests:** Playwright (cross-browser, reliable)
- **API Tests:** Supertest (Express integration)
- **Component Tests:** React Testing Library (user-centric)

### 8.2 Recommended Additions

#### **For Integration Testing:**
- **@supabase/supabase-js** - Real Supabase client in tests
- **testcontainers** - Docker containers for isolated DB tests (optional)
- **msw** - Mock Service Worker for external API mocking (OpenAI, Square)

#### **For Load Testing:**
- **Artillery** - Flexible load testing framework
- **k6** - Grafana's load testing tool (alternative)

#### **For Security Testing:**
- **OWASP ZAP** - Automated security scanning
- **sqlmap** - SQL injection testing
- **jwt-tool** - JWT manipulation and testing

#### **For Monitoring:**
- **Sentry** - Error tracking and performance monitoring
- **Datadog** - APM and infrastructure monitoring
- **Prometheus + Grafana** - Custom metrics and dashboards

### 8.3 Configuration Examples

#### **Vitest with Real Supabase:**
```typescript
// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/integration/setup.ts'],
    testTimeout: 30000, // Longer for real API calls
    include: ['**/*.integration.test.ts']
  }
});
```

#### **Artillery Load Test:**
```yaml
# tests/load/api-load.yml
config:
  target: 'https://july25.onrender.com'
  phases:
    - duration: 60
      arrivalRate: 10
      rampTo: 50

scenarios:
  - name: "Order Creation Load"
    flow:
      - post:
          url: "/api/v1/orders"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            type: "dine_in"
            items: [{ menu_item_id: "test-item", quantity: 1 }]
```

---

## 9. Success Metrics and KPIs

### 9.1 Testing Health Dashboard

**Target Metrics (6 Months):**

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Test Coverage** | ~60% | 80% | 🟡 Improving |
| **Integration Tests** | 8% | 40% | 🔴 Critical |
| **E2E Test Reliability** | ~85% | 95% | 🟡 Improving |
| **Tests Block Deploys** | No | Yes | 🔴 Critical |
| **Production Incidents** | 3/month | <1/quarter | 🔴 Critical |
| **Mean Time to Detection** | 6 days | <2 hours | 🔴 Critical |
| **Mean Time to Resolution** | 3 days | <4 hours | 🔴 Critical |
| **Test Execution Time** | ~15 min | <10 min | 🟡 Good |
| **Flaky Test Rate** | ~15% | <2% | 🔴 Critical |
| **Mock Usage Ratio** | ~90% | ~40% | 🔴 Critical |

### 9.2 Weekly KPIs

**Track in Team Standup:**
- Tests added this week
- Tests removed/refactored this week
- Flaky tests identified
- Coverage delta (+/- %)
- Production incidents
- Mean Time to Detection (MTTD)
- Mean Time to Resolution (MTTR)

### 9.3 Monthly Review

**Dashboard Metrics:**
```typescript
// Monthly Testing Report
{
  "month": "2025-11",
  "tests": {
    "total": 650,
    "unit": 450,
    "integration": 120,
    "e2e": 80,
    "added": +35,
    "removed": -12
  },
  "coverage": {
    "overall": 78,
    "critical_paths": 85,
    "auth": 92,
    "orders": 88,
    "payments": 72
  },
  "reliability": {
    "pass_rate": 94,
    "flaky_tests": 8,
    "avg_execution_time_minutes": 9.5
  },
  "production": {
    "incidents": 0,
    "mttd_hours": 0.5,
    "mttr_hours": 2.1
  }
}
```

---

## 10. Team Training and Adoption

### 10.1 Testing Best Practices Workshop (2 hours)

**Agenda:**
1. **Why Tests Matter** (15 min)
   - JWT scope bug case study
   - Cost of production bugs
   - ROI of comprehensive testing

2. **Test Types Explained** (20 min)
   - Unit: Pure function testing
   - Integration: Service interaction testing
   - E2E: User journey testing
   - When to use each

3. **Writing Effective Tests** (30 min)
   - Arrange-Act-Assert pattern
   - Avoiding common pitfalls
   - Mocking vs real integration
   - Live coding demo

4. **CI/CD Pipeline Overview** (20 min)
   - Pre-commit → PR → Deploy flow
   - How to read test failures
   - Debugging flaky tests

5. **Hands-On Exercise** (30 min)
   - Write JWT structure test
   - Run integration test locally
   - Fix failing E2E test

6. **Q&A** (15 min)

### 10.2 Testing Checklist for PRs

**Before Submitting PR:**
- [ ] Tests added for new features
- [ ] Tests updated for modified features
- [ ] All tests pass locally (`npm test`)
- [ ] No console.log statements
- [ ] Coverage maintained or improved
- [ ] Flaky tests fixed (not just re-run)

**PR Template Addition:**
```markdown
## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added (if applicable)
- [ ] E2E tests added (if user-facing change)
- [ ] Manual testing completed
- [ ] All tests passing locally

**Test Coverage:**
- Before: X%
- After: Y%
```

### 10.3 Code Review Checklist

**For Reviewers:**
- [ ] Tests actually test the feature (not just passing)
- [ ] Tests use real services (not excessive mocking)
- [ ] Test names describe expected behavior
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] Tests are deterministic (no random data)

---

## 11. Appendix

### 11.1 Testing Commands Reference

```bash
# Unit Tests
npm test                          # Run all unit tests
npm test -- --coverage            # With coverage report
npm test -- --watch              # Watch mode
npm test -- path/to/file.test.ts # Run specific file

# Integration Tests
npm run test:integration         # All integration tests
npm run test:integration:auth    # Auth integration only

# E2E Tests
npm run test:e2e                 # All E2E tests
npm run test:e2e:smoke           # Smoke tests only
npm run test:e2e -- --project=chromium # Specific browser
npm run test:e2e -- --headed     # Show browser

# Security Tests
npm run test:security            # Run security proof tests

# Performance Tests
npm run test:performance         # Lighthouse + ordering perf
npm run load:test                # Artillery load tests

# CI/CD
npm run test:ci                  # CI mode (no watch, coverage)
npm run test:quick               # Fast feedback (smoke only)

# Debugging
npm run test:debug               # Debug mode
npm run test -- --inspect        # Node inspector
```

### 11.2 Test File Naming Conventions

```
server/src/services/orders.service.ts
├── orders.service.test.ts         # Unit tests
├── orders.service.integration.test.ts # Integration tests
└── __tests__/orders.service.test.ts   # Alternative structure

tests/e2e/orders/
├── order-creation.spec.ts         # E2E test
└── order-creation.smoke.spec.ts   # Smoke test

tests/load/
└── order-creation.load.yml        # Load test config
```

### 11.3 Common Test Utilities

```typescript
// tests/utils/test-helpers.ts

export async function createTestToken(overrides = {}) {
  const payload = {
    sub: '00000000-0000-0000-0000-000000000000',
    email: 'test@test.com',
    role: 'server',
    scope: ['orders:create', 'orders:read'],
    restaurant_id: TEST_RESTAURANT_ID,
    auth_method: 'email',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides
  };

  return jwt.sign(payload, process.env.JWT_SECRET!);
}

export async function createTestOrder(overrides = {}) {
  const order = {
    type: 'dine_in',
    table_id: TEST_TABLE_ID,
    seat_number: 1,
    items: [{ menu_item_id: TEST_ITEM_ID, quantity: 1 }],
    restaurant_id: TEST_RESTAURANT_ID,
    ...overrides
  };

  const response = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${await createTestToken()}`)
    .send(order);

  return response.body;
}

export async function waitForWebSocketMessage(
  ws: WebSocket,
  predicate: (msg: any) => boolean,
  timeout = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('WebSocket message timeout'));
    }, timeout);

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (predicate(msg)) {
        clearTimeout(timer);
        resolve(msg);
      }
    });
  });
}
```

### 11.4 Debugging Failed Tests

**Common Issues:**

1. **Flaky Test (Passes Sometimes):**
   ```bash
   # Run test 10 times to confirm flakiness
   for i in {1..10}; do npm test path/to/test.ts; done

   # Common causes:
   # - Race conditions (missing await)
   # - Timing dependencies (setTimeout without proper waits)
   # - Shared state between tests
   # - Non-deterministic data (Date.now(), Math.random())
   ```

2. **Test Timeout:**
   ```typescript
   // Increase timeout for slow operations
   test('slow operation', async () => {
     // ...
   }, 30000); // 30 second timeout
   ```

3. **JWT Decode Failures:**
   ```typescript
   // Always handle decode errors
   try {
     const decoded = jwt.decode(token);
     expect(decoded).toBeDefined();
   } catch (error) {
     console.error('Token decode failed:', error);
     console.log('Token:', token);
     throw error;
   }
   ```

### 11.5 Resources

**Documentation:**
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)

**Internal Docs:**
- [JWT Scope Bug Postmortem](/docs/postmortems/2025-11-12-jwt-scope-bug.md)
- [Auth Debugging Runbook](/docs/how-to/operations/runbooks/AUTH_DEBUGGING_RUNBOOK.md)
- [Testing Gap Analysis](/docs/archive/2025-11/TESTING_GAP_ANALYSIS.md)

**Tools:**
- [JWT Decoder](https://jwt.io/)
- [Artillery](https://www.artillery.io/)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)

---

## Summary

This comprehensive testing strategy addresses the critical gaps that allowed production bugs like the JWT scope issue (10-day outage) and React hydration bug (3-day outage) to slip through.

**Key Takeaways:**

1. **Tests exist but need quality improvement** - 115 test files, but 90% use mocks
2. **Critical gap: Integration tests** - Need real Supabase integration, not mocks
3. **CI/CD needs gates** - Tests run but don't block bad deploys
4. **Production validation missing** - No staging smoke tests before prod deploy
5. **12-week roadmap** - Phased approach to 80%+ critical path coverage

**Immediate Action Items (Week 1):**
- ✅ Add JWT structure validation tests
- ✅ Implement deployment gates (tests must pass)
- ✅ Set up production health monitoring
- ✅ Document rollback procedures

**Expected Outcomes (6 Months):**
- 80%+ test coverage on critical paths
- <1 production incident per quarter
- <2 hour mean time to detection
- <4 hour mean time to resolution
- Tests block all bad deployments

---

**Document Prepared By:** System Quality Assessment Team
**Last Updated:** 2025-11-14
**Next Review:** 2025-12-14 (Monthly)
**Status:** Ready for Implementation

**Stakeholders:** Engineering Team, DevOps, QA, Product Management
