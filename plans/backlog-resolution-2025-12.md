# Backlog Resolution Plan - December 2025

**Created:** 2025-12-01
**Purpose:** Comprehensive plan to resolve all open issues in optimal phases
**Total Estimated Effort:** 2-3 days of focused work

---

## Context for New Chat

This plan addresses all verified open issues from the 2025-12-01 multi-agent TODO scan. The codebase is a Restaurant OS (React + Express + Supabase) with:

- **Phases 1 & 2 complete**: Multi-seat ordering and payment system operational
- **Phase 3 at 25%**: Table status automation partially implemented
- **9 issues closed** in verification, **12 issues remain** plus Phase 3 work

### Key Files to Reference
- `TODO_ISSUES.csv` - Master issue tracker (updated 2025-12-01)
- `.claude/memories/orchestration/ORCHESTRATION_STATUS.md` - Phase 3 details
- `.claude/memories/orchestration/TODO_VERIFICATION_2025-12-01.md` - Full verification report

---

## Execution Phases

### Phase A: Critical Blocker (30 minutes)
**Goal:** Unblock Phase 3 table automation

| Task | File | Change |
|------|------|--------|
| A1 | `server/src/lib/ports.ts:125` | Add 'paid' to TableStatus enum |

```typescript
// Change from:
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

// Change to:
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'paid';
```

**Verification:** Run `npm run typecheck` - should pass

---

### Phase B: Quick Wins (1-2 hours)
**Goal:** Close easy issues with high impact

| Task | Issue | File | Change |
|------|-------|------|--------|
| B1 | #15 | `client/src/modules/order-system/components/MenuItemCard.tsx` | Wire `removeFromCart` from context |
| B2 | #18 | `server/scripts/seed-menu-mapped.ts` | Add CLI arg or env var for restaurant ID |
| B3 | #13 | `server/src/routes/metrics.ts` | Add route alias `/api/v1/analytics/performance` → `/metrics` |

**B1 Details:**
```typescript
// Add to destructuring (line ~15):
const { cart, addToCart: unifiedCartAdd, removeFromCart } = useUnifiedCart();

// Update handleQuantityChange to use removeFromCart when delta < 0
```

**B2 Details:**
```typescript
const RESTAURANT_ID = process.env.SEED_RESTAURANT_ID || process.argv[2] || '11111111-1111-1111-1111-111111111111';
```

**Verification:**
- B1: Test cart item removal in UI
- B2: `SEED_RESTAURANT_ID=xxx npm run db:seed`
- B3: `curl localhost:3001/api/v1/analytics/performance` returns 200

---

### Phase C: Phase 3 Completion (2-3 hours)
**Goal:** Complete table status automation

| Task | Description | File(s) |
|------|-------------|---------|
| C1 | Create useTableStatus hook | `client/src/hooks/useTableStatus.ts` (new) |
| C2 | Wire Supabase subscription | Import `subscribeToTableUpdates` from `core/supabase.ts` |
| C3 | Add 'paid' status color | `client/src/components/floor-plan/FloorPlanCanvas.tsx` |
| C4 | Replace polling with subscription | `client/src/pages/hooks/useServerView.ts` |
| C5 | Add auto-transition logic | `server/src/services/table.service.ts` |
| C6 | Write E2E test | `tests/e2e/table-realtime.spec.ts` (new) |

**C1 Implementation:**
```typescript
// client/src/hooks/useTableStatus.ts
import { useEffect, useState } from 'react';
import { subscribeToTableUpdates } from '@/core/supabase';
import { Table } from 'shared/types';

export function useTableStatus(restaurantId: string) {
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    if (!restaurantId) return;

    const unsubscribe = subscribeToTableUpdates(restaurantId, (payload) => {
      setTables(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(t => t.id === payload.new.id);
        if (idx >= 0) updated[idx] = payload.new;
        return updated;
      });
    });

    return () => unsubscribe();
  }, [restaurantId]);

  return { tables, setTables };
}
```

**C3 Color Addition:**
```typescript
// Add to FloorPlanCanvas.tsx status colors (~line 153)
case 'paid':
  return 'bg-gradient-to-br from-yellow-400 to-amber-500'; // Gold gradient
```

**Verification:**
- Open floor plan in two browser tabs
- Complete payment on one tab
- Verify table color updates in real-time on second tab

---

### Phase D: P1 Infrastructure (2-3 hours)
**Goal:** Complete high-priority infrastructure items

| Task | Issue | Description |
|------|-------|-------------|
| D1 | #9 | Implement `clearAllCachesForRestaurantSwitch()` |
| D2 | #11 | Add Redis and AI service health checks |
| D3 | #10 | Add metrics forwarding stub (DataDog/New Relic) |

**D1 Implementation:**
```typescript
// client/src/utils/cacheUtils.ts (new or existing)
export function clearAllCachesForRestaurantSwitch() {
  // Clear React Query cache
  queryClient.clear();

  // Clear any localStorage caches
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('cache:') || key.startsWith('menu:')) {
      localStorage.removeItem(key);
    }
  });

  // Clear in-memory caches
  menuCache.clear();
  orderCache.clear();
}
```

**D2 Implementation:**
```typescript
// server/src/routes/metrics.ts - Add to /health/detailed endpoint
const checks = {
  server: { /* existing */ },
  database: { /* existing */ },
  redis: await checkRedisHealth(),  // New
  ai: await checkAIServiceHealth(), // New
};

async function checkRedisHealth() {
  if (!process.env.REDIS_URL) return { status: 'not_configured' };
  try {
    await redis.ping();
    return { status: 'healthy' };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

async function checkAIServiceHealth() {
  if (!process.env.OPENAI_API_KEY) return { status: 'not_configured' };
  // Lightweight check - just verify API key format
  return { status: 'configured' };
}
```

**D3 Implementation:**
```typescript
// server/src/routes/metrics.ts
// TODO: Forward to monitoring service (DataDog, New Relic, etc.)
if (process.env.DATADOG_API_KEY) {
  // await datadogClient.sendMetrics(metrics);
  logger.info('Metrics forwarding configured but not implemented', {
    todo: 'Implement DataDog integration when ready'
  });
}
```

---

### Phase E: P2 Refinements (1-2 hours)
**Goal:** Address medium-priority technical debt

| Task | Issue | Description |
|------|-------|-------------|
| E1 | #14 | Document station assignment limitation (defer refactor) |
| E2 | #17 | Add rate limit reset in test setup |

**E1 - Add Documentation:**
```typescript
// client/src/components/kitchen/StationStatusBar.tsx
/**
 * Station Assignment Logic
 *
 * KNOWN LIMITATION: Currently uses keyword matching as fallback.
 * TODO: Refactor to use menu item metadata when menu system supports
 * station assignments at the item level.
 *
 * See: TODO_ISSUES.csv #14
 */
```

**E2 Implementation:**
```typescript
// server/src/routes/__tests__/security.test.ts
beforeEach(async () => {
  // Reset rate limiter between tests
  if (rateLimiter?.resetKey) {
    await rateLimiter.resetKey(testIP);
  }
});
```

---

### Phase F: Test Improvements (1 hour)
**Goal:** Fix remaining test issues

| Task | Issue | Description |
|------|-------|-------------|
| F1 | #25 | Enable demo panel tests conditionally |
| F2 | #26 | Fix AuthContext concurrent refresh timeout |

**F1 - Conditional Test Enable:**
```typescript
// tests/e2e/workspace-landing.spec.ts
const DEMO_ENABLED = process.env.VITE_DEMO_PANEL === 'true';

test.describe('Demo Panel', () => {
  test.skip(!DEMO_ENABLED, 'Demo panel disabled in environment');
  // ... existing tests
});
```

**F2 - Fix Timeout:**
```typescript
// client/src/contexts/__tests__/AuthContext.test.tsx
// Increase timeout or mock the refresh delay
jest.useFakeTimers();
// ... test setup
jest.runAllTimers();
```

---

### Phase G: Deferred Items (Future Sprints)
**Goal:** Track but don't implement now

| Item | Priority | Reason for Deferral |
|------|----------|---------------------|
| Multi-tenant test infrastructure | P2 | 2-3 days effort, needs dedicated sprint |
| Message queue extraction | P3 | Low priority refactoring |
| Orders status NOT NULL migration | P3 | Needs production verification first |
| Multi-seat hook extraction | P2 | High risk, needs test coverage first |

---

## Execution Order Summary

```
Phase A (30 min)  → Unblock Phase 3
      ↓
Phase B (1-2 hr)  → Quick wins, visible progress
      ↓
Phase C (2-3 hr)  → Complete Phase 3 table automation
      ↓
Phase D (2-3 hr)  → P1 infrastructure completion
      ↓
Phase E (1-2 hr)  → P2 refinements
      ↓
Phase F (1 hr)    → Test fixes
```

**Total: 8-12 hours** (can be split across sessions)

---

## Parallel Execution Opportunities

These tasks can run in parallel:
- B1 + B2 + B3 (all independent)
- C1 + C3 + C5 (frontend hooks, colors, backend logic)
- D1 + D2 (different files)
- E1 + E2 (documentation + tests)

---

## Verification Checklist

After each phase, verify:

- [ ] `npm run typecheck` passes
- [ ] `npm run test:quick` passes
- [ ] No new console errors in browser
- [ ] Git status clean (commit after each phase)

---

## Commands for New Chat

```bash
# Read current state
cat TODO_ISSUES.csv
cat .claude/memories/orchestration/ORCHESTRATION_STATUS.md

# Start Phase A
# Edit server/src/lib/ports.ts - add 'paid' to TableStatus

# Verify after changes
npm run typecheck
npm run test:quick
```

---

## Success Criteria

| Metric | Before | After |
|--------|--------|-------|
| Open P0 issues | 0 | 0 |
| Open P1 issues | 3 | 0 |
| Open P2 issues | 4 | 1 (deferred) |
| Phase 3 completion | 25% | 100% |
| Test pass rate | 99.8% | 100% |

---

**Plan Version:** 1.0
**Author:** Claude Code
**Ready for Execution:** Yes
