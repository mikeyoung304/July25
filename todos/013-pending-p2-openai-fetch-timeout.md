# TODO-013: Add Timeout to OpenAI API Fetch

## Metadata
- **Status**: complete
- **Priority**: P2 (Important)
- **Issue ID**: 013
- **Tags**: backend, voice, reliability, timeout
- **Dependencies**: None
- **Created**: 2025-11-24
- **Completed**: 2025-11-29
- **Source**: Code Review - Backend Analyst Agent

---

## Problem Statement

The `fetch()` call to OpenAI for ephemeral token creation has no timeout. If OpenAI API hangs, the Express request hangs indefinitely, exhausting connection pools.

---

## Findings

### Current Code
```typescript
// server/src/routes/realtime.routes.ts:398
const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(sessionConfig),
  // NO TIMEOUT!
});
```

### Risk
- OpenAI API outage → all voice sessions hang
- Connection pool exhaustion
- User sees infinite loading

---

## Proposed Solutions

### Option A: AbortController Timeout (Recommended)
Standard pattern for fetch timeout.

**Effort**: Low (30 min)
**Risk**: Very Low

---

## Recommended Action

```typescript
// server/src/routes/realtime.routes.ts

const OPENAI_TIMEOUT_MS = 30000; // 30 seconds

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

try {
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sessionConfig),
    signal: controller.signal,
  });

  // ... handle response
} catch (error) {
  if (error.name === 'AbortError') {
    logger.error('[Realtime] OpenAI API timeout', { timeoutMs: OPENAI_TIMEOUT_MS });
    return res.status(504).json({
      error: 'Voice service temporarily unavailable',
      code: 'OPENAI_TIMEOUT'
    });
  }
  throw error;
} finally {
  clearTimeout(timeoutId);
}
```

---

## Technical Details

### Affected Files
- `server/src/routes/realtime.routes.ts:398`

---

## Acceptance Criteria

- [x] AbortController with 45s timeout (increased from 30s for P95 latency scenarios)
- [x] Timeout error returns 504 to client
- [x] Helpful error message for users
- [x] Timeout cleaned up in finally block
- [x] Logged for monitoring

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From backend review |
| 2025-11-29 | Completed | Verified implementation already exists with 45s timeout (lines 433-484 in realtime.routes.ts). Includes AbortController, proper error handling for AbortError with 504 response, and cleanup in finally block. |
