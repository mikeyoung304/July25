# TODO: Missing Test for Ack Timeout Rollback

**Priority:** P2 - Important
**Category:** Test Coverage
**Detected:** 2025-12-24 (Code Review)
**Status:** pending
**Tags:** code-review, testing, websocket

## Problem Statement

The `ackTimeout` (5 second timer) that triggers automatic rollback when the server doesn't acknowledge an optimistic update is not tested. This is a critical code path that could silently break.

## Findings

### From Test Coverage Review Agent:
- **File:** `client/src/services/websocket/WebSocketService.ts:631-637`
- Timer-based rollback is implemented but not tested
- Tests cover connection failure rollback but not timeout rollback
- Edge case: acknowledgment race conditions also untested

### Untested Code Path:
```typescript
setTimeout(() => {
  if (this.pendingOptimisticUpdates.has(updateId)) {
    logger.warn('Optimistic update ack timeout, rolling back', { updateId })
    this.rollbackUpdate(updateId)
  }
}, this.ackTimeout)
```

## Proposed Solutions

### Option A: Add Timeout Rollback Test (Recommended)
**Pros:** Full coverage of critical path
**Cons:** Requires timer manipulation
**Effort:** Small
**Risk:** Low

```typescript
test('should rollback update after ack timeout expires', async () => {
  const rollbackSpy = vi.fn()
  optimisticService.onRollback(rollbackSpy)

  // Connect
  const connectPromise = optimisticService.connect()
  await vi.runOnlyPendingTimersAsync()
  getCurrentMock().simulateOpen()
  getCurrentMock().simulateMessage({ type: 'auth:success', timestamp: new Date().toISOString() })
  await connectPromise

  // Send optimistic update
  optimisticService.sendOptimisticUpdate({ order_id: '123', status: 'preparing' })
  expect(optimisticService.getPendingUpdateCount()).toBe(1)

  // Advance time past ack timeout (5 seconds)
  await vi.advanceTimersByTimeAsync(5500)

  // Verify rollback was called due to timeout
  expect(rollbackSpy).toHaveBeenCalledTimes(1)
  expect(optimisticService.getPendingUpdateCount()).toBe(0)
})
```

## Technical Details

**Affected Files:**
- `client/src/services/websocket/WebSocketService.test.ts`

**Additional Tests Needed:**
- Ack arriving just before timeout fires
- Ack arriving after disconnect
- Handler exception isolation

## Acceptance Criteria

- [ ] Test for ack timeout rollback added
- [ ] Test for acknowledgment race conditions added
- [ ] All new tests passing

## Triage Decision

**Date:** 2025-12-24
**Decision:** Deferred - Blocked on #206
**Rationale:** If OptimisticWebSocketService is deleted (per #206), no tests needed for non-existent code.
**Note:** Timer memory leak (#204) was fixed regardless, as best practice.
**Next Action:** Resolve #206 first

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-24 | Created from code review | Timer-based behavior needs explicit testing |
| 2025-12-24 | Triage: blocked on #206 | May not need tests if class is deleted |

## Resources

- Test file: `client/src/services/websocket/WebSocketService.test.ts`
- Vitest timer docs: https://vitest.dev/api/vi.html#vi-advancetimersbytime
