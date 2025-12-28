---
status: ready
priority: p2
issue_id: "009"
tags: [payments, error-handling, ux]
dependencies: []
---

# No Retry Logic After Payment Failure

## Problem Statement
When a payment fails, there's no built-in retry mechanism. Users must manually re-enter information or refresh the page.

## Findings
- Location: `client/src/pages/CheckoutPage.tsx`
- Payment failures show error but no retry option
- User must start over or guess what to do
- Poor error recovery UX

## Proposed Solutions

### Option 1: Add retry button with state preservation
- **Pros**: Better UX, preserves user data
- **Cons**: Need to handle Stripe Elements state
- **Effort**: Medium
- **Risk**: Low

```typescript
const handleRetry = () => {
  setPaymentError(null);
  setPaymentStatus('idle');
  // Elements automatically ready for retry
};
```

## Recommended Action
Add clear retry button after payment failure. Preserve form data and allow re-attempt.

## Technical Details
- **Affected Files**: `CheckoutPage.tsx`, `StripePaymentForm.tsx`
- **Related Components**: Payment flow, error handling
- **Database Changes**: No

## Acceptance Criteria
- [ ] Retry button shown after payment failure
- [ ] Form data preserved on retry
- [ ] Clear error message explaining what went wrong
- [ ] Limit retries to prevent abuse (3-5 attempts)

## Work Log

### 2025-12-28 - Approved for Work
**By:** Claude Triage System
**Actions:**
- UX issue identified during testing
- Status set to ready
- Priority P2 - important for payment completion

## Notes
Source: User Flow Test Findings (Dec 28, 2025) - Item P13
