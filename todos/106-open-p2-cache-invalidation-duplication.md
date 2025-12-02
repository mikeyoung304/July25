---
status: resolved
priority: p2
issue_id: "106"
tags: [code-quality, dry, refactor, code-review]
dependencies: []
resolved_date: 2025-12-02
resolved_by: fix/code-review-p1-p2-followup
---

# Cache Invalidation Code Duplicated 4x in httpClient

## Problem Statement

The same 9-line cache invalidation block is repeated in POST, PUT, PATCH, and DELETE methods (36 lines total of duplicated code).

## Findings

### Code Simplicity Agent Discovery
From `client/src/services/http/httpClient.ts`:
```typescript
// Lines 278-284 (POST), 303-309 (PUT), 328-334 (PATCH), 349-355 (DELETE)
// Identical code repeated 4 times:
if (endpoint.includes('/menu')) {
  this.clearCache('/api/v1/menu')
} else if (endpoint.includes('/tables')) {
  this.clearCache('/api/v1/tables')
} else if (endpoint.includes('/voice-config')) {
  this.clearCache('/api/v1/voice-config/menu')
}
```

### Irony
The PR claims to fix "TODO-099 duplication" in metrics.ts but introduces new duplication here.

## Proposed Solutions

### Option A: Extract Helper Method (Recommended)
**Pros:** Single source of truth, DRY
**Cons:** Minor refactor
**Effort:** Small (15 min)
**Risk:** Low

```typescript
private clearRelatedCache(endpoint: string): void {
  if (endpoint.includes('/menu')) {
    this.clearCache('/api/v1/menu')
  } else if (endpoint.includes('/tables')) {
    this.clearCache('/api/v1/tables')
  } else if (endpoint.includes('/voice-config')) {
    this.clearCache('/api/v1/voice-config/menu')
  }
}

// Then in each method:
async post<T>(endpoint: string, data?: unknown, options?: HttpRequestOptions): Promise<T> {
  this.clearRelatedCache(endpoint)
  return this.request<T>(endpoint, { /* ... */ })
}
```

### Option B: Leave As-Is
**Pros:** No change
**Cons:** Violates DRY, harder to maintain
**Effort:** None
**Risk:** Low (but tech debt)

## Recommended Action

Option A - Extract helper method

## Technical Details

### Affected Files
- `client/src/services/http/httpClient.ts` (lines 278-358)

### Impact
- Reduces 36 lines to ~13 lines (63% reduction)
- Single point of maintenance for cache patterns

## Acceptance Criteria

- [x] Helper method `clearRelatedCache()` created
- [x] All 4 mutation methods use helper
- [x] Cache invalidation behavior unchanged
- [x] Tests pass

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during PR #150 review |
| 2025-12-02 | Resolved | Extracted clearRelatedCache() helper, reduced 36 lines to ~13 |

## Resources

- PR #150: https://github.com/owner/repo/pull/150
