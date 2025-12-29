# TODO: WebSocket Optimistic Update Timer Memory Leak

**Priority:** P1 - Critical
**Category:** Performance/Memory
**Detected:** 2025-12-24 (Code Review)
**Status:** pending
**Tags:** code-review, performance, memory-leak, websocket

## Problem Statement

The `OptimisticWebSocketService.sendOptimisticUpdate()` method creates `setTimeout` timers for ack timeouts that are never stored or cleared. This causes:
1. Memory leaks from orphaned timers holding references
2. Potential null reference errors if service is cleaned up before timeout fires
3. Rollback attempts on destroyed service instances

## Findings

### From Performance Review Agent:
- **File:** `client/src/services/websocket/WebSocketService.ts:631-637`
- The `setTimeout` reference is never stored, making it impossible to cancel
- If `sendOptimisticUpdate` is called many times rapidly, multiple timers accumulate
- On page navigation or component unmount, orphan timers continue running

### From Security Review Agent:
- Memory accumulation risk in long-running sessions (KDS/kitchen displays run 8+ hours)
- Potential state corruption if timer fires after disconnect

### Code Evidence:
```typescript
// Set timeout for ack - if no ack received, rollback
setTimeout(() => {
  if (this.pendingOptimisticUpdates.has(updateId)) {
    logger.warn('Optimistic update ack timeout, rolling back', { updateId })
    this.rollbackUpdate(updateId)
  }
}, this.ackTimeout)  // Timer reference not stored!
```

## Proposed Solutions

### Option A: Store Timeout IDs in Map (Recommended)
**Pros:** Clean, matches existing pattern, full cleanup capability
**Cons:** Adds ~15 lines of code
**Effort:** Small
**Risk:** Low

```typescript
private pendingTimeouts: Map<string, NodeJS.Timeout> = new Map()

// In sendOptimisticUpdate:
const timeoutId = setTimeout(...)
this.pendingTimeouts.set(updateId, timeoutId)

// In acknowledgeUpdate:
clearTimeout(this.pendingTimeouts.get(updateId))
this.pendingTimeouts.delete(updateId)

// In rollbackUpdate:
clearTimeout(this.pendingTimeouts.get(updateId))
this.pendingTimeouts.delete(updateId)
```

### Option B: Clear All Timers on Disconnect
**Pros:** Simpler implementation
**Cons:** Less granular control
**Effort:** Small
**Risk:** Medium (timers still leak until disconnect)

## Technical Details

**Affected Files:**
- `client/src/services/websocket/WebSocketService.ts` (lines 582-697)

**Related Patterns:**
- Base `WebSocketService` already handles timer cleanup correctly (lines 554-558, 435-439)
- Follow same pattern with `stopHeartbeat()` / `clearTimeout()`

## Acceptance Criteria

- [ ] Timeout IDs stored when created
- [ ] Timeouts cleared when update acknowledged
- [ ] Timeouts cleared when update rolled back
- [ ] All timeouts cleared on disconnect
- [ ] No memory leaks in 8-hour session test
- [ ] Add test for ack timeout rollback behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-24 | Created from code review | Timer cleanup is critical for long-running apps |

## Resources

- Related lesson: [CL-MEM-001](.claude/lessons/CL-MEM-001-interval-leaks.md)
- Test file: `client/src/services/websocket/WebSocketService.test.ts`
