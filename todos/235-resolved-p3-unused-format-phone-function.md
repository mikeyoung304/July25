---
status: ready
priority: p3
issue_id: "235"
tags: [code-quality, dead-code, code-review]
dependencies: []
---

# Unused _formatPhoneNumber Function in CheckoutPage

## Problem Statement
The CheckoutPage contains an unused `_formatPhoneNumber` function prefixed with underscore but never called.

## Findings
- **Source**: Code Simplicity Reviewer (2025-12-28)
- **Location**: `client/src/pages/CheckoutPage.tsx` lines 247-252
- **Evidence**: Function defined but never called

```typescript
// Lines 247-252 - Never used anywhere
const _formatPhoneNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0,3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6,10)}`;
};
```

The underscore prefix suggests it was intentionally marked as unused, but it should be removed entirely.

## Proposed Solutions

### Option 1: Delete the function (Recommended)
- **Pros**: Removes dead code
- **Cons**: None
- **Effort**: Trivial
- **Risk**: None

### Option 2: Use the function for phone display
- **Pros**: Better UX with formatted phone numbers
- **Cons**: May not be needed
- **Effort**: Small
- **Risk**: Low

## Recommended Action
Option 1 - Delete the unused function.

## Technical Details
- **Affected Files**: `client/src/pages/CheckoutPage.tsx`
- **Related Components**: None
- **Database Changes**: No

## Acceptance Criteria
- [ ] `_formatPhoneNumber` function removed
- [ ] No references to the function
- [ ] 6 lines of dead code removed

## Work Log

### 2025-12-28 - Identified in Code Review
**By:** Code Simplicity Reviewer Agent
**Actions:**
- Found dead code with underscore prefix
- Recommended removal

### 2025-12-28 - Triaged and Approved
**By:** Claude Code Review
**Decision:** Approved for implementation
**Rationale:** Valid finding with clear solution path
## Notes
Source: Code Review of commit 35025fd6
