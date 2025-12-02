---
title: "CL-SEC-003: Multi-Tenant Isolation - RLS Policies & Cache Key Tenant Prefixing"
category: security-issues
tags:
  - rls-policies
  - multi-tenant
  - cache-isolation
  - cross-tenant-leakage
  - p1-security-critical
problem_type: security_issue
components:
  - RLS-policies
  - httpClient
  - cache-system
  - restaurant-context
  - database-migrations
severity: critical
related_issues:
  - "TODO-103: RLS policies for audit tables"
  - "TODO-104: Cache key tenant isolation"
  - "TODO-108: INSERT policy NULL checks"
  - "TODO-109: Cache clearing on restaurant switch"
affected_files:
  - "client/src/services/http/httpClient.ts"
  - "supabase/migrations/20251203_audit_tables_rls.sql"
pr_references:
  - "#150: comprehensive RLS + metrics auth + code cleanup"
  - "#151: resolve P1/P2 code review findings"
created_date: 2025-12-02
resolved_date: 2025-12-02
---

# Multi-Tenant Isolation: RLS Policies & Cache Key Tenant Prefixing

## Problem Summary

Two critical security gaps in multi-tenant isolation were discovered during code review:

1. **Database Layer**: Audit tables (`order_status_history`, `voice_order_logs`) lacked RLS policies, allowing cross-tenant data access via client-side Supabase queries
2. **Client Layer**: Cache keys didn't include `restaurant_id`, causing cross-tenant data leakage when users switched restaurants

## Symptoms

- Authenticated user from Restaurant A could query audit data from Restaurant B
- After switching restaurants, cached menu/table data from previous restaurant displayed
- Race conditions during restaurant switch could serve stale tenant data

## Root Cause Analysis

### 1. Missing RLS on Audit Tables

The comprehensive RLS migration (20251202) covered 6 tables but missed 2 audit tables:
- `order_status_history` - Order state transition audit trail
- `voice_order_logs` - Voice ordering transcriptions

**Attack Vector**:
```
1. Attacker authenticates with Restaurant A credentials
2. Uses Supabase client-side queries directly against audit tables
3. Can read order transitions and voice transcriptions from ALL restaurants
```

### 2. Cache Keys Without Tenant Isolation

Original cache key format:
```typescript
// VULNERABLE - same key for all tenants
let cacheKey = endpoint  // e.g., "/api/v1/menu"
```

**Attack Vector**:
```
1. User loads Restaurant A menu → cached as "/api/v1/menu"
2. User switches to Restaurant B
3. GET /api/v1/menu → returns Restaurant A's cached menu
```

### 3. INSERT Policy Asymmetry

The INSERT policy lacked `IS NOT NULL` check present in SELECT:
```sql
-- SELECT had this:
FOR SELECT USING (restaurant_id IS NOT NULL AND restaurant_id = ...)

-- INSERT was missing IS NOT NULL:
FOR INSERT WITH CHECK (restaurant_id = ...)  -- Allows NULL!
```

This created "orphaned" rows that could be inserted but never read.

### 4. Cache Clearing Function Never Called

`clearAllCachesForRestaurantSwitch()` existed but wasn't invoked:
```typescript
// Function existed at line 362
export function clearAllCachesForRestaurantSwitch() { ... }

// But setCurrentRestaurantId() didn't call it
export function setCurrentRestaurantId(id: string | null) {
  currentRestaurantId = id  // No cache clearing!
}
```

## Working Solutions

### Solution 1: RLS Policies for Audit Tables

```sql
-- order_status_history with nullable restaurant_id handling
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_order_status_history" ON order_status_history
FOR SELECT USING (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);

CREATE POLICY "tenant_insert_order_status_history" ON order_status_history
FOR INSERT WITH CHECK (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);

-- Service role bypass for server-side operations
CREATE POLICY "service_role_order_status_history" ON order_status_history
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Performance index for RLS
CREATE INDEX IF NOT EXISTS idx_order_status_history_restaurant_id
ON order_status_history (restaurant_id);
```

**Key Points**:
- `IS NOT NULL` check in ALL policies (SELECT, INSERT, UPDATE, DELETE)
- Service role bypass uses `TO service_role` (not JWT claim check)
- Index on `restaurant_id` for RLS filter performance

### Solution 2: Tenant-Prefixed Cache Keys

```typescript
async get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
  // Build cache key with restaurant_id prefix for tenant isolation
  const restaurantId = getCurrentRestaurantId() || getRestaurantId()
  const tenantPrefix = restaurantId || 'no-tenant'

  let cacheKey = `${tenantPrefix}:${endpoint}`
  if (options?.params && Object.keys(options.params).length > 0) {
    const searchParams = new URLSearchParams()
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    cacheKey = `${tenantPrefix}:${endpoint}?${searchParams.toString()}`
  }

  // Cache lookup uses tenant-scoped key
  const cachedResponse = this.responseCache.get(cacheKey)
  // ...
}
```

**Cache Key Format**: `{restaurantId}:{endpoint}?{params}`

Examples:
- `abc123:/api/v1/menu`
- `abc123:/api/v1/tables?active=true`

### Solution 3: Auto-Clear Cache on Restaurant Switch

```typescript
export function setCurrentRestaurantId(restaurantId: string | null) {
  const previousId = currentRestaurantId
  currentRestaurantId = restaurantId

  // Clear caches when switching restaurants to prevent cross-tenant leakage
  if (previousId !== null && previousId !== restaurantId) {
    clearAllCachesForRestaurantSwitch()
  }
}

export function clearAllCachesForRestaurantSwitch(): void {
  // Clear HTTP client caches
  httpClient.clearCache()

  // Clear localStorage caches with tenant-specific prefixes
  if (typeof localStorage !== 'undefined') {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('cache:') ||
        key.startsWith('menu:') ||
        key.startsWith('orders:') ||
        key.startsWith('tables:')
      )) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  logger.info('[Multi-tenant] Cleared all caches for restaurant switch')
}
```

## Prevention Strategies

### RLS Migration Checklist

- [ ] Run SQL audit to find ALL tables with `restaurant_id` column
- [ ] Create policies for all 4 operations: SELECT, INSERT, UPDATE, DELETE
- [ ] Include `IS NOT NULL` check for nullable `restaurant_id` columns
- [ ] Verify policy symmetry (INSERT WITH CHECK matches SELECT USING)
- [ ] Add service role bypass using `TO service_role` (not JWT check)
- [ ] Create index on `restaurant_id` for each RLS-enabled table
- [ ] Test with multiple tenant JWTs to verify isolation

### Multi-Tenant Cache Checklist

- [ ] Cache keys include tenant identifier as prefix
- [ ] Cache automatically clears on tenant context change
- [ ] In-flight requests map cleared on tenant switch
- [ ] localStorage caches cleared with tenant-specific prefixes
- [ ] Test: Switch tenants, verify no stale data served

### Security Code Review Checklist

- [ ] All RLS policies have symmetric NULL handling
- [ ] Cache keys include restaurant_id prefix
- [ ] `setCurrentRestaurantId()` triggers cache clearing
- [ ] No `console.log/error` - use `logger` with context
- [ ] Endpoint matching uses `startsWith()` not `includes()`
- [ ] Service role bypass uses PostgreSQL role, not JWT claim

## Related Documentation

- [ADR-002: Multi-Tenancy Architecture](../../explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md)
- [ADR-006: Dual Authentication Pattern](../../explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)
- [CL-AUTH-001: STRICT_AUTH Drift](../../../.claude/lessons/CL-AUTH-001-strict-auth-drift.md)
- [CL-AUTH-002: WebSocket Dual Auth Prevention](../../../.claude/lessons/CL-AUTH-002-websocket-dual-auth-prevention.md)

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20251203_audit_tables_rls.sql` | New RLS policies + composite index |
| `client/src/services/http/httpClient.ts` | Tenant-prefixed cache keys, auto-clear on switch |

## Verification

```sql
-- Verify RLS enabled on audit tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('order_status_history', 'voice_order_logs');

-- Expected: rowsecurity = true for both
```

```typescript
// Verify cache key format in browser console
window.__httpCache.getStats()
// Keys should show: "restaurantId:/api/v1/..."
```

## Lessons Learned

1. **RLS audits must be comprehensive** - Use SQL queries to find ALL multi-tenant tables, don't rely on memory
2. **Policy symmetry is critical** - INSERT/UPDATE policies must match SELECT policy NULL handling
3. **Cache isolation needs multiple layers** - Tenant prefix + auto-clear + localStorage clearing
4. **Functions that exist aren't automatically called** - Wire up cache clearing in state management, not component callbacks
5. **Code review catches what tests miss** - Security gaps found through parallel agent review, not test suite
