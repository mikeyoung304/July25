# Multi-Tenant Cache Implementation Checklist

**Purpose:** Prevent cross-tenant data leakage through improperly isolated cache layers.

**Context:** PR #151 discovered that httpClient cache keys didn't include restaurant_id, creating risk of stale restaurant data being served when users switch contexts. Additionally, `clearAllCachesForRestaurantSwitch()` existed but wasn't guaranteed to be called consistently.

---

## Cache Key Design

- [ ] All cache keys include tenant/restaurant identifier as prefix:
  ```typescript
  // CORRECT: Tenant-scoped cache keys
  const restaurantId = getCurrentRestaurantId() || getRestaurantId()
  const cacheKey = `${restaurantId}:${endpoint}`

  // WRONG: No tenant isolation
  const cacheKey = endpoint
  ```

- [ ] Cache key format is consistent across all cache layers:
  - HTTP response cache: `{restaurantId}:{endpoint}?{params}`
  - localStorage: `cache:{restaurantId}:{key}`
  - IndexedDB: Include `restaurantId` in object store keys
  - React Query/SWR: `{restaurantId}:endpoint` in query keys

- [ ] Query parameters also included in cache key (to avoid serving stale filtered data):
  ```typescript
  const cacheKey = `${restaurantId}:${endpoint}?status=pending&limit=50`
  ```

- [ ] Cache key generation is centralized - single function to prevent drift:
  ```typescript
  // Recommended: Utility function
  export function getCacheKey(restaurantId: string, endpoint: string, params?: Record<string, unknown>): string {
    let key = `${restaurantId}:${endpoint}`
    if (params && Object.keys(params).length > 0) {
      const sp = new URLSearchParams()
      // ... build params
      key += `?${sp.toString()}`
    }
    return key
  }
  ```

---

## Cache Clearing Strategy

- [ ] Restaurant switch triggers cache clearing:
  ```typescript
  // In RestaurantContext or restaurant select handler
  export function setCurrentRestaurantId(restaurantId: string | null) {
    const previousId = currentRestaurantId
    currentRestaurantId = restaurantId

    // Clear caches when switching restaurants
    if (previousId !== null && previousId !== restaurantId) {
      clearAllCachesForRestaurantSwitch()
    }
  }
  ```

- [ ] Call to `clearAllCachesForRestaurantSwitch()` happens in exactly ONE place (restaurant context)

- [ ] Function clears ALL cache layers in correct order:
  ```typescript
  export function clearAllCachesForRestaurantSwitch(): void {
    // 1. Clear HTTP client caches
    httpClient.clearCache()

    // 2. Clear localStorage with tenant prefixes
    // 3. Clear IndexedDB if used
    // 4. Clear React Query cache if used
    // 5. Clear any other cache frameworks
  }
  ```

- [ ] Logging documents what was cleared:
  ```typescript
  logger.info('[Multi-tenant] Cleared all caches', {
    previousRestaurantId,
    newRestaurantId,
    cacheEntriesRemoved: count
  })
  ```

- [ ] No silent failures - if cache clear fails, error is logged

---

## Race Condition Prevention

- [ ] In-flight requests are tracked and deduped:
  ```typescript
  // Prevent duplicate concurrent requests for same cache key
  private inFlightRequests = new Map<string, Promise<JsonValue>>()

  const inFlight = this.inFlightRequests.get(cacheKey)
  if (inFlight) {
    return inFlight // Wait for existing request
  }
  ```

- [ ] Restaurant switch waits for pending requests before clearing cache (or clears cache first):
  ```typescript
  // Option 1: Clear cache first (new requests will fetch fresh)
  if (previousId !== null && previousId !== restaurantId) {
    clearAllCachesForRestaurantSwitch()
    // New requests are now forced to fetch fresh data
  }

  // Option 2: Drain pending requests first
  await httpClient.drainInFlightRequests()
  clearAllCachesForRestaurantSwitch()
  ```

- [ ] Cache key includes params that prevent request collisions:
  ```typescript
  // These are different cache keys (won't collide)
  `rest-a:GET /api/v1/orders?status=pending`
  `rest-b:GET /api/v1/orders?status=pending`
  ```

---

## Cache Layer Coverage

- [ ] HTTP response cache is scoped by restaurant:
  - httpClient.get() includes `restaurantId` in key (DONE - see httpClient.ts line 219)
  - ResponseCache.ts uses passed keys as-is (no additional munging)

- [ ] localStorage entries use restaurant-scoped prefixes:
  ```typescript
  // CORRECT: Tenant-scoped
  localStorage.setItem(`menu:${restaurantId}:categories`, data)

  // WRONG: Not scoped
  localStorage.setItem('menu:categories', data)
  ```

- [ ] IndexedDB/Dexie stores use tenant ID in key:
  ```typescript
  // If storing cache in DB: db.cache.add({ key: `${restaurantId}:...`, value, ... })
  ```

- [ ] React Query/SWR/Zustand cache keys include restaurant ID:
  ```typescript
  // React Query example
  useQuery({
    queryKey: [restaurantId, 'orders'],  // restaurantId first
    queryFn: () => fetchOrders(restaurantId)
  })
  ```

- [ ] Service Worker cache (if used) keys include restaurant ID in request URL

---

## Testing & Validation

- [ ] Test: Switch restaurants while requests in-flight
  - User on Restaurant A, fetches orders
  - Mid-request, switch to Restaurant B
  - Verify Restaurant A data is not returned

- [ ] Test: Verify cross-tenant pollution doesn't occur
  - Login to Restaurant A, fetch menu
  - Login to Restaurant B
  - Verify Restaurant B sees its own menu, not Restaurant A's cached version

- [ ] Test: Cache clearing function is called
  ```typescript
  // Add spy or mock
  jest.spyOn(httpClient, 'clearCache')
  setCurrentRestaurantId('new-id')
  expect(httpClient.clearCache).toHaveBeenCalled()
  ```

- [ ] Test: Concurrent requests with different restaurants
  - Simulate restaurant switch
  - Ensure response goes to correct restaurant (not served from wrong cache)

- [ ] Manual verification in DevTools
  - Check `window.__httpCache.getStats()` shows correct key structure with restaurant IDs
  - Verify localStorage keys have tenant prefix when multi-restaurant feature is used

---

## Code Review Checklist Items

- [ ] Cache keys are NOT just endpoint - they include restaurant/tenant ID
- [ ] clearAllCachesForRestaurantSwitch() is called on every restaurant context change
- [ ] localStorage keys use tenant-scoped prefixes
- [ ] Query parameters included in cache keys
- [ ] logger (not console) used for cache operations
- [ ] No hardcoded "default" restaurant ID in cache keys
- [ ] Service-to-service calls use service_role, bypassing auth cache entirely

---

## Common Mistakes to Prevent

1. **Cache key without tenant prefix** - Creates cross-tenant pollution on restaurant switch
2. **Clearing cache but not calling it** - Function exists but no call sites in restaurant context
3. **Query params not in key** - Serving filtered data to wrong audience (e.g., pending orders to all statuses)
4. **Race condition during switch** - New request fetches stale cache from previous restaurant
5. **Multiple cache layers with different scoping** - Some scoped, some not
6. **localStorage keys without prefixes** - Often overlooked since in-memory cache is cleared
7. **In-flight request collisions** - Not deduping by cache key, duplicate fetches
8. **No logging of cache operations** - Hard to debug when things go wrong in production

---

## References

- [TODO-104: Cache Key Tenant Isolation](../../todos/104-open-p1-cache-key-tenant-isolation.md)
- [TODO-109: Cache Clear on Restaurant Switch](../../todos/109-resolved-p1-cache-clear-on-restaurant-switch.md)
- [TODO-110: No Tenant Cache Fallback](../../todos/110-resolved-p2-no-tenant-cache-fallback.md)
- Client implementation: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/http/httpClient.ts`
- PR #151 follow-up: Cross-tenant cache pollution detection

---

## Implementation Status

- [x] httpClient cache keys include restaurantId prefix (line 219)
- [x] clearAllCachesForRestaurantSwitch() automatically called on context change (line 27-31)
- [x] In-flight request deduplication implemented (line 56, 242-248)
- [x] localStorage cache clearing implemented (line 376-393)
- [x] logger used instead of console (throughout)
- [ ] IndexedDB scoping (if applicable - not currently used)
- [ ] React Query cache key audit (if applicable)
- [ ] Service Worker cache scoping (if applicable - not currently used)
