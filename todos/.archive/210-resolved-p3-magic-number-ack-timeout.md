# TODO: Magic Number ackTimeout Without Configuration

**Priority:** P3 - Low
**Category:** Code Quality
**Detected:** 2025-12-24 (Code Review)
**Status:** pending
**Tags:** code-review, code-quality, websocket

## Problem Statement

The `ackTimeout` value of 5000ms is hardcoded as a private field with no configuration option, unlike other WebSocket config values.

## Findings

### From Code Quality Review Agent:
- **File:** `client/src/services/websocket/WebSocketService.ts:585`
- Parent class accepts `reconnectInterval` and `maxReconnectAttempts` in config
- Child class doesn't allow `ackTimeout` customization
- Different network conditions may need different timeouts

### Code Evidence:
```typescript
private ackTimeout = 5000 // 5 seconds to receive ack
```

## Proposed Solutions

### Option A: Add to Constructor Config
**Pros:** Consistent with parent class pattern
**Cons:** More code
**Effort:** Small
**Risk:** Low

```typescript
constructor(config: OptimisticWebSocketConfig = {}) {
  super(config)
  this.ackTimeout = config.ackTimeout ?? 5000
}
```

### Option B: Keep as Constant with Comment
**Pros:** Simple, no API change
**Cons:** Not configurable
**Effort:** None
**Risk:** None

## Technical Details

**Affected Files:**
- `client/src/services/websocket/WebSocketService.ts:585`

## Acceptance Criteria

- [ ] Decision made: configurable or constant
- [ ] If configurable: add to constructor options
- [ ] Document rationale for timeout value

## Triage Decision

**Date:** 2025-12-24
**Decision:** Deferred - Blocked on #206
**Rationale:** If OptimisticWebSocketService is deleted (per #206), this configuration issue becomes moot.
**Next Action:** Resolve #206 first

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-24 | Created from code review | Magic numbers should be documented |
| 2025-12-24 | Triage: blocked on #206 | May not need if class is deleted |

## Resources

- None
