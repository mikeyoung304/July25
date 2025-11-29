---
status: pending
priority: p1
issue_id: "094"
tags: [code-review, security, validation, pr-148]
dependencies: []
---

# Missing Max Validation on Tip/Cash Amounts - Financial Fraud Risk

## Problem Statement

Custom tip and cash payment inputs have no maximum value constraints. An attacker could enter astronomically high values (e.g., $999,999,999.99) causing integer overflow, payment processor rejection, or denial of service.

**Why it matters:** Financial inputs without upper bounds create attack vectors for fraud attempts and can cause downstream system failures.

## Findings

### Security Sentinel
- **File:** `client/src/components/payments/TipSelector.tsx:160-172`
- **Evidence:**
```typescript
<Input
  id="custom-tip"
  type="number"
  step="0.01"
  min="0"
  // ❌ NO MAX ATTRIBUTE
  value={custom_amount}
  onChange={handleCustomAmountChange}
/>
```

- **File:** `client/src/components/payments/CashPayment.tsx:155-165`
- **Same Issue:** No max attribute on cash amount input

### Data Integrity Guardian
- **Risk:** Negative value validation can be bypassed via browser dev tools
- **Impact:** Financial discrepancies, database constraint violations, payment processor rejection

## Proposed Solutions

### Option A: Add HTML max Attribute + JS Validation (Recommended)
**Pros:** Defense in depth, immediate user feedback
**Cons:** Two places to maintain
**Effort:** Small (10 minutes)
**Risk:** Low

```typescript
// TipSelector.tsx
<Input
  id="custom-tip"
  type="number"
  step="0.01"
  min="0"
  max="10000"  // Reasonable upper bound
  value={custom_amount}
  onChange={handleCustomAmountChange}
/>

// Handler validation
const numValue = parseFloat(value);
if (!isNaN(numValue) && numValue >= 0 && numValue <= 10000) {
  onTipChange(Math.round(numValue * 100) / 100);
} else if (numValue > 10000) {
  toast.error('Tip amount cannot exceed $10,000');
}
```

### Option B: Server-Side Only Validation
**Pros:** Single source of truth
**Cons:** Poor UX, wastes API calls
**Effort:** Small
**Risk:** Medium - user frustration

### Option C: Zod Schema Update
**Pros:** Shared validation between client/server
**Cons:** Requires schema changes
**Effort:** Medium
**Risk:** Low

Update `shared/contracts/payment.ts`:
```typescript
amount: z.number().positive().max(1000000).optional(), // Max $10,000 in cents
```

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:**
  - `client/src/components/payments/TipSelector.tsx:160-172`
  - `client/src/components/payments/CashPayment.tsx:155-165`
  - `shared/contracts/payment.ts` (optional)
- **Components:** TipSelector, CashPayment
- **Database Changes:** None

## Acceptance Criteria

- [ ] TipSelector has max attribute and JS validation
- [ ] CashPayment has max attribute and JS validation
- [ ] User receives clear error message for invalid amounts
- [ ] Tests cover max value edge cases

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
- **OWASP:** Input validation best practices
