---
status: resolved
priority: p2
issue_id: "147"
tags: [code-review, error-handling, typescript]
dependencies: []
created_date: 2025-12-02
source: workflows-review-commit-0728e1ee
---

# Unsafe Error Property Access in useServerView

## Problem Statement

The error handling in useServerView.ts accesses `error.message` and `error.status` without type guards, which could cause runtime errors if the error doesn't have these properties.

## Findings

### Evidence

```typescript
// useServerView.ts lines 118-119
logger.error('Failed to load floor plan:', {
  error: error.message,   // Assumes error has .message
  status: error.status,   // Assumes error has .status
  isInitial: isInitialLoad.current
})
```

## Proposed Solutions

### Option A: Add type guards (Recommended)
**Effort:** Small | **Risk:** Low

```typescript
logger.error('Failed to load floor plan:', {
  error: error instanceof Error ? error.message : 'Unknown error',
  status: ('status' in error && typeof error.status === 'number') ? error.status : undefined,
  isInitial: isInitialLoad.current
})
```

## Technical Details

### Affected Files
- `client/src/pages/hooks/useServerView.ts` (lines 117-121)

## Acceptance Criteria

- [ ] Type-safe error property access
- [ ] No runtime errors on unusual error types
