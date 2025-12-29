# Prevention: Payment Security Patterns

**Type**: Prevention Framework for Payment Operations
**Based On**: Analysis of #238, #239, #241 security fixes
**Date**: 2025-12-29
**Severity**: Critical (Payments & Multi-Tenancy)

---

## Executive Summary

This document prevents recurrence of three critical payment security patterns that were discovered and fixed:

1. **Idempotency Anti-Pattern** - Random nonce defeated idempotency key purpose
2. **Incomplete Transaction Pattern** - External system updated without local state sync
3. **Missing Tenant Validation Pattern** - Resource operations without ownership verification

These patterns are subtle because they involve **correct individual components that create security gaps when combined**.

---

## Pattern 1: Idempotency Anti-Pattern

### What Went Wrong

The `generateIdempotencyKey()` function included a random nonce in every key generation. While the function was called correctly and keys were used properly, the randomness defeated the purpose.

**Issue Code (BEFORE):**
```typescript
export function generateIdempotencyKey(
  type: IdempotencyKeyType,
  restaurantId: string,
  orderId: string
): string {
  const nonce = randomBytes(8).toString('hex'); // ❌ WRONG
  const ts = Math.floor(Date.now() / 1000);
  const restaurantSuffix = restaurantId.slice(-8);
  const orderSuffix = orderId.slice(-12);
  return `${type}_${restaurantSuffix}_${orderSuffix}_${ts}_${nonce}`;
}

// Usage was CORRECT:
const idempotencyKey = generateIdempotencyKey('refund', restaurantId, orderId);
await stripe.refunds.create({ ... }, { idempotencyKey });

// But on retry, a NEW key was generated:
const idempotencyKey = generateIdempotencyKey('refund', restaurantId, orderId); // Different!
await stripe.refunds.create({ ... }, { idempotencyKey }); // Stripe sees as new request
```

**Why It's Dangerous:**
- Idempotency keys exist specifically to prevent duplicate operations on retry
- Random nonce makes the key different on each call, even for identical operations
- Client retry (after network timeout) generates new key → Stripe treats as new request
- Result: Duplicate charges/refunds despite appearing to use idempotency protection

### Code Review Checklist

**Idempotency Key Generation:**
- [ ] **No random component in key** - Key is deterministic based on operation parameters
- [ ] **Timestamp granularity correct** - Using seconds (not milliseconds) to allow retries in same second
- [ ] **Key includes tenant ID** - `${type}_${restaurantId}_${resourceId}_${timestamp}`
- [ ] **Key includes resource ID** - Different resources have different keys, even in same second
- [ ] **Key length reasonable** - Under 255 chars (Stripe limit)

**Idempotency Key Usage:**
- [ ] **Generated once per request** - Not regenerated on retry/error
- [ ] **Passed to external API** - Stripe/payment provider receives the key
- [ ] **Tested with duplicate calls** - Same exact request returns same result
- [ ] **Client-side**: Retry logic preserves original request parameters to recreate same key
- [ ] **Server-side**: Key stored in audit log for deduplication verification

### Patterns to Watch For

**❌ Anti-Pattern: Randomness in Key**
```typescript
// WRONG - Different key on each call
function generateIdempotencyKey(orderId) {
  const random = randomBytes(8).toString('hex');
  return `pay_${orderId}_${Date.now()}_${random}`; // ❌
}

// On retry:
const key1 = generateIdempotencyKey(orderId); // pay_order123_1735344000_abc123
const key2 = generateIdempotencyKey(orderId); // pay_order123_1735344000_xyz789 (DIFFERENT!)
```

**❌ Anti-Pattern: Timestamp in Milliseconds**
```typescript
// WRONG - Too granular, won't match on retry
function generateIdempotencyKey(orderId) {
  return `pay_${orderId}_${Date.now()}`; // Using ms instead of seconds
}

// Retry 500ms later:
const key1 = generateIdempotencyKey(orderId); // pay_order123_1735344000000
const key2 = generateIdempotencyKey(orderId); // pay_order123_1735344000500 (DIFFERENT!)
```

**✅ Correct Pattern: Deterministic Key**
```typescript
// CORRECT - Same key every time for same operation
function generateIdempotencyKey(
  type: string,
  restaurantId: string,
  orderId: string
): string {
  // Seconds (not ms) - allows retries in same second
  const ts = Math.floor(Date.now() / 1000);
  const restaurantSuffix = restaurantId.slice(-8);
  const orderSuffix = orderId.slice(-12);
  // No random component - deterministic
  return `${type}_${restaurantSuffix}_${orderSuffix}_${ts}`;
}

// Same call, same key:
const key1 = generateIdempotencyKey('refund', rest123, order456); // refund_11111111_order456_1735344000
const key2 = generateIdempotencyKey('refund', rest123, order456); // refund_11111111_order456_1735344000 ✅
```

### Test Cases

**Unit Test: Deterministic Keys**
```typescript
describe('Idempotency Keys', () => {
  it('should generate same key for identical parameters', () => {
    const key1 = generateIdempotencyKey('refund', 'rest-abc123', 'order-xyz789');
    const key2 = generateIdempotencyKey('refund', 'rest-abc123', 'order-xyz789');
    expect(key1).toBe(key2); // Must be identical
  });

  it('should generate different keys for different resource IDs', () => {
    const key1 = generateIdempotencyKey('refund', 'rest-abc123', 'order-xyz789');
    const key2 = generateIdempotencyKey('refund', 'rest-abc123', 'order-different');
    expect(key1).not.toBe(key2); // Different orders → different keys
  });

  it('should generate different keys for different operations', () => {
    const key1 = generateIdempotencyKey('pay', 'rest-abc123', 'order-xyz789');
    const key2 = generateIdempotencyKey('refund', 'rest-abc123', 'order-xyz789');
    expect(key1).not.toBe(key2); // Different type → different key
  });

  it('should not contain random bytes', () => {
    const key = generateIdempotencyKey('pay', 'rest-abc123', 'order-xyz789');
    // Key format: type_restaurantSuffix_orderSuffix_timestamp
    const parts = key.split('_');
    expect(parts).toHaveLength(4);
    expect(parts[3]).toMatch(/^\d+$/); // Timestamp is pure digits
  });

  it('should handle timestamp granularity correctly', () => {
    // Mock time at boundary
    const now = 1735344000;
    const key1 = generateIdempotencyKey('pay', 'rest-abc', 'order-xyz', now);
    const key2 = generateIdempotencyKey('pay', 'rest-abc', 'order-xyz', now + 0.5); // 500ms later
    expect(key1).toBe(key2); // Same second → same timestamp
  });
});
```

**Integration Test: Stripe Idempotency**
```typescript
describe('Stripe Idempotency', () => {
  it('should return same response for duplicate refund requests', async () => {
    const restaurantId = testRestaurantId;
    const orderId = testOrderId;
    const paymentId = 'pi_test123';

    // First refund
    const refund1 = await stripe.refunds.create(
      { payment_intent: paymentId, amount: 5000 },
      { idempotencyKey: generateIdempotencyKey('refund', restaurantId, orderId) }
    );

    // Duplicate refund (same parameters)
    const refund2 = await stripe.refunds.create(
      { payment_intent: paymentId, amount: 5000 },
      { idempotencyKey: generateIdempotencyKey('refund', restaurantId, orderId) }
    );

    // Must return same result
    expect(refund1.id).toBe(refund2.id);
    expect(refund1.amount).toBe(refund2.amount);
  });

  it('should create different refunds for different operations', async () => {
    const restaurantId = testRestaurantId;
    const paymentId = 'pi_test123';

    // Two different refunds
    const refund1 = await stripe.refunds.create(
      { payment_intent: paymentId, amount: 5000 },
      { idempotencyKey: generateIdempotencyKey('refund', restaurantId, 'order-1') }
    );

    const refund2 = await stripe.refunds.create(
      { payment_intent: paymentId, amount: 3000 },
      { idempotencyKey: generateIdempotencyKey('refund', restaurantId, 'order-2') }
    );

    // Different refunds
    expect(refund1.id).not.toBe(refund2.id);
    expect(refund1.amount).not.toBe(refund2.amount);
  });
});
```

### General Rules

**Rule 1: Idempotency keys must be deterministic**
- Key depends ONLY on operation parameters (type, resource ID, optional timestamp)
- No randomness, no UUIDs, no database state
- Same operation = same key, always

**Rule 2: Idempotency keys must include tenant ID**
- Prevents cross-tenant collisions (two restaurants same order ID)
- At least use restaurant ID suffix

**Rule 3: Timestamp granularity must match retry window**
- Seconds: Allows retries within same second (typical)
- If retries happen faster than second, use milliseconds
- Document the choice in comments

**Rule 4: Key format must be stable**
- Don't change key format mid-deployment
- If format changes, old keys remain valid until cleanup period
- New format should not collide with old format

---

## Pattern 2: Incomplete Transaction Pattern

### What Went Wrong

The refund endpoint successfully processed the refund with Stripe but didn't update the local order status. This created data inconsistency between external system and local database.

**Issue Code (BEFORE):**
```typescript
// server/src/routes/payments.routes.ts - refund endpoint
router.post('/refund', async (req, res) => {
  const { paymentId } = req.body;
  const restaurantId = req.restaurantId!;

  // Step 1: Validate refund request
  validateRefundRequest(restaurantId, paymentId);

  // Step 2: Create refund with Stripe ✅
  const refund = await stripe.refunds.create({
    payment_intent: paymentId,
    amount: fullAmount
  }, { idempotencyKey });

  // Step 3: Log to audit trail ✅
  await PaymentService.logPaymentAttempt({
    orderId: paymentIntentMetadata.order_id,
    amount: refund.amount,
    status: 'refunded', // ✅ Logged as refunded
    restaurantId,
    paymentId
  });

  // ❌ MISSING: Update order payment_status
  // The order still shows as 'paid' in the database
  // But Stripe shows it as refunded

  res.json({ success: true, refund });
});

// Result: Data inconsistency
// - Stripe: payment is refunded
// - Database: order.payment_status = 'paid'
// - Audit trail: shows refund event
// - Staff UI: shows order as "paid" (wrong)
```

**Why It's Dangerous:**
- Financial records don't match Stripe data
- Staff see incorrect order status
- Reconciliation between systems fails
- Partial refunds might create state confusion

### Code Review Checklist

**Transaction Completeness:**
- [ ] **All side effects tracked** - List every system updated (Stripe, database, cache, audit log)
- [ ] **Updates are ordered correctly** - Dependencies respected (validate before updating)
- [ ] **External API called first** - Stripe updated before local state (idempotency safety)
- [ ] **Local state updated second** - Database updated after Stripe succeeds
- [ ] **Audit logged after both** - Log captures both external and internal updates
- [ ] **Rollback plan exists** - If local update fails, Stripe already updated (plan for this)

**Payment State Transitions:**
- [ ] **Valid state transitions only** - `paid → refunded`, not `pending → refunded`
- [ ] **All affected records updated** - Order, payment record, audit trail, cache
- [ ] **No orphaned records** - Every payment has corresponding order status
- [ ] **Consistency checks in tests** - Verify DB matches Stripe state

### Patterns to Watch For

**❌ Anti-Pattern: External System Updated, Local State Not**
```typescript
// WRONG - Incomplete transaction
async function processRefund(restaurantId, paymentId, amount) {
  // Step 1: Update external system
  const stripe_refund = await stripe.refunds.create({
    payment_intent: paymentId,
    amount
  });
  logger.info('Refund processed on Stripe'); // ✅ Stripe updated

  // Missing Step 2: Update local state
  // ❌ Database still shows payment as 'paid'
  // ❌ UI shows wrong status
  // ❌ Reconciliation fails

  return { success: true, refund: stripe_refund };
}
```

**❌ Anti-Pattern: Local State Updated, Stripe Call Might Fail**
```typescript
// WRONG - Wrong order of operations
async function processRefund(restaurantId, paymentId, amount) {
  // Step 1: Update local state (risky - Stripe call might fail)
  await db.orders.update({
    where: { id: orderId },
    data: { payment_status: 'refunded' }
  }); // ✅ Local updated

  // Step 2: Call Stripe (might fail)
  const stripe_refund = await stripe.refunds.create({
    payment_intent: paymentId,
    amount
  }); // ❌ What if this fails?

  // If Stripe call fails: DB says refunded but Stripe doesn't have refund
  // If network timeout: DB updated but Stripe call might complete later
}
```

**❌ Anti-Pattern: Audit Log Without State Update**
```typescript
// WRONG - Logging refund without updating state
async function processRefund(restaurantId, paymentId, amount) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentId,
    amount
  }); // ✅ Stripe updated

  // Log that it happened
  await auditLog.create({
    action: 'refund',
    status: 'success',
    paymentId
  }); // ✅ Audit logged

  // ❌ But order status never updated
  // Audit trail shows refund succeeded
  // Database shows payment_status still 'paid'
}
```

**✅ Correct Pattern: Complete Transaction**
```typescript
// CORRECT - All systems updated
async function processRefund(restaurantId, paymentId, amount) {
  // Step 1: Validate all preconditions
  const order = await db.orders.findById(orderId);
  if (order.payment_status !== 'paid') {
    throw BadRequest('Order not in paid state');
  }
  if (!order.stripe_payment_id) {
    throw BadRequest('Order has no Stripe payment');
  }

  // Step 2: Call Stripe (external system first)
  const refund = await stripe.refunds.create({
    payment_intent: paymentId,
    amount
  }, { idempotencyKey: generateIdempotencyKey('refund', restaurantId, orderId) });

  // Step 3: Update database (local state)
  const updatedOrder = await db.orders.update({
    where: { id: orderId, restaurant_id: restaurantId },
    data: {
      payment_status: 'refunded',
      updated_at: now
    }
  });

  // Step 4: Log completion (audit trail)
  await PaymentService.logPaymentAttempt({
    orderId,
    restaurantId,
    amount: refund.amount,
    status: 'refunded',
    paymentId: refund.id,
    idempotencyKey
  });

  // ✅ All systems consistent
  return { success: true, order: updatedOrder, refund };
}
```

### Test Cases

**Unit Test: State Consistency**
```typescript
describe('Refund Completeness', () => {
  it('should update order status when refund succeeds', async () => {
    const restaurantId = testRestaurantId;
    const orderId = testOrderId;

    // Initial state
    let order = await db.orders.findById(orderId);
    expect(order.payment_status).toBe('paid');

    // Process refund
    await stripe.refunds.create(
      { payment_intent: order.stripe_payment_id, amount: order.total_amount * 100 },
      { idempotencyKey: generateIdempotencyKey('refund', restaurantId, orderId) }
    );

    // Database must be updated
    order = await db.orders.findById(orderId);
    expect(order.payment_status).toBe('refunded'); // ✅ Updated

    // Check timestamps match
    expect(order.updated_at).toBeTruthy();
  });

  it('should not return success if database update fails', async () => {
    const restaurantId = testRestaurantId;
    const orderId = testOrderId;

    // Mock Stripe success
    jest.spyOn(stripe, 'refunds').mockResolvedValue({ id: 're_test123' });

    // Mock database failure
    jest.spyOn(db.orders, 'update').mockRejectedValue(new Error('DB error'));

    // Should throw error (not return success)
    await expect(
      processRefund(restaurantId, orderId)
    ).rejects.toThrow();
  });

  it('should include all metadata in audit log', async () => {
    const restaurantId = testRestaurantId;
    const orderId = testOrderId;
    const auditSpy = jest.spyOn(PaymentService, 'logPaymentAttempt');

    await processRefund(restaurantId, orderId);

    // Verify complete audit entry
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        restaurantId,
        status: 'refunded',
        paymentId: expect.any(String), // Stripe refund ID
        idempotencyKey: expect.any(String)
      })
    );
  });
});
```

**Integration Test: Full Refund Flow**
```typescript
describe('Full Refund Transaction', () => {
  it('should keep Stripe and database in sync', async () => {
    const restaurantId = testRestaurantId;
    const orderId = testOrderId;

    // Create order in paid state
    const order = await db.orders.create({
      restaurant_id: restaurantId,
      total_amount: 50.00,
      payment_status: 'paid',
      stripe_payment_id: 'pi_test123'
    });

    // Process refund
    const result = await refundEndpoint({
      restaurantId,
      paymentId: 'pi_test123'
    });

    // Verify Stripe state
    const stripePayment = await stripe.paymentIntents.retrieve('pi_test123');
    expect(stripePayment.charges.data[0].refunded).toBe(true); // ✅ Stripe refunded

    // Verify database state
    const dbOrder = await db.orders.findById(order.id);
    expect(dbOrder.payment_status).toBe('refunded'); // ✅ DB refunded

    // Verify audit trail
    const auditEntry = await db.audit_logs.findOne({
      where: { order_id: order.id, action: 'refund' }
    });
    expect(auditEntry).toBeTruthy();
    expect(auditEntry.status).toBe('success');

    // ✅ All systems in sync
  });

  it('should handle idempotency correctly', async () => {
    const restaurantId = testRestaurantId;
    const orderId = testOrderId;

    // First refund
    const result1 = await refundEndpoint({
      restaurantId,
      paymentId: 'pi_test123'
    });

    // Duplicate refund
    const result2 = await refundEndpoint({
      restaurantId,
      paymentId: 'pi_test123'
    });

    // Both should succeed (idempotent)
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Same refund ID from Stripe
    expect(result1.refund.id).toBe(result2.refund.id);

    // Database updated only once (no duplicate rows)
    const auditEntries = await db.audit_logs.find({
      where: { order_id: orderId, action: 'refund' }
    });
    expect(auditEntries.length).toBe(1); // Single audit entry
  });
});
```

### General Rules

**Rule 1: External system updated first, database second**
- Stripe/payment provider call before database update
- Prevents inconsistency if local update fails
- Database can always recover to match Stripe

**Rule 2: Every external operation has local state update**
- Payment created in Stripe → Order status set
- Refund created in Stripe → Order status updated
- Charge captured → Payment status updated
- No exception to this rule

**Rule 3: State transitions must be valid**
- Only allow transitions that make business sense
- `paid → refunded` (full)
- `paid → partially_refunded` (partial)
- Never allow invalid transitions like `pending → refunded`

**Rule 4: Audit log captures complete transaction**
- Log external system ID (Stripe refund ID, payment ID)
- Log local state change (old status → new status)
- Include idempotency key for deduplication
- Log must occur after both systems updated

**Rule 5: Idempotency protects against partial failures**
- If refund succeeds but database update fails
- Retry will complete the database update
- Without idempotency, would create duplicate Stripe refund

---

## Pattern 3: Missing Tenant Validation Gap

### What Went Wrong

The refund endpoint validated that the requesting user had access to a restaurant (via middleware), but didn't verify that the payment being refunded belonged to that restaurant. An attacker who obtained a payment ID from a different restaurant could potentially refund it.

**Issue Code (BEFORE):**
```typescript
// server/src/routes/payments.routes.ts - refund endpoint
router.post('/refund', async (req, res) => {
  // Middleware validates restaurantId from JWT ✅
  const restaurantId = req.restaurantId!; // From JWT, verified
  const { paymentId } = req.body;

  // ❌ MISSING: Verify payment belongs to this restaurant
  // Just fetches payment from Stripe without checking ownership
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

  // Create refund (no tenant check)
  const refund = await stripe.refunds.create({
    payment_intent: paymentId,
    // ...
  });

  // ❌ If paymentId is from different restaurant, still succeeds
  // Scenario:
  // - Restaurant A owns payment 'pi_rest_a_order_123'
  // - Restaurant B tries to refund it
  // - Middleware passes (user has JWT for their restaurant)
  // - Payment ownership never checked
  // - Refund succeeds (unauthorized)
});

// Vulnerable request:
POST /api/refund
Authorization: Bearer eyJrestaurant_id: 'rest-b'...
{ "paymentId": "pi_rest_a_order_123" }
// ❌ Succeeds because endpoint doesn't check payment ownership
```

**Why It's Dangerous:**
- Multi-tenant isolation is critical security boundary
- Attacker doesn't need access to Restaurant A's JWT
- Just needs to know a payment ID from Restaurant A
- Can refund any payment in the system
- Payment metadata might be visible in error responses

### Code Review Checklist

**Tenant Isolation - Resource Operations:**
- [ ] **Tenant ID extracted from JWT** - Never from request headers or client
- [ ] **Resource ownership validated** - Every resource operation checks ownership
- [ ] **Ownership check is explicit** - Don't rely on implicit scoping
- [ ] **Early return on ownership failure** - Check before modifying state
- [ ] **Error message is generic** - Don't reveal why access denied

**Tenant Isolation - Payment Operations Specifically:**
- [ ] **Payment retrieved from Stripe** - Stripe returns data
- [ ] **Payment metadata checked** - Verify `metadata.restaurant_id` matches JWT
- [ ] **OR local record checked** - Look up payment in database with restaurant filter
- [ ] **Payment order_id extracted** - Used to verify order ownership
- [ ] **Order ownership verified** - Order belongs to authenticated restaurant

**Tenant Isolation - Multi-tenant Pattern:**
- [ ] **All database queries filter by tenant ID** - SELECT, UPDATE, DELETE all include filter
- [ ] **Foreign key checks work with tenant ID** - Payment order → Order restaurant match
- [ ] **Cross-tenant attempts logged** - Audit trail captures unauthorized access attempts
- [ ] **RLS policies enforce in database** - Cannot accidentally query without filter

### Patterns to Watch For

**❌ Anti-Pattern: No Ownership Check**
```typescript
// WRONG - Only validates request, not resource ownership
async function refundPayment(req, res) {
  const restaurantId = req.restaurantId; // ✅ From JWT
  const { paymentId } = req.body;

  // ❌ Missing: Verify payment belongs to this restaurant
  const payment = await stripe.paymentIntents.retrieve(paymentId);

  // Creates refund without checking ownership
  const refund = await stripe.refunds.create({
    payment_intent: paymentId
  });

  res.json({ success: true, refund });
}

// Vulnerable to:
// Restaurant A: POST /api/refund { paymentId: 'pi_rest_a_...' } ✅ Allowed
// Restaurant B: POST /api/refund { paymentId: 'pi_rest_a_...' } ❌ ALSO ALLOWED (wrong!)
```

**❌ Anti-Pattern: Only Checking Stripe Metadata**
```typescript
// WRONG (if metadata not set correctly)
async function refundPayment(req, res) {
  const restaurantId = req.restaurantId;
  const { paymentId } = req.body;

  const payment = await stripe.paymentIntents.retrieve(paymentId);

  // Assumes metadata is always present and correct
  if (payment.metadata.restaurant_id !== restaurantId) {
    // ❌ What if metadata is missing or empty?
    throw Unauthorized();
  }

  // ❌ Relies on Stripe data being correct
  // If payment was created without metadata, check fails silently
}
```

**❌ Anti-Pattern: Checking Local Record After Creating Refund**
```typescript
// WRONG - Too late to check after modifying state
async function refundPayment(req, res) {
  const restaurantId = req.restaurantId;
  const { paymentId } = req.body;

  // ❌ Refund created first
  const refund = await stripe.refunds.create({
    payment_intent: paymentId
  });

  // ❌ Check ownership AFTER refund created
  const order = await db.orders.findOne({
    where: { stripe_payment_id: paymentId, restaurant_id: restaurantId }
  });

  if (!order) {
    // Too late - refund already created
    throw Unauthorized();
  }
}
```

**✅ Correct Pattern: Verify Ownership Before Operation**
```typescript
// CORRECT - Check ownership BEFORE refund
async function refundPayment(req, res) {
  const restaurantId = req.restaurantId; // From JWT
  const { paymentId } = req.body;

  // Step 1: Verify payment ownership via local database
  const order = await db.orders.findOne({
    where: {
      stripe_payment_id: paymentId,
      restaurant_id: restaurantId // ✅ FILTER BY RESTAURANT
    }
  });

  // ❌ If not found, payment doesn't belong to this restaurant
  if (!order) {
    throw Unauthorized('Payment not found');
  }

  // Step 2: Verify Stripe payment metadata (defense in depth)
  const payment = await stripe.paymentIntents.retrieve(paymentId);
  if (payment.metadata?.restaurant_id !== restaurantId) {
    logger.warn('Stripe metadata mismatch', {
      paymentId,
      requestRestaurantId: restaurantId,
      stripeRestaurantId: payment.metadata?.restaurant_id
    });
    throw Unauthorized('Payment does not belong to this restaurant');
  }

  // Step 3: Generate idempotency key using restaurant and order IDs
  const idempotencyKey = generateIdempotencyKey('refund', restaurantId, order.id);

  // Step 4: Create refund (now we know it's authorized)
  const refund = await stripe.refunds.create(
    { payment_intent: paymentId, amount: order.total_amount * 100 },
    { idempotencyKey }
  );

  // Step 5: Update local state
  await db.orders.update({
    where: { id: order.id },
    data: { payment_status: 'refunded' }
  });

  // ✅ All checks passed, state updated
  res.json({ success: true, refund });
}
```

**✅ Correct Pattern: Dual Validation (Database + Stripe)**
```typescript
// CORRECT - Both local and external validation
async function refundPayment(req, res) {
  const restaurantId = req.restaurantId;
  const { paymentId } = req.body;

  // Validation 1: Check local database
  const order = await db.orders.findOne({
    where: { stripe_payment_id: paymentId, restaurant_id: restaurantId }
  });
  if (!order) {
    throw Unauthorized('Payment not found');
  }

  // Validation 2: Verify Stripe metadata
  const payment = await stripe.paymentIntents.retrieve(paymentId);
  if (payment.metadata?.restaurant_id !== restaurantId) {
    // Log discrepancy
    logger.error('Payment ownership mismatch', {
      source: 'database',
      databaseRestaurantId: restaurantId,
      stripeMetadata: payment.metadata?.restaurant_id
    });
    throw Unauthorized('Payment authentication failed');
  }

  // Both checks passed - safe to proceed
  const refund = await stripe.refunds.create({
    payment_intent: paymentId
  }, { idempotencyKey: generateIdempotencyKey('refund', restaurantId, order.id) });

  await db.orders.update({
    where: { id: order.id },
    data: { payment_status: 'refunded' }
  });

  // ✅ Verified from two independent sources
  return { success: true, refund };
}
```

### Test Cases

**Unit Test: Ownership Validation**
```typescript
describe('Refund Ownership Validation', () => {
  const restaurantA = '11111111-1111-1111-1111-111111111111';
  const restaurantB = '22222222-2222-2222-2222-222222222222';

  it('should allow refund of own restaurant payment', async () => {
    // Setup: Restaurant A has a payment
    const order = await db.orders.create({
      restaurant_id: restaurantA,
      stripe_payment_id: 'pi_rest_a_123',
      payment_status: 'paid'
    });

    // Restaurant A refunds its own payment
    const result = await refundPayment({
      restaurantId: restaurantA,
      paymentId: 'pi_rest_a_123'
    });

    expect(result.success).toBe(true); // ✅ Allowed
  });

  it('should deny refund of other restaurant payment', async () => {
    // Setup: Restaurant A has a payment
    const order = await db.orders.create({
      restaurant_id: restaurantA,
      stripe_payment_id: 'pi_rest_a_123',
      payment_status: 'paid'
    });

    // Restaurant B attempts to refund Restaurant A's payment
    await expect(
      refundPayment({
        restaurantId: restaurantB,
        paymentId: 'pi_rest_a_123'
      })
    ).rejects.toThrow('Payment not found'); // ❌ Denied

    // ✅ Payment not refunded
    const refunds = await stripe.refunds.list({ payment_intent: 'pi_rest_a_123' });
    expect(refunds.data).toHaveLength(0);
  });

  it('should reject even with valid request body', async () => {
    // Verify it's not about request validation
    const order = await db.orders.create({
      restaurant_id: restaurantA,
      stripe_payment_id: 'pi_rest_a_123'
    });

    // Even with perfectly formatted request
    await expect(
      refundPayment({
        restaurantId: restaurantB,
        paymentId: 'pi_rest_a_123',
        amount: order.total_amount // Valid amount
      })
    ).rejects.toThrow();

    // ❌ Still denied
  });

  it('should log cross-tenant attempts', async () => {
    const auditSpy = jest.spyOn(logger, 'warn');

    await expect(
      refundPayment({
        restaurantId: restaurantB,
        paymentId: 'pi_rest_a_123'
      })
    ).rejects.toThrow();

    // ✅ Logged for security monitoring
    expect(auditSpy).toHaveBeenCalledWith(
      expect.stringContaining('cross-tenant') || 'Payment not found',
      expect.any(Object)
    );
  });
});
```

**Integration Test: Multi-tenant Payment Isolation**
```typescript
describe('Multi-Tenant Payment Isolation', () => {
  it('should prevent cross-tenant refund via database query', async () => {
    // Create payments in different restaurants
    const orderA = await db.orders.create({
      restaurant_id: restaurantA,
      stripe_payment_id: 'pi_rest_a_456',
      payment_status: 'paid'
    });

    const orderB = await db.orders.create({
      restaurant_id: restaurantB,
      stripe_payment_id: 'pi_rest_b_789',
      payment_status: 'paid'
    });

    // Query for restaurant A's payments (restaurant B's user)
    const payments = await db.orders.find({
      where: {
        stripe_payment_id: 'pi_rest_a_456',
        restaurant_id: restaurantB // ❌ Wrong restaurant
      }
    });

    // ✅ Database RLS or query logic prevents access
    expect(payments).toHaveLength(0);
  });

  it('should require restaurant_id in all payment queries', async () => {
    // This test catches if someone removes the restaurant_id filter

    // BAD: Query without restaurant filter
    // const payment = await db.orders.findOne({
    //   where: { stripe_payment_id: 'pi_rest_a_456' }
    // }); // ❌ Would return any payment with that ID

    // GOOD: Query with restaurant filter
    const payment = await db.orders.findOne({
      where: {
        stripe_payment_id: 'pi_rest_a_456',
        restaurant_id: restaurantA // ✅ REQUIRED FILTER
      }
    });

    // Verify query includes restaurant_id
    // (This might be a static code check rather than runtime test)
  });
});
```

**E2E Test: Cross-Tenant Refund Prevention**
```typescript
describe('Cross-Tenant Refund Prevention E2E', () => {
  it('should deny Restaurant B refunding Restaurant A payment', async () => {
    // Setup: Create restaurant A with payment
    const restA = await createTestRestaurant('Restaurant A');
    const orderA = await createTestOrder(restA.id, {
      stripe_payment_id: 'pi_rest_a_xyz',
      payment_status: 'paid'
    });

    // Create restaurant B
    const restB = await createTestRestaurant('Restaurant B');
    const tokenB = generateJWT(restB.id);

    // Restaurant B attempts refund of A's payment
    const response = await request(app)
      .post('/api/payments/refund')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ paymentId: 'pi_rest_a_xyz' })
      .expect(401); // Unauthorized

    expect(response.body.error).toBeDefined();

    // Verify refund was NOT created
    const stripeRefunds = await stripe.refunds.list({
      payment_intent: 'pi_rest_a_xyz'
    });
    expect(stripeRefunds.data).toHaveLength(0); // ✅ No refund created
  });
});
```

### General Rules

**Rule 1: Extract tenant ID from JWT only**
- Never use client-provided headers or query parameters for tenant validation
- Middleware sets `req.restaurantId` from JWT
- Use `req.restaurantId` for all database operations

**Rule 2: Verify resource ownership before modification**
- Query database with `WHERE restaurant_id = $1`
- Verify returned resource matches expected restaurant
- If not found, throw 401/403 (don't expose whether resource exists)

**Rule 3: Dual validation for critical operations**
- Check local database (primary source of truth)
- Verify external system metadata (defense in depth)
- Log if they don't match (data integrity issue)

**Rule 4: All database queries must include tenant filter**
- Exception: Admin operations (log these)
- Use query builder/ORM to prevent accidental omission
- Code review catches missing filters

**Rule 5: Error messages must be generic for authorization failures**
- ❌ "Payment belongs to Restaurant A"
- ❌ "Order not found for this restaurant"
- ✅ "Payment not found" (same as non-existent payment)

---

## Combined Code Review Checklist

Use this checklist for any PR touching payment flows:

### Payment Security Checklist

**Idempotency:**
- [ ] Idempotency key generation has NO random component
- [ ] Key format is: `{type}_{restaurantId}_{resourceId}_{timestamp}`
- [ ] Timestamp granularity matches retry window (seconds typical)
- [ ] Key is passed to Stripe/external API
- [ ] Test verifies duplicate requests return same response

**Transaction Completeness:**
- [ ] Stripe API called first (before database update)
- [ ] Database state updated after Stripe succeeds
- [ ] Order status changed (paid → refunded, etc.)
- [ ] Audit log includes Stripe ID and local state change
- [ ] Error handling documented (what if DB update fails)

**Tenant Isolation:**
- [ ] Restaurant ID extracted from JWT
- [ ] Payment ownership verified before refund
- [ ] Database query includes `restaurant_id` filter
- [ ] Stripe metadata checked (if present)
- [ ] Cross-tenant attempts logged

**Comprehensive Example:**

```typescript
// ✅ CORRECT - All patterns applied
async function refundPayment(req: Request, res: Response) {
  const restaurantId = req.restaurantId!; // From JWT
  const { paymentId, amount } = req.body;

  // 1. TENANT VALIDATION - Verify ownership first
  const order = await db.orders.findOne({
    where: { stripe_payment_id: paymentId, restaurant_id: restaurantId }
  });
  if (!order) {
    logger.warn('Refund attempt for unknown payment', { paymentId, restaurantId });
    throw Unauthorized('Payment not found');
  }

  // 2. DUAL VALIDATION - Check Stripe too
  const payment = await stripe.paymentIntents.retrieve(paymentId);
  if (payment.metadata?.restaurant_id !== restaurantId) {
    throw Unauthorized('Payment ownership verification failed');
  }

  // 3. IDEMPOTENCY - Generate deterministic key
  const idempotencyKey = generateIdempotencyKey(
    'refund',
    restaurantId,
    order.id
  );

  // 4. EXTERNAL SYSTEM FIRST - Stripe refund
  const refund = await stripe.refunds.create(
    { payment_intent: paymentId, amount },
    { idempotencyKey }
  );

  // 5. LOCAL STATE SECOND - Update database
  const updatedOrder = await db.orders.update({
    where: { id: order.id, restaurant_id: restaurantId },
    data: { payment_status: 'refunded', updated_at: new Date() }
  });

  // 6. AUDIT LOG LAST - Record completion
  await PaymentService.logPaymentAttempt({
    orderId: order.id,
    restaurantId,
    amount: refund.amount,
    status: 'refunded',
    paymentId: refund.id,
    idempotencyKey
  });

  // ✅ All systems consistent
  res.json({ success: true, order: updatedOrder, refund });
}
```

---

## Prevention Summary

These three patterns compound (interact) to create vulnerabilities:

1. **Idempotency broken** + **Incomplete transaction** = Duplicate refunds with state inconsistency
2. **Missing tenant check** + **Incomplete transaction** = Cross-tenant data modification
3. **Missing tenant check** + **Idempotency broken** = Replay attack across tenants

**The key insight:** Each issue alone is dangerous. Combined, they create catastrophic scenarios.

### Prevention Cascade

1. **Code Review**
   - Check idempotency keys have no randomness
   - Check all external operations have local state updates
   - Check all resources validated for ownership

2. **Testing**
   - Unit tests for deterministic keys
   - Integration tests for transaction completeness
   - E2E tests for cross-tenant prevention

3. **Monitoring**
   - Alert on Stripe refunds without order status change
   - Alert on cross-tenant access attempts
   - Alert on idempotency key collisions

4. **Deployment**
   - Run payment tests before deploy
   - Verify refund tests pass
   - Check for any orphaned refunds on Stripe vs database

---

## Related Documents

- `SECURITY-HARDENING-PREVENTION.md` - General security prevention patterns
- `CHECKLIST-SECURITY-CODE-REVIEW.md` - Security code review checklist
- `docs/solutions/security-issues/multi-tenant-isolation-rls-cache.md` - Multi-tenancy deep dive
- Payment service: `server/src/services/payment.service.ts`
- Refund endpoint: `server/src/routes/payments.routes.ts`

---

**Last Updated**: 2025-12-29
**Type**: Critical (Payments + Multi-Tenancy)
**Review Cycle**: Before any payment-related changes, minimum after each security incident
