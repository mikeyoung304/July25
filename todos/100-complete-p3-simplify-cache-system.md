---
status: complete
priority: p3
issue_id: "100"
tags: [simplification, refactor, performance, cache]
dependencies: []
created_date: 2025-12-02
resolved_date: 2025-12-02
source: code-review-simplicity-agent
resolution: Already resolved - dual cache removed, only ResponseCache remains
---

# P3: Simplify Dual Cache System in HttpClient

## Problem

`HttpClient` maintains two parallel caching systems:

```typescript
// client/src/services/http/httpClient.ts
export class HttpClient extends SecureAPIClient {
  // Simple in-memory cache for GET requests
  private cache = new Map<string, CacheEntry<JsonValue>>();  // Cache 1

  // Response cache with LRU eviction
  private responseCache: ResponseCache;  // Cache 2

  // Track in-flight requests
  private inFlightRequests = new Map<string, Promise<JsonValue>>();

  // Request batcher (unused?)
  private batcher: RequestBatcher;
```

The `get()` method checks both caches:
```typescript
async get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
  // Check ResponseCache first
  const cachedResponse = this.responseCache.get(cacheKey);
  if (cachedResponse) { return cachedResponse as T; }

  // Fallback to simple cache
  const cached = this.cache.get(cacheKey);
  if (cached) { ... }

  // Make request and store in BOTH caches
  requestPromise.then(data => {
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    this.responseCache.set(cacheKey, data, { ttl });
  });
}
```

## Issues

1. **Redundancy:** Two caches storing same data
2. **Complexity:** Must reason about two cache systems
3. **Memory waste:** Data stored twice
4. **Unclear purpose:** Why both? Comments say "backward compatibility"
5. **Unused:** `RequestBatcher` initialized but never used

## Recommended Simplification

Keep only `ResponseCache` (has LRU eviction):

```typescript
export class HttpClient extends SecureAPIClient {
  private responseCache: ResponseCache;
  private inFlightRequests = new Map<string, Promise<JsonValue>>();

  constructor() {
    super(getApiUrl());
    this.responseCache = new ResponseCache({
      maxSize: 100,
      defaultTTL: 60000
    });
  }

  async get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
    const cacheKey = buildCacheKey(endpoint, options?.params);

    // Single cache check
    const cached = this.responseCache.get(cacheKey);
    if (cached) return cached as T;

    // Dedup in-flight
    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) return inFlight as Promise<T>;

    // Make request
    const promise = this.request<T>(endpoint, { ...options, method: 'GET' });
    this.inFlightRequests.set(cacheKey, promise);

    promise.then(data => {
      this.responseCache.set(cacheKey, data, { ttl: this.getCacheTTL(endpoint) });
    }).finally(() => {
      this.inFlightRequests.delete(cacheKey);
    });

    return promise;
  }
}
```

## Impact

- Remove ~50 lines of code
- Reduce memory usage (no duplicate storage)
- Simpler mental model
- Remove unused `RequestBatcher`

## Files to Modify

- `client/src/services/http/httpClient.ts` - Remove dual cache
- Verify no external code depends on `cache` Map

## References

- YAGNI principle
- Related: Performance optimization backlog
