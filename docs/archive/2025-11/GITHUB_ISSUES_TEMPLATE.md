# GitHub Issues - Ready to Create

This document contains ready-to-paste GitHub issue templates for all TODO/FIXME items found in the codebase.

---

## CRITICAL PRIORITY ISSUES

### Issue #1: Authentication middleware blocking valid order creation requests

**Labels:** `critical`, `bug`, `authentication`, `backend`

**Priority:** P0 - Critical

**Description:**
Multiple authentication tests are consistently failing with 403 Forbidden responses instead of expected 201 Created status codes when valid users attempt to create orders.

**Current Behavior:**
- Customer role: 403 Forbidden when POST /api/v1/orders
- Server role: 403 Forbidden when POST /api/v1/orders
- kiosk_demo role: 403 Forbidden even with AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true

**Expected Behavior:**
- Customer role should receive 201 Created
- Server role should receive 201 Created
- kiosk_demo should work with compatibility flag

**Files Affected:**
- `/server/tests/routes/orders.auth.test.ts` (Lines 162-180, 184-202, 206-228, 260-293, 397+)

**Tests to Fix:**
- [ ] Test 1: customer role → POST /api/v1/orders → 201
- [ ] Test 2: server role → POST /api/v1/orders → 201
- [ ] Test 3: kiosk_demo with AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true → 201
- [ ] Test 5: X-Client-Flow header capture/logging
- [ ] Integration: Complete order flow with auth

**Investigation Steps:**
1. Review auth middleware configuration
2. Check role permissions in RBAC system
3. Verify JWT token generation in tests
4. Review order creation endpoint auth requirements

**Estimated Effort:** 3-5 days

---

### Issue #2: Security - Enforce restaurant_id requirement in authentication tokens

**Labels:** `critical`, `security`, `multi-tenant`, `backend`

**Priority:** P0 - Critical

**Description:**
Tokens without `restaurant_id` are currently being accepted by the authentication system, creating a security vulnerability in the multi-tenant architecture. This allows potential cross-tenant data access.

**Current Behavior:**
- Tokens without `restaurant_id` are accepted
- Warning logged: "Tokens without restaurant_id are accepted - security risk"
- STRICT_AUTH flag not enforcing requirement

**Expected Behavior:**
- All tokens MUST include `restaurant_id`
- Tokens without `restaurant_id` should be rejected with 401
- STRICT_AUTH flag should enforce this requirement

**Files Affected:**
- `/server/tests/security/auth.proof.test.ts` (Line 156)
- `/server/tests/security/rbac.proof.test.ts` (Line 257-258)

**Security Impact:**
- Multi-tenant data isolation could be bypassed
- Users could potentially access data from other restaurants
- Violates security requirements in ADR documents

**Test to Enable:**
```typescript
it.skip('should reject tokens without restaurant context', async () => {
  // TODO: Enable this test when STRICT_AUTH enforces restaurant_id requirement
```

**Action Items:**
- [ ] Update auth middleware to require restaurant_id
- [ ] Enable STRICT_AUTH enforcement
- [ ] Update token generation to always include restaurant_id
- [ ] Enable skipped security test
- [ ] Add integration tests for cross-tenant access prevention
- [ ] Security audit of existing tokens

**Estimated Effort:** 3-5 days

---

### Issue #3: Remove temporary auto-fill debug data from checkout pages

**Labels:** `critical`, `cleanup`, `production-ready`, `frontend`

**Priority:** P0 - Critical

**Description:**
Temporary debug code that auto-fills customer data is still present in checkout pages. This code was added for faster testing but MUST be removed before production deployment.

**Current State:**
Auto-fill enabled in development mode:
```typescript
// TEMPORARY DEBUG: Auto-fill demo data for faster testing (remove when done debugging)
const DEMO_CUSTOMER_DATA = {
  email: 'demo@example.com',
  phone: '(555) 555-1234',
};
```

**Files Affected:**
- `/client/src/pages/CheckoutPage.tsx` (Lines 30-34)
- `/client/src/components/kiosk/KioskCheckoutPage.tsx` (Lines 127-132)

**Risk:**
If this code is deployed to production, it could:
- Confuse real customers
- Cause data validation issues
- Create poor user experience

**Solution:**
Either:
1. Remove the auto-fill code entirely
2. Gate it behind a proper feature flag (VITE_ENABLE_DEBUG_AUTOFILL)
3. Only enable in local development (check for localhost)

**Acceptance Criteria:**
- [ ] Remove DEMO_CUSTOMER_DATA or properly gate it
- [ ] Verify checkout pages work without auto-fill
- [ ] Test in production build mode
- [ ] Update any dependent tests

**Estimated Effort:** 0.5 days

---

### Issue #4: STRICT_AUTH flag not enforcing restaurant_id token requirement

**Labels:** `critical`, `security`, `authentication`, `backend`

**Priority:** P0 - Critical

**Description:**
The STRICT_AUTH environment variable is not properly enforcing the restaurant_id requirement on JWT tokens, creating a security gap in multi-tenant isolation.

**Current Behavior:**
- STRICT_AUTH flag exists but doesn't enforce restaurant_id
- Test for this behavior is skipped

**Expected Behavior:**
- When STRICT_AUTH=true, tokens without restaurant_id should be rejected
- Test should pass and be enabled

**Files Affected:**
- `/server/tests/security/rbac.proof.test.ts` (Line 257-258)

**Test to Enable:**
```typescript
it.skip('should reject tokens without restaurant context', async () => {
  // TODO: Enable this test when STRICT_AUTH enforces restaurant_id requirement
```

**Related Issues:**
- Related to Issue #2 (restaurant_id enforcement)
- Part of broader RBAC security audit

**Estimated Effort:** 2-3 days

---

## HIGH PRIORITY ISSUES

### Issue #5: Implement real-time table status updates via Supabase channels

**Labels:** `enhancement`, `real-time`, `backend`, `websocket`

**Priority:** P1 - High

**Description:**
Phase 3 of table service implementation requires Supabase real-time event emission for table status changes. Currently, status updates are persisted but clients are not notified in real-time.

**Current State:**
Code commented out with TODO:
```typescript
// TODO: Phase 3 - Emit Supabase real-time event for status change
// This will notify all connected clients about the table status update
// await supabase.channel('tables').send({
//   type: 'broadcast',
//   event: 'table_status_updated',
//   payload: { table_id: tableId, status: 'paid', restaurant_id: restaurantId }
```

**Files Affected:**
- `/server/src/services/table.service.ts` (Lines 104-109)

**Implementation Requirements:**
- [ ] Setup Supabase channel for table events
- [ ] Emit event on table status change
- [ ] Include table_id, status, restaurant_id in payload
- [ ] Update client to listen for table_status_updated events
- [ ] Add error handling for channel failures
- [ ] Test multi-client synchronization

**Benefits:**
- Real-time UI updates across all connected clients
- Eliminates need for polling
- Improves user experience for multi-user environments

**Estimated Effort:** 3-5 days

---

### Issue #6: Implement kitchen display notifications for confirmed orders

**Labels:** `enhancement`, `orders`, `notifications`, `backend`

**Priority:** P1 - High

**Description:**
Order state machine has a hook registered for confirmed orders but the actual notification logic is not implemented. Kitchen displays should be notified when orders are confirmed.

**Current State:**
```typescript
OrderStateMachine.registerHook('*->confirmed', async (_transition, order) => {
  logger.info('Order confirmed, notifying kitchen', { orderId: order.id });
  // TODO: Send notification to kitchen display
});
```

**Files Affected:**
- `/server/src/services/orderStateMachine.ts` (Line 243-244)

**Implementation Requirements:**
- [ ] Design notification payload structure
- [ ] Implement WebSocket/real-time notification to KDS
- [ ] Add fallback for offline KDS
- [ ] Include order details (items, table, priority)
- [ ] Test with multiple kitchen displays
- [ ] Add notification queue for reliability

**Acceptance Criteria:**
- [ ] KDS receives real-time notification on order confirmation
- [ ] Notification includes full order context
- [ ] Failed notifications are retried
- [ ] Notifications respect restaurant multi-tenancy

**Estimated Effort:** 2-3 days

---

### Issue #7: Implement customer notifications for ready orders

**Labels:** `enhancement`, `orders`, `notifications`, `customer-experience`

**Priority:** P1 - High

**Description:**
When orders transition to 'ready' state, customers should receive notifications. Currently, the hook is registered but not implemented.

**Current State:**
```typescript
OrderStateMachine.registerHook('*->ready', async (_transition, order) => {
  logger.info('Order ready, notifying customer', { orderId: order.id });
  // TODO: Send notification to customer
});
```

**Files Affected:**
- `/server/src/services/orderStateMachine.ts` (Line 246-248)

**Implementation Requirements:**
- [ ] Determine notification channels (SMS, email, push, in-app)
- [ ] Integrate with notification service (Twilio, SendGrid, etc.)
- [ ] Create notification templates
- [ ] Add customer preference management
- [ ] Include order number, estimated pickup time
- [ ] Handle notification failures gracefully

**Notification Types:**
1. In-app notification (WebSocket)
2. SMS (for mobile orders)
3. Email (optional, for online orders)
4. Kiosk display update

**Acceptance Criteria:**
- [ ] Customers receive notification when order is ready
- [ ] Multiple notification channels supported
- [ ] Customer can opt-in/opt-out of channels
- [ ] Notification includes relevant order info

**Estimated Effort:** 2-3 days

---

### Issue #8: Implement automated refund processing for cancelled orders

**Labels:** `enhancement`, `orders`, `payments`, `backend`

**Priority:** P1 - High

**Description:**
When orders are cancelled, refunds should be processed automatically if payment was already made. Currently, this is logged but not implemented.

**Current State:**
```typescript
OrderStateMachine.registerHook('*->cancelled', async (_transition, order) => {
  logger.info('Order cancelled, processing refund', { orderId: order.id });
  // TODO: Process refund if payment was made
});
```

**Files Affected:**
- `/server/src/services/orderStateMachine.ts` (Line 251-253)

**Implementation Requirements:**
- [ ] Check if payment was made before cancellation
- [ ] Integrate with payment service (Square) refund API
- [ ] Calculate refund amount (full vs partial)
- [ ] Update order with refund status
- [ ] Create audit log entry for refund
- [ ] Send refund confirmation to customer
- [ ] Handle refund failures (retry logic)

**Edge Cases to Handle:**
- Partial refunds for partially fulfilled orders
- Refund failures (insufficient funds, expired cards)
- Manual review for high-value refunds
- Time limits on refunds (per payment processor)

**Security Requirements:**
- Require manager approval for refunds > $X
- Log all refund attempts to audit trail
- Per ADR-009: Audit log failures MUST block refund

**Acceptance Criteria:**
- [ ] Refunds processed automatically for cancelled paid orders
- [ ] Refund status tracked in order record
- [ ] Customers notified of refund
- [ ] Failed refunds flagged for manual intervention
- [ ] All refunds logged in audit trail

**Estimated Effort:** 2-3 days

---

### Issue #9: Implement cache clearing when switching between restaurants

**Labels:** `enhancement`, `multi-tenant`, `performance`, `frontend`

**Priority:** P1 - High

**Description:**
When switching between restaurants in a multi-tenant environment, cached data should be cleared to prevent data leakage and stale data issues.

**Current State:**
Test exists but not implemented:
```typescript
it('should clear cached data when switching restaurants', async () => {
  // TODO: Implement cache clearing logic when restaurant changes
  // This would involve clearing any in-memory caches, resetting WebSocket connections, etc.
  expect(true).toBe(true)
})
```

**Files Affected:**
- `/tests/e2e/multi-tenant.e2e.test.tsx` (Lines 322-326)

**Implementation Requirements:**
- [ ] Identify all caches that need clearing
  - Menu item cache
  - Order cache
  - Table layout cache
  - User preference cache
  - WebSocket connections
- [ ] Implement cache clearing function
- [ ] Reset WebSocket subscriptions
- [ ] Clear localStorage/sessionStorage selectively
- [ ] Trigger re-fetch of restaurant-specific data
- [ ] Update E2E test to verify clearing

**Security Impact:**
- Prevents data leakage between restaurants
- Ensures users only see data for current restaurant
- Critical for multi-tenant data isolation

**Acceptance Criteria:**
- [ ] All restaurant-specific caches cleared on switch
- [ ] WebSocket connections reset with new restaurant context
- [ ] No stale data from previous restaurant
- [ ] Test verifies cache clearing behavior

**Estimated Effort:** 3-5 days

---

### Issue #10: Forward metrics to DataDog/New Relic monitoring service

**Labels:** `enhancement`, `observability`, `production-ready`, `backend`

**Priority:** P1 - High

**Description:**
Client-side performance metrics are collected but not forwarded to external monitoring services. This is required for production observability.

**Current State:**
```typescript
// TODO: Forward to monitoring service (DataDog, New Relic, etc.)
// Example:
// await datadogClient.gauge('client.slow_renders', metrics.slowRenders);
// await datadogClient.gauge('client.slow_apis', metrics.slowAPIs);
```

**Files Affected:**
- `/server/src/routes/metrics.ts` (Lines 21-24)

**Implementation Requirements:**
- [ ] Choose monitoring service (DataDog vs New Relic)
- [ ] Install monitoring SDK
- [ ] Configure API keys/credentials
- [ ] Map metrics to monitoring service format
- [ ] Implement batch sending for efficiency
- [ ] Add error handling for monitoring failures
- [ ] Set up dashboards in monitoring service

**Metrics to Forward:**
- Slow renders count
- Slow API calls count
- Performance statistics
- Custom application metrics

**Configuration:**
- Only enable in production
- Make monitoring service configurable
- Support multiple environments (staging, prod)

**Acceptance Criteria:**
- [ ] Metrics forwarded to monitoring service
- [ ] Dashboards created for key metrics
- [ ] Alerts configured for anomalies
- [ ] No performance impact from monitoring

**Estimated Effort:** 3-5 days

---

### Issue #11: Add health checks for database, Redis, and AI services

**Labels:** `enhancement`, `observability`, `devops`, `backend`

**Priority:** P1 - High

**Description:**
Detailed health check endpoint exists but only checks server health. Database, Redis, and AI service checks need to be implemented.

**Current State:**
```typescript
const checks = {
  server: {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  },
  // TODO: Add database, Redis, and AI service checks
  // database: await checkDatabase(),
  // redis: await checkRedis(),
  // ai: await checkAIService(),
};
```

**Files Affected:**
- `/server/src/routes/metrics.ts` (Lines 56-59)

**Implementation Requirements:**

**Database Check:**
- [ ] Test database connection
- [ ] Run simple query (SELECT 1)
- [ ] Measure query latency
- [ ] Check connection pool status

**Redis Check:**
- [ ] Test Redis connection
- [ ] Run PING command
- [ ] Check memory usage
- [ ] Verify pub/sub working

**AI Service Check:**
- [ ] Check OpenAI API availability
- [ ] Verify API key valid
- [ ] Test simple completion
- [ ] Check rate limit status

**Response Format:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "redis": { "status": "healthy", "memory": "50MB" },
    "ai": { "status": "healthy", "quota": "80%" }
  }
}
```

**Acceptance Criteria:**
- [ ] All three services have health checks
- [ ] Failed checks don't crash endpoint
- [ ] Timeouts handled gracefully
- [ ] Results useful for debugging

**Estimated Effort:** 2-3 days

---

### Issue #12: Remove deprecated kiosk_demo role and backward compatibility code

**Labels:** `cleanup`, `deprecated`, `security`, `backend`

**Priority:** P1 - High

**Description:**
The `kiosk_demo` role has been deprecated in favor of the `customer` role, but backward compatibility code still exists in multiple locations. This code should be removed.

**Deprecated Code Locations:**
1. `/server/src/middleware/auth.ts` (Lines 77, 86)
2. `/server/src/middleware/rbac.ts` (Line 166)
3. `/client/src/config/demoCredentials.ts` (Line 92)
4. `/server/tests/routes/orders.auth.test.ts` (Line 228)

**Current Behavior:**
```typescript
logger.warn("⚠️ auth: role 'kiosk_demo' is deprecated; treating as 'customer'", {...});
// OR
throw Unauthorized("Role 'kiosk_demo' is deprecated. Use 'customer' instead.");
```

**Migration Steps:**
- [ ] Create migration guide for users of kiosk_demo role
- [ ] Update all test fixtures to use 'customer' role
- [ ] Remove backward compatibility code from auth middleware
- [ ] Remove backward compatibility code from RBAC middleware
- [ ] Remove deprecated references in config files
- [ ] Update documentation
- [ ] Create database migration to update existing kiosk_demo users

**Breaking Change Notice:**
This is a breaking change. Need to:
1. Announce deprecation 2 weeks before removal
2. Provide migration guide
3. Update any demo/seed data
4. Test with existing kiosk installations

**Acceptance Criteria:**
- [ ] No references to kiosk_demo in codebase
- [ ] Migration guide published
- [ ] All tests use 'customer' role
- [ ] Database migration tested

**Estimated Effort:** 2-3 days

---

## MEDIUM PRIORITY ISSUES

### Issue #13: Create /api/v1/analytics/performance server endpoint

**Labels:** `enhancement`, `analytics`, `backend`

**Priority:** P2 - Medium

**Description:**
Performance analytics are collected on the client but cannot be sent to the server because the endpoint doesn't exist yet.

**Current State:**
```typescript
// DISABLED: Analytics endpoint not yet implemented on server
// TODO: Re-enable when /api/v1/analytics/performance endpoint is created
```

**Files Affected:**
- `/client/src/services/monitoring/performance.ts` (Line 291)

**Endpoint Specification:**
```
POST /api/v1/analytics/performance
Content-Type: application/json

Body: {
  timestamp: ISO8601,
  slowRenders: number,
  slowAPIs: number,
  stats: {
    avgRenderTime: number,
    avgAPITime: number,
    ...
  }
}
```

**Implementation Requirements:**
- [ ] Create route handler
- [ ] Define request schema/validation
- [ ] Store metrics in database or forward to monitoring
- [ ] Add authentication
- [ ] Rate limit to prevent abuse
- [ ] Implement data retention policy

**Acceptance Criteria:**
- [ ] Endpoint accepts performance metrics
- [ ] Metrics validated before storage
- [ ] Client code re-enabled
- [ ] Metrics viewable in dashboard

**Estimated Effort:** 3-5 days

---

### Issue #14: Refactor station assignment from keyword matching to menu metadata

**Labels:** `refactor`, `technical-debt`, `kitchen`

**Priority:** P2 - Medium

**Description:**
Kitchen station assignment currently uses simple keyword matching on item names. This is fragile and should be moved to menu item metadata.

**Current Implementation:**
```typescript
// TODO: This should ideally come from the menu item metadata
// For now, we'll do simple keyword matching
const itemNameLower = item.name.toLowerCase()

for (const station of stations) {
  for (const category of station.categories) {
    if (itemNameLower.includes(category)) {
      return station
    }
  }
}
```

**Files Affected:**
- `/client/src/components/kitchen/StationStatusBar.tsx` (Lines 85-94)

**Problems with Current Approach:**
- Fails if item name doesn't contain category keyword
- Can't handle multi-station items
- No way to override default assignment
- Difficult to debug assignment issues

**Proposed Solution:**
Add `station_id` or `stations` field to menu items:
```typescript
{
  id: 'item-123',
  name: 'Burger',
  category: 'Entrees',
  station_id: 'grill',  // NEW
  // OR
  stations: ['grill', 'fry'],  // For items needing multiple stations
}
```

**Implementation Steps:**
- [ ] Add station fields to menu item schema
- [ ] Update menu item creation/editing UI
- [ ] Migrate existing menu items
- [ ] Update getItemStation to check metadata first
- [ ] Keep keyword matching as fallback
- [ ] Add admin UI to configure station mappings

**Acceptance Criteria:**
- [ ] Station assignment based on menu metadata
- [ ] Keyword matching used as fallback only
- [ ] All menu items have station assigned
- [ ] Admin can update station assignments

**Estimated Effort:** 2-3 days

---

### Issue #15: Implement cart item removal in MenuItemCard

**Labels:** `enhancement`, `cart`, `frontend`

**Priority:** P2 - Medium

**Description:**
Users can add items to cart but cannot remove them via the quantity selector in MenuItemCard. The decrement button only updates local state.

**Current State:**
```typescript
} else if (delta < 0 && localQuantity > 0) {
  // For now, just decrease local counter
  // TODO: Implement remove from cart functionality
  setLocalQuantity(prev => Math.max(0, prev - 1));
```

**Files Affected:**
- `/client/src/modules/order-system/components/MenuItemCard.tsx` (Lines 73-78)

**Expected Behavior:**
- Clicking minus (-) should decrease quantity in cart
- Reaching 0 should remove item from cart
- UI should update to reflect removal

**Implementation Requirements:**
- [ ] Add removeFromCart or updateQuantity to cart context
- [ ] Call cart update when quantity decreased
- [ ] Handle quantity reaching 0 (remove vs keep at 0)
- [ ] Update UI state after removal
- [ ] Add confirmation for last item removal
- [ ] Test with multiple items in cart

**Edge Cases:**
- What if cart update fails?
- Should we show confirmation before removal?
- Handle optimistic updates vs server confirmation

**Acceptance Criteria:**
- [ ] Minus button removes quantity from cart
- [ ] UI updates correctly on removal
- [ ] Cart total updates
- [ ] Reaching 0 removes item entirely

**Estimated Effort:** 1-2 days

---

### Issue #16: Implement checkout navigation in DriveThruPage

**Labels:** `enhancement`, `drive-thru`, `frontend`

**Priority:** P2 - Medium

**Description:**
Drive-through page is missing navigation to checkout or confirmation after order is placed.

**Current State:**
```typescript
// TODO: Navigate to checkout or confirmation
```

**Files Affected:**
- `/client/src/pages/DriveThruPage.tsx` (Line 71)

**Implementation Requirements:**
- [ ] Determine navigation flow (checkout vs confirmation)
- [ ] Add routing for next step
- [ ] Pass order data to next page
- [ ] Handle errors in navigation
- [ ] Add loading state during transition
- [ ] Test full drive-thru flow

**User Flow Options:**
1. **Direct to Confirmation:** Skip checkout, go straight to confirmation
2. **Checkout Page:** Allow review/modification before confirmation
3. **Payment Page:** Collect payment before confirmation

**Acceptance Criteria:**
- [ ] User can complete drive-thru order
- [ ] Navigation to next step works
- [ ] Order data preserved during navigation
- [ ] Back button works correctly

**Estimated Effort:** 1 day

---

### Issue #17: Add rate limit reset mechanism between security tests

**Labels:** `test`, `security`, `backend`

**Priority:** P2 - Medium

**Description:**
Security tests for rate limiting fail due to rate limit state persisting between tests. Need mechanism to reset rate limit state.

**Current State:**
```typescript
// TODO: Test requires rate limit reset between tests
```

**Files Affected:**
- `/server/src/routes/__tests__/security.test.ts` (Lines 244, 256)

**Problem:**
- Tests run in sequence
- Rate limit state persists between tests
- Second test hits rate limit from first test
- Tests fail intermittently depending on order

**Possible Solutions:**
1. Add reset method to rate limiter service
2. Use different IPs/clients for each test
3. Mock rate limiter in tests
4. Increase rate limit for test environment
5. Add delay between tests (not ideal)

**Implementation:**
- [ ] Add `reset()` method to rate limiter
- [ ] Call reset in test setup/teardown
- [ ] Verify tests run in isolation
- [ ] Document rate limit testing approach

**Acceptance Criteria:**
- [ ] Security tests pass consistently
- [ ] Tests don't affect each other
- [ ] Rate limit testing documented

**Estimated Effort:** 1-2 days

---

## LOW PRIORITY ISSUES

### Issue #18: Extract server and section data from order metadata

**Labels:** `enhancement`, `orders`, `frontend`

**Priority:** P3 - Low

**Description:**
Order grouping should extract server name and section from order metadata instead of hardcoding or omitting.

**Current State:**
```typescript
// TODO: Extract server and section from order metadata if available
// tableGroup.serverName = order.metadata?.serverName
// tableGroup.section = order.metadata?.section
```

**Files Affected:**
- `/client/src/hooks/useTableGrouping.ts` (Lines 101-103)

**Benefits:**
- Better organization of orders by server
- Section-based filtering in kitchen display
- Improved reporting capabilities

**Implementation:**
- [ ] Ensure order metadata includes serverName and section
- [ ] Uncomment extraction code
- [ ] Add fallback for missing metadata
- [ ] Update UI to display server/section
- [ ] Test with various order types

**Estimated Effort:** 1-2 days

---

### Issue #19: Integrate MemoryMonitorInstance API in ExpoPage

**Labels:** `enhancement`, `performance`, `monitoring`

**Priority:** P3 - Low

**Description:**
Expo page should integrate memory monitoring for long-running sessions but API is not yet available.

**Current State:**
```typescript
// TODO: Implement memory monitoring when MemoryMonitorInstance API is available
// const memoryMonitor = MemoryMonitorInstance
// memoryMonitor.configure({...})
```

**Files Affected:**
- `/client/src/pages/ExpoPage.tsx` (Lines 141-143)

**Implementation:**
- [ ] Verify MemoryMonitorInstance API exists
- [ ] Configure memory thresholds for expo
- [ ] Add memory warning UI
- [ ] Implement auto-refresh on high memory
- [ ] Test with long-running session

**Estimated Effort:** 1-2 days

---

### Issue #20: Remove @ts-ignore suppressions and add proper type definitions

**Labels:** `refactor`, `typescript`, `code-quality`

**Priority:** P3 - Low

**Description:**
Multiple test files use `@ts-ignore` or `@ts-expect-error` to bypass TypeScript checking. Should add proper type definitions instead.

**Locations (11 total):**
- WebSocket mocking (1)
- Performance API - Chrome-specific (7)
- Lighthouse API (3)

**Files:**
- `/client/src/services/websocket/WebSocketService.test.ts` (Line 115)
- `/tests/e2e/websocket-service.e2e.test.ts` (Lines 13, 20, 73)
- `/tests/performance/lighthouse.spec.ts` (Lines 152, 154)
- `/tests/performance/ordering-performance.spec.ts` (Lines 87, 90, 92, 94, 203, 222)

**Solution:**
- [ ] Create type definitions for WebSocket mocks
- [ ] Add Chrome performance API types
- [ ] Add Lighthouse types
- [ ] Remove all @ts-ignore comments
- [ ] Verify builds pass

**Estimated Effort:** 2-3 days

---

### Issue #21: Make restaurant ID configurable in seed-menu-mapped script

**Labels:** `enhancement`, `developer-experience`, `backend`

**Priority:** P3 - Low

**Description:**
Seed script has restaurant ID hardcoded, should be configurable via environment variable or command line argument.

**Current State:**
```typescript
// TODO: replace with your real restaurant id if different
```

**Files Affected:**
- `/server/scripts/seed-menu-mapped.ts` (Line 17)

**Implementation:**
- [ ] Read restaurant ID from env var
- [ ] Accept as CLI argument
- [ ] Provide helpful error if not set
- [ ] Update documentation

**Estimated Effort:** 0.5 days

---

## TEST-ONLY ISSUES

### Issue #22: Re-enable or remove skipped basic route tests

**Labels:** `test`, `e2e`, `frontend`

**Files:** `/tests/e2e/basic-routes.spec.ts` (Lines 33, 48, 63)

**Estimated Effort:** 1 day

---

### Issue #23: Investigate and fix voice control E2E test

**Labels:** `test`, `e2e`, `voice-ordering`

**Files:** `/tests/e2e/voice-control.e2e.test.ts` (Line 47)

**Estimated Effort:** 2-3 days

---

### Issue #24: Re-enable kitchen display smoke test

**Labels:** `test`, `e2e`, `kitchen`

**Files:** `/tests/e2e/kds/kitchen-display.smoke.spec.ts` (Line 65)

**Estimated Effort:** 1 day

---

### Issue #25: Enable demo panel tests in CI environment

**Labels:** `test`, `e2e`, `ci`

**Files:** `/tests/e2e/workspace-landing.spec.ts` (7 tests)

**Estimated Effort:** 1-2 days

---

### Issue #26: Fix AuthContext concurrent refresh test timeout

**Labels:** `test`, `unit`, `authentication`

**Files:** `/client/src/contexts/__tests__/AuthContext.test.tsx` (Line 128)

**Estimated Effort:** 1-2 days

---

## Summary Statistics

**Total Issues: 26**

**By Priority:**
- P0 Critical: 4 issues (9-14 days)
- P1 High: 8 issues (18-29 days)
- P2 Medium: 6 issues (13-21 days)
- P3 Low: 3 issues (4.5-7.5 days)
- Tests: 5 issues (6-10 days)

**Total Estimated Effort: 51-82 days**

**By Category:**
- Security: 4 issues
- Features: 9 issues
- Cleanup: 3 issues
- Tests: 6 issues
- Refactoring: 4 issues

**Labels Used:**
`critical`, `security`, `bug`, `enhancement`, `cleanup`, `test`, `frontend`, `backend`, `authentication`, `multi-tenant`, `orders`, `notifications`, `real-time`, `websocket`, `observability`, `performance`, `monitoring`, `technical-debt`, `deprecated`, `production-ready`, `developer-experience`, `code-quality`, `typescript`, `e2e`, `unit`, `ci`, `cart`, `drive-thru`, `kitchen`, `analytics`, `voice-ordering`
