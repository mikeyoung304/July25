# Code Review Backlog Resolution Plan (v2 - Post Review)

**Created:** 2025-12-02
**Updated:** 2025-12-02 (incorporated multi-agent review feedback)
**Purpose:** Address all findings from comprehensive code review with enterprise-grade solutions
**Total Issues:** 11 findings across security, architecture, and code quality

---

## Executive Summary

A comprehensive multi-agent code review identified 11 issues. This plan has been revised based on feedback from three specialized reviewers (DHH Philosophy, Security, Code Simplicity) to balance security rigor with code simplicity.

### Key Changes from v1
1. **Expanded RLS scope** - All 7 multi-tenant tables, not just `tables`
2. **Fixed service role bypass** - Using PostgreSQL role instead of JWT claim
3. **Required full auth on metrics** - Eliminates restaurant_id spoofing
4. **Simplified Phase B** - Delete `useTableStatus.ts` instead of refactoring
5. **Skip type unification** - Three types for three layers is correct design

### Priority Distribution

| Priority | Count | Category | Action |
|----------|-------|----------|--------|
| P1 Critical | 2 | Security vulnerabilities | **Ship this week** |
| P2 High | 1 | Memory leak fix | **Ship with P1** |
| P3 Cleanup | 3 | Dead code removal | **Ship when time permits** |
| DROPPED | 5 | Over-engineering | **Skip entirely** |

---

## Phase A: Critical Security Fixes (P1)

**Goal:** Complete multi-tenant isolation at database level

### Task A1: Add RLS Policies to ALL Multi-Tenant Tables

**Issue:** Missing Row Level Security on 7 tables with `restaurant_id` column

**Tables Requiring RLS:**
1. `tables` - Floor plan data (TODO-093)
2. `menu_items` - Customer-facing menu data
3. `menu_categories` - Menu structure
4. `user_profiles` - Staff PII
5. `user_restaurants` - Access control
6. `user_pins` - PIN authentication
7. `station_tokens` - KDS authentication

**Files to Create:**
- `supabase/migrations/20251202_comprehensive_rls.sql` (NEW)

**Implementation:**

```sql
-- supabase/migrations/20251202_comprehensive_rls.sql
-- Comprehensive RLS policies for all multi-tenant tables
-- Pattern: 4 policies per table (SELECT, INSERT, UPDATE, DELETE) + service role bypass

-- ============================================================================
-- TABLES
-- ============================================================================
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_tables" ON tables;
DROP POLICY IF EXISTS "tenant_insert_tables" ON tables;
DROP POLICY IF EXISTS "tenant_update_tables" ON tables;
DROP POLICY IF EXISTS "tenant_delete_tables" ON tables;
DROP POLICY IF EXISTS "service_role_tables" ON tables;

CREATE POLICY "tenant_select_tables" ON tables
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_tables" ON tables
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_tables" ON tables
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_tables" ON tables
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

-- Service role bypass using PostgreSQL role (NOT JWT claim - security fix)
CREATE POLICY "service_role_tables" ON tables
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables (restaurant_id);

-- ============================================================================
-- MENU_ITEMS
-- ============================================================================
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_menu_items" ON menu_items;
DROP POLICY IF EXISTS "tenant_insert_menu_items" ON menu_items;
DROP POLICY IF EXISTS "tenant_update_menu_items" ON menu_items;
DROP POLICY IF EXISTS "tenant_delete_menu_items" ON menu_items;
DROP POLICY IF EXISTS "service_role_menu_items" ON menu_items;

CREATE POLICY "tenant_select_menu_items" ON menu_items
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_menu_items" ON menu_items
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_menu_items" ON menu_items
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_menu_items" ON menu_items
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_menu_items" ON menu_items
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items (restaurant_id);

-- ============================================================================
-- MENU_CATEGORIES
-- ============================================================================
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "tenant_insert_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "tenant_update_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "tenant_delete_menu_categories" ON menu_categories;
DROP POLICY IF EXISTS "service_role_menu_categories" ON menu_categories;

CREATE POLICY "tenant_select_menu_categories" ON menu_categories
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_menu_categories" ON menu_categories
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_menu_categories" ON menu_categories
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_menu_categories" ON menu_categories
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_menu_categories" ON menu_categories
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories (restaurant_id);

-- ============================================================================
-- USER_PROFILES
-- ============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "tenant_insert_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "tenant_update_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "tenant_delete_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "service_role_user_profiles" ON user_profiles;

CREATE POLICY "tenant_select_user_profiles" ON user_profiles
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_user_profiles" ON user_profiles
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_user_profiles" ON user_profiles
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_user_profiles" ON user_profiles
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_user_profiles" ON user_profiles
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_profiles_restaurant_id ON user_profiles (restaurant_id);

-- ============================================================================
-- USER_RESTAURANTS
-- ============================================================================
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_user_restaurants" ON user_restaurants;
DROP POLICY IF EXISTS "tenant_insert_user_restaurants" ON user_restaurants;
DROP POLICY IF EXISTS "tenant_update_user_restaurants" ON user_restaurants;
DROP POLICY IF EXISTS "tenant_delete_user_restaurants" ON user_restaurants;
DROP POLICY IF EXISTS "service_role_user_restaurants" ON user_restaurants;

CREATE POLICY "tenant_select_user_restaurants" ON user_restaurants
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_user_restaurants" ON user_restaurants
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_user_restaurants" ON user_restaurants
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_user_restaurants" ON user_restaurants
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_user_restaurants" ON user_restaurants
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON user_restaurants (restaurant_id);

-- ============================================================================
-- USER_PINS
-- ============================================================================
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_user_pins" ON user_pins;
DROP POLICY IF EXISTS "tenant_insert_user_pins" ON user_pins;
DROP POLICY IF EXISTS "tenant_update_user_pins" ON user_pins;
DROP POLICY IF EXISTS "tenant_delete_user_pins" ON user_pins;
DROP POLICY IF EXISTS "service_role_user_pins" ON user_pins;

CREATE POLICY "tenant_select_user_pins" ON user_pins
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_user_pins" ON user_pins
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_user_pins" ON user_pins
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_user_pins" ON user_pins
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_user_pins" ON user_pins
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index already exists from 20251015 migration

-- ============================================================================
-- STATION_TOKENS
-- ============================================================================
ALTER TABLE station_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_station_tokens" ON station_tokens;
DROP POLICY IF EXISTS "tenant_insert_station_tokens" ON station_tokens;
DROP POLICY IF EXISTS "tenant_update_station_tokens" ON station_tokens;
DROP POLICY IF EXISTS "tenant_delete_station_tokens" ON station_tokens;
DROP POLICY IF EXISTS "service_role_station_tokens" ON station_tokens;

CREATE POLICY "tenant_select_station_tokens" ON station_tokens
FOR SELECT USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_insert_station_tokens" ON station_tokens
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_station_tokens" ON station_tokens
FOR UPDATE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_station_tokens" ON station_tokens
FOR DELETE USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_station_tokens" ON station_tokens
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_station_tokens_restaurant_id ON station_tokens (restaurant_id);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after migration to verify all tables have RLS enabled:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('tables', 'menu_items', 'menu_categories',
--                   'user_profiles', 'user_restaurants', 'user_pins', 'station_tokens');
```

**Verification:**
- [ ] Run migration: `npm run db:push`
- [ ] Run verification query to confirm RLS enabled on all 7 tables
- [ ] Test with Restaurant A token: Cannot see Restaurant B data
- [ ] Test CRUD operations within tenant work
- [ ] Test service role operations still function

---

### Task A2: Secure Metrics Endpoints with Full Authentication

**Issue:** TODO-094 - Unauthenticated metrics endpoints allow DoS and restaurant_id spoofing

**Security Reviewer Recommendation:** Require full authentication to prevent:
- Rate limit exhaustion attacks via `X-Restaurant-ID` header spoofing
- Metrics poisoning across restaurants
- Anonymous log flooding

**Files to Modify:**
- `server/src/routes/metrics.ts`

**Implementation:**

```typescript
// server/src/routes/metrics.ts - Simplified enterprise-grade security

import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Rate limiter keyed by authenticated restaurant (no IP fallback - auth required)
const metricsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 300 : 100,
  standardHeaders: true, // Return rate limit info in headers
  keyGenerator: (req) => {
    const authReq = req as AuthenticatedRequest;
    // Only use restaurant_id from JWT (not from header) - prevents spoofing
    return `metrics:${authReq.user?.restaurant_id || 'unknown'}`;
  },
  handler: (req, res) => {
    const authReq = req as AuthenticatedRequest;
    logger.warn('[RATE_LIMIT] Metrics rate limit exceeded', {
      restaurantId: authReq.user?.restaurant_id,
      userId: authReq.user?.id,
      ip: req.ip
    });
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: 60,
      limit: 100,
      windowMs: 60000
    });
  }
});

// Shared handler for both endpoints (fixes TODO-099 duplication)
async function handleMetrics(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  try {
    const metrics = req.body;

    // Sanitize metrics
    const sanitizedMetrics = {
      timestamp: metrics.timestamp || new Date().toISOString(),
      slowRenders: Math.max(0, parseInt(metrics.slowRenders) || 0),
      slowAPIs: Math.max(0, parseInt(metrics.slowAPIs) || 0),
      stats: typeof metrics.stats === 'object' ? metrics.stats : {}
    };

    logger.info('Client performance metrics', {
      ...sanitizedMetrics,
      restaurantId: authReq.user?.restaurant_id, // From JWT only
      userId: authReq.user?.id
    });

    await forwardMetricsToMonitoring(sanitizedMetrics);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to process metrics', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Both endpoints require authentication
router.post('/metrics',
  express.json({ limit: '1kb' }),
  authenticate,  // Full auth required - no optionalAuth
  metricsLimiter,
  handleMetrics
);

router.post('/analytics/performance',
  express.json({ limit: '1kb' }),
  authenticate,  // Full auth required
  metricsLimiter,
  handleMetrics  // Same handler - fixes missing forwardMetricsToMonitoring
);

export default router;
```

**Verification:**
- [ ] Unauthenticated request returns 401
- [ ] Authenticated request succeeds
- [ ] Rate limit headers present in response
- [ ] 101st request in 1 minute returns 429
- [ ] restaurant_id in logs comes from JWT only
- [ ] `/analytics/performance` now forwards to monitoring

---

## Phase B: Simplified Architecture Fixes

**Goal:** Fix memory leak, delete unnecessary code

### Task B1: DELETE useTableStatus.ts

**Reviewer Consensus:** Delete the hook entirely instead of refactoring (-112 lines)

> "Why have a hook at all if it's just wrapping Supabase's channel API?" - DHH Reviewer
> "Delete useTableStatus.ts entirely, use Supabase subscription directly" - Simplicity Reviewer

**Files to Modify:**
- `client/src/hooks/useTableStatus.ts` (DELETE)
- `client/src/pages/hooks/useServerView.ts` (inline subscription)

**Implementation:**

```typescript
// client/src/pages/hooks/useServerView.ts - Inline Supabase subscription

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/core/supabase';
import { logger } from '@/services/logger';

export function useServerView() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  // ... other state

  // Inline subscription - no useTableStatus hook needed
  useEffect(() => {
    if (!restaurant?.id) {
      setIsSubscribed(false);
      return;
    }

    const channel = supabase
      .channel(`tables:${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        (payload) => {
          logger.info('[useServerView] Real-time table update', {
            eventType: payload.eventType,
            tableId: payload.new?.id || payload.old?.id
          });

          if (payload.eventType === 'DELETE' && payload.old) {
            setTables(prev => prev.filter(t => t.id !== payload.old!.id));
          } else if (payload.new) {
            setTables(prev => {
              const exists = prev.some(t => t.id === payload.new!.id);
              if (exists) {
                return prev.map(t => t.id === payload.new!.id
                  ? { ...t, status: payload.new!.status as Table['status'] }
                  : t
                );
              }
              return prev;
            });
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          logger.info('[useServerView] Subscribed to table updates');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [restaurant?.id]);

  // ... rest of hook
}
```

```bash
# Delete the old hook file
rm client/src/hooks/useTableStatus.ts
```

**Verification:**
- [ ] `useTableStatus.ts` deleted
- [ ] Real-time updates still work in ServerFloorPlan
- [ ] No import errors
- [ ] `npm run typecheck` passes

---

### Task B2: Fix Memory Leak in useEffect

**Issue:** TODO-098 - `toast` dependency causes callback recreation

**Files to Modify:**
- `client/src/pages/hooks/useServerView.ts`

**Implementation:**

```typescript
// Add ref pattern for toast
const { toast } = useToast();
const toastRef = useRef(toast);

useEffect(() => {
  toastRef.current = toast;
}, [toast]);

const loadFloorPlan = useCallback(async () => {
  // ... existing code ...

  // Use toastRef.current instead of toast directly
  if (isInitialLoad.current) {
    toastRef.current.error('Failed to load floor plan. Please refresh.');
    isInitialLoad.current = false;
  }
}, [restaurant?.id]); // toast NOT in deps
```

**Verification:**
- [ ] Effect doesn't re-run on every render
- [ ] Toast notifications still work
- [ ] No memory leak warnings

---

## Phase C: Code Cleanup (P3)

**Goal:** Remove dead code

### Task C1: Remove Dual Cache System

**Files to Modify:**
- `client/src/services/http/httpClient.ts`

**Lines Removable:** ~50 lines

**Implementation:**
```typescript
// DELETE these from httpClient.ts:
// - private requestCache = new Map<string, { data: any; timestamp: number }>();
// - All requestCache.get(), requestCache.set(), requestCache.delete() calls
// - Related cache invalidation logic
```

---

### Task C2: Remove Unused RequestBatcher

**Files to Modify:**
- `client/src/services/http/httpClient.ts`
- `client/src/services/http/RequestBatcher.ts` (DELETE entire file)

**Lines Removable:** ~240 lines (228 in RequestBatcher + 12 in httpClient)

**Implementation:**
```bash
# Delete unused file
rm client/src/services/http/RequestBatcher.ts

# Remove from httpClient.ts:
# - import { RequestBatcher } from './RequestBatcher';
# - private batcher: RequestBatcher;
# - Any batcher instantiation
```

---

## DROPPED Tasks (Based on Reviewer Feedback)

The following tasks from v1 have been dropped as over-engineering:

| Task | Original Goal | Why Dropped |
|------|---------------|-------------|
| B2: Type Consolidation | Unify Table types | "Three types for three layers is correct design" |
| B3: Polling/Realtime Fix | Disable polling when subscribed | "Current 120s poll when subscribed is reasonable" |
| C3: Health Check | Optimize DB query | "Health checks shouldn't query DB" - but current works |
| B5: Metrics Duplication | Extract shared handler | Already included in A2 |

---

## Execution Order

```
Phase A: Security (Ship This Week)
├── A1: Comprehensive RLS Migration (7 tables)
└── A2: Metrics Authentication + Rate Limiting

Phase B: Architecture (Ship with A)
├── B1: Delete useTableStatus.ts (-112 lines)
└── B2: Fix Memory Leak (5 lines changed)

Phase C: Cleanup (Ship When Time Permits)
├── C1: Remove Dual Cache (-50 lines)
└── C2: Remove RequestBatcher (-240 lines)
```

**Net Code Change:** -390 lines (vs +290 in v1)

---

## Verification Checklist

### Security (Must Pass Before Deploy)
- [ ] `npm run db:push` succeeds
- [ ] RLS verification query shows all 7 tables enabled
- [ ] Cross-tenant query returns empty (not other tenant's data)
- [ ] Unauthenticated metrics request returns 401
- [ ] Rate limit triggers at 101 requests/minute

### Functionality
- [ ] `npm run typecheck` passes
- [ ] `npm run test:quick` passes
- [ ] Real-time table updates work
- [ ] Floor plan loads correctly
- [ ] Toast notifications work

### Code Quality
- [ ] No console.log statements added
- [ ] No new TypeScript errors
- [ ] Git status clean

---

## Success Criteria

1. **Complete Multi-Tenant Isolation:** All 7 tables have RLS
2. **Secure Metrics:** Authentication required, rate limited
3. **Simplified Codebase:** -390 lines of code
4. **No Regressions:** All tests pass
5. **Enterprise Ready:** Defense-in-depth security model

---

## References

### Security
- PostgreSQL RLS: `TO service_role` pattern (not JWT role check)
- Rate limiting: Per-restaurant keying from JWT only
- Authentication: Full auth required for metrics

### Reviewer Feedback Applied
- DHH: "Ship Phase A, skip Phase B refactors, delete instead of abstract"
- Security: "Fix service role bypass, expand RLS scope, require full auth"
- Simplicity: "Delete useTableStatus, -390 lines achievable"
