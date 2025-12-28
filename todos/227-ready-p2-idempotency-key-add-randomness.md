---
status: ready
priority: p2
issue_id: "227"
tags: [security, payments, code-review]
dependencies: []
---

# Idempotency Key Lacks Cryptographic Randomness

## Problem Statement
The `generateIdempotencyKey()` function creates predictable keys using truncated IDs and timestamps. An attacker who knows the restaurant ID, order ID, and approximate timestamp could predict the key.

## Findings
- **Source**: Security Sentinel Review (2025-12-28)
- **Location**: `server/src/services/payment.service.ts` lines 52-62
- **Current Format**: `{type}_{restaurantSuffix}_{orderSuffix}_{timestamp}`
- **Risk**: While Stripe's idempotency is scoped to API keys, predictable keys could enable replay attacks if API key is compromised

## Proposed Solutions

### Option 1: Add cryptographic nonce (Recommended)
- **Pros**: Strong uniqueness guarantee, minimal code change
- **Cons**: Slightly longer key
- **Effort**: Small
- **Risk**: Low

```typescript
import { randomBytes } from 'crypto';
const nonce = randomBytes(8).toString('hex');
return `${type}_${restaurantSuffix}_${orderSuffix}_${ts}_${nonce}`;
```

### Option 2: Use full UUID hash
- **Pros**: Completely unpredictable
- **Cons**: Longer key, more computation
- **Effort**: Small
- **Risk**: Low

```typescript
import { createHash } from 'crypto';
const hash = createHash('sha256').update(`${restaurantId}${orderId}${ts}`).digest('hex').slice(0, 16);
return `${type}_${hash}_${ts}`;
```

## Recommended Action
Option 1 - Add 16-character random nonce to existing format.

## Technical Details
- **Affected Files**: `server/src/services/payment.service.ts`
- **Related Components**: Payment processing, idempotency
- **Database Changes**: No

## Acceptance Criteria
- [ ] Idempotency keys include cryptographic randomness
- [ ] Keys remain under Stripe's 255 character limit
- [ ] Existing tests updated to not expect predictable format
- [ ] Tenant isolation maintained

## Work Log

### 2025-12-28 - Identified in Code Review
**By:** Security Sentinel Agent
**Actions:**
- Identified predictable key format
- Assessed as MEDIUM-HIGH risk
- Recommended adding nonce

### 2025-12-28 - Triaged and Approved
**By:** Claude Code Review
**Decision:** Approved for implementation
**Rationale:** Valid finding with clear solution path
## Notes
Source: Code Review of commit 35025fd6
