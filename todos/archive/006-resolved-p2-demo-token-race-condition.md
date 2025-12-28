---
status: ready
priority: p2
issue_id: "006"
tags: [payments, demo-mode, bug]
dependencies: []
---

# Demo Token Uses Date.now() - Race Condition

## Problem Statement
In demo mode, payment tokens are generated using `Date.now()` which could cause race conditions if two payments are submitted in the same millisecond, resulting in duplicate tokens.

## Findings
- Location: `client/src/modules/order-system/components/StripePaymentForm.tsx:141`
- Uses `Date.now()` for demo payment token
- Two rapid submissions could generate same token
- Could cause idempotency issues

## Proposed Solutions

### Option 1: Add random suffix to token
- **Pros**: Simple fix, prevents collisions
- **Cons**: None
- **Effort**: Small
- **Risk**: Low

```typescript
const demoToken = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

### Option 2: Use UUID
- **Pros**: Guaranteed unique
- **Cons**: Slightly longer token
- **Effort**: Small
- **Risk**: Low

## Recommended Action
Add random suffix to demo token generation for uniqueness.

## Technical Details
- **Affected Files**: `client/src/modules/order-system/components/StripePaymentForm.tsx`
- **Related Components**: Demo payment flow
- **Database Changes**: No

## Acceptance Criteria
- [ ] Demo tokens include random component
- [ ] No duplicate tokens possible
- [ ] Demo flow still works correctly
- [ ] Token format documented

## Work Log

### 2025-12-28 - Approved for Work
**By:** Claude Triage System
**Actions:**
- Potential bug identified during testing
- Status set to ready
- Priority P2 - edge case but could cause issues

## Notes
Source: User Flow Test Findings (Dec 28, 2025) - Item P3
