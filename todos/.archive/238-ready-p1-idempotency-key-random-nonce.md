---
status: done
priority: p1
issue_id: "238"
tags: [code-review, security, payments]
dependencies: []
---

# P1: Idempotency Key Random Nonce Defeats Purpose

## Problem Statement

The `generateIdempotencyKey()` function includes a random nonce in every generated key, which defeats the purpose of idempotency keys. If a request is retried due to network failure, a NEW idempotency key is generated, meaning duplicate charges/refunds are NOT prevented.

**Why it matters:** Idempotency keys exist specifically to prevent duplicate operations on retry. The current implementation provides false confidence - the key exists but doesn't actually prevent duplicates.

## Findings

**Location:** `server/src/services/payment.service.ts:62`

```typescript
const nonce = randomBytes(8).toString('hex');
return `${type}_${restaurantSuffix}_${orderSuffix}_${ts}_${nonce}`;
```

**Evidence:**
- Each call generates a new random nonce
- If client retries after network timeout, new key is generated
- Stripe's idempotency protection is bypassed

**Severity:** P1 - Could result in duplicate refunds or charges

## Proposed Solutions

### Option A: Remove random nonce entirely (Recommended)
**Pros:** Simple fix, deterministic keys based on order+type
**Cons:** Keys are less unique (but that's the point)
**Effort:** Small (1 line change)
**Risk:** Low

```typescript
return `${type}_${restaurantSuffix}_${orderSuffix}_${ts}`;
```

### Option B: Use request-scoped nonce from client
**Pros:** Client controls retry identity
**Cons:** Adds client complexity, requires API change
**Effort:** Medium
**Risk:** Medium

### Option C: Cache keys by order ID
**Pros:** Deterministic per request
**Cons:** Requires Redis/memory cache, adds complexity
**Effort:** Large
**Risk:** Medium

## Recommended Action
<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `server/src/services/payment.service.ts` (generateIdempotencyKey)
- `server/src/routes/payments.routes.ts` (refund endpoint)

**Components:** Payment service, Stripe integration

## Acceptance Criteria

- [ ] Idempotency key is deterministic for same operation
- [ ] Retry of same request uses same idempotency key
- [ ] Test: Two identical refund requests return same Stripe response
- [ ] Timestamp granularity is coarse enough (seconds, not ms) to handle normal retries

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-29 | Identified during security review | Random nonce defeats idempotency purpose |

## Resources

- [Stripe Idempotency Keys](https://stripe.com/docs/api/idempotent_requests)
- PR: Security hardening sprint
