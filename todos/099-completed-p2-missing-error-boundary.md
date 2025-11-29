---
status: pending
priority: p2
issue_id: "099"
tags: [code-review, architecture, error-handling, pr-148]
dependencies: []
---

# Missing PaymentErrorBoundary Wrapper

## Problem Statement

The PaymentModal is not wrapped in the existing `PaymentErrorBoundary` component. Payment errors will bubble up to the global error boundary instead of being handled with payment-specific recovery logic and audit logging.

**Why it matters:** Payment flows require specialized error handling with proper recovery options and compliance logging.

## Findings

### Architecture Strategist
- **File:** `client/src/pages/ServerView.tsx:311-320`
- **Evidence:**
```typescript
<PaymentModal
  show={paymentState.show_modal}
  order_id={paymentState.order_id || ''}
  subtotal={paymentState.subtotal}
  tax={paymentState.tax}
  table_id={paymentState.table_id || undefined}
  onClose={handlePaymentModalClose}
  onSuccess={handlePaymentSuccess}
  onUpdateTableStatus={handleUpdateTableStatus}
/>
// ❌ Not wrapped in PaymentErrorBoundary
```

- **Existing Component:** `client/src/components/errors/PaymentErrorBoundary.tsx` exists but is not used

## Proposed Solutions

### Option A: Wrap in PaymentErrorBoundary (Recommended)
**Pros:** Uses existing infrastructure, proper error recovery
**Cons:** Minor code change
**Effort:** Small (5 minutes)
**Risk:** Low

```typescript
import { PaymentErrorBoundary } from '@/components/errors/PaymentErrorBoundary';

<PaymentErrorBoundary onRetry={() => setPaymentState(initialPaymentState)}>
  <PaymentModal
    show={paymentState.show_modal}
    order_id={paymentState.order_id || ''}
    subtotal={paymentState.subtotal}
    tax={paymentState.tax}
    table_id={paymentState.table_id || undefined}
    onClose={handlePaymentModalClose}
    onSuccess={handlePaymentSuccess}
    onUpdateTableStatus={handleUpdateTableStatus}
  />
</PaymentErrorBoundary>
```

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:** `client/src/pages/ServerView.tsx:311-320`
- **Components:** ServerView, PaymentModal, PaymentErrorBoundary
- **Existing Infrastructure:** `client/src/components/errors/PaymentErrorBoundary.tsx`

## Acceptance Criteria

- [ ] PaymentModal wrapped in PaymentErrorBoundary
- [ ] Error recovery tested (payment error → retry option shown)
- [ ] Audit logging triggers on payment errors

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
- **Existing:** PaymentErrorBoundary component
