# CODE HEALTH & COMPLEXITY ANALYSIS

**Audit Date**: 2025-12-28
**System**: Grow / Restaurant OS (rebuild-6.0)
**Analysis Method**: Hostile complexity audit

---

## Executive Summary

The codebase demonstrates **mature engineering practices** in core business logic but shows signs of **accumulated complexity** in authentication and configuration layers. The shared types package is well-maintained, while some server middleware shows defensive over-engineering.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Maintainability | 72/100 | Good structure, some complexity debt |
| Readability | 78/100 | Consistent style, good naming |
| Testability | 65/100 | Core logic tested, gaps in integration |
| Simplicity | 60/100 | Some over-engineering observed |
| Consistency | 75/100 | Snake_case enforced, minor drift |

---

## Complexity Hotspots

### 1. Authentication Middleware (`server/src/middleware/auth.ts`)

**Cyclomatic Complexity**: High (8+ branches)

**Evidence**:
```typescript
// 4 different authentication paths
if (supabaseToken) { ... }
else if (demoToken) { ... }
else if (pinToken) { ... }
else if (stationToken) { ... }
// Plus fallback logic
```

**Why It's Complex**:
- 4 authentication sources to check
- Demo user bypass adds conditional
- STRICT_AUTH optional flag adds branch
- Restaurant header fallback adds branch

**Hostile Assessment**: This complexity is **partially justified** by real business requirements (shared devices), but the demo bypass and header fallback add unnecessary attack surface.

**Recommendation**:
- Extract each auth path to separate function
- Remove demo bypass in production build
- Remove header fallback or make explicit opt-in

---

### 2. Order State Machine (`server/src/services/orderStateMachine.ts`)

**Cyclomatic Complexity**: Medium (controlled)

**Evidence**:
```typescript
// Clean transition map - LOW complexity
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['pending', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  // ... explicit allowed transitions
};

// Hook system adds complexity
private static hooks: TransitionHook[] = [];
```

**Why It's Reasonable**:
- Explicit state machine (not implicit transitions)
- Single source of truth for allowed transitions
- Hooks are registered, not hardcoded

**Hostile Assessment**: This is **well-designed complexity**. The state machine pattern is appropriate for the domain. Hook system is clean.

**Recommendation**: Keep as-is. Consider adding state machine visualization for debugging.

---

### 3. Payment Service (`server/src/services/payment.service.ts`)

**Cyclomatic Complexity**: Medium

**Evidence**:
```typescript
// Multiple validation steps
if (!order.items || order.items.length === 0) { ... }
if (!restaurantId) { ... }
for (const item of order.items) {
  if (itemPrice < 0) { ... }
  if (!quantity || quantity < 1) { ... }
  if (item.modifiers && Array.isArray(item.modifiers)) {
    for (const modifier of item.modifiers) { ... }
  }
}
```

**Why It's Reasonable**:
- Defensive validation is appropriate for payments
- Each check prevents a specific financial risk
- Two-phase audit logging is correct pattern

**Hostile Assessment**: This complexity is **justified by compliance requirements**. Payment code should be defensive.

**Recommendation**: Keep validation thorough. Add unit tests for edge cases.

---

### 4. HTTP Client (`client/src/services/http/httpClient.ts`)

**Cyclomatic Complexity**: Medium-High

**Evidence**:
```typescript
// Token source priority
const session = await supabase.auth.getSession();
if (session?.access_token) {
  headers['Authorization'] = `Bearer ${session.access_token}`;
} else {
  // Check localStorage for PIN/station/demo tokens
  const token = localStorage.getItem('token');
  if (token) { ... }
}
```

**Why It's Complex**:
- Mirrors server's 4-path authentication
- Adds retry logic
- Adds error transformation

**Hostile Assessment**: Complexity is a **symptom of dual auth pattern**. Acceptable given business requirements.

**Recommendation**: Document token priority clearly. Add comments explaining precedence.

---

### 5. RBAC Configuration (Dual Source)

**Cyclomatic Complexity**: Medium (spread across files)

**Evidence**:
```typescript
// Source 1: Code constants
const ROLE_PERMISSIONS = {
  manager: ['orders:*', 'menu:*', 'reports:*'],
  server: ['orders:read', 'orders:create'],
  // ...
};

// Source 2: Database table (role_scopes)
// Can override code defaults per-restaurant
```

**Why It's Complex**:
- Two sources of truth
- Merge logic needed
- Per-restaurant customization desired

**Hostile Assessment**: This is **accidental complexity**. Either source alone would be simpler.

**Recommendation**: Consolidate to single source (database with seeded defaults).

---

## Code Bloat Analysis

### Large Files (>300 lines)

| File | Lines | Justification | Recommendation |
|------|-------|---------------|----------------|
| `orderStateMachine.ts` | ~400 | Single responsibility | Keep |
| `payment.service.ts` | ~440 | Critical financial logic | Keep |
| `auth.ts` (middleware) | ~350 | 4 auth paths | Split by auth type |
| `AuthContext.tsx` | ~500 | State + methods | Extract hooks |
| `OrdersPage.tsx` | ~600 | UI + logic | Extract to hooks |

### Redundant Code Patterns

| Pattern | Occurrences | Impact |
|---------|-------------|--------|
| Manual restaurant_id checks | 30+ | Low (defense in depth) |
| Token extraction logic | 4 | Medium (could abstract) |
| Error response formatting | 15+ | Low (consistent is good) |
| Logger calls | 100+ | None (appropriate) |

**Hostile Assessment**: Redundancy in security checks (restaurant_id) is **acceptable defense in depth**. Other redundancy is minor.

---

## Areas Hostile to Change

### 1. Authentication Flow Modification

**Risk Level**: High

**Why It's Hostile**:
- 4 interleaved auth paths
- Client and server must stay in sync
- Demo bypass affects all paths
- STRICT_AUTH flag affects behavior

**Change Scenario**: "Add OAuth support"
- Would require modifying both client and server
- Must integrate with existing 4-path logic
- Token priority becomes 5-way decision

**Recommendation**: Before adding auth paths, consolidate existing paths.

---

### 2. Order Status Changes

**Risk Level**: Medium

**Why It's Hostile**:
- State machine transition map is explicit (good)
- Hooks fire on transitions
- Client UI must handle all states
- KDS depends on specific statuses

**Change Scenario**: "Add 'delayed' status"
- Modify transition map (low risk)
- Add hooks for new status
- Update 8+ UI components
- Update KDS filtering

**Recommendation**: State machine is well-designed. Changes are manageable.

---

### 3. Payment Flow Modification

**Risk Level**: High

**Why It's Hostile**:
- Two-phase audit logging is critical
- Idempotency key format is hardcoded
- Stripe integration tightly coupled
- Compliance requirements

**Change Scenario**: "Add Square as payment option"
- Must maintain audit logging pattern
- Must generate compatible idempotency keys
- Must handle both Stripe and Square webhooks
- High testing burden

**Recommendation**: Abstract payment provider behind interface before adding alternatives.

---

### 4. Multi-Tenancy Modification

**Risk Level**: Critical

**Why It's Hostile**:
- restaurant_id in every query
- RLS policies in database
- Middleware validation
- Context providers in client

**Change Scenario**: "Add franchise grouping (multi-restaurant)"
- Breaks restaurant_id = tenant assumption
- RLS policies need hierarchy
- Permissions become complex
- Reporting needs aggregation

**Recommendation**: Avoid multi-level tenancy without major refactor.

---

## Technical Debt Inventory

### Critical (Blocks Features)

| Item | Location | Impact | Effort |
|------|----------|--------|--------|
| Demo user bypass | `restaurantAccess.ts:43-50` | Security blocker | Low |
| Weak default secret | `stationAuth.ts:11` | Security blocker | Low |
| localStorage tokens | `AuthContext.tsx` | Security risk | Medium |

### High (Causes Problems)

| Item | Location | Impact | Effort |
|------|----------|--------|--------|
| In-memory rate limiting | `rateLimiter.ts` | Reliability gap | Medium |
| Dual RBAC sources | Multiple | Confusion | Medium |
| Missing refund idempotency | `payments.routes.ts` | Financial risk | Low |

### Medium (Slows Development)

| Item | Location | Impact | Effort |
|------|----------|--------|--------|
| Large AuthContext | `AuthContext.tsx` | Hard to test | Medium |
| Embedded transition hooks | `orderStateMachine.ts` | Hard to extend | Low |
| Manual type assertions | Various | Type safety gaps | Medium |

### Low (Nice to Fix)

| Item | Location | Impact | Effort |
|------|----------|--------|--------|
| Inconsistent error messages | API routes | UX variance | Low |
| Missing JSDoc | Services | Onboarding friction | Low |
| Test coverage gaps | Various | Confidence | High |

---

## Dependency Health

### External Dependencies (Server)

| Package | Version | Health | Risk |
|---------|---------|--------|------|
| express | 4.x | Stable | Low |
| @supabase/supabase-js | 2.x | Active | Low |
| stripe | 14.x | Active | Low |
| bcrypt | 5.x | Stable | Low |
| jsonwebtoken | 9.x | Stable | Low |
| openai | 4.x | Active | Medium (API changes) |
| zod | 3.x | Active | Low |

### External Dependencies (Client)

| Package | Version | Health | Risk |
|---------|---------|--------|------|
| react | 18.3.x | Stable | Low |
| @tanstack/react-query | 5.x | Active | Low |
| @stripe/stripe-js | 4.x | Active | Low |
| tailwindcss | 3.x | Active | Low |
| vite | 5.x | Active | Low |

### Dependency Concerns

1. **OpenAI SDK**: Frequent API changes. Pin version carefully.
2. **Supabase SDK**: Breaking changes between v1 and v2. Currently on v2.
3. **No major vulnerabilities** observed in package audit.

---

## Test Coverage Assessment

### Current State (Estimated)

| Area | Coverage | Quality |
|------|----------|---------|
| Order State Machine | 80%+ | Good |
| Payment Service | 70%+ | Good |
| Auth Middleware | 50% | Gaps in demo/station paths |
| API Routes | 40% | Integration tests sparse |
| Client Components | 30% | E2E covers happy paths |
| WebSocket Handlers | 20% | Minimal |

### Testing Gaps (Risk Areas)

| Gap | Risk | Recommendation |
|-----|------|----------------|
| Demo auth bypass | Not tested for security | Add negative tests |
| Rate limiter reset | Not tested | Add restart simulation |
| WebSocket reconnection | Not tested | Add disconnect tests |
| Concurrent PIN attempts | Race not tested | Add concurrent tests |
| Refund double-processing | Not tested | Add idempotency tests |

---

## Recommendations

### Immediate (Reduce Attack Surface)

1. Remove demo user bypass code path in production
2. Remove weak default secret fallback
3. Add missing negative test cases for auth

### Short-Term (Reduce Complexity)

1. Extract auth paths into separate middlewares
2. Consolidate RBAC to single source
3. Split large context providers into hooks

### Medium-Term (Improve Maintainability)

1. Add payment provider abstraction
2. Increase integration test coverage
3. Add architecture decision records for implicit decisions

### Long-Term (Enable Evolution)

1. Document all implicit architectural decisions
2. Create change impact analysis tooling
3. Establish code review checklist for sensitive areas

---

## Conclusion

The codebase shows **good structural decisions** (state machine, audit logging, type sharing) with **accumulated complexity** in authentication and authorization. The complexity is largely driven by legitimate business requirements (shared devices, multi-tenancy) but some patterns (demo bypass, dual RBAC) add unnecessary risk.

**Code Health Grade**: B- (Good foundation, cleanup needed)

The highest priority items are security-related (demo bypass, weak secrets) rather than complexity-related. The complexity is manageable with focused refactoring.

---

**Report Prepared By**: Hostile Enterprise Auditor
**Review Date**: 2025-12-28
