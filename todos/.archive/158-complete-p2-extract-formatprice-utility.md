---
status: complete
priority: p2
issue_id: "158"
tags: [refactoring, dry, utilities, ui-ux-review]
dependencies: []
created_date: 2025-12-03
completed_date: 2025-12-03
source: ui-ux-plan-review
---

# Extract formatPrice Utility (The ONLY Justified DRY Refactor)

## Problem Statement

Price formatting is duplicated across 3+ components with slightly different implementations. This is the ONLY shared utility worth extracting from the UI/UX plan.

## Findings

### Code Quality Agent Discovery

**Duplicate Implementations:**

```typescript
// MenuItemCard.tsx lines 36-41
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};

// ItemDetailModal.tsx lines 38-43
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};

// CartItem.tsx lines 12-17
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};

// MenuItemGrid.tsx line 78 (DIFFERENT!)
<span>${item.price.toFixed(2)}</span>
```

**Inconsistency:** MenuItemGrid uses `toFixed(2)` while others use Intl.NumberFormat.

## Proposed Solutions

### Solution A: Create Shared Utility (Recommended)

**Effort:** 10 minutes | **Risk:** None

```typescript
// shared/utils/currency.ts
export function formatPrice(price: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
}

// Optional: React component for convenience
export const Price: React.FC<{ amount: number }> = ({ amount }) => (
  <span>{formatPrice(amount)}</span>
);
```

### Solution B: Create Price Component Only

**Effort:** 15 minutes | **Risk:** Low

```tsx
// client/src/components/shared/Price.tsx
interface PriceProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Price: React.FC<PriceProps> = ({
  amount,
  size = 'md',
  className
}) => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-bold',
  };

  return (
    <span className={`${sizeClasses[size]} ${className || ''}`}>
      {formatted}
    </span>
  );
};
```

## Recommended Action

Solution A - utility function is simpler and more flexible than component.

## Technical Details

**New File:**
- `shared/utils/currency.ts` (utility function)
- OR `client/src/components/shared/Price.tsx` (component)

**Files to Update:**
- `MenuItemCard.tsx` - import and use
- `ItemDetailModal.tsx` - import and use
- `CartItem.tsx` - import and use
- `MenuItemGrid.tsx` - fix toFixed(2) inconsistency

## Acceptance Criteria

- [ ] formatPrice utility exists in shared/utils
- [ ] All price displays use the utility
- [ ] MenuItemGrid no longer uses toFixed(2)
- [ ] All prices render consistently ($XX.XX format)
- [ ] TypeScript types correct

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-03 | Created | From UI/UX plan code quality review |

## Resources

- Intl.NumberFormat MDN docs
- Existing shared/utils patterns
