---
status: complete
priority: p3
issue_id: 230
tags: [code-review, quality, simplicity]
dependencies: []
---

# Redundant Fallback Pattern in Error Handling

## Problem Statement

The pattern `getErrorMessage(error) || 'fallback'` is used throughout the codebase, but the fallback is never triggered because `getErrorMessage` always returns a truthy string.

## Findings

### Code Simplicity Review Finding

**The utility:**
```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);  // Always returns a string
}
```

**The pattern (dead code):**
```typescript
getErrorMessage(error) || 'Unknown error'  // || never executes
```

**Occurrences found:**
- `client/src/components/auth/DevAuthOverlay.tsx`
- `client/src/components/kiosk/KioskCheckoutPage.tsx` (3x)
- `client/src/hooks/kiosk/useKioskOrderSubmission.ts`
- `client/src/modules/orders/hooks/useOrderActions.ts` (2x)
- `client/src/modules/voice/services/VoiceEventHandler.ts`
- `server/src/services/ai.service.ts`
- `server/src/routes/metrics.ts` (2x)

**Why it's dead code:** `String(undefined)` returns `"undefined"` (truthy), `String(null)` returns `"null"` (truthy). The fallback never executes.

## Proposed Solutions

### Option A: Remove Fallbacks (Recommended)
**Pros:** Cleaner code, removes dead code
**Cons:** Minor refactor
**Effort:** Small
**Risk:** Low

```typescript
// Before
const msg = getErrorMessage(error) || 'Unknown error';
// After
const msg = getErrorMessage(error);
```

### Option B: Make Fallback Work
**Pros:** Fallback becomes meaningful
**Cons:** Changes utility behavior
**Effort:** Small
**Risk:** Low

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error === null || error === undefined) return '';  // Enable fallback
  return String(error);
}
```

## Recommended Action

**IMPLEMENTED**: Option A (Remove Fallbacks) - Removed all redundant `|| 'fallback'` patterns across 11 occurrences.

## Technical Details

**Affected files:** 10+ files with `|| 'fallback'` pattern

## Acceptance Criteria

- [x] No redundant `|| 'fallback'` patterns after getErrorMessage
- [ ] Or: getErrorMessage updated to return empty string for null/undefined

## Work Log

| Date       | Action    | Notes                                        |
| ---------- | --------- | -------------------------------------------- |
| 2025-12-26 | Created   | Found during code review                     |
| 2025-12-26 | Completed | Removed all 11 redundant fallback patterns   |
