---
status: ready
priority: p1
issue_id: "164"
tags: [code-review, logging, standards-violation, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# CRITICAL: Console.log Violations in MenuService

## Problem Statement

The client MenuService uses `console.error()` instead of the required `logger` service, violating project standards documented in CLAUDE.md.

## Findings

### Agent Discovery

**Security Sentinel:** Console operations may leak sensitive error details
**Architecture Strategist:** Violates logging standard (CLAUDE.md)
**Code Quality Reviewer:** Pre-commit hook should catch this

### Evidence

```typescript
// client/src/services/menu/MenuService.ts
Line 83:  console.error('Menu API failed:', error);
Line 103: console.error('Menu items API failed:', error);
Line 123: console.error('Menu categories API failed:', error);
```

### CLAUDE.md Requirement

> ### Logging
> ```typescript
> // Client-side
> import { logger } from '@/services/logger';
> logger.info('Message', { data });
> // Never use console.log - enforced by pre-commit hook
> ```

### Impact

- Violates codebase standards
- Console operations block event loop (~1-5ms each)
- May leak sensitive error details to browser console
- Not captured by logging infrastructure

## Proposed Solutions

### Solution A: Replace with Logger Service (Recommended)

**Effort:** Small (10 min) | **Risk:** Low

```typescript
import { logger } from '@/services/logger';

// Line 83
logger.error('Menu API failed', { error, context: 'getMenu' });

// Line 103
logger.error('Menu items API failed', { error, context: 'getMenuItems' });

// Line 123
logger.error('Menu categories API failed', { error, context: 'getMenuCategories' });
```

## Recommended Action

Implement Solution A - simple find/replace with structured logging.

## Technical Details

**Affected File:** `client/src/services/menu/MenuService.ts:83,103,123`

**Logger Import:** `import { logger } from '@/services/logger';`

## Acceptance Criteria

- [ ] All `console.error` replaced with `logger.error`
- [ ] Structured context added to each log call
- [ ] No console.* calls remain in MenuService
- [ ] Pre-commit hook passes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- CLAUDE.md logging standards
- Logger service: `client/src/services/logger.ts`
- PR #152: feat(menu): implement 86-item management
