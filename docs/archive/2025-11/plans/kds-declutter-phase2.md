# feat(kds): Declutter KDS Order Cards - Phase 2 Simplification

## Overview

The Kitchen Display System (KDS) order cards are still too visually cluttered after the Phase 1 minimal redesign. This plan focuses on aggressive information reduction while maintaining operational safety and accessibility compliance.

**Current State**: See screenshot showing issues:
- Long order IDs (`Order #20251105-0004`)
- Redundant "Guest" labels
- Full notes displayed inline
- Progress indicators (`0/2 items`) adding noise
- Small typography for kitchen viewing distances

## Problem Statement

Kitchen staff report the KDS is difficult to scan during rush periods. The current card design shows too much information at once, violating the **2-second rule**: staff should identify order type, table, and urgency in under 2 seconds.

### Current Issues Identified

| Element | Current Display | Problem |
|---------|-----------------|---------|
| Order ID | `Order #20251105-0004` | Too long, date prefix unnecessary |
| Customer | "Guest" | Placeholder when no name exists |
| Notes | Full text inline | Expands card, adds clutter |
| Progress | `0/2 items` | Visual noise in minimal view |
| Typography | 18px primary | Too small from 6ft viewing distance |
| Modifiers | Always expanded | Cognitive overload |

## Proposed Solution

### Phase 2 Changes (This Plan)

1. **Progressive Disclosure**: Collapse modifiers to badge, expand on tap
2. **Smart Order IDs**: Remove date prefix, show last 4 digits only
3. **Remove Guest Placeholder**: Show table OR order ID, not "Guest"
4. **Collapse Notes**: Icon indicator with popover on tap
5. **Increase Typography**: 24px for primary identifiers
6. **Context-Aware Progress**: Hide in Kitchen view, keep in Expo view

### Design Mockup (ASCII)

```
Current Card (Cluttered):
┌────────────────────────────────────────┐
│ [DRIVE-THRU]              ⏱️ 31848m   │
│ Guest                                  │
│ Order #20251105-0004                   │
│                                        │
│ Note: Demo online order                │
│                                        │
│ ○ 1x Sloppy Dip with House Chips       │
│ ○ 1x Fall Sampler                      │
│                                        │
│ Progress                    0/2 items  │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │          Mark Ready                │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘

Proposed Card (Minimal):
┌────────────────────────────────────────┐
│ [DRIVE-THRU]              ⚠️ 12m      │
│ Order #0004                    💬      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 1x Sloppy Dip with House Chips         │
│ 1x Fall Sampler                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ┌────────────────────────────────────┐ │
│ │          Mark Ready                │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

## Technical Approach

### Files to Modify

| File | Changes |
|------|---------|
| `client/src/components/kitchen/OrderCard.tsx` | Primary card simplification |
| `client/src/components/kitchen/OrderGroupCard.tsx` | Group card updates |
| `client/src/pages/KitchenDisplayOptimized.tsx` | View mode toggle |
| `shared/config/kds.ts` | Add display constants |

### Implementation Details

#### 1. Shorten Order ID Display

**File**: `client/src/components/kitchen/OrderCard.tsx:70-88`

```typescript
// BEFORE
<div className="font-medium text-gray-700">
  Order #{order.order_number}
</div>

// AFTER
<div className="font-medium text-gray-700">
  Order #{order.order_number?.split('-').pop() || order.order_number}
</div>
```

#### 2. Remove Guest Placeholder

**File**: `client/src/components/kitchen/OrderCard.tsx:71-81`

```typescript
// BEFORE
{order.customer_name ? (
  <h3>{order.customer_name.split(' ').pop()}</h3>
) : (
  <h3>Guest</h3>  // REMOVE THIS
)}

// AFTER - Only show if actual name exists
{order.customer_name && (
  <h3 className="text-2xl font-bold">
    {order.customer_name.split(' ').pop()}
  </h3>
)}
```

#### 3. Collapse Special Instructions

**File**: `client/src/components/kitchen/OrderCard.tsx:106-110`

```typescript
// BEFORE - Always visible
{item.special_instructions && (
  <div className="text-xs text-gray-600 ml-4 italic">
    Note: {item.special_instructions}
  </div>
)}

// AFTER - Icon indicator with popover
{item.special_instructions && (
  <Tooltip content={item.special_instructions}>
    <span className="ml-2 text-amber-600 cursor-pointer">
      <MessageSquare size={14} />
    </span>
  </Tooltip>
)}
```

#### 4. Progressive Disclosure for Modifiers

**File**: `client/src/components/kitchen/OrderCard.tsx:98-104`

```typescript
// BEFORE - All modifiers visible
{item.modifiers?.map((mod, i) => (
  <div key={i}>• {mod.name}</div>
))}

// AFTER - Badge with expand
{item.modifiers && item.modifiers.length > 0 && (
  <ModifierBadge
    modifiers={item.modifiers}
    alwaysShowAllergy={true}
  />
)}
```

**New Component**: `client/src/components/kitchen/ModifierBadge.tsx`

```typescript
interface ModifierBadgeProps {
  modifiers: OrderItemModifier[];
  alwaysShowAllergy?: boolean;
}

export function ModifierBadge({ modifiers, alwaysShowAllergy = true }: ModifierBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  // Always show allergy-related modifiers
  const allergyKeywords = ['allergy', 'allergic', 'gluten', 'dairy', 'nut', 'shellfish'];
  const criticalMods = modifiers.filter(m =>
    allergyKeywords.some(k => m.name.toLowerCase().includes(k))
  );
  const otherMods = modifiers.filter(m => !criticalMods.includes(m));

  return (
    <div className="ml-4 mt-1">
      {/* Always show critical mods */}
      {criticalMods.map((mod, i) => (
        <div key={i} className="text-xs text-red-600 font-medium">
          ⚠️ {mod.name}
        </div>
      ))}

      {/* Collapsible other mods */}
      {otherMods.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs bg-gray-200 px-2 py-0.5 rounded"
        >
          {expanded ? 'Hide' : `+${otherMods.length} mods`}
        </button>
      )}

      {expanded && otherMods.map((mod, i) => (
        <div key={i} className="text-xs text-gray-600">• {mod.name}</div>
      ))}
    </div>
  );
}
```

#### 5. Increase Typography

**File**: `client/src/components/kitchen/OrderCard.tsx`

```typescript
// Primary identifier: 18px → 24px
<h3 className="text-2xl font-bold text-gray-900">
  {/* Table or Customer name */}
</h3>

// Timer: default → 20px bold
<span className="text-xl font-bold">
  {elapsedMinutes}m
</span>

// Item names: default → 16px
<span className="text-base font-medium">
  {item.quantity}x {item.name}
</span>
```

#### 6. Remove Progress from Minimal View

**File**: `client/src/pages/KitchenDisplayOptimized.tsx`

Add view mode state and hide progress in "kitchen" mode:

```typescript
const [viewMode, setViewMode] = useState<'kitchen' | 'expo'>('kitchen');

// In OrderCard render
<OrderCard
  order={order}
  showProgress={viewMode === 'expo'}
/>
```

## Acceptance Criteria

### Functional Requirements

- [ ] Order ID shows last 4 digits only (e.g., "#0004" not "#20251105-0004")
- [ ] "Guest" placeholder is never displayed
- [ ] Special instructions show icon, full text on hover/tap
- [ ] Non-allergy modifiers collapsed by default
- [ ] Allergy-related modifiers always visible with warning icon
- [ ] Primary identifiers at 24px font size
- [ ] Progress indicators hidden in Kitchen view
- [ ] Progress indicators visible in Expo view

### Safety Requirements (CRITICAL)

- [ ] Modifiers containing "allergy", "gluten", "nut", "dairy", "shellfish" ALWAYS visible
- [ ] Food safety instructions (temperature, cooking times) ALWAYS visible
- [ ] Special instructions accessible within 1 tap/click

### Accessibility Requirements (WCAG 2.1 AA)

- [ ] Color-coded urgency has text alternative (icon + text, not color only)
- [ ] Collapsed sections keyboard accessible (Tab, Enter/Space)
- [ ] Screen reader announces modifier count
- [ ] Touch targets minimum 44x44px
- [ ] Contrast ratio 4.5:1 for all text

### Performance Requirements

- [ ] Card renders in <100ms with 20+ orders
- [ ] Expand/collapse animation <200ms
- [ ] No layout shift when expanding modifiers

## Test Plan

### Manual Testing

1. **Rush Period Simulation**: Load 20 orders, verify scannability
2. **Allergy Order Test**: Create order with "peanut allergy" modifier, verify visibility
3. **Multi-Seat Test**: Create 3 orders for same table, verify differentiation
4. **Touch Test**: Use iPad, verify all tap targets accessible
5. **Screen Reader Test**: Navigate with VoiceOver, verify announcements

### Automated Testing

```typescript
// tests/e2e/kds/minimal-card.spec.ts

test('order ID shows last 4 digits only', async ({ page }) => {
  // Create order with long ID
  const order = await createOrder({ order_number: '20251105-0004' });

  // Navigate to KDS
  await page.goto('/kitchen');

  // Verify shortened display
  const orderCard = page.locator(`[data-testid="order-card-${order.id}"]`);
  await expect(orderCard).toContainText('Order #0004');
  await expect(orderCard).not.toContainText('20251105');
});

test('allergy modifiers always visible', async ({ page }) => {
  const order = await createOrder({
    items: [{
      name: 'Burger',
      modifiers: [
        { name: 'No peanuts (allergy)' },
        { name: 'Extra cheese' }
      ]
    }]
  });

  await page.goto('/kitchen');

  const orderCard = page.locator(`[data-testid="order-card-${order.id}"]`);

  // Allergy mod visible
  await expect(orderCard).toContainText('No peanuts (allergy)');

  // Non-allergy mod collapsed
  await expect(orderCard).not.toContainText('Extra cheese');
  await expect(orderCard).toContainText('+1 mods');
});
```

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Allergy info missed | Medium | Critical | Always expand allergy keywords |
| Staff confusion with icons | Low | Moderate | Training material + legend |
| Multi-seat order mixup | Medium | Moderate | Keep last 4 digits of order ID |
| Layout breaks on tablet | Medium | Low | Responsive typography |

## Dependencies

- Tooltip component from `@/components/ui/tooltip`
- MessageSquare icon from `lucide-react`
- Existing KDS config from `shared/config/kds.ts`

## Rollback Strategy

Feature flag in environment:

```env
VITE_KDS_MINIMAL_V2=true
```

```typescript
// In OrderCard.tsx
const useMinimalV2 = import.meta.env.VITE_KDS_MINIMAL_V2 === 'true';

if (!useMinimalV2) {
  return <LegacyOrderCard {...props} />;
}
```

## Success Metrics

1. **Order identification time**: Target <2 seconds (measure with stopwatch test)
2. **Error rate**: No increase in wrong order pickups
3. **Staff satisfaction**: Survey score >4/5 on readability
4. **Cards visible**: 6+ cards visible without scrolling on 1920x1080

## References

### Internal
- Previous minimal redesign: `plans/kds-minimal-redesign.md`
- KDS configuration: `shared/config/kds.ts:180-211`
- Current OrderCard: `client/src/components/kitchen/OrderCard.tsx`
- Type colors implementation: commit `e9896859`

### External
- [KDS UX Best Practices](https://loman.ai/blog/7-best-kitchen-display-systems-kds-for-order-routing-2024)
- [Progressive Disclosure Pattern](https://ui-patterns.com/patterns/ProgressiveDisclosure)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Implementation Phases

### Phase 2A: Typography & Cleanup (Low Risk)
- [ ] Increase font sizes to 24px/20px/16px
- [ ] Remove "Guest" placeholder
- [ ] Shorten order ID display

### Phase 2B: Progressive Disclosure (Medium Risk)
- [ ] Create ModifierBadge component
- [ ] Implement allergy keyword detection
- [ ] Collapse non-critical modifiers

### Phase 2C: Notes & Progress (Medium Risk)
- [ ] Convert notes to icon + popover
- [ ] Add view mode toggle (Kitchen/Expo)
- [ ] Hide progress in Kitchen view

### Phase 2D: Accessibility & Testing (Required)
- [ ] Add ARIA labels
- [ ] Keyboard navigation
- [ ] E2E tests for all scenarios

---

*Generated with Claude Code*
