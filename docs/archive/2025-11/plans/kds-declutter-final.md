# feat(kds): Declutter KDS with Adaptive Cards and Visual Hierarchy

## Overview

Simplify the Kitchen Display System by making text bigger, using adaptive card sizing for different order complexities, and color-coding modifiers by type. No scrolling, no gesture confusion, no hidden information.

## Problem Statement

The current KDS is too cluttered:
- Small text hard to read from kitchen distances
- Long order IDs (`Order #20251105-0004`)
- Redundant "Guest" labels
- All cards same size regardless of order complexity
- Modifiers lack visual categorization

## Solution Summary

| Change | Implementation |
|--------|----------------|
| Bigger typography | 24px primary, 16px items, 14px modifiers |
| Shorter order IDs | Show last 4 digits only (`#0004`) |
| Remove "Guest" | Show table or order ID, never placeholder |
| Adaptive card sizing | Cards span 1-2 columns based on item count |
| Color-coded modifiers | Red=removal, Green=addition, Orange=temp |
| Focus mode button | [🔍] on all cards for full-screen view |

## Technical Approach

### 1. Typography Updates

**File**: `client/src/components/kitchen/OrderCard.tsx`

```typescript
// Primary identifier (Table/Customer)
<h3 className="text-2xl font-bold text-gray-900">

// Timer
<span className="text-xl font-bold">

// Item names
<span className="text-base font-medium">

// Modifiers
<span className="text-sm">
```

### 2. Shorten Order ID

**File**: `client/src/components/kitchen/OrderCard.tsx`

```typescript
// Format order number to show last 4 digits
function formatOrderNumber(orderNumber: string): string {
  const parts = orderNumber.split('-');
  const lastPart = parts[parts.length - 1];
  return lastPart.padStart(4, '0');
}

// Usage
<span>Order #{formatOrderNumber(order.order_number)}</span>
```

### 3. Remove "Guest" Placeholder

```typescript
// Only show customer name if it exists and isn't "Guest"
{order.customer_name && order.customer_name !== 'Guest' && (
  <h3 className="text-2xl font-bold">
    {order.customer_name.split(' ').pop()}
  </h3>
)}
```

### 4. Adaptive Card Sizing

**File**: `shared/config/kds.ts`

```typescript
export type CardSize = 'standard' | 'wide' | 'large';

export function getCardSize(itemCount: number, modifierCount: number): CardSize {
  const complexity = itemCount + (modifierCount * 0.3);

  if (complexity <= 5) return 'standard';  // 1 column
  if (complexity <= 10) return 'wide';     // 2 columns
  return 'large';                          // 2 columns + taller
}

export const CARD_SIZE_CLASSES = {
  standard: 'col-span-1',
  wide: 'col-span-1 xl:col-span-2',
  large: 'col-span-1 xl:col-span-2 row-span-2',
} as const;
```

**File**: `client/src/pages/KitchenDisplayOptimized.tsx`

```typescript
import { getCardSize, CARD_SIZE_CLASSES } from '@rebuild/shared/config/kds';

// In the grid
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-auto">
  {orders.map(order => {
    const totalMods = order.items.reduce((sum, item) =>
      sum + (item.modifiers?.length || 0), 0);
    const cardSize = getCardSize(order.items.length, totalMods);

    return (
      <div key={order.id} className={CARD_SIZE_CLASSES[cardSize]}>
        <OrderCard order={order} />
      </div>
    );
  })}
</div>
```

### 5. Color-Coded Modifiers

**File**: `shared/config/kds.ts`

```typescript
export type ModifierType = 'removal' | 'addition' | 'allergy' | 'temperature' | 'substitution' | 'default';

const REMOVAL_KEYWORDS = ['no ', 'without', 'remove', 'hold'];
const ADDITION_KEYWORDS = ['extra', 'add', 'double', 'triple', 'more'];
const ALLERGY_KEYWORDS = ['allergy', 'allergic', 'gluten', 'dairy', 'nut', 'peanut', 'shellfish', 'celiac'];
const TEMP_KEYWORDS = ['rare', 'medium', 'well', 'well-done', 'hot', 'cold', 'temp'];
const SUB_KEYWORDS = ['sub ', 'substitute', 'instead', 'swap'];

export function getModifierType(modifierName: string): ModifierType {
  const lower = modifierName.toLowerCase();

  if (ALLERGY_KEYWORDS.some(k => lower.includes(k))) return 'allergy';
  if (REMOVAL_KEYWORDS.some(k => lower.startsWith(k))) return 'removal';
  if (ADDITION_KEYWORDS.some(k => lower.startsWith(k))) return 'addition';
  if (TEMP_KEYWORDS.some(k => lower.includes(k))) return 'temperature';
  if (SUB_KEYWORDS.some(k => lower.includes(k))) return 'substitution';
  return 'default';
}

export const MODIFIER_STYLES = {
  removal: 'text-red-600',
  addition: 'text-green-600',
  allergy: 'bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold',
  temperature: 'text-orange-600',
  substitution: 'text-blue-600',
  default: 'text-gray-600',
} as const;

export const MODIFIER_ICONS = {
  removal: '✕',
  addition: '+',
  allergy: '⚠️',
  temperature: '🔥',
  substitution: '↔',
  default: '•',
} as const;
```

**File**: `client/src/components/kitchen/OrderCard.tsx`

```typescript
import { getModifierType, MODIFIER_STYLES, MODIFIER_ICONS } from '@rebuild/shared/config/kds';

// In modifier rendering
{item.modifiers?.map((mod, i) => {
  const modType = getModifierType(mod.name);
  return (
    <div key={i} className={cn('text-sm ml-4', MODIFIER_STYLES[modType])}>
      {MODIFIER_ICONS[modType]} {mod.name}
    </div>
  );
})}
```

### 6. Focus Mode Button & Overlay

**File**: `client/src/components/kitchen/OrderCard.tsx`

```typescript
// Add to card header
<div className="flex items-center gap-2">
  <button
    onClick={() => onFocusMode?.(order)}
    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 touch-manipulation"
    aria-label="Expand order details"
  >
    <Search size={20} />
  </button>
  <Button onClick={() => onMarkReady(order.id)}>
    Mark Ready
  </Button>
</div>
```

**File**: `client/src/components/kitchen/FocusOverlay.tsx` (new)

```typescript
interface FocusOverlayProps {
  order: Order;
  onClose: () => void;
}

export function FocusOverlay({ order, onClose }: FocusOverlayProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Large format order details */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-4xl font-bold">
              {order.table_number ? `Table ${order.table_number}` : `Order #${formatOrderNumber(order.order_number)}`}
            </h2>
            <p className="text-2xl text-gray-600 mt-2">
              {order.items.length} items
            </p>
          </div>
          <button onClick={onClose} className="p-3 rounded-full bg-gray-100">
            <X size={32} />
          </button>
        </div>

        {/* Items with large text */}
        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <div key={idx} className="border-b pb-4">
              <div className="text-2xl font-semibold">
                {item.quantity}x {item.name}
              </div>
              {item.modifiers?.map((mod, i) => {
                const modType = getModifierType(mod.name);
                return (
                  <div key={i} className={cn('text-xl ml-6 mt-1', MODIFIER_STYLES[modType])}>
                    {MODIFIER_ICONS[modType]} {mod.name}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <Button
          className="w-full mt-8 h-16 text-2xl"
          onClick={() => { onMarkReady(order.id); onClose(); }}
        >
          Mark Ready
        </Button>
      </div>
    </div>
  );
}
```

## Acceptance Criteria

- [ ] Primary text is 24px (readable from 6ft)
- [ ] Order IDs show last 4 digits only
- [ ] "Guest" placeholder never displayed
- [ ] Cards span 2 columns when order has 6+ items
- [ ] Modifiers color-coded by type (removal/addition/allergy/temp)
- [ ] All modifiers always visible (no hiding/toggling)
- [ ] Focus button [🔍] on every card
- [ ] Focus overlay shows large-format order details
- [ ] Tap outside focus overlay closes it

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/kitchen/OrderCard.tsx` | Typography, order ID format, modifier colors, focus button |
| `client/src/pages/KitchenDisplayOptimized.tsx` | Adaptive grid sizing |
| `shared/config/kds.ts` | Card size logic, modifier type detection, style constants |
| `client/src/components/kitchen/FocusOverlay.tsx` | New component for focus mode |

## Visual Mockup

### Standard Card (1-5 items)
```
┌────────────────────────────────────┐
│ [DRIVE-THRU]        ⏱️ 12m  [🔍][✓]│
│ Order #0004                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ 1x Bacon Cheeseburger              │
│   ✕ no onion                       │  ← red
│   + extra cheese                   │  ← green
│   🔥 medium rare                   │  ← orange
│ 1x Large Fries                     │
│   + extra crispy                   │  ← green
└────────────────────────────────────┘
```

### Wide Card (6-10 items, spans 2 columns)
```
┌────────────────────────────────────────────────────────────────────────┐
│ [DINE-IN]                                     ⏱️ 8m            [🔍][✓]│
│ Table 7                                                                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ 2x Bacon Cheeseburger          │ 1x Caesar Salad                       │
│   ✕ no onion                   │   ✕ no croutons                       │
│   + extra cheese               │ 1x Chocolate Shake                    │
│ 2x Large Fries                 │ 1x Apple Pie                          │
│   + extra crispy               │   ⚠️ ALLERGY: nuts                    │  ← red bg
└────────────────────────────────────────────────────────────────────────┘
```

## Testing

1. Create orders with varying item counts (1, 5, 8, 12 items)
2. Verify card sizing adapts correctly
3. Test modifier color coding with various keywords
4. Test focus mode on touch device
5. Verify 24px text readable from 6ft

---

*Plan finalized based on UX analysis and user feedback. No double-tap gestures, no hidden information, fully adaptive layout.*
