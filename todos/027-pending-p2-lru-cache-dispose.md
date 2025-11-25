# TODO: Remove LRU Cache Dispose Callback Overhead

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Performance
**Effort:** 1 hour
**Created:** 2025-11-24

## Problem

The LRU cache dispose callback runs on every session eviction, causing 5-25ms overhead:

**Location:** `client/src/services/voice/VoiceEventHandler.ts:120-131`

```typescript
dispose: (sessionId: string, session: OrderSession) => {
  logger.info('[VoiceEventHandler] Session evicted from cache', {
    sessionId,
    duration: Date.now() - session.createdAt,
    finalState: session.currentState
  });
}
```

**Impact:**
- 5-25ms latency spike per eviction
- Unnecessary work since sessions auto-cleanup on disconnect
- Logging overhead in production

## Solution

Remove the dispose callback entirely:

```typescript
private sessions = new LRUCache<string, OrderSession>({
  max: 100,
  ttl: 15 * 60 * 1000, // 15 minutes
  // Remove dispose callback - cleanup happens on disconnect
});
```

**Rationale:**
- Sessions already cleanup via disconnect handlers
- Cache eviction is just memory management
- No action needed when old sessions expire
- Logging adds no operational value

**Alternative (if metrics needed):**
- Track eviction count with simple counter
- Log summary stats periodically (not per-eviction)

## Acceptance Criteria

- [ ] Remove dispose callback from LRU cache config
- [ ] Verify session cleanup still works via disconnect handlers
- [ ] Add eviction counter metric if needed
- [ ] Test with cache full scenario (101+ sessions)
- [ ] Measure latency improvement in load tests

## References

- Code Review P2-004: LRU Cache Dispose
- Related: Voice session lifecycle management
- Related: Performance optimization patterns
