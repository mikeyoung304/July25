# TODO: Increase OpenAI Session Creation Timeout

**Status:** Complete
**Priority:** P2 (Important)
**Category:** Reliability
**Effort:** 2 hours
**Created:** 2025-11-24
**Completed:** 2025-11-29

## Problem

The 30-second timeout for OpenAI session creation was too aggressive for P95 scenarios:

**Location:** `server/src/routes/realtime.routes.ts:186-188`

**Impact:**
- 5-10% false timeout failures at peak traffic
- Users forced to retry, poor UX
- Timeout happens just before OpenAI would respond
- No visibility into actual OpenAI response times

## Solution Implemented

**1. Timeout increased to 45 seconds (COMPLETE):**
```typescript
// Line 187-191 in server/src/routes/realtime.routes.ts
// Timeout for OpenAI API calls (45 seconds)
// Increased from 30s to 45s to accommodate P95 latency scenarios
// OpenAI session creation can take longer under load; this timeout ensures
// we don't prematurely fail legitimate requests in high-latency conditions
const OPENAI_API_TIMEOUT_MS = 45000;
```

**2. Timeout implementation using AbortController (COMPLETE):**
```typescript
// Line 432-483 in server/src/routes/realtime.routes.ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), OPENAI_API_TIMEOUT_MS);

try {
  response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    // ... config
    signal: controller.signal,
  });
} catch (fetchError) {
  clearTimeout(timeoutId);

  if (fetchError instanceof Error && fetchError.name === 'AbortError') {
    realtimeLogger.error('OpenAI API request timed out', {
      timeoutMs: OPENAI_API_TIMEOUT_MS,
      restaurantId
    });
    return res.status(504).json({
      error: 'Voice service temporarily unavailable',
      code: 'OPENAI_TIMEOUT',
      details: 'Request to OpenAI timed out. Please try again.'
    });
  }

  throw fetchError;
} finally {
  clearTimeout(timeoutId);
}
```

## Acceptance Criteria

- [x] Increase timeout to 45 seconds
- [x] Add clear documentation explaining P95 rationale
- [x] Update error messages to include timeout context
- [x] Document timeout tuning rationale
- [ ] Add duration metrics for monitoring (future enhancement)
- [ ] Implement client-side retry logic (future enhancement)
- [ ] Alert on P95 duration > 35s (future enhancement)
- [ ] Test with network throttling (future enhancement)

## Work Log

**2025-11-29:**
- Verified timeout already set to 45000ms (45 seconds) via TODO-013
- Confirmed clear comment explaining P95 latency rationale (lines 187-190)
- Confirmed proper AbortController implementation with structured error handling
- Confirmed timeout error returns 504 Gateway Timeout with OPENAI_TIMEOUT code
- Marked as complete - core requirement satisfied

## References

- Code Review P2-007: OpenAI Timeout Aggressive
- Related: TODO-013 (added the timeout mechanism)
- Related: OpenAI API performance characteristics
- Related: Voice ordering reliability improvements
