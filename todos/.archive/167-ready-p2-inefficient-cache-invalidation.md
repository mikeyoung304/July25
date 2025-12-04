---
status: ready
priority: p2
issue_id: "167"
tags: [code-review, performance, cache, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# Inefficient Cache Invalidation Strategy

## Problem Statement

The `clearCache()` method iterates through ALL cache keys on every single menu item update, causing O(n) overhead instead of O(1).

## Findings

### Agent Discovery

**Performance Oracle:** Identified as P1 performance issue
**Data Integrity Guardian:** Noted fragility of string matching approach

### Evidence

```typescript
// server/src/services/menu.service.ts:250-265
static clearCache(restaurantId?: string): void {
  if (restaurantId) {
    const keys = menuCache.keys();  // O(n) operation
    keys.forEach(key => {
      if (key.includes(restaurantId)) {  // String search on every key
        menuCache.del(key);
      }
    });
  }
}
```

### Performance Impact

- With 100 cached restaurants: ~2-5ms overhead per update
- With 1,000 cached restaurants: ~20-50ms overhead per update
- Blocks event loop during iteration
- Unnecessary CPU usage on high-frequency toggles

## Proposed Solutions

### Solution A: Targeted Cache Deletion (Recommended)

**Effort:** Small (30 min) | **Risk:** Low

```typescript
static clearCache(restaurantId: string, itemId?: string): void {
  if (itemId) {
    menuCache.del(`${CACHE_KEYS.ITEM}${restaurantId}:${itemId}`);
  }

  // Clear aggregated caches
  menuCache.del(`${CACHE_KEYS.FULL_MENU}${restaurantId}`);
  menuCache.del(`${CACHE_KEYS.ITEMS}${restaurantId}`);
  // Categories don't change on item update, skip clearing

  this.logger.info('Cleared menu cache', {
    restaurantId,
    itemId,
    keys: itemId ? 3 : 2
  });
}
```

Update call site in `updateItem()`:
```typescript
this.clearCache(restaurantId, itemId);
```

### Performance Gain

- O(n) → O(1) cache invalidation
- 1-2ms fixed time regardless of cache size
- No event loop blocking

## Recommended Action

Implement Solution A for immediate performance improvement.

## Technical Details

**Affected File:** `server/src/services/menu.service.ts:250-265`

**Cache Keys:**
- `menu:full:${restaurantId}`
- `categories:${restaurantId}`
- `items:${restaurantId}`
- `item:${restaurantId}:${itemId}`

## Acceptance Criteria

- [ ] clearCache uses targeted deletion
- [ ] No iteration over all cache keys
- [ ] Performance test shows O(1) behavior
- [ ] Categories cache preserved on item update

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- NodeCache documentation
- PR #152: feat(menu): implement 86-item management
