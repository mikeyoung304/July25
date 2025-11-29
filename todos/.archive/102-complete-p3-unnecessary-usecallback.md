---
status: complete
priority: p3
issue_id: "102"
tags: [code-review, simplicity, react, pr-148]
dependencies: []
---

# Unnecessary useCallback Wrappers in PaymentModal

## Problem Statement

Several simple state setters in PaymentModal are wrapped in useCallback with empty or trivial dependency arrays. These add complexity without benefit since React's setState is already stable.

**Why it matters:** Code simplicity and maintainability. Excessive memoization adds cognitive overhead.

## Findings

### Code Simplicity Reviewer
- **File:** `client/src/components/payments/PaymentModal.tsx:38-60`
- **Evidence:**
```typescript
// These can be simplified to inline arrow functions:
const handleTipChange = useCallback((tip_amount: number) => {
  setTip(tip_amount);
}, []);

const handleContinueFromTip = useCallback(() => {
  setStep('tender');
}, []);

const handleSelectCard = useCallback(() => {
  setStep('card');
}, []);

const handleSelectCash = useCallback(() => {
  setStep('cash');
}, []);

const handleBackToTip = useCallback(() => {
  setStep('tip');
}, []);

const handleBackToTender = useCallback(() => {
  setStep('tender');
}, []);
```

### Recommendation
Keep useCallback only for:
- `handlePaymentSuccess` - has external dependencies
- `handleClose` - has external dependencies

Remove useCallback from simple state setters.

## Proposed Solutions

### Option A: Inline Simple Handlers
**Pros:** Simpler code, less boilerplate
**Cons:** Slightly more re-renders (negligible)
**Effort:** Small
**Risk:** Low

### Option B: Keep As-Is
**Pros:** Consistent pattern
**Cons:** Unnecessary complexity
**Effort:** None
**Risk:** None

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:** `client/src/components/payments/PaymentModal.tsx:38-60`
- **Potential Savings:** ~12 lines

## Acceptance Criteria

- [ ] Simple handlers use inline arrows or no useCallback
- [ ] Complex handlers with external deps keep useCallback

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |
| 2025-11-28 | Fixed | Removed unnecessary useCallback wrappers from simple state setters in PaymentModal.tsx |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
- **React Docs:** When to useMemo and useCallback
