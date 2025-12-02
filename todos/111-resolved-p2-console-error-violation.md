---
status: pending
priority: p2
issue_id: "111"
tags: [code-quality, logging, conventions, code-review]
dependencies: []
created_date: 2025-12-02
source: pr-151-review
---

# console.error() Violates Project Logging Convention

## Problem Statement

The httpClient uses `console.error()` instead of `logger.error()`, violating the project's logging convention from CLAUDE.md.

## Findings

### Code Quality Agent Discovery

**Current Code** (httpClient.ts lines 61-62):
```typescript
console.error('Production build is trying to connect to localhost backend!')
console.error('Please set VITE_API_BASE_URL to your production backend URL')
```

### Project Convention

From CLAUDE.md:
> "Use `logger`, never `console.log` - enforced by pre-commit hook"

### Impact

- Inconsistent logging across codebase
- Missing structured logging metadata
- Pre-commit hook should have caught this (may indicate hook gap)

## Proposed Solutions

### Option A: Replace with logger.error() (Recommended)
**Pros:** Follows convention, structured logging
**Cons:** None
**Effort:** Small (5 min)
**Risk:** None

```typescript
logger.error('Production build is trying to connect to localhost backend!', {
  baseURL,
  env: 'production'
})
logger.error('Please set VITE_API_BASE_URL to your production backend URL')
```

## Recommended Action

Option A - Replace with logger.error()

## Technical Details

### Affected Files
- `client/src/services/http/httpClient.ts` (lines 61-62)

## Acceptance Criteria

- [ ] console.error() replaced with logger.error()
- [ ] Pre-commit hook validates this file
- [ ] No console.* statements in production code

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during PR #151 review |

## Resources

- PR #151: https://github.com/mikeyoung304/July25/pull/151
- CLAUDE.md logging convention
