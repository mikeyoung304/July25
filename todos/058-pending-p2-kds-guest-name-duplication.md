# TODO-058: KDS Guest Name Filtering Logic Duplicated in 3 Components

## Metadata
- **Status**: pending
- **Priority**: P2 (Important)
- **Issue ID**: 058
- **Tags**: architecture, kds, dry, refactor, code-review
- **Dependencies**: None
- **Created**: 2025-11-26
- **Source**: Code Review - KDS Declutter Implementation

---

## Problem Statement

The guest name filtering and display logic is duplicated across 3 components:
- `OrderCard.tsx` - Check `customer_name !== 'Guest'` and `split(' ').pop()`
- `OrderGroupCard.tsx` - Same logic
- `FocusOverlay.tsx` - Same logic in ternary for `primaryLabel`

The string `'Guest'` is hardcoded in 3 places (magic string), and the `split(' ').pop()` pattern is repeated without null safety.

---

## Findings

### Evidence Location

**OrderCard.tsx (lines 94-98)**:
```typescript
order.customer_name && order.customer_name !== 'Guest' ? (
  <h3 className="text-2xl font-bold text-gray-900">
    {order.customer_name.split(' ').pop()}
  </h3>
) : null
```

**OrderGroupCard.tsx (lines 142-146)**:
```typescript
displayType === 'drive-thru' && orderGroup.customer_name && orderGroup.customer_name !== 'Guest' ? (
  <h3 className="text-2xl font-bold text-gray-900">
    {orderGroup.customer_name.split(' ').pop()}
  </h3>
) : null
```

**FocusOverlay.tsx (lines 39-43)**:
```typescript
const primaryLabel = tableNumber
  ? `Table ${tableNumber}`
  : customerName && customerName !== 'Guest'
  ? customerName.split(' ').pop()
  : `Order #${formatOrderNumber(orderNumber)}`
```

### Issues
1. **Magic string**: `'Guest'` hardcoded in 3 places
2. **No null safety**: `split(' ').pop()` can return `undefined`
3. **No case handling**: Doesn't handle `'guest'` or `' Guest '`
4. **Logic duplication**: Same check in 3 files

---

## Proposed Solutions

### Option A: Extract Helper Functions to kds.ts (Recommended)
**Pros**: Centralized logic, testable, null-safe
**Cons**: Adds 2 functions to shared config
**Effort**: Small (1-2 hours)
**Risk**: Low - extraction refactor

### Option B: Extract to Custom Hook
**Pros**: React-specific optimization
**Cons**: Can't use in non-React code
**Effort**: Small (1 hour)
**Risk**: Low

---

## Recommended Action

**Option A** - Add helper functions to `shared/config/kds.ts`:

```typescript
/**
 * Guest placeholder constant
 * Used to identify anonymous/guest orders in the system
 */
export const GUEST_CUSTOMER_NAME = 'Guest';

/**
 * Extract display name from customer name
 * Returns last name for personalization, or null if customer is guest
 *
 * @param customerName - Full customer name or 'Guest' placeholder
 * @returns Last name or null if guest/invalid
 *
 * @example
 * getDisplayCustomerName('John Smith') // 'Smith'
 * getDisplayCustomerName('Guest') // null
 * getDisplayCustomerName(null) // null
 * getDisplayCustomerName('Madonna') // 'Madonna'
 */
export function getDisplayCustomerName(customerName: string | null | undefined): string | null {
  if (!customerName) return null;

  const trimmed = customerName.trim();
  if (trimmed === GUEST_CUSTOMER_NAME) return null;

  const parts = trimmed.split(' ');
  // Return last part, or whole name if single word
  return parts.length > 1 ? parts[parts.length - 1]! : trimmed;
}

/**
 * Get primary label for order display
 * Priority: Table Number > Customer Name > Order Number
 *
 * @param tableNumber - Table number if dine-in
 * @param customerName - Customer name
 * @param orderNumber - Order number
 * @returns Display label for order
 */
export function getOrderPrimaryLabel(
  tableNumber: number | string | null | undefined,
  customerName: string | null | undefined,
  orderNumber: string
): string {
  if (tableNumber) {
    return `Table ${tableNumber}`;
  }

  const displayName = getDisplayCustomerName(customerName);
  if (displayName) {
    return displayName;
  }

  return `Order #${formatOrderNumber(orderNumber)}`;
}
```

**Usage in components**:
```typescript
// OrderCard.tsx
const displayName = getDisplayCustomerName(order.customer_name);
{displayName && (
  <h3 className="text-2xl font-bold text-gray-900">{displayName}</h3>
)}

// FocusOverlay.tsx
const primaryLabel = getOrderPrimaryLabel(tableNumber, customerName, orderNumber);
```

---

## Technical Details

### Affected Files
- `shared/config/kds.ts` - Add constants and helper functions
- `client/src/components/kitchen/OrderCard.tsx`
- `client/src/components/kitchen/OrderGroupCard.tsx`
- `client/src/components/kitchen/FocusOverlay.tsx`

### Benefits
- Single source of truth for guest detection
- Null-safe implementation
- Testable in isolation
- Consistent behavior across all KDS components

---

## Acceptance Criteria

- [ ] `GUEST_CUSTOMER_NAME` constant exported from `kds.ts`
- [ ] `getDisplayCustomerName()` function handles null/undefined/Guest
- [ ] `getOrderPrimaryLabel()` function provides unified label logic
- [ ] All 3 components updated to use helper functions
- [ ] Unit tests for both helper functions
- [ ] Edge cases tested: null, undefined, 'Guest', single name, full name

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-26 | Created | From KDS declutter code review |

---

## Resources

- [Centralized Configuration Pattern](https://refactoring.guru/replace-magic-number-with-symbolic-constant)
