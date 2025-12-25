---
title: "Timer Memory Leak in OptimisticWebSocketService"
date_solved: 2025-12-24
category: performance-issues
severity: P1
status: resolved
tags:
  - websocket
  - memory-leak
  - timer
  - cleanup
components:
  - client/src/services/websocket/WebSocketService.ts
related_todos:
  - "204"
related_lessons:
  - CL-MEM-001-interval-leaks
commit: daa27568
---

# Timer Memory Leak in OptimisticWebSocketService

## Problem Summary

`setTimeout()` in `OptimisticWebSocketService.sendOptimisticUpdate()` was called without storing the timeout ID, making it impossible to cancel timers when updates were acknowledged or connections closed.

**Symptoms:**
- Orphaned timers accumulate in long-running sessions (8+ hour kitchen displays)
- Memory growth of 50-200 MB/day from timer callbacks holding references
- Potential null references if service destroyed before timeout fires

## Root Cause

```typescript
// BEFORE: Timer reference lost immediately
setTimeout(() => {
  if (this.pendingOptimisticUpdates.has(updateId)) {
    logger.warn('Optimistic update ack timeout, rolling back', { updateId })
    this.rollbackUpdate(updateId)
  }
}, this.ackTimeout)  // 5000ms - ID not stored!
```

The callback closure holds a reference to `this` and `updateId`, preventing garbage collection even after the update is acknowledged.

## Solution

Added `pendingTimeouts: Map<string, NodeJS.Timeout>` to track all timeout IDs:

```typescript
// AFTER: Store timeout ID for cleanup
private pendingTimeouts: Map<string, NodeJS.Timeout> = new Map()

// In sendOptimisticUpdate():
const timeoutId = setTimeout(() => {
  this.pendingTimeouts.delete(updateId)
  if (this.pendingOptimisticUpdates.has(updateId)) {
    logger.warn('Optimistic update ack timeout, rolling back', { updateId })
    this.rollbackUpdate(updateId)
  }
}, this.ackTimeout)
this.pendingTimeouts.set(updateId, timeoutId)
```

**Cleanup in all paths:**

```typescript
// In acknowledgeUpdate():
const timeoutId = this.pendingTimeouts.get(updateId)
if (timeoutId) {
  clearTimeout(timeoutId)
  this.pendingTimeouts.delete(updateId)
}

// In rollbackAllPending():
this.pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
this.pendingTimeouts.clear()
```

## Prevention Checklist

When creating timers (setTimeout/setInterval):

- [ ] Store the return value: `const id = setTimeout(...)`
- [ ] Track in a Map or Set for multi-instance scenarios
- [ ] Clear on success (operation completes normally)
- [ ] Clear on failure (error/rollback path)
- [ ] Clear all in cleanup/disconnect/unmount
- [ ] Consider: What happens if component/service is destroyed before timer fires?

## Test Cases

```typescript
test('should clear timeout when update is acknowledged', async () => {
  const updateId = service.sendOptimisticUpdate({ order_id: '123', status: 'preparing' })
  expect(service['pendingTimeouts'].size).toBe(1)

  service.acknowledgeUpdate(updateId)
  expect(service['pendingTimeouts'].size).toBe(0)
})

test('should clear all timeouts on disconnect', async () => {
  service.sendOptimisticUpdate({ order_id: '1', status: 'preparing' })
  service.sendOptimisticUpdate({ order_id: '2', status: 'preparing' })
  expect(service['pendingTimeouts'].size).toBe(2)

  service.disconnect()
  expect(service['pendingTimeouts'].size).toBe(0)
})
```

## Related Documentation

- [CL-MEM-001: Interval Leaks](/.claude/lessons/CL-MEM-001-interval-leaks.md) - Similar pattern with setInterval
- [TODO #204](../../todos/archive/204-resolved-p1-websocket-timer-memory-leak.md) - Original issue

## Impact

- **Lines changed:** 19 additions to WebSocketService.ts
- **Risk:** Low (additive change, no breaking API changes)
- **Benefit:** Prevents memory accumulation in long-running sessions
