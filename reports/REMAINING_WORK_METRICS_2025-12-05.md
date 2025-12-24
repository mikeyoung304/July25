# Remaining Work: Detailed Metrics & Effort Estimates

**Report Date:** December 5, 2025
**Analysis Method:** Multi-agent audit + code inspection
**Coverage:** Complete codebase analysis

---

## Executive Summary

### Work Completed (Phase 1-3)
All critical E2E testing infrastructure improvements have been completed:
- Playwright configuration fixes
- Vitest standardization
- GitHub Actions workflow
- Timeout replacement (35+ instances)
- Cache isolation tests (13 new tests)
- Debug file cleanup

### Remaining Effort
**Total Remaining:** ~140-160 hours across all categories
**Critical Path:** Test pyramid rebalancing (42 hours)
**Timeline:** 8-12 weeks for complete implementation

---

## Detailed Remaining Work by Category

### Category 1: Test Pyramid Rebalancing (CRITICAL PATH)

#### Metrics Summary
| Metric | Value |
|--------|-------|
| **E2E Tests to Convert** | 138 tests |
| **Files to Convert** | 15 files |
| **Current E2E Lines** | ~3,500 lines |
| **Target Unit Tests** | ~100-130 |
| **Effort Hours** | 42 hours |
| **Timeline** | 4-5 weeks (2 engineers) |
| **Priority** | P2 Medium |

#### Detailed Breakdown

**Group A: UI/Component Tests (6 files)**
| File | Tests | Lines | Unit Tests | Hours | Risk |
|------|-------|-------|-----------|-------|------|
| viewport-test.spec.ts | 12 | 420 | 4 | 3.5 | Low |
| kiosk-voice-button.spec.ts | 8 | 280 | 3 | 2.5 | Low |
| basic-routes.spec.ts | 18 | 540 | 5 | 4 | Low |
| checkout-smoke.spec.ts | 15 | 450 | 8 | 4 | Medium |
| production-serverview-detailed.spec.ts | 24 | 720 | 6 | 4 | Medium |
| production-serverview-interaction.spec.ts | 18 | 540 | 5 | 3.5 | Medium |
| **Group A Totals** | **95** | **2,950** | **31** | **21.5** | - |

**Group B: Validation Tests (4 files)**
| File | Tests | Lines | Unit Tests | Hours | Risk |
|------|-------|-------|-----------|-------|------|
| checkout-flow.spec.ts | 22 | 660 | 9 | 3.5 | Medium |
| card-payment.spec.ts | 14 | 420 | 7 | 3 | Medium |
| cash-payment.spec.ts | 8 | 240 | 4 | 2 | Low |
| workspace-landing.spec.ts | 12 | 360 | 6 | 3 | Medium |
| **Group B Totals** | **56** | **1,680** | **26** | **11.5** | - |

**Group C: Smoke Tests (5 files)**
| File | Tests | Consolidate To | Hours | Risk |
|------|-------|-----------------|-------|------|
| auth/login.smoke.spec.ts | 8 | 2 E2E tests | 2 | Low |
| kds/kitchen-display.smoke.spec.ts | 6 | 1 E2E test | 2 | Low |
| orders/server-order-flow.smoke.spec.ts | 10 | 1 E2E test | 2 | Low |
| voice-ordering.spec.ts | 14 | 1 E2E test (+skip for CI) | 2 | Low |
| Other smoke tests | - | Keep as-is | - | - |
| **Group C Totals** | **38** | **5 E2E** | **8** | - |

**Complete Group Summary:**
```
┌─────────────────────────────────────────────────────┐
│ Test Pyramid Conversion Summary                      │
├─────────────────────────────────────────────────────┤
│ Current E2E: 188 tests                              │
│ After Conversion: ~50 E2E + ~130 unit tests         │
│ Effort: 42 hours                                    │
│ Timeline: 4-5 weeks (2 engineers)                   │
│                                                     │
│ Before: 188 E2E tests (2+ hours in CI)             │
│ After: 50 E2E tests (7-10 minutes in CI)           │
│        130 unit tests (2-3 minutes locally)         │
└─────────────────────────────────────────────────────┘
```

---

### Category 2: Integration Test Layer (NEW)

#### Metrics Summary
| Metric | Value |
|--------|-------|
| **Tests to Create** | ~150 new tests |
| **Coverage Areas** | 3 (API, RLS, DB) |
| **Effort Hours** | 35-40 hours |
| **Timeline** | 4-6 weeks |
| **Priority** | P1 High |

#### Detail by Subcategory

**API Contract Integration Tests (100 tests)**
```
Purpose: Validate request/response schemas, error handling
Current Coverage: Limited
Target Coverage: Complete

Examples:
- POST /orders request validation (15 tests)
  - Valid payload structure
  - Required fields
  - Type validation
  - Malformed payloads

- GET /restaurants/:id response format (8 tests)
  - Success response structure
  - Error response format
  - Status codes (200, 404, 500)

- WebSocket message format (10 tests)
  - Message schema validation
  - Missing fields handling
  - Rate limiting

Effort: 25-30 hours
Tests: ~100
Files: ~8 new test files
```

**RLS Policy Integration Tests (40 tests)**
```
Purpose: Verify Row-Level Security policies at database level
Current Coverage: Untested
Target Coverage: Complete

Critical Tests:
- User A cannot read User B's restaurants (5 tests)
  - SELECT violation
  - INSERT violation
  - UPDATE violation
  - DELETE violation
  - Service role can bypass

- WebSocket subscriptions respect tenant boundaries (8 tests)
- Payment audit logs filtered by restaurant (5 tests)
- User permissions propagate correctly (10 tests)
- Role-based access enforcement (12 tests)

Effort: 8-10 hours
Tests: ~40
Files: 1-2 test files
Risk: High (database-level testing)
```

**Database Integrity Integration Tests (20 tests)**
```
Purpose: Verify constraints, cascades, transactions
Current Coverage: Minimal
Target Coverage: Edge cases

Examples:
- Cascade delete restaurant → users, orders (4 tests)
- Unique constraint violations (4 tests)
- Transaction rollback on error (4 tests)
- Data consistency after concurrent updates (4 tests)
- Constraint triggers (4 tests)

Effort: 5-8 hours
Tests: ~20
Files: 1 test file
```

**Integration Testing Stack:**
```typescript
// Supertest for API contracts
import request from 'supertest';
import app from '../server';

describe('Order API Contracts', () => {
  it('POST /orders validates amount > 0', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({ amount: -10, items: [...] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_AMOUNT');
  });
});

// Supabase client for RLS testing
import { createClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  it('prevents cross-restaurant access', async () => {
    const client = createClient(url, token_restaurant_a);
    const { data, error } = await client
      .from('orders')
      .select()
      .eq('restaurant_id', restaurant_b_id);

    expect(error?.code).toBe('PGRST116'); // RLS violation
  });
});
```

---

### Category 3: WebSocket Real-time Testing

#### Metrics Summary
| Metric | Value |
|--------|-------|
| **Tests to Create** | ~30 new tests |
| **Coverage Areas** | 3 (subscription, updates, errors) |
| **Effort Hours** | 20-25 hours |
| **Timeline** | 2-3 weeks |
| **Priority** | P1 High |

#### Detail by Subcategory

**Subscription Management (8 tests)**
```
1. Subscribe to order updates (1 test)
2. Multiple subscribers on same order (1 test)
3. Unsubscribe cleanup (1 test)
4. Subscription with invalid restaurant_id (1 test)
5. Subscription authentication validation (1 test)
6. Message queue for offline subscribers (1 test)
7. Subscription limits per user (1 test)
8. Concurrent subscription requests (1 test)

Effort: 6 hours
Risk: Medium (timing-sensitive)
```

**Real-time Updates Broadcasting (12 tests)**
```
Order Status Transitions:
1. pending → confirmed propagates to all KDS stations
2. confirmed → preparing updates order card
3. preparing → ready triggers customer notification
4. ready → picked-up updates all tables
5. picked-up → completed archives order

Table Status Updates:
6. Table occupied → available seen in floor plan
7. Table payment pending → paid color change
8. Table cleaning → available when done

Kitchen Display:
9. Ticket arrival appears on correct station
10. Ticket move between stations
11. Completed ticket removal from board

WebSocket:
12. Broadcast to multiple clients simultaneously

Effort: 10 hours
Risk: Medium (WebSocket timing)
```

**Error Handling (8 tests)**
```
1. WebSocket disconnection → auto-reconnect
2. Invalid message format → logged, connection maintained
3. Subscription permission denied → error response
4. Message delivery guarantee (at-least-once)
5. Heartbeat keeps connection alive
6. Graceful shutdown cleanup
7. Memory leak prevention (listeners removed)
8. Rate limit exceeded → backoff strategy

Effort: 8 hours
Risk: High (distributed system testing)
```

---

### Category 4: CI/CD Performance Optimization

#### Metrics Summary
| Metric | Value |
|--------|-------|
| **Current E2E Duration** | 35 minutes (CI) |
| **Target Duration** | 7-10 minutes |
| **Optimization Methods** | 3 (sharding, trace upload, parallelization) |
| **Effort Hours** | 12-15 hours |
| **Timeline** | 1-2 weeks |
| **Priority** | P2 Medium |

#### Optimization Breakdown

**Task 190: Test Sharding (4-6 hours)**
```
Approach: Run E2E tests in parallel workers

Current:
  └─ 35 minutes (1 worker, sequential tests)

With Sharding (4 workers):
  ├─ Worker 1: [1/4] tests (8-10 min)
  ├─ Worker 2: [2/4] tests (8-10 min)
  ├─ Worker 3: [3/4] tests (8-10 min)
  └─ Worker 4: [4/4] tests (8-10 min)

Total: ~10 minutes

Implementation:
- Update playwright.config.ts (1 hour)
- Update GitHub Actions workflow (1 hour)
- Test locally with matrix.shard (1 hour)
- Optimize test distribution (1-2 hours)
- CI debugging if timing issues (1 hour)

Evidence of Success:
- CI duration reduced from 35 min → 10 min
- All tests still pass with sharding
- No cross-shard dependency issues
```

**Task 191: Trace Upload for Failures (2-3 hours)**
```
Approach: Capture Playwright traces on test failure in CI

Implementation:
- Configure trace generation (30 min)
  trace: 'on-first-retry'

- Update CI to upload on failure (1 hour)
  uses: actions/upload-artifact@v4
  if: failure()

- Document trace analysis process (30 min)

Value:
- Faster debugging of CI-only failures
- Visual replay of failed test steps
- Network inspection in browser
- Retention: 7 days

Cost:
- Storage: ~50MB per failed run
- Build time: +1 minute for uploads
```

**Task 192: Test Execution Time Analysis (3-4 hours)**
```
Current Bottlenecks:
- Server startup: 5-7 seconds per test
- Vite client build: 3-5 seconds per test
- Playwright browser initialization: 2-3 seconds

Optimizations:
1. Shared server instance across tests (2 hours)
   Before: Each test starts server
   After: All tests share 1 server instance
   Savings: 5-7 seconds per test × 50 tests = 250-350 seconds

2. Shared browser context (1 hour)
   Before: Fresh browser per file
   After: Reuse browser, fresh context per test
   Savings: 3-5 seconds per file × 30 files = 90-150 seconds

3. Optimize database seeding (1 hour)
   Before: Full seed per test
   After: Seed once, restore snapshots
   Savings: 10-15 seconds per test × 50 tests

Total Potential Savings: 300-500 seconds (8-12 minutes)
```

---

### Category 5: Remaining P1/P2 Issues (Non-Test)

#### Metrics Summary
| Metric | Value |
|--------|-------|
| **P1 High Issues** | 3 open items |
| **P2 Medium Issues** | 4 open items |
| **Total Effort Hours** | 12-15 hours |
| **Timeline** | 2-3 weeks |
| **Priority** | Varies (P1 High, P2 Medium) |

#### P1 High Remaining Issues

**Issue #5: Real-time Table Status via Supabase (Partial)**
```
Status: 50% complete (WebSocket works, Supabase integration partial)
Effort: 2-3 hours
Risk: Low

Current State:
- Server broadcasts table changes via WebSocket ✓
- Client receives updates ✓
- Supabase channels defined but unused ✗

Required Work:
1. Subscribe to table changes via Supabase Realtime (1 hour)
2. Fallback to WebSocket if Supabase unavailable (0.5 hours)
3. Add E2E test for dual-source updates (0.5 hours)
4. Document hybrid approach (0.5 hours)

Code Example:
const subscription = supabase
  .channel(`table-updates:${restaurantId}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'tables' },
    (payload) => handleTableUpdate(payload)
  )
  .subscribe();
```

**Issue #9: Cache Clearing on Restaurant Switch**
```
Status: Function defined but never invoked
Effort: 1-2 hours
Risk: Low

Current State:
- Function exists: clearAllCachesForRestaurantSwitch() ✓
- Hook on restaurant change: MISSING ✗

Required Work:
1. Add call to useEffect in RestaurantContext (0.5 hours)
2. Add tests for cache clearing (0.5 hours)
3. Verify no orphaned cached data (0.5 hours)
4. Document cache strategy (0.5 hours)

Code Example:
const setCurrentRestaurantId = (id: string) => {
  clearAllCachesForRestaurantSwitch();
  setRestaurantId(id);
  // Reload data for new restaurant
};
```

**Issue #10: Metrics Forwarding to Monitoring**
```
Status: TODO comment present, no integration
Effort: 3-5 hours
Risk: Medium (external API dependency)

Current State:
- Metrics collected locally ✓
- /metrics endpoint works ✓
- DataDog/New Relic integration: MISSING ✗

Required Work:
1. Install DataDog SDK (0.5 hours)
2. Configure API keys (0.5 hours)
3. Forward metrics on /metrics endpoint (1 hour)
4. Test integration locally (0.5 hours)
5. Add CI environment (1 hour)
6. Verify in production (0.5 hours)

Code Example:
import { StatsD } from 'node-dogstatsd';
const client = new StatsD();

router.post('/metrics', (req, res) => {
  const { duration, endpoint } = req.body;
  client.timing('api.endpoint.duration', duration,
    { endpoint, restaurant_id: req.restaurantId });
});
```

#### P2 Medium Remaining Issues

**Issue #14: Station Assignment Refactor (Keyword Matching)**
```
Status: Still using fragile keyword matching
Effort: 2-3 hours
Risk: Medium

Current Code:
if (itemName.includes('appetizer')) station = 'appetizer-station';
if (itemName.includes('main')) station = 'main-kitchen';
// ... fragile, doesn't scale

Required Work:
1. Add station_id to menu_items table (0.5 hours)
2. Migrate data (0.5 hours)
3. Update assignment logic (0.5 hours)
4. Add unit tests (0.5 hours)
5. Add E2E test for assignment (0.5 hours)

New Approach:
const getStationForItem = (itemId) => {
  const item = items.find(i => i.id === itemId);
  return item.station_id; // Direct lookup
};
```

**Issue #17: Rate Limit Reset in Tests**
```
Status: State persists between tests
Effort: 1-2 hours
Risk: Low

Current Problem:
Test 1: 10 failed login attempts → rate limited
Test 2: Still rate limited from previous test

Required Work:
1. Reset rate limit store between tests (0.5 hours)
2. Use fresh Express app instance per test (0.5 hours)
3. Add verification test (0.5 hours)

Implementation:
beforeEach(() => {
  rateLimitStore.clear(); // Reset for each test
  app = createExpressApp(); // Fresh middleware chain
});
```

**Issue #18: Configurable Restaurant ID in Seed**
```
Status: Hardcoded in seed-menu-mapped.ts
Effort: 0.5-1 hour
Risk: Low

Current Code:
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'; // Hardcoded

Required Work:
1. Add environment variable support (0.25 hours)
2. Add CLI argument support (0.25 hours)
3. Update docs (0.5 hours)

Implementation:
const restaurantId = process.env.SEED_RESTAURANT_ID
  || process.argv[2]
  || DEFAULT_ID;
```

---

### Category 6: Type System Improvements (P3)

#### Metrics Summary
| Metric | Value |
|--------|-------|
| **Issues** | 3 major, 9 minor |
| **Effort Hours** | 8-12 hours |
| **Timeline** | 2 weeks |
| **Priority** | P3 Low |

#### Type Issues Detail

**Issue #21: @ts-ignore Suppressions**
```
Status: 9 remaining suppressions
Effort: 3-4 hours

Breakdown:
- Chrome performance.memory API (4) → Legitimate, document
- WebRTC types incomplete (3) → Add DefinitelyTyped package
- DOM event types (2) → Add type guards

Action:
1. Document which suppressions are intentional (1 hour)
2. Replace others with proper types (2-3 hours)
3. Add type guard utilities (0.5 hours)

Example:
// Before
// @ts-ignore
const used = performance.memory?.usedJSHeapSize;

// After
const getMemoryUsage = (): number | null => {
  return (performance as any).memory?.usedJSHeapSize ?? null;
};
```

**Issue #96: Table Type Inconsistency (DatabaseTable vs Table)**
```
Status: Two conflicting type definitions
Effort: 4-5 hours

Current Types:
type Table = {
  id: string;
  status: 'available' | 'occupied' | 'reserved'; // Missing 'paid'
};

type DatabaseTable = {
  id: string;
  status: string; // Over-generic
  table_number: number;
};

Required Work:
1. Unify type definition (1 hour)
2. Add 'paid' status (0.5 hours)
3. Update all references (2 hours)
4. Add type tests (1 hour)

Solution:
export type TableStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'cleaning'
  | 'paid';

export type Table = {
  id: string;
  restaurant_id: string;
  table_number: number;
  status: TableStatus;
};
```

---

## Total Remaining Effort Summary

### By Category
```
┌────────────────────────────────────────────────┐
│ Remaining Work Summary                         │
├────────────────────────────────────────────────┤
│ 1. Test Pyramid Rebalancing       42 hours    │
│ 2. Integration Test Layer          35-40 hrs  │
│ 3. WebSocket Real-time Tests       20-25 hrs  │
│ 4. CI/CD Performance                12-15 hrs │
│ 5. P1/P2 Issues (Non-test)         12-15 hrs  │
│ 6. Type System Improvements         8-12 hrs  │
│                                                │
│ TOTAL REMAINING               141-157 hours   │
│                                                │
│ Timeline (2 engineers)        7-10 weeks      │
│ Timeline (1 engineer)         14-20 weeks     │
└────────────────────────────────────────────────┘
```

### By Priority
```
P1 High Priority:
├─ Integration Test Layer          35-40 hours (critical for security)
├─ WebSocket Real-time Tests       20-25 hours (customer-facing)
├─ Remaining P1 Issues             6-7 hours (blocking production)
└─ Subtotal                        61-72 hours

P2 Medium Priority:
├─ Test Pyramid Rebalancing        42 hours (infrastructure)
├─ CI/CD Performance               12-15 hours (dev productivity)
├─ Remaining P2 Issues             6-8 hours
└─ Subtotal                        60-65 hours

P3 Low Priority:
├─ Type System Improvements        8-12 hours (code quality)
└─ Subtotal                        8-12 hours

TOTAL: 141-157 hours
```

### By Timeline
```
CRITICAL PATH (Must do first):
1. Test Pyramid (42 hrs) + Integration Tests (35 hrs) = 77 hours
   └─ Week 1-8 (2 engineers)

HIGH VALUE (Important for production):
2. WebSocket Tests (20 hrs) + P1 Issues (6 hrs) = 26 hours
   └─ Week 5-7 (1 engineer, parallel)

PRODUCTIVITY:
3. CI/CD Optimization (12 hrs)
   └─ Week 6-7 (1 engineer)

POLISH:
4. Type System (8 hrs) + P2 Issues (6 hrs) = 14 hours
   └─ Week 8-10 (1 engineer)
```

---

## Resource Allocation Recommendation

### Option A: Fast Track (2 Engineers, 7-8 weeks)
```
Engineer 1: Test Pyramid (42 hrs)
Engineer 2: Integration Tests (35-40 hrs)
[Both]: WebSocket & CI optimization (12 weeks)

Advantages:
- Fastest to completion
- Parallel critical path items
- High test quality (pair reviews)

Disadvantages:
- High resource cost
- May block other work
```

### Option B: Steady State (1.5 Engineers, 10-12 weeks)
```
Engineer 1: Test Pyramid (42 hrs) + CI Optimization (12 hrs)
Engineer 2: Integration Tests (35 hrs) + WebSocket (20 hrs)
Engineer 2 (part-time): P1/P2 Issues + Type fixes

Advantages:
- Lower resource cost
- Sustainable pace
- Less context switching

Disadvantages:
- Longer timeline
- Some parallelization lost
```

### Option C: Incremental (1 Engineer, 16-20 weeks)
```
Week 1-5: Test Pyramid (42 hrs)
Week 6-10: Integration Tests (35 hrs)
Week 11-14: WebSocket Tests (20 hrs)
Week 15-16: CI Optimization + P1/P2 issues

Advantages:
- Minimal resource commitment
- Can stop/pause as needed
- Single point of knowledge

Disadvantages:
- Longest timeline
- Context switching overhead
- Risk of incomplete implementation
```

---

## Critical Path Dependencies

```
Phase 1 (Must complete first - 8 weeks):
┌──────────────────────────────────────────────┐
│ Test Pyramid Rebalancing (42 hrs)            │
│ └─ Required before: CI Optimization          │
│                                              │
│ Integration Test Layer (35-40 hrs, parallel)│
│ └─ Required before: Type System cleanup      │
└──────────────────────────────────────────────┘
         ↓ (Both complete)

Phase 2 (Can run in parallel - 4 weeks):
┌──────────────────────────────────────────────┐
│ WebSocket Real-time Tests (20-25 hrs)       │
│ CI/CD Performance (12-15 hrs)                │
│ P1/P2 Issue Fixes (12-15 hrs)               │
└──────────────────────────────────────────────┘
         ↓ (All complete)

Phase 3 (Polish - 2 weeks):
┌──────────────────────────────────────────────┐
│ Type System Improvements (8-12 hrs)          │
│ Documentation & Training (4-5 hrs)           │
└──────────────────────────────────────────────┘
```

---

## Success Metrics & Monitoring

### Test Coverage Metrics
```
Current → Target
- E2E tests: 188 → 50 (-73%)
- Unit tests: 1,397 → 1,500+ (+7%)
- Integration tests: 30 → 150 (+400%)
- Code coverage: TBD → 85%+
```

### Performance Metrics
```
Current → Target
- CI duration: 35 min → 7 min (-80%)
- E2E execution: 2 min/test → 10 sec/test
- Unit test suite: 5 min → 2-3 min
- Test flakiness: ~15% → <2%
```

### Quality Metrics
```
Current → Target
- Type safety errors: 0 → 0 (maintain)
- @ts-ignore suppressions: 9 → <3
- Test pass rate: 85% → 95%+
- Code review cycles: N/A → <2
```

---

**Report Version:** 1.0
**Generated:** 2025-12-05
**Next Review:** After Phase 1 (Week 8)
