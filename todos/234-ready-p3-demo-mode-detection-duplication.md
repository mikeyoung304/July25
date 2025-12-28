---
status: ready
priority: p3
issue_id: "234"
tags: [code-quality, dry, frontend, code-review]
dependencies: []
---

# Demo Mode Detection Logic Duplicated

## Problem Statement
Demo mode detection logic is duplicated across multiple components. Changes to demo mode determination require updates in multiple places.

## Findings
- **Source**: Architecture Strategist Review (2025-12-28)
- **Locations**:
  - `client/src/pages/CheckoutPage.tsx` lines 36-38
  - `client/src/modules/order-system/components/StripePaymentForm.tsx` lines 29-33

```typescript
// CheckoutPage.tsx
const isDemoMode = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
                   import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'demo' ||
                   import.meta.env.DEV;

// StripePaymentForm.tsx
const isDemoMode = !stripePublishableKey ||
                   stripePublishableKey === 'demo' ||
                   import.meta.env.DEV ||
                   import.meta.env.VITE_ENVIRONMENT === 'development';
```

Note: The logic is also slightly different between files (one checks VITE_ENVIRONMENT).

## Proposed Solutions

### Option 1: Create useDemoMode hook (Recommended)
- **Pros**: Single source of truth, React-friendly
- **Cons**: New hook file
- **Effort**: Small
- **Risk**: Low

```typescript
// client/src/hooks/useDemoMode.ts
export function useDemoMode(): boolean {
  return !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
         import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'demo' ||
         import.meta.env.DEV ||
         import.meta.env.VITE_ENVIRONMENT === 'development';
}
```

### Option 2: Create DemoContext provider
- **Pros**: Can include additional demo state
- **Cons**: More boilerplate
- **Effort**: Medium
- **Risk**: Low

### Option 3: Create shared constant
- **Pros**: Simplest change
- **Cons**: Not reactive if env changes
- **Effort**: Small
- **Risk**: Low

## Recommended Action
Option 1 - Create `useDemoMode()` hook.

## Technical Details
- **Affected Files**: New hook file, `CheckoutPage.tsx`, `StripePaymentForm.tsx`
- **Related Components**: All demo mode UI
- **Database Changes**: No

## Acceptance Criteria
- [ ] Single `useDemoMode()` hook created
- [ ] All components use the hook
- [ ] Demo mode detection logic is consistent
- [ ] Logic includes all environment checks

## Work Log

### 2025-12-28 - Identified in Code Review
**By:** Architecture Strategist Agent
**Actions:**
- Found duplicate demo detection logic
- Logic differs between files

### 2025-12-28 - Triaged and Approved
**By:** Claude Code Review
**Decision:** Approved for implementation
**Rationale:** Valid finding with clear solution path
## Notes
Source: Code Review of commit 35025fd6
