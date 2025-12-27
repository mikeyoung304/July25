# TODO: Dual Singleton Pattern Creates Ambiguity

**Priority:** P2 - Important
**Category:** Architecture
**Detected:** 2025-12-24 (Code Review)
**Status:** pending
**Tags:** code-review, architecture, websocket, yagni

## Problem Statement

Two singleton instances are exported from WebSocketService.ts:
1. `webSocketService` - base service
2. `optimisticWebSocketService` - extended service

This creates ambiguity about which to use. Additionally, `optimisticWebSocketService` is **never imported or used** in actual application code (YAGNI violation).

## Findings

### From Architecture Review Agent:
- **File:** `client/src/services/websocket/WebSocketService.ts:699-703`
- Both singletons can connect independently, potentially creating two WebSocket connections
- Violates Interface Segregation Principle - clients must understand the difference
- `OptimisticWebSocketService` is 116 lines of unused production code

### From Simplicity Review Agent:
- `optimisticWebSocketService` is exported but grep shows zero imports outside definition files
- ~116 lines of production code + ~200 lines of tests for functionality never used
- Clear YAGNI violation

### Code Evidence:
```typescript
// Create singleton instance
export const webSocketService = new WebSocketService()

// Create optimistic-capable singleton for components that need rollback support
export const optimisticWebSocketService = new OptimisticWebSocketService()
```

### Usage Search:
```bash
grep "import.*optimisticWebSocketService" -> 0 matches in application code
```

## Proposed Solutions

### Option A: Remove Unused Code (Recommended if not planned)
**Pros:** Removes dead code, simplifies API
**Cons:** Loses feature if needed later
**Effort:** Small
**Risk:** Low (can be restored from git)

### Option B: Feature Flag for Optimistic Updates
**Pros:** Single service with optional feature
**Cons:** Adds complexity to base class
**Effort:** Medium
**Risk:** Medium

### Option C: Document and Keep (if planned feature)
**Pros:** Ready for future use
**Cons:** Carries dead code
**Effort:** Small
**Risk:** Low

## Technical Details

**Affected Files:**
- `client/src/services/websocket/WebSocketService.ts` (lines 569-703)
- `client/src/services/websocket/index.ts` (exports)
- `client/src/services/websocket/WebSocketService.test.ts` (lines 567-787)

## Decision Needed

Is optimistic update functionality planned for a near-term feature? If not, recommend Option A.

## Acceptance Criteria

- [ ] Determine if feature is needed
- [ ] If not needed: Remove `OptimisticWebSocketService` class and tests
- [ ] If needed: Document the planned use case

## Triage Decision

**Date:** 2025-12-24
**Decision:** Deferred
**Rationale:** User unsure if optimistic updates at WebSocket level are needed. Current KDS latency is acceptable.
**Dependencies:** Items #205, #207, #209, #210 depend on this decision
**Next Action:** Revisit when KDS performance requirements clarify

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-24 | Created from code review | YAGNI - don't build features that aren't used |
| 2025-12-24 | Triage: deferred | User hasn't decided on feature plan |

## Resources

- YAGNI principle: https://martinfowler.com/bliki/Yagni.html
