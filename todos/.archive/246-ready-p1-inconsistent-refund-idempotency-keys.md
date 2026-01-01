---
status: done
priority: p1
issue_id: "246"
tags: [code-review, security, payments, refund]
dependencies: []
---

# P1: Inconsistent Refund Idempotency Key Formats

## Problem Statement

Two different idempotency key formats are used for refunds in the codebase:

1. **orderStateMachine.ts** (cancellation hook, line 536): `refund-${order.id}` - Simple format
2. **payment.service.ts** (API endpoint, line 432): `refund_{restaurantSuffix}_{paymentSuffix}_{timestamp}` - Full format

**Why it matters:** This inconsistency could lead to:
- **Duplicate refunds** if the same order is refunded via both paths (cancellation hook + API endpoint)
- **Lack of tenant isolation** in the hook-based refund (no `restaurant_id` in key)
- **No collision protection** in the hook-based refund (no timestamp)

## Findings

**Evidence:**

```typescript
// orderStateMachine.ts:536 (cancellation hook)
idempotencyKey: `refund-${order.id}`

// payment.service.ts:432 (API refund endpoint)
idempotencyKey = generateIdempotencyKey('refund', restaurantId, paymentId);
// Generates: refund_{restaurantSuffix}_{paymentSuffix}_{timestamp}
```

**Risk Scenario:**
1. Order `abc123` is cancelled, triggering hook with key `refund-abc123`
2. Same order refund is also triggered via API with key `refund_1111_abc1_170000`
3. Stripe sees these as different operations and processes BOTH refunds

## Proposed Solutions

### Option A: Standardize on generateIdempotencyKey (Recommended)

Update `orderStateMachine.ts` to use the same key generation function:

```typescript
// In orderStateMachine.ts cancellation hook
import { generateIdempotencyKey } from './payment.service';

const idempotencyKey = generateIdempotencyKey('refund', order.restaurant_id, order.id);
```

**Pros:** Consistent format, tenant isolation, collision protection
**Cons:** Minor refactor, requires importing from payment service
**Effort:** Small
**Risk:** Low

### Option B: Create Shared Key Generator Module

Extract key generation to a shared utility:

```typescript
// shared/utils/idempotencyKeys.ts
export function generateRefundKey(restaurantId: string, orderId: string): string {
  return `refund_${restaurantId.slice(-4)}_${orderId.slice(-4)}_${Math.floor(Date.now() / 1000)}`;
}
```

**Pros:** Clear single source of truth, no circular dependencies
**Cons:** More files to maintain
**Effort:** Medium
**Risk:** Low

## Recommended Action

_Awaiting triage decision._

## Technical Details

**Affected Files:**
- `server/src/services/orderStateMachine.ts` (line 536)
- `server/src/services/payment.service.ts` (line 432)

**Related Issues:**
- #238 (idempotency key nonce removal)

## Acceptance Criteria

- [ ] Single idempotency key format used for all refunds
- [ ] All refund keys include restaurant_id for tenant isolation
- [ ] Tests verify consistent key generation
- [ ] No duplicate refund scenarios possible

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-29 | Created | Found during /workflows:review analysis |

## Resources

- PR: Recent commits on main
- ADR-002: Multi-tenancy architecture
- Stripe idempotency documentation
