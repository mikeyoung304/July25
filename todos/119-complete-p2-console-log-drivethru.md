---
status: complete
priority: p2
issue_id: 119
tags: [code-review, logging, standards, pre-commit]
dependencies: []
---

# Console.log in DriveThruPage Violates Project Standards

## Problem Statement

`client/src/pages/DriveThruPage.tsx` uses `console.log` and `console.warn` at lines 54, 62, and 65, violating the project's logging standards. All logging should use the structured `logger` service for consistency, searchability, and proper log levels.

## Findings

**Location**: `client/src/pages/DriveThruPage.tsx:54, 62, 65`

**Current Implementation**:
```typescript
// Line 54
console.log('[DriveThru] Order created:', result);

// Line 62
console.log('[DriveThru] Sending voice order:', orderData);

// Line 65
console.warn('[DriveThru] Voice order submission failed:', error);
```

**Impact**:
- Violates project rule: "Logging: Use `logger`, never `console.log`" (CLAUDE.md)
- Inconsistent with rest of codebase
- No structured data for log aggregation
- Pre-commit hook should have caught this (potential hook bypass?)
- Cannot filter/search logs effectively in production

**Risk Level**: P2 IMPORTANT - Standards violation, affects observability

**Pre-commit Hook Investigation**:
The project has a pre-commit hook that should prevent console.log. Investigate:
- Was the hook bypassed with `--no-verify`?
- Is DriveThruPage.tsx excluded from the hook?
- Is the hook pattern missing console.warn?

## Proposed Solutions

### Solution 1: Replace with Logger (Recommended)
```typescript
import { logger } from '@/services/logger';

// Line 54
logger.info('[DriveThru] Order created', { result });

// Line 62
logger.info('[DriveThru] Sending voice order', { orderData });

// Line 65
logger.warn('[DriveThru] Voice order submission failed', { error });
```

**Pros**:
- Consistent with project standards
- Structured data for log aggregation
- Proper log levels
- Searchable in production

**Cons**:
- None

### Solution 2: Conditional Development Logging
If these are truly debug-only logs:
```typescript
import { logger } from '@/services/logger';

if (import.meta.env.DEV) {
  logger.debug('[DriveThru] Order created', { result });
}
```

**Pros**:
- Removes noise from production logs
- Still uses logger service

**Cons**:
- May hide useful production debugging info

## Technical Details

**Files to Modify**:
- `client/src/pages/DriveThruPage.tsx` - Replace console.* with logger.*

**Pre-commit Hook Check**:
```bash
# Verify hook is active
cat .git/hooks/pre-commit | grep console

# Check if DriveThruPage is excluded
grep -r "console\\.log" client/src/pages/DriveThruPage.tsx

# Test hook manually
git add client/src/pages/DriveThruPage.tsx
git commit -m "test" --dry-run
```

**Logger Import Path**:
```typescript
// Client-side (uses @/ path alias per CLAUDE.md)
import { logger } from '@/services/logger';
```

**Testing Requirements**:
- Verify logs still appear in browser console during development
- Check log format matches other components
- Ensure structured data is properly captured
- Verify pre-commit hook catches future violations

## Acceptance Criteria

- [ ] Replace all `console.log` with `logger.info`
- [ ] Replace all `console.warn` with `logger.warn`
- [ ] Import logger from correct path: `@/services/logger`
- [ ] Verify logs appear correctly in browser console
- [ ] Test pre-commit hook catches console.log
- [ ] Document pre-commit hook issue if found
- [ ] No other console.* calls in DriveThruPage.tsx

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | From code review of commit a699c6c6 |
