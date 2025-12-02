---
status: pending
priority: p2
issue_id: "110"
tags: [security, cache, multi-tenant, code-review]
dependencies: ["109"]
created_date: 2025-12-02
source: pr-151-review
---

# Cache Key "no-tenant" Fallback Creates Cross-Tenant Risk

## Problem Statement

When `restaurantId` is null/undefined, cache keys default to `no-tenant:endpoint`, which can cause cross-tenant cache pollution during app initialization or edge cases.

## Findings

### Security Agent Discovery

**Current Code** (httpClient.ts line 210):
```typescript
const tenantPrefix = restaurantId || 'no-tenant'
let cacheKey = `${tenantPrefix}:${endpoint}`
```

### Risk Scenario

1. User A loads app before RestaurantContext initializes
2. Fetches menu → cached as `no-tenant:/api/v1/menu`
3. User B loads app (different restaurant, also before context init)
4. Fetches menu → returns User A's cached data from `no-tenant:/api/v1/menu`

### Mitigating Factors

- RLS at database level prevents actual data leakage
- This is a UX issue more than security (shows wrong restaurant's UI)
- Cache TTL limits exposure window

## Proposed Solutions

### Option A: Skip Caching When No Tenant (Recommended)
**Pros:** No false sharing, defensive
**Cons:** Reduced cache efficiency during init
**Effort:** Small (15 min)
**Risk:** Low

```typescript
const restaurantId = getCurrentRestaurantId() || getRestaurantId()
if (!restaurantId || restaurantId === 'undefined') {
  logger.warn('Restaurant ID unavailable, bypassing cache')
  return this.request<T>(endpoint, { ...options, method: 'GET' })
}
```

### Option B: Use Session-Scoped Fallback
**Pros:** Still caches during init, isolated per session
**Cons:** More complex
**Effort:** Medium
**Risk:** Medium

```typescript
const tenantPrefix = restaurantId || `session-${sessionId}`
```

### Option C: Leave As-Is
**Pros:** No change
**Cons:** Edge case vulnerability remains
**Effort:** None
**Risk:** Low (RLS provides backend protection)

## Recommended Action

Option A - Skip caching when tenant unavailable

## Technical Details

### Affected Files
- `client/src/services/http/httpClient.ts` (lines 209-220)

## Acceptance Criteria

- [ ] No caching occurs when restaurant ID is unavailable
- [ ] Warning logged when cache bypassed
- [ ] Test: Initial load without restaurant context doesn't cache
- [ ] Test: After restaurant context loads, caching works normally

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during PR #151 review |

## Resources

- PR #151: https://github.com/mikeyoung304/July25/pull/151
