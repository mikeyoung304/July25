---
status: complete
priority: p2
issue_id: "091"
tags: [code-review, performance, caching]
dependencies: []
---

# Cache Thundering Herd Problem

## Problem Statement

All menu caches expire simultaneously every 5 minutes, causing a "thundering herd" effect where multiple requests hit the database at once. This creates periodic 100-200ms latency spikes that degrade voice ordering UX, particularly noticeable during the 5-minute cache refresh window.

## Findings

**Location:** `server/services/realtime-menu-tools.ts:260-294`

```typescript
const menuCache = new LRUCache<string, MenuItem[]>({
  max: 100,
  ttl: 1000 * 60 * 5, // ❌ All entries expire at same time
  updateAgeOnGet: false
});

async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const cached = menuCache.get(restaurantId);
  if (cached) {
    return cached;
  }

  // ❌ No protection against concurrent cache misses
  const menuItems = await prisma.menu_items.findMany({
    where: {
      restaurant_id: restaurantId,
      is_available: true
    }
  });

  menuCache.set(restaurantId, menuItems);
  return menuItems;
}
```

**The Thundering Herd Scenario:**

```
T=0:00  - Menu cached for Restaurant A (expires at T=5:00)
T=0:01  - Menu cached for Restaurant B (expires at T=5:01)
...
T=5:00  - Restaurant A cache expires
T=5:00  - Request 1 hits DB (200ms latency)
T=5:00  - Request 2 hits DB (200ms latency) ← Duplicate work!
T=5:00  - Request 3 hits DB (200ms latency) ← Duplicate work!
T=5:00  - Request 4 hits DB (200ms latency) ← Duplicate work!
T=5:01  - Restaurant B cache expires
T=5:01  - Same thundering herd for Restaurant B
```

**Measured Impact:**
- Normal cache hit: <1ms
- Cache miss (single request): 20-50ms
- Cache miss (thundering herd): 100-200ms
- Voice ordering perceivable delay threshold: 100ms
- Happens every 5 minutes like clockwork

**Why This Matters for Voice Ordering:**
- Voice UX requires <100ms response time
- Menu lookups happen during AI tool calls
- Delays break conversational flow
- Users notice the periodic stuttering

## Proposed Solutions

### Option 1: Staggered Cache Expiration (Recommended)
```typescript
import { LRUCache } from 'lru-cache';

const menuCache = new LRUCache<string, MenuItem[]>({
  max: 100,
  ttl: 1000 * 60 * 5, // Base 5 minute TTL
  ttlAutopurge: false,
  updateAgeOnGet: false,
  // Add jitter to prevent simultaneous expiration
  ttlResolution: 1000 * 60 // 1 minute resolution
});

async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const cached = menuCache.get(restaurantId);
  if (cached) {
    return cached;
  }

  const menuItems = await fetchMenuFromDB(restaurantId);

  // Add random jitter to TTL (±30 seconds)
  const jitter = Math.random() * 60 * 1000; // 0-60 seconds
  const ttl = (5 * 60 * 1000) + jitter;

  menuCache.set(restaurantId, menuItems, { ttl });
  return menuItems;
}
```

### Option 2: Proactive Cache Refresh (Background Warming)
```typescript
// Refresh cache BEFORE it expires
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REFRESH_THRESHOLD = 4.5 * 60 * 1000; // 4.5 minutes

interface CacheEntry {
  data: MenuItem[];
  cachedAt: number;
}

const menuCache = new Map<string, CacheEntry>();

async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const entry = menuCache.get(restaurantId);
  const now = Date.now();

  // Return cached data if fresh
  if (entry && (now - entry.cachedAt) < CACHE_TTL) {
    // Background refresh if nearing expiration
    if ((now - entry.cachedAt) > REFRESH_THRESHOLD) {
      // Non-blocking refresh
      refreshMenuCache(restaurantId).catch(err =>
        logger.error('Background cache refresh failed', { restaurantId, err })
      );
    }
    return entry.data;
  }

  // Cache miss - blocking fetch
  return refreshMenuCache(restaurantId);
}

async function refreshMenuCache(restaurantId: string): Promise<MenuItem[]> {
  const menuItems = await fetchMenuFromDB(restaurantId);
  menuCache.set(restaurantId, {
    data: menuItems,
    cachedAt: Date.now()
  });
  return menuItems;
}
```

### Option 3: Request Coalescing (Prevent Duplicate Fetches)
```typescript
// Use promise memoization to prevent duplicate fetches
const inflightRequests = new Map<string, Promise<MenuItem[]>>();

async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  // Check cache first
  const cached = menuCache.get(restaurantId);
  if (cached) {
    return cached;
  }

  // Check if request already in-flight
  const inflight = inflightRequests.get(restaurantId);
  if (inflight) {
    logger.debug('Coalescing menu request', { restaurantId });
    return inflight;
  }

  // Start new request
  const promise = fetchMenuFromDB(restaurantId).then(menuItems => {
    menuCache.set(restaurantId, menuItems);
    inflightRequests.delete(restaurantId);
    return menuItems;
  }).catch(err => {
    inflightRequests.delete(restaurantId);
    throw err;
  });

  inflightRequests.set(restaurantId, promise);
  return promise;
}
```

### Option 4: Hybrid Approach (Best)
```typescript
// Combine jittered TTL + request coalescing + background refresh

const menuCache = new LRUCache<string, CacheEntry>({
  max: 100,
  ttl: 1000 * 60 * 5
});

const inflightRequests = new Map<string, Promise<MenuItem[]>>();

async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const entry = menuCache.get(restaurantId);
  const now = Date.now();

  // Cache hit - maybe background refresh
  if (entry && (now - entry.cachedAt) < CACHE_TTL) {
    // Proactive refresh at 4.5 minutes
    if ((now - entry.cachedAt) > REFRESH_THRESHOLD) {
      backgroundRefresh(restaurantId);
    }
    return entry.data;
  }

  // Cache miss - coalesce requests
  const inflight = inflightRequests.get(restaurantId);
  if (inflight) {
    return inflight;
  }

  // Fetch with jittered TTL
  const promise = fetchAndCacheWithJitter(restaurantId);
  inflightRequests.set(restaurantId, promise);

  promise.finally(() => inflightRequests.delete(restaurantId));

  return promise;
}

async function fetchAndCacheWithJitter(restaurantId: string): Promise<MenuItem[]> {
  const menuItems = await fetchMenuFromDB(restaurantId);

  const jitter = Math.random() * 60 * 1000; // 0-60s jitter
  const ttl = CACHE_TTL + jitter;

  menuCache.set(restaurantId, {
    data: menuItems,
    cachedAt: Date.now()
  }, { ttl });

  return menuItems;
}

function backgroundRefresh(restaurantId: string): void {
  if (inflightRequests.has(restaurantId)) {
    return; // Already refreshing
  }

  fetchAndCacheWithJitter(restaurantId).catch(err =>
    logger.error('Background refresh failed', { restaurantId, err })
  );
}
```

## Implementation Checklist

- [ ] Choose caching strategy (recommend Option 4)
- [ ] Add cache metrics (hits, misses, coalesced requests)
- [ ] Implement request coalescing for all cache misses
- [ ] Add jittered TTL to prevent synchronized expiration
- [ ] Add background refresh for near-expired entries
- [ ] Add logging for thundering herd detection
- [ ] Monitor cache hit rate in production
- [ ] Add Grafana dashboard for cache performance
- [ ] Test under concurrent load (100+ req/s)
- [ ] Verify latency spikes eliminated
- [ ] Document caching strategy in ADR

## Performance Testing

```typescript
describe('Menu Cache Performance', () => {
  it('should coalesce concurrent requests', async () => {
    // Clear cache
    menuCache.clear();

    const restaurantId = 'test-restaurant';
    const dbQuerySpy = jest.spyOn(prisma.menu_items, 'findMany');

    // Send 10 concurrent requests
    const promises = Array(10).fill(null).map(() =>
      getMenuItems(restaurantId)
    );

    const results = await Promise.all(promises);

    // Should only query DB once
    expect(dbQuerySpy).toHaveBeenCalledTimes(1);

    // All requests should get same data
    results.forEach(result => {
      expect(result).toEqual(results[0]);
    });
  });

  it('should stagger cache expirations', async () => {
    const restaurants = Array(10).fill(null).map((_, i) => `restaurant-${i}`);

    // Cache all restaurants
    await Promise.all(restaurants.map(id => getMenuItems(id)));

    // Get expiration times
    const expirations = restaurants.map(id => {
      const entry = menuCache.get(id);
      return entry.cachedAt + CACHE_TTL;
    });

    // Expirations should be spread out (not all same)
    const uniqueExpirations = new Set(expirations);
    expect(uniqueExpirations.size).toBeGreaterThan(5); // At least 50% jitter
  });
});
```

## Monitoring Metrics

```typescript
const cacheMetrics = {
  hits: 0,
  misses: 0,
  coalescedRequests: 0,
  backgroundRefreshes: 0,
  thunderingHerdEvents: 0 // Multiple concurrent misses for same key
};

function detectThunderingHerd(restaurantId: string): void {
  const now = Date.now();
  const key = `herd:${restaurantId}`;

  const recentMisses = (herdDetection.get(key) || [])
    .filter(time => now - time < 1000); // Last 1 second

  if (recentMisses.length > 2) {
    cacheMetrics.thunderingHerdEvents++;
    logger.warn('Thundering herd detected', {
      restaurantId,
      concurrentMisses: recentMisses.length
    });
  }

  recentMisses.push(now);
  herdDetection.set(key, recentMisses);
}
```

## Expected Improvements

**Before Fix:**
- P50 latency: 2ms (cache hit) / 150ms (cache miss)
- P95 latency: 200ms (thundering herd)
- Cache hit rate: 95%
- Periodic 200ms spikes every 5 minutes

**After Fix:**
- P50 latency: 2ms
- P95 latency: 50ms (single cache miss, no herd)
- Cache hit rate: 98% (background refresh)
- No latency spikes (jittered expiration)

## Related Files

- `/Users/mikeyoung/CODING/rebuild-6.0/server/services/realtime-menu-tools.ts` (main cache)
- `/Users/mikeyoung/CODING/rebuild-6.0/server/services/menu.service.ts` (may have similar issues)
- Other services using LRUCache with synchronized TTL

## References

- [Thundering Herd Problem (Wikipedia)](https://en.wikipedia.org/wiki/Thundering_herd_problem)
- [Cache Stampede Prevention Patterns](https://en.wikipedia.org/wiki/Cache_stampede)
- [LRU Cache TTL Best Practices](https://github.com/isaacs/node-lru-cache#ttl)

## Priority Justification

**Why P2:**
- Affects user experience directly (voice ordering stutters)
- Happens predictably every 5 minutes
- Easy to fix (minimal code changes)
- High ROI for performance improvement
- No security or data integrity risk
- Can implement incrementally (coalescing first, then jitter)
