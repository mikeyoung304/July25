# Quick Reference: Payment Security Patterns

**Use this during code review of payment-related PRs**
**Time to review: 5 minutes**
**Full guide: `PREVENTION-PAYMENT-SECURITY.md`**

---

## Red Flags (Stop and investigate)

### Idempotency Keys

- [ ] Random bytes, nonce, or UUID in key: `randomBytes()`, `crypto.randomUUID()`, `Math.random()`
- [ ] Millisecond timestamp in key instead of seconds: `Date.now()` directly
- [ ] Key changes on retry (test: call same function twice with identical params)
- [ ] Key doesn't include resource ID: `pay_timestamp` instead of `pay_restaurantId_orderId_timestamp`
- [ ] Key not passed to Stripe: `stripe.refunds.create()` missing `{ idempotencyKey }`

### Transaction Completeness

- [ ] Stripe call without database update: `await stripe.refunds.create()` → no `db.orders.update()`
- [ ] Database updated BEFORE Stripe call (wrong order)
- [ ] Audit log but no order status change: `logPaymentAttempt({ status: 'refunded' })` but order still `paid`
- [ ] No error handling for partial failure (Stripe succeeds, DB fails)
- [ ] Missing state transition validation: no check that order is in `paid` state before refunding

### Tenant Isolation

- [ ] No ownership check before operation: `stripe.refunds.create({ payment_intent: paymentId })`
- [ ] Only checking request (not resource): `if (req.restaurantId)` without checking payment ownership
- [ ] Database query without restaurant filter: `db.orders.findOne({ stripe_payment_id })` no `.where()`
- [ ] Getting restaurantId from header: `req.headers['x-restaurant-id']` (should be from JWT)
- [ ] Logging before ownership check: revealing payment details without validating tenant

---

## Green Flags (Good patterns)

### Idempotency Keys

- [ ] Key format: `{type}_{restaurantSuffix}_{resourceSuffix}_{secondsTimestamp}`
- [ ] Generated consistently: Same operation = Same key
- [ ] No randomness: Only deterministic components
- [ ] Passed to external API: `stripe.refunds.create({...}, { idempotencyKey })`
- [ ] Timestamp in seconds: `Math.floor(Date.now() / 1000)` or similar

### Transaction Completeness

- [ ] Stripe operation first: `const refund = await stripe.refunds.create(...)`
- [ ] Database update second: `await db.orders.update({ ...data })`
- [ ] Audit log third: `await PaymentService.logPaymentAttempt(...)`
- [ ] All three in order: external → local → audit
- [ ] Includes order ID extraction: `const orderId = paymentIntentMetadata.order_id`

### Tenant Isolation

- [ ] Database lookup with restaurant filter: `db.orders.findOne({ stripe_payment_id, restaurant_id })`
- [ ] Ownership check BEFORE operation: Verify ownership before calling Stripe
- [ ] Stripe metadata check: `if (payment.metadata?.restaurant_id !== restaurantId)`
- [ ] Two validations: Local database AND Stripe metadata
- [ ] Generic error message: "Payment not found" (not "Payment from different restaurant")

---

## Code Review Checklist (2 minutes)

### Payment Operation (any Stripe call)

- [ ] **Ownership verified**: Payment/charge belongs to authenticated restaurant
- [ ] **Tenant ID from JWT**: `req.restaurantId` (not headers)
- [ ] **All effects tracked**: List Stripe calls + DB updates + audit logs
- [ ] **Order in correct state**: Can only refund if payment_status is 'paid'
- [ ] **Idempotency key included**: If Stripe call, key is provided

### Refund Specifically

- [ ] **Restaurant_id in key**: `generateIdempotencyKey('refund', restaurantId, orderId)`
- [ ] **Order updated after refund**: `payment_status: 'refunded'` or `'partially_refunded'`
- [ ] **Timestamps match**: Order `updated_at` matches refund operation
- [ ] **Stripe API called first**: Before database update
- [ ] **Audit logged**: Entry includes Stripe refund ID and idempotency key

---

## Common Mistakes (Quick Diagnosis)

**"Tests pass, payment endpoint works, but we could double-refund"**
→ Check idempotency key for random nonce (Issue #238)

**"Stripe shows refunded, database shows paid, reconciliation breaks"**
→ Check if order status is updated after Stripe refund (Issue #239)

**"Restaurant B somehow refunded Restaurant A's payment"**
→ Check if ownership verified before refund, not just middleware (Issue #241)

**"Duplicate refunds in Stripe"**
→ Check if key has randomness OR key not being used

---

## Test This (5-10 minutes)

### Unit Test: Deterministic Keys
```typescript
const key1 = generateIdempotencyKey('refund', 'rest-abc', 'order-xyz');
const key2 = generateIdempotencyKey('refund', 'rest-abc', 'order-xyz');
expect(key1).toBe(key2); // ✅ Must match
```

### Unit Test: Ownership Check
```typescript
const result = await refund({
  restaurantId: 'rest-b',
  paymentId: 'pi_rest_a_123' // From different restaurant
});
expect(result).toThrow(); // ✅ Must reject
```

### Integration Test: Completeness
```typescript
// Before: order.payment_status = 'paid'
await refundEndpoint({ paymentId: 'pi_test123' });
// After: order.payment_status = 'refunded' (not still 'paid')
```

---

## Pattern Summary

| Pattern | Issue | Red Flag | Green Flag |
|---------|-------|----------|-----------|
| **Idempotency** | Random nonce defeats purpose | `randomBytes()` in key | Deterministic, no randomness |
| **Transactions** | External updated, local not | Stripe call without DB update | All 3 effects in order |
| **Tenant Check** | No ownership validation | No `.where(restaurant_id)` | Two validations: DB + Stripe |

---

## References

- Full guide: `PREVENTION-PAYMENT-SECURITY.md`
- Payment service: `server/src/services/payment.service.ts`
- Refund endpoint: `server/src/routes/payments.routes.ts`
- Issues fixed: #238, #239, #241

---

**Last Updated:** 2025-12-29
**Type:** Quick Reference (bookmark this!)
**Use:** During code review of payment PRs
