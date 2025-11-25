# TODO: Fail Fast on Oversized Session Config

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Performance
**Effort:** 2 hours
**Created:** 2025-11-24

## Problem

Oversized session configs are logged as warnings but still sent to OpenAI, wasting 3-5 seconds:

**Location:** `client/src/services/voice/WebRTCVoiceClient.ts:197-199`

```typescript
if (estimatedSize > MAX_SIZE) {
  logger.warn('Session config exceeds recommended size', { estimatedSize });
  // ❌ Still sends config to OpenAI, which will reject it
}
```

**Impact:**
- 3-5s wasted on API call that will fail
- User sees delayed error message
- Poor UX during peak menu updates
- Unnecessary API quota usage

## Solution

Fail fast and transition to ERROR state immediately:

```typescript
const MAX_SIZE = 150_000; // 150KB safe limit

if (estimatedSize > MAX_SIZE) {
  logger.error('Session config too large, aborting', {
    estimatedSize,
    maxSize: MAX_SIZE,
    menuItemCount: config.menu?.items?.length
  });

  // Transition to ERROR state immediately
  this.stateMachine.transition('sessionError', {
    code: 'CONFIG_TOO_LARGE',
    message: 'Menu too large for voice ordering'
  });

  return; // Don't attempt OpenAI call
}
```

**User feedback:**
```typescript
// Show helpful error to user
"Menu is too large for voice ordering. Please use the regular ordering interface."
```

## Acceptance Criteria

- [ ] Add MAX_SIZE constant with safe threshold
- [ ] Fail fast when config exceeds limit
- [ ] Transition to ERROR state (don't attempt API call)
- [ ] Show user-friendly error message
- [ ] Log detailed metrics for monitoring
- [ ] Add alert for high config size frequency
- [ ] Test with large menu scenario

## References

- Code Review P2-006: Session Size Validation
- Related: Voice ordering menu optimization
- Related: OpenAI Realtime API limits
