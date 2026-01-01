---
status: done
priority: p2
issue_id: "248"
tags: [code-review, testing, payments]
dependencies: []
---

# P2: Test Expectation Mismatch for Refund Idempotency Keys

## Problem Statement

Test expects a nonce in partial refund keys, but the implementation does NOT include a nonce:

```typescript
// Test expects (payment-calculation.test.ts:632-633):
expect(result.idempotencyKey).toMatch(/^refund_.+_.+_\d+_[0-9a-f]+$/);

// Implementation generates (payment.service.ts:52-64):
// refund_{restaurantSuffix}_{orderSuffix}_{timestamp}  (NO nonce)
```

**Why it matters:** This test will fail, indicating code drift between tests and implementation. The comment at line 59 states: "Random nonce was removed - it defeated idempotency purpose (see #238)"

## Findings

**Test Location:** `payment-calculation.test.ts` line 632-633
**Implementation:** `payment.service.ts` line 52-64

The test regex expects 5 parts: `refund_xxx_xxx_timestamp_nonce`
The implementation only generates 4 parts: `refund_xxx_xxx_timestamp`

## Proposed Solutions

### Option A: Update Test to Match Implementation (Recommended)

```typescript
// Change from:
expect(result.idempotencyKey).toMatch(/^refund_.+_.+_\d+_[0-9a-f]+$/);

// To:
expect(result.idempotencyKey).toMatch(/^refund_.+_.+_\d+$/);
```

**Pros:** Aligns with implementation and #238 decision
**Cons:** None
**Effort:** Trivial
**Risk:** None

### Option B: Add Back Nonce for Refunds (If #247 chooses this approach)

If the team decides to add nonces for partial refunds (see #247), keep the test as-is.

**Pros:** Test already expects nonce
**Cons:** Must be coordinated with #247
**Effort:** N/A (depends on #247)
**Risk:** Low

## Recommended Action

_Awaiting triage decision. Should be aligned with decision on #247._

## Technical Details

**Affected Files:**
- `server/tests/services/payment-calculation.test.ts` (line 632-633)

**Dependencies:**
- #247 (partial refund key collision) - decision affects this fix

## Acceptance Criteria

- [ ] Test regex matches actual key format
- [ ] All payment-calculation tests pass
- [ ] Coordinated with #247 if nonce is added

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-29 | Created | Found during /workflows:review security analysis |

## Resources

- PR #238 (nonce removal)
- payment.service.ts:59 comment
