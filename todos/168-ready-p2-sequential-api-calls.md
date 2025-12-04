---
status: ready
priority: p2
issue_id: "168"
tags: [code-review, performance, api, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# Sequential API Calls (Waterfall Pattern) in MenuService

## Problem Statement

The `getMenuItems()` method makes sequential API calls for categories then items, adding 50-200ms latency to menu management load.

## Findings

### Agent Discovery

**Performance Oracle:** Identified waterfall pattern adding unnecessary latency

### Evidence

```typescript
// client/src/services/menu/MenuService.ts:98-101
async getMenuItems(): Promise<MenuItem[]> {
  // 1st request: Fetch categories (100-150ms)
  const categories = await this.getMenuCategories()

  // 2nd request: Fetch items (150-300ms)
  const response = await httpClient.get<any[]>('/api/v1/menu/items')

  // Total: 250-450ms (sequential waterfall)
  return response.map(item => this.transformMenuItem(item, categories))
}
```

### Performance Impact

- Categories API: ~100-150ms
- Items API: ~150-300ms
- **Total: 250-450ms (waterfall)**
- Parallel would be: ~150-300ms (max of both)

## Proposed Solutions

### Solution A: Parallel Fetches (Recommended)

**Effort:** Small (15 min) | **Risk:** Low

```typescript
async getMenuItems(): Promise<MenuItem[]> {
  // Fire both requests simultaneously
  const [categories, response] = await Promise.all([
    this.getMenuCategories(),
    httpClient.get<any[]>('/api/v1/menu/items')
  ]);

  // Total: ~150-300ms (parallel, max of both)
  return response.map(item => this.transformMenuItem(item, categories))
}
```

### Solution B: Backend Denormalization

**Effort:** Medium | **Risk:** Low

Include category data in items response, eliminating need for separate category fetch.

## Recommended Action

Implement Solution A for immediate 40-50% latency reduction.

## Technical Details

**Affected File:** `client/src/services/menu/MenuService.ts:98-101`

**Used by:** `MenuManagement.tsx:82` - blocks initial render

## Acceptance Criteria

- [ ] getMenuItems uses Promise.all for parallel fetches
- [ ] Menu management load time reduced by 40-50%
- [ ] No functional changes to returned data
- [ ] Error handling preserved

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- PR #152: feat(menu): implement 86-item management
