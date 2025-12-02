---
status: pending
priority: p2
issue_id: "112"
tags: [code-quality, maintainability, code-review]
dependencies: []
created_date: 2025-12-02
source: pr-151-review
---

# Cache Invalidation Uses Fragile endpoint.includes() Matching

## Problem Statement

The `clearRelatedCache()` helper uses `endpoint.includes()` for matching, which is fragile and can cause false positives.

## Findings

### Code Quality Agent Discovery

**Current Code** (httpClient.ts lines 281-288):
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
```

### Problems

1. `/api/v1/menu/items/123` matches `/menu` → clears ALL menu caches
2. `/api/v1/user/menu-preferences` would match `/menu` (false positive)
3. No protection against endpoint typos or similar names
4. Difficult to extend for new endpoints

## Proposed Solutions

### Option A: Use startsWith() for Precise Matching (Recommended)
**Pros:** More precise, less false positives
**Cons:** Minor code change
**Effort:** Small (10 min)
**Risk:** Low

```typescript
private clearRelatedCache(endpoint: string): void {
  if (endpoint.startsWith('/api/v1/menu')) {
    this.clearCache('/api/v1/menu')
  } else if (endpoint.startsWith('/api/v1/tables')) {
    this.clearCache('/api/v1/tables')
  } else if (endpoint.startsWith('/api/v1/voice-config')) {
    this.clearCache('/api/v1/voice-config/menu')
  }
}
```

### Option B: Use Endpoint Constants Map
**Pros:** Centralized configuration, extensible
**Cons:** More code
**Effort:** Medium (20 min)
**Risk:** Low

```typescript
const CACHE_INVALIDATION_MAP: Record<string, string[]> = {
  '/api/v1/menu': ['/api/v1/menu', '/api/v1/menu/categories'],
  '/api/v1/tables': ['/api/v1/tables'],
  '/api/v1/voice-config': ['/api/v1/voice-config/menu']
}

private clearRelatedCache(endpoint: string): void {
  for (const [prefix, caches] of Object.entries(CACHE_INVALIDATION_MAP)) {
    if (endpoint.startsWith(prefix)) {
      caches.forEach(cache => this.clearCache(cache))
      return
    }
  }
}
```

## Recommended Action

Option A for immediate fix, Option B for long-term maintainability

## Technical Details

### Affected Files
- `client/src/services/http/httpClient.ts` (lines 280-288)

## Acceptance Criteria

- [ ] Replace includes() with startsWith()
- [ ] Test: Similar endpoint names don't cause false cache clearing
- [ ] Document cache invalidation patterns

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during PR #151 review |

## Resources

- PR #151: https://github.com/mikeyoung304/July25/pull/151
