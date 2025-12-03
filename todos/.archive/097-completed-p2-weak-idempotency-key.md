---
status: complete
priority: p2
issue_id: "097"
tags: [code-review, security, payments, pr-148]
dependencies: []
---

# Weak Idempotency Key Generation Using Math.random()

## Problem Statement

The idempotency key for card payments uses `Math.random()` which is cryptographically weak. An attacker could potentially predict or brute-force idempotency keys to replay or manipulate payment requests.

**Why it matters:** Idempotency keys prevent duplicate charges. Weak keys could enable payment replay attacks.

## Findings

### Security Sentinel
- **File:** `client/src/components/payments/CardPayment.tsx:68`
- **Evidence:**
```typescript
idempotency_key: `card-checkout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

### Risk Assessment
- `Math.random()` uses a PRNG that can be seeded/predicted
- `Date.now()` is predictable
- Combined, this provides weak entropy for security-sensitive operations

## Proposed Solutions

### Option A: Use crypto.randomUUID() (Recommended)
**Pros:** Cryptographically secure, native browser API
**Cons:** Requires modern browser support
**Effort:** Small (5 minutes)
**Risk:** Low

```typescript
idempotency_key: `card-checkout-${order_id}-${crypto.randomUUID()}`
```

### Option B: Use crypto.getRandomValues()
**Pros:** More control over format
**Cons:** More code
**Effort:** Small
**Risk:** Low

```typescript
const array = new Uint32Array(4);
crypto.getRandomValues(array);
const key = Array.from(array, x => x.toString(16).padStart(8, '0')).join('');
idempotency_key: `card-checkout-${order_id}-${key}`
```

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:** `client/src/components/payments/CardPayment.tsx:68`
- **Components:** CardPayment
- **Note:** Server at `payment.service.ts:138` generates its own idempotency key, so client key is secondary

## Acceptance Criteria

- [ ] Idempotency key uses cryptographically secure random
- [ ] Browser compatibility verified (crypto.randomUUID support)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
- **MDN:** crypto.randomUUID()
