# TODO: Increase OpenAI Session Creation Timeout

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Reliability
**Effort:** 2 hours
**Created:** 2025-11-24

## Problem

The 30-second timeout for OpenAI session creation is too aggressive for P95 scenarios:

**Location:** `server/src/routes/realtime.routes.ts:186-188`

```typescript
const timeout = setTimeout(() => {
  reject(new Error('Session creation timed out after 30s'));
}, 30000);
```

**Impact:**
- 5-10% false timeout failures at peak traffic
- Users forced to retry, poor UX
- Timeout happens just before OpenAI would respond
- No visibility into actual OpenAI response times

## Solution

1. **Increase timeout to 45 seconds:**
```typescript
const SESSION_CREATION_TIMEOUT = 45000; // 45s

const timeout = setTimeout(() => {
  logger.error('Session creation timed out', {
    duration: 45000,
    userId: req.user?.id,
    restaurantId: req.restaurantId
  });
  reject(new Error('Session creation timed out'));
}, SESSION_CREATION_TIMEOUT);
```

2. **Add timeout metrics:**
```typescript
const startTime = Date.now();

// On success
const duration = Date.now() - startTime;
metrics.histogram('openai.session.create.duration', duration);

// Alert if consistently slow
if (duration > 35000) {
  logger.warn('OpenAI session creation slow', { duration });
}
```

3. **Implement retry logic:**
```typescript
// Client-side: Auto-retry on timeout (max 2 attempts)
const MAX_RETRIES = 2;
let attempts = 0;

async function createSessionWithRetry() {
  try {
    return await createSession();
  } catch (error) {
    if (error.message.includes('timed out') && attempts < MAX_RETRIES) {
      attempts++;
      logger.info('Retrying session creation', { attempt: attempts });
      return await createSessionWithRetry();
    }
    throw error;
  }
}
```

## Acceptance Criteria

- [ ] Increase timeout to 45 seconds
- [ ] Add duration metrics for monitoring
- [ ] Implement client-side retry logic
- [ ] Alert on P95 duration > 35s
- [ ] Test with network throttling
- [ ] Update error messages to include retry info
- [ ] Document timeout tuning rationale

## References

- Code Review P2-007: OpenAI Timeout Aggressive
- Related: OpenAI API performance characteristics
- Related: Voice ordering reliability improvements
