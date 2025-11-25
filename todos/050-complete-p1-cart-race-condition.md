---
status: complete
priority: p1
issue_id: "050"
tags: [code-review, data-integrity, concurrency, voice-ordering]
dependencies: []
---

# Cart Race Condition - Concurrent Modification Bug

## Problem Statement

Multiple concurrent AI function calls can modify the same cart simultaneously without locking, causing lost updates.

**Location:** `server/src/ai/functions/realtime-menu-tools.ts:311-325`

```typescript
function getCart(sessionId: string, restaurantId: string): Cart {
  if (!cartStorage.has(sessionId)) {
    cartStorage.set(sessionId, { /* new cart */ });
  }
  return cartStorage.get(sessionId)!; // Returns mutable reference
}
```

**Why It Matters:**
- Fast speakers trigger parallel `add_to_order` calls
- Items get lost due to read-modify-write race
- Price calculations become incorrect

## Findings

### Race Condition Scenario:
```javascript
// Voice AI processes "add burger" and "add fries" in parallel
Thread A: cart = getCart(session); cart.items.push(burger); updateTotals(cart);
Thread B: cart = getCart(session); cart.items.push(fries); updateTotals(cart);
// Result: Lost update - only one item added
```

### Real-World Trigger:
- User speaks: "I want a burger and fries and a coke"
- OpenAI Realtime API calls `add_to_order` 3x in parallel
- JavaScript event loop processes simultaneously
- Items get lost or prices miscalculated

### Affected Code (Lines 616-642):
```typescript
const existingItem = cart.items.find(item => /* ... */);
if (existingItem) {
  existingItem.quantity += _args.quantity; // Read-modify-write race
} else {
  cart.items.push(newItem); // Concurrent push race
}
```

## Proposed Solutions

### Solution 1: Session-Level Mutex (Recommended)
**Pros:** Simple, effective, no infrastructure changes
**Cons:** Small latency overhead
**Effort:** Low (2 hours)
**Risk:** Low

```typescript
import { Mutex } from 'async-mutex';
const cartLocks = new Map<string, Mutex>();

async function withCartLock<T>(sessionId: string, fn: (cart: Cart) => T): Promise<T> {
  if (!cartLocks.has(sessionId)) {
    cartLocks.set(sessionId, new Mutex());
  }
  const mutex = cartLocks.get(sessionId)!;
  return await mutex.runExclusive(() => {
    const cart = getCart(sessionId);
    return fn(cart);
  });
}
```

### Solution 2: Optimistic Locking with Version
**Pros:** No blocking, good for Redis
**Cons:** Retry logic needed
**Effort:** Medium (4 hours)
**Risk:** Low

### Solution 3: Request Serialization
**Pros:** No code changes in handler
**Cons:** Higher latency for all requests
**Effort:** Medium (3 hours)
**Risk:** Medium

## Recommended Action
<!-- To be filled after triage -->

## Technical Details

**Affected Files:**
- `server/src/ai/functions/realtime-menu-tools.ts`

**Dependencies:**
- `async-mutex` npm package (lightweight)

## Acceptance Criteria

- [ ] Stress test: 50 concurrent `add_to_order` calls → all items added
- [ ] No lost updates in cart
- [ ] Price calculations always accurate
- [ ] Latency impact < 10ms per operation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-11-24 | Created from code review | Race condition confirmed in data integrity review |

## Resources

- npm package: `async-mutex` - https://www.npmjs.com/package/async-mutex
