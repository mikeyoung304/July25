---
title: "Idempotency Key Pattern for Payments"
slug: idempotency-key-pattern
category: security-issues
severity: critical
date_solved: 2025-12-28
---

# Idempotency Key Pattern for Payments

## Problem Summary

Network failures during payment operations can cause retries. Without idempotency keys, retries create duplicate charges or refunds, causing financial loss and customer dissatisfaction.

## Symptoms

- Duplicate refunds appearing in Stripe dashboard
- Customer charged twice for same order
- Payment audit log shows multiple attempts for single order

## Root Cause

Refund creation in `server/src/routes/payments.routes.ts:656-670` generates idempotency key but doesn't pass it to Stripe:

```typescript
// VULNERABLE - key generated but not used
const idempotencyKey = generateIdempotencyKey(orderId, 'refund');
// ...
await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: refundAmount,
  // idempotencyKey: NOT PASSED!
});
```

## Solution

### Stripe API with Idempotency Key:

```typescript
const idempotencyKey = generateIdempotencyKey(orderId, 'refund', restaurantId);

await stripe.refunds.create(
  {
    payment_intent: paymentIntentId,
    amount: refundAmount,
    reason: 'requested_by_customer',
    metadata: {
      order_id: orderId,
      restaurant_id: restaurantId,
      idempotency_key: idempotencyKey,
    },
  },
  {
    idempotencyKey, // CRITICAL: Pass to Stripe
  }
);
```

### Idempotency Key Generation:

```typescript
import crypto from 'crypto';

function generateIdempotencyKey(
  orderId: string,
  operation: 'charge' | 'refund' | 'capture',
  restaurantId: string
): string {
  // Deterministic key based on inputs
  const input = `${restaurantId}:${orderId}:${operation}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}
```

### With Nonce for Partial Refunds:

```typescript
function generateIdempotencyKey(
  orderId: string,
  operation: string,
  nonce: string  // Required - never use timestamps!
): string {
  if (!nonce) {
    throw new Error('Nonce required for idempotency key generation');
  }
  // Include nonce for operations that can happen multiple times
  const input = `${orderId}:${operation}:${nonce}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

// For partial refunds, use unique request ID as nonce
const key = generateIdempotencyKey(orderId, 'partial_refund', refundRequestId);

// NEVER use Date.now() - retries at different times generate different keys!
```

### Database-Level Idempotency (Belt and Suspenders):

```typescript
// Prevent duplicate operations at database level
async function createRefundWithIdempotency(
  orderId: string,
  amount: number
): Promise<Refund> {
  const idempotencyKey = generateIdempotencyKey(orderId, 'refund');

  // Check if already processed
  const existing = await prisma.refund.findUnique({
    where: { idempotency_key: idempotencyKey },
  });

  if (existing) {
    return existing; // Return existing refund, don't create new
  }

  // Create with unique constraint on idempotency_key
  return prisma.refund.create({
    data: {
      order_id: orderId,
      amount,
      idempotency_key: idempotencyKey,
      status: 'pending',
    },
  });
}
```

## Prevention

1. **Always pass idempotencyKey to Stripe** - For all payment operations
2. **Use deterministic keys** - Same input = same key = idempotent
3. **Store keys in metadata** - For reconciliation and debugging
4. **Add database-level checks** - Belt and suspenders approach
5. **Log idempotency key usage** - Detect duplicates in audit

## References

- `audit_output/02_RISK_REGISTER.md` - P0-003, P0-009
- `plans/security-remediation-v2.md` - Task 0.3
- `server/src/routes/payments.routes.ts:656-670`
- Stripe Idempotency Documentation
