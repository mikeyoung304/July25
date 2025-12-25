# TODO: Testing Method Exposed in Production Build

**Priority:** P2 - Important
**Category:** Security
**Detected:** 2025-12-24 (Code Review)
**Status:** pending
**Tags:** code-review, security, websocket

## Problem Statement

The `OptimisticWebSocketService.simulateConnectionFailure()` method is public and not guarded by environment check. This testing utility is included in production builds where it could be misused.

## Findings

### From Security Review Agent:
- **File:** `client/src/services/websocket/WebSocketService.ts:691-696`
- Method is public with no environment guard
- Could be called via browser console if service is exposed
- Would trigger all pending rollbacks, causing UI inconsistency

### Code Evidence:
```typescript
/**
 * Simulate connection failure (for testing)
 */
simulateConnectionFailure(): void {
  // Emit disconnected event to trigger rollbacks
  this.emit('disconnected', new CloseEvent('close', { code: 1006, reason: 'Simulated failure' }))
}
```

## Proposed Solutions

### Option A: Guard with Environment Check (Recommended)
**Pros:** Simple, follows existing pattern
**Cons:** None
**Effort:** Small
**Risk:** Low

```typescript
simulateConnectionFailure(): void {
  if (!import.meta.env.DEV) {
    logger.warn('simulateConnectionFailure is only available in development')
    return
  }
  this.emit('disconnected', new CloseEvent('close', { code: 1006, reason: 'Simulated failure' }))
}
```

### Option B: Remove Method, Use Event Emission in Tests
**Pros:** No test code in production
**Cons:** Tests become more complex
**Effort:** Medium
**Risk:** Low

## Technical Details

**Affected Files:**
- `client/src/services/websocket/WebSocketService.ts:691-696`

**Existing Pattern:**
- Base class uses `import.meta.env.DEV` guards (lines 51-56)

## Acceptance Criteria

- [ ] Method guarded with `import.meta.env.DEV` check
- [ ] Production build excludes method body (tree-shaken)
- [ ] Tests still pass with guard in place

## Triage Decision

**Date:** 2025-12-24
**Decision:** Deferred - Blocked on #206
**Rationale:** If OptimisticWebSocketService is deleted (per #206), this issue becomes moot.
**Next Action:** Resolve #206 first

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-24 | Created from code review | Test utilities should be dev-only |
| 2025-12-24 | Triage: blocked on #206 | May not need fix if class is deleted |

## Resources

- Existing pattern: `WebSocketService.ts:51-56` (dev-only instrumentation)
