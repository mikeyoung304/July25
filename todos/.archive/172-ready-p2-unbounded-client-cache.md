---
status: ready
priority: p2
issue_id: "172"
tags: [code-review, performance, memory, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# Unbounded Cache Growth in Client MenuService

## Problem Statement

The `categoriesCache` Map in MenuService grows indefinitely without size limits, TTL, or eviction policy - potential memory leak over long sessions.

## Findings

### Agent Discovery

**Performance Oracle:** Identified memory leak potential

### Evidence

```typescript
// client/src/services/menu/MenuService.ts:13
export class MenuService implements IMenuService {
  private categoriesCache: Map<string, MenuCategory> = new Map()
  // ⚠️ No size limit, no TTL, no eviction policy
}
```

### Usage

- Line 77: Cache populated on every `getMenu()` call
- Line 120: Cache populated on every `getMenuCategories()` call
- Line 28-33: Cache accessed during item transformation

### Memory Impact

- Typical category: ~200 bytes
- With 10 categories: ~2KB (negligible)
- **Issue:** Cache persists across restaurant switches
- Multi-restaurant session: Could accumulate 100+ categories over hours

## Proposed Solutions

### Solution A: Remove Client Cache (Recommended)

**Effort:** Small (15 min) | **Risk:** Low

Backend already caches categories with 300s TTL. Client doesn't need second layer.

```typescript
export class MenuService implements IMenuService {
  // Delete: private categoriesCache: Map<string, MenuCategory> = new Map()

  // Rely on backend cache + HTTP cache headers
}
```

### Solution B: Add TTL-Based Eviction

**Effort:** Medium | **Risk:** Low

```typescript
import { LRUCache } from 'lru-cache';

export class MenuService implements IMenuService {
  private categoriesCache = new LRUCache<string, MenuCategory>({
    max: 100,
    ttl: 300_000,  // 5 min TTL
  });
}
```

## Recommended Action

Implement Solution A - remove redundant cache layer.

## Technical Details

**Affected File:** `client/src/services/menu/MenuService.ts:13`

**Backend Cache:** 300s TTL, properly scoped

## Acceptance Criteria

- [ ] Client cache removed or TTL added
- [ ] No memory growth over long sessions
- [ ] No performance regression (backend cache handles it)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- Backend cache: `server/src/services/menu.service.ts`
- PR #152: feat(menu): implement 86-item management
