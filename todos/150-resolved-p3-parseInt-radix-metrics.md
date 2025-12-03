---
status: resolved
priority: p3
issue_id: "150"
tags: [code-review, best-practices]
dependencies: []
created_date: 2025-12-02
source: workflows-review-commit-0728e1ee
---

# Missing Radix and Upper Bound in parseInt

## Problem Statement

`parseInt()` calls in metrics.ts lack radix parameter and upper bound checking.

## Findings

```typescript
// server/src/routes/metrics.ts:89-90
slowRenders: Math.max(0, parseInt(metrics.slowRenders) || 0)  // Missing radix
slowAPIs: Math.max(0, parseInt(metrics.slowAPIs) || 0)        // No upper bound
```

## Proposed Solutions

```typescript
slowRenders: Math.min(1000000, Math.max(0, parseInt(metrics.slowRenders, 10) || 0)),
slowAPIs: Math.min(1000000, Math.max(0, parseInt(metrics.slowAPIs, 10) || 0))
```

## Technical Details

### Affected Files
- `server/src/routes/metrics.ts` (lines 89-90)

## Acceptance Criteria

- [ ] Radix 10 specified
- [ ] Reasonable upper bound added
