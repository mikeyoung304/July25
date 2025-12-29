---
status: resolved
priority: p2
issue_id: "008"
tags: [ux, demo-mode, consistency]
dependencies: []
---

# Demo Mode Messages Inconsistent

## Problem Statement
Demo mode messages are inconsistent between CheckoutPage and StripePaymentForm. This creates confusion about what demo mode means and how it behaves.

## Findings
- Location: `CheckoutPage.tsx` vs `StripePaymentForm.tsx`
- Different wording for demo mode indicators
- Inconsistent styling/placement
- User confusion about demo vs production

## Proposed Solutions

### Option 1: Create unified demo banner component
- **Pros**: Single source of truth, consistent UX
- **Cons**: Minor refactor needed
- **Effort**: Small
- **Risk**: Low

```typescript
// Shared component
const DemoModeBanner = () => (
  <div className="demo-banner">
    🎭 Demo Mode - No real charges will be made
  </div>
);
```

## Recommended Action
Create a shared DemoModeBanner component used consistently across all payment-related pages.

## Technical Details
- **Affected Files**: `CheckoutPage.tsx`, `StripePaymentForm.tsx`, new component
- **Related Components**: Payment flow components
- **Database Changes**: No

## Acceptance Criteria
- [ ] Consistent demo mode message across all pages
- [ ] Clear visual indicator (banner/badge)
- [ ] Same styling and placement
- [ ] Message explains what demo mode means

## Work Log

### 2025-12-28 - Approved for Work
**By:** Claude Triage System
**Actions:**
- UX inconsistency identified during testing
- Status set to ready
- Priority P2 - user experience improvement

## Notes
Source: User Flow Test Findings (Dec 28, 2025) - Item P6
