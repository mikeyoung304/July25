---
status: pending
priority: p1
issue_id: "132"
tags: [code-review, logging, standards, kitchen]
dependencies: []
---

# TODO-132: console.error used instead of logger service

## Problem Statement

`KitchenDisplayOptimized.tsx` uses `console.error()` which violates the codebase's logging standards. Per CLAUDE.md: "Use logger, never console.log - enforced by pre-commit hook."

## Findings

### Evidence
```typescript
// KitchenDisplayOptimized.tsx:69
console.error('Failed to update order status:', orderId)

// KitchenDisplayOptimized.tsx:92
console.error('Failed to manually fire order:', orderId)
```

### ExpoTabContent also lacks logging
- No logger import
- No error logging in async handlers (lines 104-110)
- Errors silently swallowed

## Proposed Solutions

### Solution 1: Replace with logger (Recommended)
Import and use centralized logger service.

**Pros:** Consistent with codebase, proper error tracking
**Cons:** None
**Effort:** Small
**Risk:** Low

```typescript
import { logger } from '@/services/logger'

// Replace console.error with:
logger.error('Failed to update order status', { orderId, status })
logger.error('Failed to manually fire order', { orderId })
```

## Recommended Action
<!-- To be filled during triage -->

## Technical Details

**Affected Files:**
- `client/src/pages/KitchenDisplayOptimized.tsx:69, 92`
- `client/src/components/kitchen/ExpoTabContent.tsx` (add error logging)

## Acceptance Criteria

- [ ] All console.error replaced with logger.error
- [ ] ExpoTabContent imports and uses logger
- [ ] Error context includes relevant data (orderId, status)
- [ ] Pre-commit hook passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Standards violation found |

## Resources

- Logger service: `client/src/services/logger.ts`
- CLAUDE.md logging requirements: line 136-141
