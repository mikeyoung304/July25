# Restaurant OS Recovery Plan - September 16 AM Scan
## Single Source of Truth for Production Readiness

**Document Version**: 1.0
**Created**: September 16, 2025
**Status**: ACTIVE - Recovery Sprint In Progress
**Current Health**: 5.2/10 ⚠️
**Target Health**: 8.5/10 (Production Ready)
**Timeline**: 5-day sprint + optional weekend

---

## 🚨 EXECUTIVE SUMMARY

The Restaurant OS is **NOT production-ready**. An overnight audit on January 15, 2025 revealed critical blockers that prevent ANY orders from being created. The system has good architectural bones (unified auth, single voice implementation, no circular dependencies) but requires immediate fixes to function.

### Critical Facts:
- **Order Creation**: 100% failure rate due to validation schema bugs
- **Memory Leaks**: System crashes after 4-6 hours (20-30MB per voice session)
- **Test Coverage**: 18.4% failure rate (58/316 tests failing)
- **Security Gaps**: Missing RLS on critical tables (orders, menu_items, restaurants)
- **Technical Debt**: 41 orphaned files, 100+ unused packages, 560 TypeScript errors

### Path to Production:
```
Current (5.2/10) → Day 1 Fix Blockers (6.5/10) → Day 5 Secure (7.5/10) → Week 2 Ready (8.5/10)
```

---

## 📊 SYSTEM HEALTH SCORECARD

| Category | Score | Status | Critical Issues |
|----------|-------|--------|-----------------|
| **Runtime** | 3/10 | 🔴 | Validation rejects orders, memory leaks, missing handlers |
| **Security** | 6/10 | 🟡 | Missing RLS, unprotected webhooks, debug in prod |
| **Tests** | 2/10 | 🔴 | 18% failures, no integration tests, missing deps |
| **Auth** | 7/10 | 🟢 | HTTP↔WS parity good, some gaps remain |
| **Payments** | 4/10 | 🔴 | Split payment UI completely missing |
| **Performance** | 6/10 | 🟡 | Bundle 109KB (target 100KB), memory leaks |
| **TypeScript** | 4/10 | 🔴 | 560 errors, validation schemas incomplete |
| **Docs** | 3/10 | 🔴 | 73 stale files, ADR conflicts |
| **Observability** | 1/10 | 🔴 | No monitoring, minimal logging |

---

## 🔴 CRITICAL BLOCKERS (Must Fix Immediately)

### 1. Order Validation Broken - ALL Orders Fail
**Impact**: 100% order failure rate
**Location**: Two validators both missing statuses
```typescript
// Zod: /shared/types/validation.ts:92
orderStatus: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])
// MISSING: 'new' status

// Joi: /server/src/models/order.model.ts:45
status: Joi.string().valid('pending', 'preparing', 'ready', 'completed', 'cancelled')
// MISSING: 'new' and 'confirmed' statuses
```
**Fix Time**: 15 minutes
**PR**: `fix/order-status-validation-schemas`

### 2. KDS Will Crash - Missing Status Handlers
**Impact**: Runtime errors, ErrorBoundary failures
**Locations**:
- `client/src/components/station/StationStatusBar.tsx:45` - Missing 'cancelled'
- `client/src/hooks/useTableGrouping.tsx` - Missing 'new', 'pending', 'cancelled'
- Multiple components lack default/fallback cases
**Fix Time**: 30 minutes
**PR**: `fix/kds-exhaustive-status-handlers`

### 3. Memory Leaks - Crashes After 4-6 Hours
**Impact**: Kiosk/KDS terminals require daily restarts
**Evidence**: 12 useEffect hooks missing cleanup
- WebSocket event listeners not removed
- WebRTC peer connections not disposed
- Callbacks causing reconnection churn
**Fix Time**: 3 hours
**PR**: `fix/websocket-memory-cleanup-with-soak`

### 4. Restaurant ID Bypass - Multi-tenant Data Leak
**Impact**: Orders assigned to wrong restaurant
**Location**: `client/src/hooks/kiosk/useOrderSubmission.ts:59`
```typescript
// WRONG: Uses environment variable
const restaurantId = process.env.REACT_APP_RESTAURANT_ID

// CORRECT: Should use context
const { restaurantId } = useRestaurantContext()
```
**Fix Time**: 45 minutes
**PR**: `fix/kiosk-use-context-not-env`

### 5. Node Crypto in Client - Build Failures
**Impact**: Production builds fail in browser
**Location**: `client/src/utils/crypto.ts`
```typescript
// WRONG: Node.js crypto
import crypto from 'crypto'

// CORRECT: Web Crypto API
const crypto = window.crypto || globalThis.crypto
```
**Fix Time**: 1 hour
**PR**: `fix/client-webcrypto-isomorphic`

---

## 📅 5-DAY RECOVERY PLAN

### Day 1: Stop The Bleeding (Monday - 4.5 hours)

#### 1.1 Fix Validation Schemas (15 min) 🔴
```typescript
// Fix both validators to include all 7 statuses:
// 'new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'

// Zod: /shared/types/validation.ts:92
orderStatus: z.enum(['new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])

// Joi: /server/src/models/order.model.ts:45
status: Joi.string().valid('new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')
```

#### 1.2 Fix KDS Status Handlers (30 min) 🔴
```typescript
// Add exhaustive status handling with assertNever pattern:
function handleStatus(status: OrderStatus) {
  switch(status) {
    case 'new': return handleNew()
    case 'pending': return handlePending()
    case 'confirmed': return handleConfirmed()
    case 'preparing': return handlePreparing()
    case 'ready': return handleReady()
    case 'completed': return handleCompleted()
    case 'cancelled': return handleCancelled()
    default:
      return assertNever(status) // TypeScript will error if case missing
  }
}
```

#### 1.3 Fix Memory Leaks (3 hours) 🔴
```typescript
// Create shared cleanup helper:
// /shared/utils/cleanup-helpers.ts
export function useCleanupEffect(effect: () => (() => void) | void, deps: any[]) {
  useEffect(() => {
    const cleanup = effect()
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  }, deps)
}

// Fix callbacks with ref pattern:
const onEventRef = useRef(onEvent)
useEffect(() => {
  onEventRef.current = onEvent
}, [onEvent])

useEffect(() => {
  const handler = (data) => onEventRef.current?.(data)
  socket.on('event', handler)
  return () => socket.off('event', handler)
}, []) // Stable deps only!
```
**Verification**: 30-minute soak test showing <5MB/hour growth

#### 1.4 Enforce Restaurant ID (45 min) 🔴
```typescript
// Server middleware: /server/src/middleware/auth.ts
export const requireRestaurantId = (req, res, next) => {
  const restaurantId = req.headers['x-restaurant-id'] || req.user?.restaurant_id

  if (!restaurantId) {
    return res.status(400).json({
      error: 'restaurant_id required',
      code: 'MISSING_RESTAURANT_ID'
    })
  }

  req.restaurantId = restaurantId
  next()
}

// Apply to ALL write endpoints
router.post('/orders', authenticate, requireRestaurantId, createOrder)
```

#### 1.5 Fix Kiosk Context (30 min) 🔴
```typescript
// /client/src/hooks/kiosk/useOrderSubmission.ts:59
const { restaurantId } = useRestaurantContext() // NOT process.env
if (!restaurantId) {
  throw new Error('Restaurant context required for kiosk orders')
}
```

### Day 2: Security & Build (Tuesday - 5 hours)

#### 2.1 Webhook Security (2 hours) 🟡
```typescript
// /server/src/middleware/webhook-auth.ts
export const validateWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-webhook-signature']
  const timestamp = req.headers['x-webhook-timestamp']
  const secret = process.env.WEBHOOK_SECRET

  const payload = `${timestamp}.${JSON.stringify(req.body)}`
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Check timestamp is within 5 minutes
  if (Date.now() - parseInt(timestamp) > 300000) {
    return res.status(401).json({ error: 'Request too old' })
  }

  next()
}
```

#### 2.2 Web Crypto Fix (1 hour) 🟡
```typescript
// /client/src/utils/crypto.ts
const getWebCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto
  }
  throw new Error('Web Crypto API not available')
}

export async function sha256(message: string): Promise<string> {
  const crypto = getWebCrypto()
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
```

#### 2.3 Auth Parity Documentation (1 hour) 🟡
```markdown
## Auth Flow Verification

### HTTP Flow:
1. Request → authenticate middleware → AuthenticationService.validateToken()
2. Token extracted from Authorization header or cookie
3. Validated against Supabase/JWT

### WebSocket Flow:
1. Connection → verifyWebSocketAuth → AuthenticationService.validateToken()
2. Token from handshake auth header
3. Same validation as HTTP

### Proof of Parity:
- Both paths use identical validateToken() method
- No demo/test bypasses in production (NODE_ENV check)
- Test tokens explicitly rejected in both flows
```

#### 2.4 Bundle Optimization (1 hour) 🟢
```typescript
// Lazy load admin routes:
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Analytics = lazy(() => import('./pages/Analytics'))

// Target: Main chunk ≤100KB gzipped
// Current: 109KB → Target: <100KB
```

### Day 3: Cleanup & Testing (Wednesday - 5 hours)

#### 3.1 Quarantine Orphans (1.5 hours) 🟢
```bash
# Phase 1: Quarantine
mkdir -p _archive/orphans/
mv client/src/__tests__/e2e/floor-plan.e2e.test.ts _archive/orphans/
mv client/src/components/errors/PaymentErrorBoundary.tsx _archive/orphans/
# ... 39 more files

# Phase 2: Test build
npm run build
npm run dev # Manual test

# Phase 3: Delete (separate commit)
rm -rf _archive/orphans/
```

#### 3.2 Fix Tests (2.5 hours) 🟡
```bash
# Install missing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event

# Fix Vitest compatibility
# Replace jest. with vi. (3 occurrences)
# Fix OrderService tests (8 failures)

# Target: ≥80% pass rate
```

#### 3.3 Remove Unused Packages (1 hour) 🟢
```bash
# Run depcheck first
npx depcheck

# Confirmed unused (safe to remove):
npm uninstall dayjs hono @commitlint/cli @commitlint/config-conventional

# Verify with code search before removing others
# Keep backup of package-lock.json
```

### Day 4: Database Security (Thursday - 4 hours)

#### 4.1 RLS Policies 🟡
```sql
-- Orders table
CREATE POLICY orders_tenant_isolation ON orders
  USING (restaurant_id = current_setting('app.restaurant_id')::uuid);

-- Menu items table
CREATE POLICY menu_tenant_isolation ON menu_items
  USING (restaurant_id = current_setting('app.restaurant_id')::uuid);

-- Restaurants table
CREATE POLICY restaurant_access ON restaurants
  USING (id = current_setting('app.restaurant_id')::uuid);

-- Test with non-service role to verify enforcement
```

### Day 5: Architecture (Friday - 6 hours)

#### 5.1 Centralize Transforms (4 hours) 🟢
```typescript
// /shared/utils/api-transforms.ts
export const toSnakeCase = (obj: any): any => {
  // Centralized camelCase → snake_case
}

export const toCamelCase = (obj: any): any => {
  // Centralized snake_case → camelCase
}

// Apply ONLY at API boundaries:
// - Request/response interceptors
// - WebSocket message handlers
// NOT in business logic
```

#### 5.2 Observability Lite (2 hours) 🟡
```typescript
// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  })
})

// Structured logging
import pino from 'pino'
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    bindings: (bindings) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      service: 'restaurant-os'
    })
  }
})
```

---

## ✅ SUCCESS METRICS & GATES

| Metric | Current | Day 1 Target | Day 5 Target | Production Gate |
|--------|---------|--------------|--------------|-----------------|
| **Orders Work** | 0% | 100% | 100% | Manual + automated test |
| **KDS Stability** | Crashes | No crashes | 6-hour stable | Console error-free |
| **Memory Growth** | 20-30MB/hr | <10MB/hr | <5MB/hr | 30-min soak test |
| **Test Pass Rate** | 81.6% | 85% | 90% | CI/CD green |
| **Bundle Size** | 109KB | 105KB | <100KB | webpack-analyzer |
| **TypeScript Errors** | 560 | 500 | <400 | tsc --noEmit |
| **Auth Parity** | Unknown | Documented | Verified | Code + test proof |
| **RLS Coverage** | 0/3 tables | 0/3 | 3/3 tables | Supabase console |
| **Health Score** | 5.2/10 | 6.5/10 | 7.5/10 | Re-run audit |

### Go/No-Go Checklist for Production

- [ ] All orders create successfully
- [ ] KDS displays all 7 statuses without crashing
- [ ] Memory stable over 6-hour test (<5MB/hr growth)
- [ ] Test suite >90% passing
- [ ] RLS enabled on orders, menu_items, restaurants
- [ ] Webhook signatures validated
- [ ] No Node.js crypto in client
- [ ] Restaurant context (not env var) in kiosk
- [ ] Bundle main chunk <100KB
- [ ] Health endpoint responding

---

## 📋 PR STRATEGY

### PR Guidelines
1. **Atomic**: One fix per PR
2. **Verifiable**: Include test/proof in PR
3. **Reversible**: Document rollback steps
4. **Gated**: Use AUDIT_MODE=1 for test helpers
5. **Focused**: Reject scope creep

### PR Template
```markdown
## Fix: [Issue Name]

### Problem
- What was broken
- Impact on system

### Solution
- What was changed
- Why this approach

### Verification
- [ ] Test added/updated
- [ ] Manual test steps
- [ ] Performance impact measured
- [ ] No new TypeScript errors

### Rollback
- How to revert if needed
```

### PR Naming Convention
- `fix/` - Bug fixes
- `sec/` - Security fixes
- `perf/` - Performance improvements
- `chore/` - Cleanup, dependencies
- `test/` - Test fixes/additions
- `doc/` - Documentation only
- `refactor/` - Code structure changes

---

## ⚠️ RISK MITIGATION

### Risk: Validation Fix Breaks Orders
**Mitigation**: Test with variety of order types before merging. Have immediate revert ready. Orders working > perfect validation.

### Risk: Memory Leaks Persist
**Mitigation**: Implement 4-hour auto-restart as temporary fix. Add monitoring to track growth. Consider using pm2 with memory limits.

### Risk: Tests Remain Broken
**Mitigation**: Skip (don't delete) unfixable tests with clear documentation. Focus on critical path tests first.

### Risk: RLS Breaks Application
**Mitigation**: Test thoroughly with non-service role. Keep service role as emergency fallback with audit logging. Implement gradually per table.

### Risk: Bundle Size Exceeds Target
**Mitigation**: Defer admin features to lazy loading. Remove dev dependencies from production build. Consider code splitting at route level.

---

## 📊 TECHNICAL DEBT INVENTORY

### High Priority (Blocking Production)
1. Missing status handlers - Runtime crashes
2. Validation schemas incomplete - Orders fail
3. Memory leaks - System instability
4. Restaurant ID bypass - Security risk
5. Node crypto in client - Build failures

### Medium Priority (Fix This Sprint)
6. Missing RLS policies - Security gap
7. Unprotected webhooks - External manipulation
8. 58 failing tests - Can't verify changes
9. 41 orphaned files - Bundle bloat
10. 100+ unused packages - Security risk

### Low Priority (Post-Production)
11. 560 TypeScript errors - Developer experience
12. Split payment UI - Feature gap
13. Documentation debt - Maintenance burden
14. No monitoring - Blind operations
15. Field transform chaos - Maintainability

---

## 🎯 IMPLEMENTATION TRACKING

### Day 1 Progress
- [ ] Fix Zod validation schema
- [ ] Fix Joi validation schema
- [ ] Add missing KDS status handlers
- [ ] Implement memory leak fixes
- [ ] Add 30-minute soak test
- [ ] Enforce restaurant_id server-side
- [ ] Fix kiosk context usage

### Day 2 Progress
- [ ] Add webhook signature validation
- [ ] Implement rate limiting
- [ ] Replace Node crypto with Web Crypto
- [ ] Document auth parity
- [ ] Bundle analysis complete
- [ ] First 2 lazy load points

### Day 3 Progress
- [ ] Quarantine orphan files
- [ ] Build/test with quarantine
- [ ] Delete orphaned files
- [ ] Install test dependencies
- [ ] Fix jest→vi references
- [ ] Fix OrderService tests
- [ ] Remove proven unused packages

### Day 4 Progress
- [ ] Create RLS policy for orders
- [ ] Create RLS policy for menu_items
- [ ] Create RLS policy for restaurants
- [ ] Test with non-service role
- [ ] Document policy rules

### Day 5 Progress
- [ ] Create api-transforms.ts
- [ ] Centralize all transforms
- [ ] Remove ad-hoc conversions
- [ ] Add health endpoint
- [ ] Implement structured logging
- [ ] Add basic metrics

---

## 📝 NOTES & UPDATES

### Update Log
- **Sep 16, 2025 09:00**: Document created based on overnight audit
- **Sep 16, 2025 09:30**: Unified plan with external review feedback
- **Sep 16, 2025 10:00**: Confirmed both Zod AND Joi need fixes

### Key Decisions
1. Fix functionality first, then security, then optimization
2. Use two-phase orphan deletion (quarantine→delete)
3. Keep both validators (Zod + Joi) for now, unify later
4. Implement restaurant_id enforcement on Day 1 (not Day 2)
5. Target 100KB bundle as hard requirement

### Open Questions
1. Do we have active split payment usage requiring UI?
2. Preferred monitoring platform (Datadog, New Relic, etc.)?
3. How many developers available for parallel work?
4. Deployment pipeline details (CI/CD configuration)?
5. Rollback procedure for production?

---

## 🚀 NEXT STEPS

1. **Immediate**: Start Day 1 fixes (validation, handlers, memory)
2. **Today**: Get orders working and KDS stable
3. **This Week**: Achieve 90% test coverage and security hardening
4. **Next Week**: Performance optimization and monitoring
5. **Future**: Split payments, full TypeScript compliance, 100% coverage

---

## 📞 CONTACTS & RESOURCES

### Audit Artifacts
- Full audit report: `/docs/overnight-audit/20250115/`
- Dependency graphs: `graph_client.json`, `graph_server.json`
- Orphan list: `orphan_files.csv`
- Test failures: `test_failures.md`

### Key Files to Fix
- Zod validation: `/shared/types/validation.ts:92`
- Joi validation: `/server/src/models/order.model.ts:45`
- Status handlers: `StationStatusBar.tsx:45`, `useTableGrouping.tsx`
- Memory leaks: 12 useEffect hooks (see `memory_analysis.md`)
- Kiosk context: `useOrderSubmission.ts:59`

### Documentation
- Original audit: `/docs/overnight-audit/20250115/EXEC_SUMMARY.md`
- Risk registry: `/docs/overnight-audit/20250115/02_risks.md`
- 7-day plan: `/docs/overnight-audit/20250115/07_next_7_days.md`
- This document: `/docs/sep16Amscan.md`

---

**END OF DOCUMENT - This is your single source of truth for the recovery sprint**