---
status: open
priority: p1
issue_id: "104"
tags: [security, cache, multi-tenant, code-review]
dependencies: []
---

# HTTP Client Cache Key Missing Restaurant ID (Cross-Tenant Risk)

## Problem Statement

The httpClient cache key does not include `restaurant_id`, creating potential for cross-tenant cache pollution when users switch restaurants.

## Findings

### Security Agent Discovery
From `client/src/services/http/httpClient.ts:208`:
```typescript
let cacheKey = endpoint // Missing tenant isolation!
if (options?.params) {
  cacheKey = `${endpoint}?${searchParams.toString()}`
}
```

### Attack Scenario
1. User authenticates to Restaurant A
2. Fetches menu -> cached as `/api/v1/menu`
3. Switches to Restaurant B (updates JWT)
4. Fetches menu -> **returns Restaurant A's cached menu**

### Current Mitigation
`clearAllCachesForRestaurantSwitch()` exists (line 372) but:
- Must be called on every restaurant switch
- Race condition if request in-flight during switch
- Not verified to be called consistently

## Proposed Solutions

### Option A: Include Restaurant ID in Cache Key (Recommended)
**Pros:** Defense-in-depth, eliminates race condition
**Cons:** Minor code change
**Effort:** Small (15 min)
**Risk:** Low

```typescript
async get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
  const restaurantId = getCurrentRestaurantId() || getRestaurantId()
  let cacheKey = `${restaurantId}:${endpoint}`

  if (options?.params && Object.keys(options.params).length > 0) {
    const searchParams = new URLSearchParams()
    // ... build params
    cacheKey = `${restaurantId}:${endpoint}?${searchParams.toString()}`
  }
  // ... rest of method
}
```

### Option B: Verify clearAllCachesForRestaurantSwitch() Coverage
**Pros:** No code change to cache logic
**Cons:** Relies on proper call sites, doesn't prevent race conditions
**Effort:** Medium (audit all switch points)
**Risk:** Medium

## Recommended Action

Option A - Include restaurant_id in cache key

## Technical Details

### Affected Files
- `client/src/services/http/httpClient.ts` (lines 206-259)

### Related Functions
- `clearAllCachesForRestaurantSwitch()` (line 372)
- `setCurrentRestaurantId()` (line 21)

## Acceptance Criteria

- [ ] Cache keys include restaurant_id prefix
- [ ] Test: Switch restaurants, verify fresh data fetched
- [ ] Test: Concurrent requests during switch don't pollute cache
- [ ] No cross-tenant data leakage possible via cache

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during PR #150 review |

## Resources

- PR #150: https://github.com/owner/repo/pull/150
- Related: Multi-tenant isolation ADR-004
