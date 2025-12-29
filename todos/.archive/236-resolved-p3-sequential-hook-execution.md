---
status: resolved
priority: p3
issue_id: "236"
tags: [performance, architecture, code-review]
dependencies: []
---

# Sequential Hook Execution Could Be Parallelized

## Problem Statement
Order state machine hooks are executed sequentially using `for...await`. For the `*->confirmed` transition, there are now 2 hooks that run in series, adding latency to order confirmation.

## Findings
- **Source**: Performance Oracle Review (2025-12-28)
- **Location**: `server/src/services/orderStateMachine.ts` lines 130-143
- **Evidence**: Sequential await in loop

```typescript
// Lines 130-143 - Sequential execution
for (const hook of hooks) {
  try {
    await hook(transition, order);  // Each hook blocks the next
  } catch (error: any) {
    // Error logged but execution continues
  }
}
```

For `*->confirmed`, registered hooks:
1. Kitchen notification hook
2. Email confirmation hook

If email service has 500ms latency, it delays the response by that amount.

## Proposed Solutions

### Option 1: Parallelize with Promise.all (Recommended)
- **Pros**: Faster execution, hooks run concurrently
- **Cons**: Error handling slightly more complex
- **Effort**: Small
- **Risk**: Low

```typescript
await Promise.all(hooks.map(async (hook) => {
  try {
    await hook(transition, order);
  } catch (error: any) {
    orderStateMachineLogger.error('Hook failed', { error, transition });
  }
}));
```

### Option 2: Fire-and-forget for non-critical hooks
- **Pros**: Response returns immediately
- **Cons**: No error visibility, may miss failures
- **Effort**: Small
- **Risk**: Medium

### Option 3: Queue-based async processing
- **Pros**: Best for scaling, proper job management
- **Cons**: Requires BullMQ/Redis setup
- **Effort**: Large
- **Risk**: Medium

## Recommended Action
Option 1 - Use Promise.all for immediate improvement.

## Technical Details
- **Affected Files**: `server/src/services/orderStateMachine.ts`
- **Related Components**: All order state hooks
- **Database Changes**: No

## Acceptance Criteria
- [ ] Hooks execute in parallel
- [ ] Individual hook failures don't block others
- [ ] Errors still logged
- [ ] Response time improved

## Work Log

### 2025-12-28 - Identified in Code Review
**By:** Performance Oracle Agent
**Actions:**
- Found sequential hook execution
- Assessed as MEDIUM priority

### 2025-12-28 - Triaged and Approved
**By:** Claude Code Review
**Decision:** Approved for implementation
**Rationale:** Valid finding with clear solution path
## Notes
Source: Code Review of commit 35025fd6
