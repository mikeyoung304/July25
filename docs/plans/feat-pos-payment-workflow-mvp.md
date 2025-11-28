# feat: POS Payment Workflow MVP

> **Issue Type:** Enhancement
> **Estimated Effort:** 4-5 days
> **Priority:** P1
> **Created:** 2025-11-28
> **Scope:** Single demo restaurant

---

## Overview

Add tip entry and cash payment support to the existing payment flow. This MVP focuses on the highest-value, lowest-complexity features: capturing tips and processing cash payments with change calculation.

**What's NOT in scope (deferred to v2):**
- Split checks (future-proofing, not urgent)
- Zoomed seat picker (no user complaints about current grid)
- Table status automation (manual status works fine)
- New `checks` table architecture

---

## Problem Statement

### Current Issues
1. **No tip entry UI** - Tips can't be captured before payment
2. **No cash payment flow** - Only Stripe card payments supported
3. **No change calculation** - Servers must calculate manually

### Business Impact
- Revenue tracking incomplete (cash tips untracked)
- Cash payments require workarounds
- Server efficiency reduced

---

## Proposed Solution

Extend the existing payment flow with:
1. **TipSelector** - Preset percentages + custom amount
2. **PaymentMethodSelector** - Card vs Cash choice
3. **CashPaymentForm** - Fast cash buttons + change calculation

### Architecture (Minimal Changes)

```
Existing CheckoutPage
    └── NEW: PaymentModal
        ├── Step 1: TipSelector (15%, 18%, 20%, 25%, custom)
        ├── Step 2: PaymentMethodSelector (Card / Cash)
        ├── Step 3a: StripePaymentForm (existing)
        └── Step 3b: CashPaymentForm (new)
```

**No new database tables.** Uses existing `orders` columns:
- `tip` (already exists)
- `payment_method` (already exists: 'cash' | 'card')
- `payment_status` (already exists)
- `cash_received` (already exists from migration 20251029)
- `change_given` (already exists from migration 20251029)

---

## Technical Approach

### Phase 1: TipSelector Component (1 day)

**File:** `client/src/components/payment/TipSelector.tsx`

```typescript
interface TipSelectorProps {
  subtotal: number;
  tax: number;
  onTipChange: (tip_amount: number) => void;
  initial_tip?: number;
}

// Features:
// - Preset buttons: 15%, 18%, 20%, 25%
// - Custom amount input
// - "No Tip" option
// - Shows dollar amount next to percentage
// - Touch-optimized (56px buttons)
```

**Acceptance Criteria:**
- [ ] Preset percentages calculate tip from subtotal (not total)
- [ ] Custom amount allows manual entry
- [ ] "No Tip" sets tip to $0
- [ ] Updates parent component via callback
- [ ] Minimum touch target 56px

---

### Phase 2: PaymentMethodSelector Component (0.5 day)

**File:** `client/src/components/payment/PaymentMethodSelector.tsx`

```typescript
interface PaymentMethodSelectorProps {
  onSelectCard: () => void;
  onSelectCash: () => void;
  total: number;
}

// Simple two-button selector:
// [💳 Card Payment]  [💵 Cash Payment]
```

**Acceptance Criteria:**
- [ ] Two large buttons (Card, Cash)
- [ ] Shows total amount due
- [ ] Touch-optimized (96px height)

---

### Phase 3: CashPaymentForm Component (1 day)

**File:** `client/src/components/payment/CashPaymentForm.tsx`

```typescript
interface CashPaymentFormProps {
  amount_due: number;
  onComplete: (cash_received: number, change_given: number) => void;
  onCancel: () => void;
}

// Features:
// - Fast cash buttons: $20, $50, $100
// - Custom amount input
// - Auto-calculate change
// - Disable confirm until sufficient cash
```

**Acceptance Criteria:**
- [ ] Fast buttons for common denominations
- [ ] Custom amount input field
- [ ] Real-time change calculation
- [ ] Green indicator when cash >= amount due
- [ ] Red indicator when insufficient
- [ ] Confirm button disabled until valid

---

### Phase 4: Integrate into CheckoutPage (1 day)

**File:** `client/src/pages/CheckoutPage.tsx` (modify existing)

Update the existing checkout flow:
1. After cart review, show TipSelector
2. After tip, show PaymentMethodSelector
3. Route to appropriate payment form

**API Changes:** None needed - existing endpoints support all fields:
- `POST /api/v1/orders` already accepts `tip`
- `POST /api/v1/payments/cash` already exists (see `payments.routes.ts`)
- Order update already handles `payment_method`, `cash_received`, `change_given`

---

### Phase 5: Server-Side Order Flow (1 day)

**For dine-in orders from ServerView:**

Currently, `ServerView.tsx` uses `VoiceOrderModal` which submits orders. We need to add a payment step after order submission for dine-in tables.

**Option A (Recommended):** Add "Close Table" button to `PostOrderPrompt`
- After finishing table orders, server taps "Close Table"
- Opens PaymentModal with total for all orders at table
- On payment complete, update all orders and table status

**File Changes:**
- `client/src/pages/components/PostOrderPrompt.tsx` - Add "Close Table" action
- `client/src/pages/ServerView.tsx` - Handle payment flow state

---

## Component Specifications

### TipSelector.tsx

```typescript
const TIP_PRESETS = [
  { percentage: 15, label: '15%' },
  { percentage: 18, label: '18%' },
  { percentage: 20, label: '20%' },
  { percentage: 25, label: '25%' },
];

export function TipSelector({ subtotal, tax, onTipChange, initial_tip = 0 }: TipSelectorProps) {
  const [selected_preset, setSelectedPreset] = useState<number | null>(20);
  const [custom_amount, setCustomAmount] = useState<string>('');
  const [is_custom, setIsCustom] = useState(false);

  const calculate_tip = (percentage: number) => {
    return Math.round(subtotal * (percentage / 100) * 100) / 100;
  };

  // ... implementation
}
```

### CashPaymentForm.tsx

```typescript
const FAST_CASH_AMOUNTS = [20, 50, 100];

export function CashPaymentForm({ amount_due, onComplete, onCancel }: CashPaymentFormProps) {
  const [cash_received, setCashReceived] = useState<number>(0);

  const change_due = cash_received - amount_due;
  const is_valid = cash_received >= amount_due;

  // ... implementation
}
```

---

## File Changes Summary

| File | Action | Lines |
|------|--------|-------|
| `client/src/components/payment/TipSelector.tsx` | Create | ~80 |
| `client/src/components/payment/PaymentMethodSelector.tsx` | Create | ~40 |
| `client/src/components/payment/CashPaymentForm.tsx` | Create | ~100 |
| `client/src/pages/CheckoutPage.tsx` | Modify | ~30 |
| `client/src/pages/components/PostOrderPrompt.tsx` | Modify | ~20 |
| `client/src/pages/ServerView.tsx` | Modify | ~30 |

**Total new code:** ~300 lines
**Database changes:** None (using existing columns)
**API changes:** None (using existing endpoints)

---

## Acceptance Criteria

### Functional Requirements
- [ ] Server can select tip percentage (15/18/20/25%) or enter custom
- [ ] Server can choose Card or Cash payment
- [ ] Cash payment shows fast buttons ($20, $50, $100)
- [ ] Change is auto-calculated and displayed
- [ ] Payment updates order with tip, payment_method, cash_received, change_given
- [ ] Works for both online checkout and dine-in table close

### Non-Functional Requirements
- [ ] Touch targets minimum 56px
- [ ] Works on tablet (portrait and landscape)
- [ ] No new database migrations
- [ ] No new API endpoints

---

## Testing Plan

### Unit Tests
- [ ] TipSelector calculates correct amounts for each preset
- [ ] TipSelector handles custom amounts correctly
- [ ] CashPaymentForm calculates change correctly
- [ ] CashPaymentForm validates sufficient cash

### Integration Tests
- [ ] Full payment flow with tip + card
- [ ] Full payment flow with tip + cash
- [ ] Order updated correctly after payment

### Manual Testing
- [ ] Test on iPad (primary device)
- [ ] Test tip presets
- [ ] Test cash fast buttons
- [ ] Test custom tip amount
- [ ] Test custom cash amount

---

## Implementation Checklist

### Day 1: TipSelector
- [ ] Create TipSelector component
- [ ] Add preset percentage buttons
- [ ] Add custom amount input
- [ ] Add "No Tip" option
- [ ] Write unit tests

### Day 2: CashPaymentForm
- [ ] Create PaymentMethodSelector component
- [ ] Create CashPaymentForm component
- [ ] Add fast cash buttons
- [ ] Add change calculation
- [ ] Write unit tests

### Day 3: Integration
- [ ] Update CheckoutPage with new flow
- [ ] Add payment step to ServerView
- [ ] Update PostOrderPrompt with "Close Table"
- [ ] Connect to existing API endpoints

### Day 4: Testing & Polish
- [ ] Integration tests
- [ ] Manual testing on tablet
- [ ] Bug fixes
- [ ] Code review

### Day 5: Buffer
- [ ] Additional testing
- [ ] Edge case fixes
- [ ] Documentation

---

## Future Enhancements (v2)

When/if needed based on user feedback:

1. **Split Checks** - Add `split_from_order_id` to orders table
2. **Table Status Automation** - Auto-transition based on orders
3. **Visual Seat Picker** - Only if current grid proves problematic
4. **Check Management** - Full `checks` table if business complexity requires

---

## References

- Existing payment service: `server/src/services/payment.service.ts`
- Existing cash endpoint: `server/src/routes/payments.routes.ts`
- Existing order types: `shared/types/order.types.ts`
- Payment fields migration: `supabase/migrations/20251029155239_add_payment_fields_to_orders.sql`

---

## ERD (No Changes)

Using existing schema - no new tables needed.

```
orders (existing)
├── tip DECIMAL(10,2)           ✅ Already exists
├── payment_method VARCHAR(20)   ✅ Already exists
├── payment_status VARCHAR(20)   ✅ Already exists
├── cash_received DECIMAL(10,2)  ✅ Already exists
└── change_given DECIMAL(10,2)   ✅ Already exists
```

---

*Simplified from original 13-15 day plan based on:*
- *Single demo restaurant scope*
- *No urgent need for split checks*
- *No user complaints about seat picker*
- *Existing database schema supports all needed fields*
