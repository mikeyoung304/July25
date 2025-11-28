# POS Seat Selection & Payment Flow - Research Findings

> **Generated:** 2025-11-28
> **Status:** Research complete, ready for planning phase
> **Next Step:** Run `/workflows:plan` in rebuild-6.0 context with this research

---

## Feature Request Summary

Design agents should improve the "Select Seat" flow so that the popup visually matches the table layout, as if the user zoomed in on the table, and should simplify the post-selection "Touch Order" screen using patterns from leading restaurant POS systems.

### Core Requirements

1. **Zoomed Table Seat Picker** - Modal that visually mirrors table shape with numbered seat hotspots
2. **Table Status Color Coding** - Gray (empty) → Yellow (seated) → Orange/Red (active order) → Green (paid)
3. **Table Actions Flow** - Add guests, add items, close table after tapping occupied table
4. **Payment Workflow** - Split checks (by seat/item/equally), show bill, tips, card/cash payments
5. **Touch Order Screen Redesign** - Persistent context header showing table/seat/check info

---

## Research Agent 1: Codebase Analysis

### Current Component Tree

```
ServerView (page)
├── useServerView() hook
│   └── Manages table list, selected table, loading state
├── ServerFloorPlan
│   └── Canvas display (read-only for servers)
├── SeatSelectionModal
│   ├── Local: selectedSeat, showSeatSelection
│   └── Shared: selectedTable (from ServerView)
├── VoiceOrderModal
│   ├── useVoiceOrderWebRTC() hook
│   │   ├── State: orderItems, orderedSeats, showVoiceOrder
│   │   └── Methods: submitOrder, addItem, removeItem
│   └── useVoiceCommerce() hook (menu parsing)
└── PostOrderPrompt
    └── Shows progress for multi-seat orders
```

### Key Files & Line Numbers

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/pages/ServerView.tsx` | 176 | Main server interface |
| `client/src/pages/components/SeatSelectionModal.tsx` | 208 | Current seat selection (3-column grid) |
| `client/src/modules/floor-plan/components/FloorPlanCanvas.tsx` | 982 | Canvas rendering, table shapes, status colors |
| `client/src/pages/hooks/useVoiceOrderWebRTC.ts` | 250+ | Order state management with useReducer |
| `client/src/pages/CheckoutPage.tsx` | 250+ | Payment flow (demo + Stripe) |
| `server/src/routes/tables.routes.ts` | 389 | Table CRUD + status updates |
| `server/src/services/table.service.ts` | 193 | Table business logic |

### Current Table Type

```typescript
interface Table {
  id: string
  type: 'circle' | 'rectangle' | 'square' | 'chip_monkey'
  x: number
  y: number
  width: number
  height: number
  seats: number
  label: string
  rotation: number
  status: 'available' | 'occupied' | 'reserved' | 'unavailable' | 'cleaning'
  z_index: number
  current_order_id?: string | null
  metadata?: Record<string, unknown>
}
```

### Current Status Colors (FloorPlanCanvas.tsx:153-174)

- **Occupied**: Amber gradient (FEF3C7 → F59E0B → D97706)
- **Reserved**: Blue gradient (EFF6FF → 3B82F6 → 1D4ED8)
- **Cleaning**: Violet gradient (F5F3FF → 8B5CF6 → 7C3AED)
- **Unavailable**: Gray gradient (F3F4F6 → 9CA3AF → 6B7280)
- **Available**: Emerald gradient (ECFDF5 → 10B981 → 059669)

### Gaps Identified

1. **No split check UI** - CheckoutPage doesn't support splitting
2. **No tip entry** - Missing tip selector component
3. **No "active order" status** - Only occupied/available/reserved/cleaning
4. **Real-time sync TODO** - table.service.ts:104 mentions Phase 3 events
5. **No bussing workflow** - No intermediate "paid but not cleared" state

---

## Research Agent 2: Industry Best Practices

### Touch Target Sizes (Critical for Restaurant)

- **Minimum WCAG:** 44×44 CSS pixels
- **Restaurant optimized:** 56px+ with padding
- **High-stress environments:** 76×76 pixels recommended
- **Spacing:** Padding between targets to prevent accidental taps

### Recommended Table Status Colors

| Status | Color | Use Case |
|--------|-------|----------|
| Empty/Available | White/Light Gray | Ready for seating |
| Seated (no order) | Yellow | Party seated, waiting to order |
| Active Order | Orange/Red | Order in progress |
| Check Printed | Purple | Bill presented |
| Paid | Green | Payment complete |
| Needs Bussing | Dark Red | Urgent action needed |

**Important:** Use icon + color + text label (not color alone) for accessibility.

### Split Check Patterns

1. **Split by Seat** (Default) - Items auto-allocated by seat number
2. **Split by Item** - Manual drag-drop item assignment
3. **Equal Split** - Divide total by guest count

### Tip Entry UX

```
┌─────────────────────────┐
│ Bill: $100.00           │
│ ─────────────────────── │
│ Tip Amount              │
│  [15%]  [18%] [20%]     │ ← Tap to select
│ [Custom Amount]         │ ← For other values
│                         │
│ Total: $118.00          │
│ [Confirm] [Modify]      │
└─────────────────────────┘
```

### Table Lifecycle State Machine

```
EMPTY
  ↓ (Host seats party)
SEATED
  ↓ (Order placed)
ACTIVE_ORDER
  ↓ (Items delivered)
DINING
  ↓ (Check printed)
CHECK_READY
  ↓ (Payment processing)
PAYING
  ↓ (Payment complete)
PAID
  ↓ (Guest leaves)
BUSSING
  ↓ (Table cleaned)
EMPTY (cycle repeats)
```

### Sources

- Toast POS table management
- Square split check documentation
- Lightspeed table status colors
- WCAG touch target guidelines
- Google "Design for Driving" (large touch targets)

---

## Research Agent 3: Framework Patterns

### Animation (Framer Motion - already in project)

```typescript
// Zoom modal pattern
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
>
```

### Long-Press Detection Hook

```typescript
export function useLongPress({
  onLongPress,
  onShortPress,
  duration = 500
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const [isPressed, setIsPressed] = useState(false)

  const handleMouseDown = useCallback(() => {
    setIsPressed(true)
    timerRef.current = setTimeout(() => {
      onLongPress()
      setIsPressed(false)
    }, duration)
  }, [duration, onLongPress])

  // ... handlers for mouseUp, mouseLeave, touchStart, touchEnd
}
```

### Recommended Component Structure

```
client/src/components/pos/
├── tables/
│   ├── TableGrid.tsx
│   ├── TableCard.tsx
│   └── ZoomedTableCard.tsx
├── seats/
│   ├── SeatPicker.tsx
│   ├── ZoomedSeatPicker.tsx
│   └── SeatGrid.tsx
├── orders/
│   ├── OrderCard.tsx
│   ├── OrderContextHeader.tsx
│   └── OrderActions.tsx
├── checks/
│   ├── CheckSummary.tsx
│   ├── CheckSplitter.tsx
│   ├── TipSelector.tsx
│   └── PaymentProcessor.tsx
└── modals/
    ├── SeatSelectionModal.tsx
    └── PaymentModal.tsx
```

### Recommended Types

```typescript
// Extended table status
type TableStatus =
  | 'empty'
  | 'seated'
  | 'active_order'
  | 'check_ready'
  | 'paying'
  | 'paid'
  | 'bussing'

// Check with splits
interface Check {
  id: string
  tableId: string
  items: CheckItem[]
  subtotal: number
  tax: number
  tip: number
  total: number
  status: 'open' | 'closed' | 'paid'
  payments: Payment[]
  splits?: CheckSplit[]
}

interface CheckSplit {
  id: string
  seatNumber?: number
  items: OrderItem[]
  subtotal: number
  tax: number
  tip: number
  total: number
  status: 'pending' | 'processing' | 'completed'
}

interface Payment {
  id: string
  checkId: string
  amount: number
  method: 'cash' | 'card' | 'digital_wallet'
  tip?: number
  status: 'pending' | 'completed' | 'failed'
}
```

---

## Recommended Implementation Phases

### Phase 1: Table Status & Visual Updates
- Add new status values (active_order, paid, bussing)
- Update FloorPlanCanvas color mapping
- Add status legend component
- Implement automatic status transitions

### Phase 2: Zoomed Seat Picker
- Create ZoomedTableSeatPicker component
- Mirror table shape in modal
- Position seats around table perimeter
- Add zoom animation from floor plan

### Phase 3: Order Context Header
- Redesign Touch Order screen
- Add persistent context bar (table/seat/status)
- Group primary actions prominently

### Phase 4: Payment & Check Management
- Create Check model and API routes
- Implement split check UI (by seat, by item, equal)
- Add tip selector with percentage presets
- Support card + cash payment flows

### Phase 5: Multi-Payment & Close Table
- Handle partial payments
- Auto-update table status on full payment
- Bussing workflow integration

---

## Next Steps

1. Open Claude Code session in `/Users/mikeyoung/CODING/rebuild-6.0`
2. Run `/workflows:plan` with the original feature description
3. Reference this research file for context
4. Create detailed implementation plan with file-level tasks

---

## Original Feature Description

<details>
<summary>Click to expand full requirements</summary>

### Seat selection popup
Redesign the "Select Seat" modal so it visually mirrors the table object on the floor plan (same shape, orientation, and seat count), essentially acting as a zoomed-in view of that table only.

Represent each seat as a clearly numbered, tappable hotspot around the table shape (e.g., circles or rounded rectangles on the table perimeter) with high contrast, large touch targets, and clear selected / occupied / unavailable states.

Persist context from the main layout: show table name/number, party size, and any status (open, occupied, check in progress) at the top of the popup so staff always know which table they are working on.

Reduce cognitive load by removing non-essential controls from this popup; primary actions should be "Choose Seat", "Auto-assign Seats", and "Continue to Order".

### Interaction and UX behavior
When a table is tapped, open the zoomed-in seat selector with a quick scale/zoom animation to reinforce that this is the same table, just magnified, instead of a generic dialog.

Allow rapid seat selection: single tap to select a seat, long-press or secondary control to mark special cases (e.g., child, high chair, wheelchair) if needed in the future.

Use clear visual legends for seat states (e.g., color + icon for occupied, check-open, or reserved) consistent with the main floor layout.

Ensure the modal is optimized for tablet use: large hit areas, minimal scrolling, and layouts that work for both portrait and landscape orientations.

### "Touch Order" screen issues
After selecting a seat and tapping "Touch Order", the resulting page currently feels confusing and disconnected from the seat selection step; agents should rework this screen to maintain continuity and use a clear hierarchy.

Always keep the current context visible at the top: table name/number, selected seat number(s), guest count, and check status (e.g., "Table 12 · Seat 3 · New Check").

Group primary actions (add items, view order by seat, split check, send to kitchen) into a simple, consistent layout that matches patterns from Toast, Square, and other leading systems.

### Table status and color changes
When a server sends the first order for a table, change the table color from "seated" to an "active order" color (for example: gray = empty, yellow = seated/no order, red = active order, green = paid/not cleared).

Keep a small legend or tooltip available so new staff can quickly understand what each color represents on the floor view.

After the check is fully paid and the table cleared, revert the table color to the "empty/available" state automatically (with an optional "paid, not cleared" intermediate color if you want bussing visibility).

### Tap table → manage or close
When the server taps a table with an active order, open a "Table Actions" / check summary screen that shows: table name/number, guest count, current check or checks, total amounts, and status.

Provide three primary actions prominently on this screen:
- "Add Guests" (increase party size, optionally assign new seats).
- "Add Items" (jump back into the ordering UI scoped to this table/seat).
- "To Payment / Close Table" (takes the server into the payment workflow).

### Split checks and bill handling
On the payment screen, include a dedicated "Split Check" entry point that supports:
- Split evenly by number of guests.
- Split by seat (each seat gets its own check).
- Split by item (move individual items to specific checks).

Visually show each check as a separate card/list with its own subtotal, tax, tip, and total so servers can see what remains unpaid at a glance.

Allow a "Show Bill" / "Print Bill" action per check so the server can present itemized bills for each guest or the combined bill for the entire table.

### Tips and payment methods
For each check, the standard flow should be: Show Bill → "Take Payment" → select payment method (Card, Cash, Other) → optional tip → confirm.

For card payments:
- Show a simple tip step with common percentages and a custom amount option before confirming the charge.
- Allow multiple card payments on a single check when needed, updating the "amount remaining" after each transaction.

For cash payments:
- Provide quick buttons for common cash amounts, auto-calculate change due, and still allow the server to enter a tip line if the restaurant tracks cash tips inside the POS.

### Closing out and clearing the table
Once all checks tied to a table are fully paid, automatically mark the table as "paid" and change its color (for example, green) while it is waiting to be bussed, then shift to "empty/available" once cleared.

If any check on that table remains open, keep the table in the "active order" color and show the count of open checks or amount remaining so the server can quickly see what still needs to be closed.

</details>
