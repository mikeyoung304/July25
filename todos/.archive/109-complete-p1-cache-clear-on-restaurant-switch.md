---
status: complete
priority: p1
issue_id: "109"
tags: [security, cache, multi-tenant, code-review]
dependencies: ["108"]
created_date: 2025-12-02
source: pr-151-review
---

# CRITICAL: Cache Clearing Not Invoked on Restaurant Switch

## Problem Statement

The `clearAllCachesForRestaurantSwitch()` function exists but is never called when users switch restaurants, creating cross-tenant data leakage via cached responses.

## Findings

### Security Agent Discovery

**The Function Exists** (httpClient.ts lines 362-388):
```typescript
export function clearAllCachesForRestaurantSwitch(): void {
  httpClient.clearCache()
  // ... clears localStorage caches
}
```

**But Never Called**:
- `setCurrentRestaurantId()` is called in multiple places
- None of those call sites invoke cache clearing
- Result: Old tenant's cached data persists after switch

### Attack Scenario

1. User authenticates to Restaurant A
2. Fetches menu → cached as `restaurantA:/api/v1/menu`
3. Switches to Restaurant B → `setCurrentRestaurantId(B)` called
4. New requests use `restaurantB:` prefix (correct)
5. BUT: In-flight requests from step 2 may complete and cache with wrong prefix
6. Race condition allows cross-tenant pollution

### Evidence

Call sites missing cache clearing:
- `AdminDashboard.tsx:68-72`: `setCurrentRestaurantId(restaurant.id)` - no cache clear
- `AuthContext.tsx:104-119`: Multiple `setCurrentRestaurantId()` calls - no cache clear
- `RestaurantIdProvider.tsx:16-22`: Restaurant ID updated - no cache clear

## Proposed Solutions

### Option A: Call clearAllCachesForRestaurantSwitch() at All Call Sites (Recommended)
**Pros:** Complete protection, uses existing function
**Cons:** Multiple call sites to update
**Effort:** Medium (30 min)
**Risk:** Low

```typescript
// In each call site:
setCurrentRestaurantId(restaurant.id)
clearAllCachesForRestaurantSwitch()
```

### Option B: Auto-Clear in setCurrentRestaurantId()
**Pros:** Single point of change, DRY
**Cons:** Side effect may surprise callers
**Effort:** Small (10 min)
**Risk:** Medium (implicit behavior)

```typescript
export function setCurrentRestaurantId(restaurantId: string | null) {
  const previousId = currentRestaurantId
  currentRestaurantId = restaurantId
  if (previousId !== restaurantId) {
    clearAllCachesForRestaurantSwitch()
  }
}
```

### Option C: Clear In-Flight Requests Map
**Pros:** Handles race condition specifically
**Cons:** Doesn't address response cache
**Effort:** Small
**Risk:** Medium (incomplete fix)

## Recommended Action

Option B - Auto-clear in setCurrentRestaurantId() for single source of truth

## Technical Details

### Affected Files
- `client/src/services/http/httpClient.ts` (setCurrentRestaurantId function)

### Related Functions
- `clearAllCachesForRestaurantSwitch()` (line 362)
- `inFlightRequests` map (line 47) - should also be cleared

## Acceptance Criteria

- [ ] Cache cleared automatically when restaurant ID changes
- [ ] In-flight requests map cleared on switch
- [ ] Test: Switch restaurants, verify fresh data fetched
- [ ] Test: No stale data from previous restaurant visible

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during PR #151 review |

## Resources

- PR #151: https://github.com/mikeyoung304/July25/pull/151
- Related: TODO-104 (cache key tenant isolation)
