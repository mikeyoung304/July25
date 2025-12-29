# TODO: Test Setup/Teardown Duplication

**Priority:** P2 - Important
**Category:** Code Quality
**Detected:** 2025-12-24 (Code Review)
**Status:** pending
**Tags:** code-review, testing, code-quality

## Problem Statement

The `beforeEach` and `afterEach` blocks for `WebSocketService` and `OptimisticWebSocketService` tests are nearly identical (~40 lines each), creating maintenance burden and risk of drift.

## Findings

### From Code Quality Review Agent:
- **File:** `client/src/services/websocket/WebSocketService.test.ts`
- Lines 100-139: `beforeEach` for WebSocketService
- Lines 574-611: Nearly identical `beforeEach` for OptimisticWebSocketService
- Lines 141-173 and 614-631: Duplicate `afterEach` blocks
- `vi.clearAllTimers()` and `vi.clearAllMocks()` called multiple times in same block

### Evidence:
```typescript
// Lines 146, 163 - clearAllTimers called twice
// Lines 149, 172 - clearAllMocks called twice in same afterEach
```

## Proposed Solutions

### Option A: Extract Shared Setup Helper (Recommended)
**Pros:** Single source of truth, cleaner tests
**Cons:** Slightly more indirection
**Effort:** Small
**Risk:** Low

```typescript
function setupWebSocketTest() {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })

  // Mock fetch
  ;(global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => ({ token: 'demo-token' })
  })

  // Set up auth mock
  ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({...})

  // Mock WebSocket constructor
  global.WebSocket = vi.fn().mockImplementation(() => {...})

  setCurrentRestaurantId('test-restaurant')
}

function cleanupWebSocketTest(service: WebSocketService, mockWebSocket: MockWebSocket) {
  service.disconnect()
  vi.clearAllTimers()
  vi.clearAllMocks()
  if (mockWebSocket) mockWebSocket.close()
  vi.useRealTimers()
}
```

### Option B: Nested Describe with Shared Setup
**Pros:** Uses vitest's built-in patterns
**Cons:** Changes test file structure
**Effort:** Medium
**Risk:** Medium

## Technical Details

**Affected Files:**
- `client/src/services/websocket/WebSocketService.test.ts`

## Acceptance Criteria

- [ ] Shared setup/teardown extracted
- [ ] Duplicate clear calls removed
- [ ] All tests still passing
- [ ] No test isolation issues

## Triage Decision

**Date:** 2025-12-24
**Decision:** Deferred - Blocked on #206
**Rationale:** If OptimisticWebSocketService is deleted (per #206), the duplicated test setup for it also gets deleted, reducing this issue significantly.
**Next Action:** Resolve #206 first

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-24 | Created from code review | Test helpers improve maintainability |
| 2025-12-24 | Triage: blocked on #206 | Duplication reduced if class is deleted |

## Resources

- Vitest hooks: https://vitest.dev/api/#beforeeach
