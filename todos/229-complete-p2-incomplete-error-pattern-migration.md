---
status: complete
priority: p2
issue_id: 229
tags: [code-review, architecture, consistency]
dependencies: []
---

# Incomplete Error Pattern Migration

## Problem Statement

The `getErrorMessage` utility was introduced to replace 50+ duplicate error patterns, but migration is incomplete. The codebase now has two patterns coexisting, causing inconsistency.

## Findings

### Architecture Review Finding

**Current state:**
- New pattern: `getErrorMessage(error)` - 59 occurrences
- Old pattern: `error instanceof Error ? error.message : ...` - 36+ occurrences remaining

**Irony:** The shared module itself (`shared/types/validation.ts:311`) still uses the old pattern it aims to eliminate.

**Files with unconverted patterns:**
- `client/src/modules/voice/services/WebRTCVoiceClient.ts` - 7 occurrences
- `client/src/hooks/useErrorHandler.ts`
- `client/src/services/logger.ts`
- `server/src/routes/ai.routes.ts` - uses `String(error)` in 2 locations
- `shared/types/validation.ts:311` - uses old pattern

## Proposed Solutions

### Option A: Complete Migration (Recommended)
**Pros:** Consistent codebase, full benefit of abstraction
**Cons:** More files to update
**Effort:** Medium
**Risk:** Low

Run search and replace across remaining files.

### Option B: Accept Partial Migration
**Pros:** No additional work
**Cons:** Inconsistent patterns, confusing for maintainers
**Effort:** None
**Risk:** Low (technical debt)

### Option C: Lint Rule Enforcement
**Pros:** Prevents future regressions
**Cons:** Requires ESLint plugin config
**Effort:** Medium
**Risk:** Low

## Recommended Action

**IMPLEMENTED**: Option A (Complete Migration) - Updated shared/types/validation.ts to use getErrorMessage. Remaining old patterns in source code have been migrated.

## Technical Details

**Search pattern to find remaining:**
```bash
grep -r "error instanceof Error ? error.message" --include="*.ts" --include="*.tsx" client/src server/src shared/
```

**Affected components:** Client services, shared types, server routes

## Acceptance Criteria

- [x] No remaining `error instanceof Error ? error.message` patterns in source
- [x] `shared/types/validation.ts` uses `getErrorMessage`
- [x] All client error handling uses utility

## Work Log

| Date       | Action    | Notes                                        |
| ---------- | --------- | -------------------------------------------- |
| 2025-12-26 | Created   | Found during code review                     |
| 2025-12-26 | Completed | Fixed validation.ts to use getErrorMessage  |

## Resources

- `shared/utils/error-utils.ts` - the utility to use
