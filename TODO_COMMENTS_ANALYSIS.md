# TODO/FIXME Comments Analysis Report

Generated: 2025-11-07

## Executive Summary

This report catalogs all TODO, FIXME, and related markers found in the codebase that should be tracked as GitHub issues. The analysis covers:
- 30+ actionable TODO comments
- 18 skipped tests requiring investigation
- 6 deprecated features needing cleanup
- 2 temporary debug code blocks
- Multiple security and performance concerns

**Total Issues to Track: 45+**

---

## 1. CRITICAL BUGS (Priority: Critical)

### 1.1 Authentication Test Failures
**Files:** `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/routes/orders.auth.test.ts`

**Issue Count:** 5 skipped tests

**Description:**
Multiple authentication tests are skipped due to consistent 403 Forbidden responses instead of expected 201 Created status codes.

**Details:**
- Lines 162-180: Customer role cannot create orders (403 instead of 201)
- Lines 184-202: Server role cannot create orders (403 instead of 201)
- Lines 206-228: kiosk_demo role not accepted even with flag enabled (403 instead of 201)
- Lines 260-293: X-Client-Flow header capture tests skipped
- Lines 397+: Complete order flow integration tests skipped

**Suggested Issue Title:**
"Critical: Authentication middleware blocking valid order creation requests"

**Estimated Effort:** 3-5 days
**Impact:** High - Blocks multiple user roles from creating orders

---

### 1.2 RBAC Token Validation
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/security/rbac.proof.test.ts`

**Issue Count:** 1 skipped test

**Description:**
Line 257-258: STRICT_AUTH not enforcing restaurant_id requirement on tokens

**Details:**
```typescript
it.skip('should reject tokens without restaurant context', async () => {
  // TODO: Enable this test when STRICT_AUTH enforces restaurant_id requirement
```

**Suggested Issue Title:**
"Security: STRICT_AUTH flag not enforcing restaurant_id token requirement"

**Estimated Effort:** 2-3 days
**Impact:** High - Security vulnerability in multi-tenant isolation

---

### 1.3 Test Timing Issue
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/contexts/__tests__/AuthContext.test.tsx`

**Issue Count:** 1 skipped test

**Description:**
Line 128-129: Test timing out after 30 seconds (pre-existing failure)

**Details:**
```typescript
test.skip('should prevent concurrent refresh attempts with latch', async () => {
  // TODO: Test timing out after 30s - pre-existing failure
```

**Suggested Issue Title:**
"Test: AuthContext concurrent refresh test timing out after 30s"

**Estimated Effort:** 1-2 days
**Impact:** Medium - Test coverage gap for race condition handling

---

## 2. MISSING FEATURES (Priority: High)

### 2.1 Real-time Event Emission
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/table.service.ts`

**Issue Count:** 1

**Description:**
Line 104-109: Phase 3 - Supabase real-time event for table status changes not implemented

**Details:**
```typescript
// TODO: Phase 3 - Emit Supabase real-time event for status change
// This will notify all connected clients about the table status update
// await supabase.channel('tables').send({
//   type: 'broadcast',
//   event: 'table_status_updated',
//   payload: { table_id: tableId, status: 'paid', restaurant_id: restaurantId }
```

**Suggested Issue Title:**
"Feature: Implement real-time table status updates via Supabase channels"

**Estimated Effort:** 3-5 days
**Impact:** High - Required for real-time UI updates across clients

---

### 2.2 Order State Machine Notifications
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orderStateMachine.ts`

**Issue Count:** 3 missing implementations

**Description:**
Lines 243-253: Notification system hooks registered but not implemented

**Details:**
```typescript
// Line 243: TODO: Send notification to kitchen display
// Line 248: TODO: Send notification to customer
// Line 253: TODO: Process refund if payment was made
```

**Suggested Issue Titles:**
1. "Feature: Implement kitchen display notifications for confirmed orders"
2. "Feature: Implement customer notifications for ready orders"
3. "Feature: Implement automated refund processing for cancelled orders"

**Estimated Effort:** 5-8 days total (2-3 days each)
**Impact:** High - Core order workflow functionality

---

### 2.3 Analytics Performance Endpoint
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/monitoring/performance.ts`

**Issue Count:** 1

**Description:**
Line 291: Analytics endpoint disabled because server endpoint doesn't exist

**Details:**
```typescript
// DISABLED: Analytics endpoint not yet implemented on server
// TODO: Re-enable when /api/v1/analytics/performance endpoint is created
```

**Suggested Issue Title:**
"Feature: Create /api/v1/analytics/performance server endpoint"

**Estimated Effort:** 3-5 days
**Impact:** Medium - Required for production performance monitoring

---

### 2.4 Monitoring Service Integration
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/metrics.ts`

**Issue Count:** 2

**Description:**
Missing integrations with external monitoring services

**Details:**
```typescript
// Line 21: TODO: Forward to monitoring service (DataDog, New Relic, etc.)
// Line 56: TODO: Add database, Redis, and AI service checks
```

**Suggested Issue Titles:**
1. "Integration: Forward metrics to DataDog/New Relic monitoring service"
2. "Feature: Add health checks for database, Redis, and AI services"

**Estimated Effort:** 5-8 days total
**Impact:** High - Required for production observability

---

### 2.5 Remove from Cart Functionality
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/order-system/components/MenuItemCard.tsx`

**Issue Count:** 1

**Description:**
Line 74: Cart removal functionality not implemented

**Details:**
```typescript
// TODO: Implement remove from cart functionality
```

**Suggested Issue Title:**
"Feature: Implement cart item removal in MenuItemCard"

**Estimated Effort:** 1-2 days
**Impact:** Medium - User experience limitation

---

### 2.6 Multi-tenant Cache Management
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/multi-tenant.e2e.test.tsx`

**Issue Count:** 1

**Description:**
Line 323: Cache clearing logic needed when switching restaurants

**Details:**
```typescript
// TODO: Implement cache clearing logic when restaurant changes
// This would involve clearing any in-memory caches, resetting WebSocket connections, etc.
```

**Suggested Issue Title:**
"Feature: Implement cache clearing when switching between restaurants"

**Estimated Effort:** 3-5 days
**Impact:** High - Critical for multi-tenant data isolation

---

## 3. TECHNICAL DEBT (Priority: Medium)

### 3.1 Menu Item Station Assignment
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kitchen/StationStatusBar.tsx`

**Issue Count:** 1

**Description:**
Line 85-86: Station assignment uses keyword matching instead of menu metadata

**Details:**
```typescript
// TODO: This should ideally come from the menu item metadata
// For now, we'll do simple keyword matching
```

**Suggested Issue Title:**
"Refactor: Move station assignment from keyword matching to menu metadata"

**Estimated Effort:** 2-3 days
**Impact:** Medium - Current implementation fragile and error-prone

---

### 3.2 Order Metadata Extraction
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/hooks/useTableGrouping.ts`

**Issue Count:** 1

**Description:**
Line 101-103: Server and section info should come from order metadata

**Details:**
```typescript
// TODO: Extract server and section from order metadata if available
// tableGroup.serverName = order.metadata?.serverName
// tableGroup.section = order.metadata?.section
```

**Suggested Issue Title:**
"Enhancement: Extract server and section data from order metadata"

**Estimated Effort:** 1-2 days
**Impact:** Low - Nice to have feature

---

### 3.3 Memory Monitoring Integration
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/ExpoPage.tsx`

**Issue Count:** 1

**Description:**
Line 141-143: Memory monitoring API not available

**Details:**
```typescript
// TODO: Implement memory monitoring when MemoryMonitorInstance API is available
// const memoryMonitor = MemoryMonitorInstance
// memoryMonitor.configure({...})
```

**Suggested Issue Title:**
"Feature: Integrate MemoryMonitorInstance API in ExpoPage"

**Estimated Effort:** 1-2 days
**Impact:** Low - Performance optimization

---

### 3.4 Drive Thru Navigation
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/DriveThruPage.tsx`

**Issue Count:** 1

**Description:**
Line 71: Navigation to checkout/confirmation not implemented

**Details:**
```typescript
// TODO: Navigate to checkout or confirmation
```

**Suggested Issue Title:**
"Feature: Implement checkout navigation in DriveThruPage"

**Estimated Effort:** 1 day
**Impact:** Medium - Incomplete user flow

---

### 3.5 Rate Limit Test Isolation
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/__tests__/security.test.ts`

**Issue Count:** 2

**Description:**
Lines 244, 256: Tests require rate limit reset between runs

**Details:**
```typescript
// TODO: Test requires rate limit reset between tests
```

**Suggested Issue Title:**
"Test: Add rate limit reset mechanism between security tests"

**Estimated Effort:** 1-2 days
**Impact:** Low - Test reliability issue

---

### 3.6 Menu Seeding Script
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/scripts/seed-menu-mapped.ts`

**Issue Count:** 1

**Description:**
Line 17: Restaurant ID hardcoded

**Details:**
```typescript
// TODO: replace with your real restaurant id if different
```

**Suggested Issue Title:**
"Refactor: Make restaurant ID configurable in seed-menu-mapped script"

**Estimated Effort:** 0.5 days
**Impact:** Low - Developer experience improvement

---

## 4. DEPRECATED CODE (Priority: High - Remove)

### 4.1 kiosk_demo Role Deprecation
**Files:**
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts` (Line 77, 86)
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/rbac.ts` (Line 166)
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/config/demoCredentials.ts` (Line 92)

**Issue Count:** 4 locations

**Description:**
The `kiosk_demo` role is deprecated in favor of `customer` role, but backward compatibility code still exists

**Suggested Issue Title:**
"Cleanup: Remove deprecated kiosk_demo role and backward compatibility code"

**Estimated Effort:** 2-3 days (includes migration guide)
**Impact:** Medium - Code clarity and security

---

## 5. TEMPORARY DEBUG CODE (Priority: High - Remove)

### 5.1 Auto-fill Demo Data
**Files:**
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/CheckoutPage.tsx` (Line 30-34)
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kiosk/KioskCheckoutPage.tsx` (Line 127-132)

**Issue Count:** 2 locations

**Description:**
Demo customer data auto-filled for faster testing - should be removed or gated by feature flag

**Details:**
```typescript
// TEMPORARY DEBUG: Auto-fill demo data for faster testing (remove when done debugging)
const DEMO_CUSTOMER_DATA = {
  email: 'demo@example.com',
  phone: '(555) 555-1234',
};
```

**Suggested Issue Title:**
"Cleanup: Remove temporary auto-fill debug data from checkout pages"

**Estimated Effort:** 0.5 days
**Impact:** High - Could cause production issues if deployed

---

## 6. SKIPPED TESTS (Priority: Medium)

### 6.1 Demo Panel Tests
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/workspace-landing.spec.ts`

**Issue Count:** 7 tests

**Description:**
Lines 113, 121, 137, 154, 180, 208, 229: Tests skipped when VITE_DEMO_PANEL not enabled

**Suggested Issue Title:**
"Test: Enable demo panel tests in CI environment"

**Estimated Effort:** 1-2 days
**Impact:** Low - Test coverage gap

---

### 6.2 Basic Routes Tests
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/basic-routes.spec.ts`

**Issue Count:** 3 tests

**Description:**
Lines 33, 48, 63: Basic route tests unconditionally skipped

**Suggested Issue Title:**
"Test: Re-enable or remove skipped basic route tests"

**Estimated Effort:** 1 day
**Impact:** Medium - Core functionality not tested

---

### 6.3 Voice Control Test
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/voice-control.e2e.test.ts`

**Issue Count:** 1 test

**Description:**
Line 47: Voice control test skipped

**Suggested Issue Title:**
"Test: Investigate and fix voice control E2E test"

**Estimated Effort:** 2-3 days
**Impact:** Medium - Voice ordering feature not tested

---

### 6.4 Kitchen Display Smoke Test
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/kds/kitchen-display.smoke.spec.ts`

**Issue Count:** 1 test

**Description:**
Line 65: Kitchen display smoke test skipped

**Suggested Issue Title:**
"Test: Re-enable kitchen display smoke test"

**Estimated Effort:** 1 day
**Impact:** Medium - KDS not verified in E2E tests

---

### 6.5 Lighthouse Performance Tests
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/tests/performance/lighthouse.spec.ts`

**Issue Count:** 1 test

**Description:**
Line 9: Lighthouse tests only run on Chromium

**Suggested Issue Title:**
"Test: Document Chromium-only requirement for Lighthouse tests"

**Estimated Effort:** 0.5 days
**Impact:** Low - Already working as designed

---

## 7. SECURITY CONCERNS

### 7.1 Tokens Without restaurant_id
**File:** `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/security/auth.proof.test.ts`

**Issue Count:** 1 warning

**Description:**
Line 156: Tokens without restaurant_id being accepted - security risk

**Suggested Issue Title:**
"Security: Enforce restaurant_id requirement in all authentication tokens"

**Estimated Effort:** 3-5 days
**Impact:** Critical - Multi-tenant security vulnerability

---

## 8. PERFORMANCE ISSUES

### 8.1 TypeScript Suppressions
**File:** Multiple test files

**Issue Count:** 11 @ts-ignore/@ts-expect-error comments

**Description:**
Type safety bypassed in test files, particularly for:
- WebSocket mocking
- Performance API (Chrome-specific)
- Lighthouse API access

**Files:**
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/WebSocketService.test.ts` (Line 115)
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/websocket-service.e2e.test.ts` (Lines 13, 20, 73)
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/performance/lighthouse.spec.ts` (Lines 152, 154)
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/performance/ordering-performance.spec.ts` (Lines 87, 90, 92, 94, 203, 222)

**Suggested Issue Title:**
"Refactor: Remove @ts-ignore suppressions and add proper type definitions"

**Estimated Effort:** 2-3 days
**Impact:** Low - Code quality improvement

---

## Summary by Priority

### Critical (Address Immediately)
1. Authentication test failures (5 tests) - **3-5 days**
2. RBAC token validation - **2-3 days**
3. Multi-tenant security (restaurant_id) - **3-5 days**
4. Remove temporary debug code (2 locations) - **0.5 days**

**Total Critical: 9-14 days**

### High (Next Sprint)
1. Real-time event emission - **3-5 days**
2. Order state machine notifications (3 features) - **5-8 days**
3. Multi-tenant cache management - **3-5 days**
4. Monitoring service integration (2 features) - **5-8 days**
5. Deprecated code cleanup - **2-3 days**

**Total High: 18-29 days**

### Medium (Backlog)
1. Analytics performance endpoint - **3-5 days**
2. Menu item station assignment - **2-3 days**
3. Remove from cart functionality - **1-2 days**
4. Drive thru navigation - **1 day**
5. Skipped tests (15 tests) - **5-8 days**
6. Rate limit test isolation - **1-2 days**

**Total Medium: 13-21 days**

### Low (Nice to Have)
1. Order metadata extraction - **1-2 days**
2. Memory monitoring integration - **1-2 days**
3. TypeScript suppressions - **2-3 days**
4. Menu seeding script - **0.5 days**

**Total Low: 4.5-7.5 days**

---

## Top 10 Most Important Issues to Track

1. **Critical: Authentication middleware blocking valid order creation requests** (Critical)
   - Effort: 3-5 days | Impact: Blocks core functionality

2. **Security: Enforce restaurant_id requirement in all authentication tokens** (Critical)
   - Effort: 3-5 days | Impact: Multi-tenant security vulnerability

3. **Feature: Implement kitchen display notifications for confirmed orders** (High)
   - Effort: 2-3 days | Impact: Core order workflow

4. **Feature: Implement customer notifications for ready orders** (High)
   - Effort: 2-3 days | Impact: Core order workflow

5. **Feature: Implement automated refund processing for cancelled orders** (High)
   - Effort: 2-3 days | Impact: Financial operations

6. **Feature: Implement real-time table status updates via Supabase channels** (High)
   - Effort: 3-5 days | Impact: Real-time UI functionality

7. **Feature: Implement cache clearing when switching between restaurants** (High)
   - Effort: 3-5 days | Impact: Multi-tenant data isolation

8. **Integration: Forward metrics to DataDog/New Relic monitoring service** (High)
   - Effort: 3-5 days | Impact: Production observability

9. **Cleanup: Remove temporary auto-fill debug data from checkout pages** (Critical)
   - Effort: 0.5 days | Impact: Could cause production issues

10. **Cleanup: Remove deprecated kiosk_demo role and backward compatibility code** (High)
    - Effort: 2-3 days | Impact: Code security and clarity

---

## Recommended Action Plan

### Week 1-2 (Critical Items)
- Fix authentication test failures
- Enforce restaurant_id in tokens
- Remove temporary debug code
- Security audit of authentication flow

### Week 3-4 (High Priority Features)
- Implement order state machine notifications
- Add real-time table status updates
- Setup monitoring service integration
- Implement multi-tenant cache management

### Week 5-6 (High Priority Cleanup)
- Remove deprecated kiosk_demo role
- Create analytics performance endpoint
- Fix skipped critical tests

### Week 7-8 (Medium Priority)
- Refactor station assignment logic
- Complete cart functionality
- Enable remaining E2E tests
- Add health check endpoints

### Ongoing (Low Priority)
- Type safety improvements
- Developer experience enhancements
- Documentation updates

---

## Notes

- All file paths are absolute paths from `/Users/mikeyoung/CODING/rebuild-6.0/`
- Effort estimates are for a single developer
- Many issues can be worked in parallel
- Some issues may uncover additional work when investigated
- Test failures should be prioritized as they may indicate production bugs
