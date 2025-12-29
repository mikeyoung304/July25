---
status: resolved
priority: p2
issue_id: "228"
tags: [security, payments, validation, code-review]
dependencies: []
---

# Missing Zod Validation on /confirm Endpoint

## Problem Statement
The `/api/v1/payments/confirm` endpoint lacks Zod schema validation, unlike `/create-payment-intent` and `/cash` endpoints. This inconsistency could allow malformed payloads.

## Findings
- **Source**: Security Sentinel Review (2025-12-28)
- **Location**: `server/src/routes/payments.routes.ts` lines 231-368
- **Evidence**: No `validateBody()` middleware on confirm route

```typescript
router.post('/confirm',
  paymentConfirmLimiter,
  optionalAuth,
  // NO validateBody() middleware here - inconsistent!
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
```

## Proposed Solutions

### Option 1: Add Zod schema (Recommended)
- **Pros**: Consistent with other payment endpoints, type-safe validation
- **Cons**: None
- **Effort**: Small
- **Risk**: Low

```typescript
// In shared/contracts/payment.ts
export const PaymentConfirmPayload = z.object({
  payment_intent_id: z.string().min(1),
  order_id: z.string().uuid()
});

// In payments.routes.ts
router.post('/confirm',
  paymentConfirmLimiter,
  optionalAuth,
  validateBody(PaymentConfirmPayload),  // Add this
  async (req: AuthenticatedRequest, res, next)
```

## Recommended Action
Add Zod schema validation to match other payment endpoints.

## Technical Details
- **Affected Files**: `server/src/routes/payments.routes.ts`, `shared/contracts/payment.ts`
- **Related Components**: Payment confirmation
- **Database Changes**: No

## Acceptance Criteria
- [ ] PaymentConfirmPayload schema defined in shared/contracts
- [ ] validateBody() middleware added to /confirm route
- [ ] Invalid payloads return 400 with validation errors
- [ ] Valid payloads continue to work

## Work Log

### 2025-12-28 - Identified in Code Review
**By:** Security Sentinel Agent
**Actions:**
- Found missing validation middleware
- Assessed as MEDIUM concern

### 2025-12-28 - Triaged and Approved
**By:** Claude Code Review
**Decision:** Approved for implementation
**Rationale:** Valid finding with clear solution path
## Notes
Source: Code Review of commit 35025fd6
