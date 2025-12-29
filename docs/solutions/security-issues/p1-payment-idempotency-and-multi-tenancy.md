---
title: "P1 Fixes: Idempotency Key, Refund Status, Tenant Validation"
slug: p1-payment-idempotency-multi-tenancy
category: security-issues
severity: p1
date_solved: 2025-12-29
tags:
  - payments
  - idempotency
  - multi-tenancy
  - data-integrity
components:
  - server/src/services/payment.service.ts
  - server/src/routes/payments.routes.ts
related_issues:
  - "#238 - Idempotency Key Random Nonce Defeats Purpose"
  - "#239 - Refund Doesn't Update Order Payment Status"
  - "#241 - Refund Endpoint Missing Tenant Validation"
---

# P1 Fixes: Idempotency Key, Refund Status, and Tenant Validation

## Problem Summary

Three interconnected issues in the refund flow created payment integrity and security gaps:

1. **#238 - Random Nonce Defeats Idempotency**: Idempotency keys included random nonces, causing retry requests to generate new keys instead of reusing the same one
2. **#239 - Refund Doesn't Update Order Status**: Successfully refunded orders remained marked as "paid" in the database
3. **#241 - Missing Tenant Validation**: Refund endpoint didn't verify that the payment belonged to the authenticated restaurant

## Solution 1: Idempotency Key (Fix #238)

### Root Cause

The `generateIdempotencyKey()` function included a random nonce that changed on every invocation:

```typescript
// VULNERABLE - generates different key on every call
const nonce = randomBytes(8).toString('hex');
return `${type}_${restaurantSuffix}_${orderSuffix}_${ts}_${nonce}`;
```

This defeated the entire purpose of idempotency keys. When a client retried a request after network timeout:
- Old key: `refund_r11111_o12345_1735411200_a1b2c3d4`
- Retry key: `refund_r11111_o12345_1735411200_e5f6g7h8`
- Result: Stripe sees two different keys = duplicate refund processed

### Solution

Remove the random nonce and use timestamp granularity instead (seconds, not milliseconds):

**File:** `server/src/services/payment.service.ts`

```typescript
function generateIdempotencyKey(
  type: 'charge' | 'refund' | 'capture',
  restaurantId: string,
  orderId: string,
  timestamp?: number
): string {
  // Use seconds (not ms) to allow retries within same second window
  // Random nonce was removed - it defeated idempotency purpose (see #238)
  const ts = timestamp ?? Math.floor(Date.now() / 1000);

  const restaurantSuffix = restaurantId.slice(0, 8);
  const orderSuffix = orderId.slice(-8);

  return `${type}_${restaurantSuffix}_${orderSuffix}_${ts}`;
}
```

### Why This Works

1. **Deterministic**: Same operation = same key
2. **Second-level granularity**: Multiple retries within 1 second window reuse the same key
3. **Stripe honors it**: Second retry with identical key returns cached response without charging again
4. **Server timestamp**: Can be passed as parameter for testing; defaults to current time

### Verification

```typescript
// Test: Two calls with same parameters generate same key
const key1 = generateIdempotencyKey('refund', restaurantId, orderId, 1735411200);
const key2 = generateIdempotencyKey('refund', restaurantId, orderId, 1735411200);

assert(key1 === key2); // ✅ True - deterministic
```

---

## Solution 2: Refund Status Update (Fix #239)

### Root Cause

The refund endpoint created a refund in Stripe and logged it, but never updated the local order's payment status:

```typescript
// After successful Stripe refund:
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: refundAmount,
  // ...
});

// Logged to audit trail
await PaymentService.logPaymentAttempt({
  status: 'refunded',
  // ...
});

// ❌ Missing: Update order.payment_status in database
```

This created data inconsistency:
- Stripe shows: payment refunded
- Local database shows: order.payment_status = 'paid'
- Staff sees: Order appears unpaid when it's actually refunded
- Reconciliation: Fails when comparing Stripe vs database

### Solution

Extract order ID from payment metadata and update order status after successful refund:

**File:** `server/src/routes/payments.routes.ts`

```typescript
const refund = await stripe.refunds.create(
  {
    payment_intent: paymentIntentId,
    amount: refundAmount,
    reason: 'requested_by_customer',
    metadata: {
      order_id: orderId,
      restaurant_id: req.restaurantId,
      idempotency_key: idempotencyKey,
    },
  },
  {
    idempotencyKey,
  }
);

// #239: Update order payment status to 'refunded'
const orderIdFromMetadata = refund.metadata?.['order_id'];
if (orderIdFromMetadata) {
  try {
    await OrdersService.updateOrderPayment(
      req.restaurantId!,
      orderIdFromMetadata,
      'refunded',
      'card',
      refund.id
    );
  } catch (orderUpdateError) {
    // Log but don't fail - Stripe refund already succeeded
    // This is intentional: Stripe is source of truth
    routeLogger.warn('Failed to update order status after refund', {
      orderId: orderIdFromMetadata,
      refundId: refund.id,
      error: orderUpdateError instanceof Error ? orderUpdateError.message : String(orderUpdateError),
    });
  }
}
```

### Why This Works

1. **Order ID stored in metadata**: Stripe refund API doesn't return original payment_intent, so metadata retrieval is reliable
2. **Separate try-catch**: If database update fails, the Stripe refund has already succeeded (source of truth)
3. **Graceful degradation**: Order status won't update, but refund is safe in Stripe
4. **Audit trail**: Warning log captures the failure for reconciliation

### Verification

```typescript
// After refund endpoint completes:
const order = await db.orders.findUnique({
  where: { id: orderId, restaurant_id: restaurantId }
});

// ✅ order.payment_status === 'refunded'
assert(order.payment_status === 'refunded');
```

---

## Solution 3: Tenant Validation (Fix #241)

### Root Cause

The refund endpoint validated restaurant access via middleware (`restaurantAccess`) but didn't verify payment ownership:

```typescript
// Middleware ensures user is authenticated and has restaurant access
router.post(
  '/refunds',
  restaurantAccess,  // ✅ Validates req.restaurantId
  async (req, res) => {
    const paymentId = req.body.payment_id;

    // ❌ Missing validation
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
    // Doesn't check: paymentIntent.metadata.restaurant_id === req.restaurantId
  }
);
```

Attack scenario:
1. Attacker works for Restaurant A
2. Attacker obtains payment ID `pi_xyz` from Restaurant B
3. Attacker calls `/api/v1/refunds` with their Restaurant A auth token + Restaurant B payment ID
4. Middleware passes (validates Restaurant A access)
5. No ownership check on payment = unauthorized refund issued

### Solution

Validate payment ownership after retrieval:

**File:** `server/src/routes/payments.routes.ts`

```typescript
router.post('/refunds', restaurantAccess, async (req, res) => {
  const paymentId = req.body.payment_id;

  // Retrieve from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

  // #241: Validate tenant ownership
  const paymentRestaurantId = paymentIntent.metadata?.['restaurant_id'];
  if (paymentRestaurantId && paymentRestaurantId !== req.restaurantId) {
    routeLogger.warn('Cross-tenant refund attempt blocked', {
      attemptedRestaurant: req.restaurantId,
      paymentRestaurant: paymentRestaurantId,
      paymentId,
    });

    return res.status(403).json({
      success: false,
      error: 'Payment not found', // Don't reveal cross-tenant details
    });
  }

  // Continue with refund...
});
```

### Why This Works

1. **Defense in depth**: Middleware validates user, endpoint validates payment ownership
2. **Metadata comparison**: Stripe metadata is set at payment creation and immutable
3. **Information hiding**: Returns "not found" instead of "unauthorized" to avoid leaking cross-tenant information
4. **Audit trail**: Logs include attempted and legitimate restaurants

### Attack Prevention

```
Attack: Refund pi_123 (belongs to Restaurant B) as Restaurant A

1. Middleware passes: ✅ Restaurant A token is valid
2. Payment retrieval: ✅ Stripe returns pi_123 (public Stripe IDs)
3. Ownership check: ❌ paymentIntent.metadata.restaurant_id = 'r222' !== 'r111'
4. Response: 403 error with generic "Payment not found"
5. Audit: Cross-tenant attempt logged
```

### Verification

```typescript
// Test: Try to refund payment from different restaurant
const testPaymentId = 'pi_xyz'; // Created by Restaurant B

const response = await fetch('/api/v1/refunds', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token-for-restaurant-a'
  },
  body: JSON.stringify({ payment_id: testPaymentId })
});

// ✅ Returns 403 with "Payment not found"
assert(response.status === 403);
```

---

## Implementation Order

These fixes were applied in order:

1. **First (#238)**: Fix idempotency key generation to be deterministic
2. **Second (#239)**: Add order status update after refund succeeds
3. **Third (#241)**: Add payment ownership validation

**Why order matters**: #239 depends on #238 being correct (if idempotency keys still break, status updates won't be reliable). #241 is independent but critical for security.

---

## Prevention Checklist

- [ ] Idempotency keys never include random values
- [ ] Timestamp granularity in idempotency keys is coarse enough for retry windows
- [ ] All database updates after external API calls are wrapped in try-catch
- [ ] Cross-tenant comparisons use exact string matching (never case-insensitive)
- [ ] Information disclosure avoided in error responses
- [ ] Payment ownership validated before any mutation

---

## Testing Strategy

### Unit Tests

```typescript
// Test idempotency key determinism
describe('generateIdempotencyKey', () => {
  it('should generate same key for same inputs', () => {
    const key1 = generateIdempotencyKey('refund', 'r111', 'o123', 1735411200);
    const key2 = generateIdempotencyKey('refund', 'r111', 'o123', 1735411200);
    expect(key1).toBe(key2);
  });

  it('should generate different keys for different timestamps', () => {
    const key1 = generateIdempotencyKey('refund', 'r111', 'o123', 1735411200);
    const key2 = generateIdempotencyKey('refund', 'r111', 'o123', 1735411201);
    expect(key1).not.toBe(key2);
  });
});

// Test refund status update
describe('POST /refunds', () => {
  it('should update order status to refunded', async () => {
    const before = await db.orders.findUnique({ where: { id: 'o123' } });
    expect(before.payment_status).toBe('paid');

    await request(app)
      .post('/api/v1/refunds')
      .set('Authorization', `Bearer ${token}`)
      .send({ payment_id: 'pi_123', amount: 2999 });

    const after = await db.orders.findUnique({ where: { id: 'o123' } });
    expect(after.payment_status).toBe('refunded');
  });
});

// Test tenant validation
describe('POST /refunds - tenant validation', () => {
  it('should reject refund of payment from different restaurant', async () => {
    const response = await request(app)
      .post('/api/v1/refunds')
      .set('Authorization', `Bearer ${tokenRestaurantA}`)
      .send({ payment_id: 'pi_from_restaurant_b' });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Payment not found'); // Generic message
  });
});
```

### Integration Tests

Run the full refund flow and verify all three properties:
1. Idempotency key allows retry
2. Order status updates
3. Cross-tenant attempt fails

---

## Commits

- `29a44575` fix: add refund idempotency key and update security status
- `4a338c8f` security: timing-safe PIN verification and webhook timestamp checks

---

## Related Documentation

- [ADR-002: Multi-Tenancy Architecture](../explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md)
- [ADR-009: Error Handling Philosophy (Fail-Fast)](../explanation/architecture-decisions/ADR-009-error-handling-philosophy.md)
- [Idempotency Key Pattern](./idempotency-key-pattern.md)
- [Multi-Tenant Isolation and RLS](./multi-tenant-isolation-rls-cache.md)
- [P0/P1 Backlog: WebSocket Auth & UUID Validation](./p0-p1-backlog-websocket-auth-uuid-validation.md)
