# TODO-003: Consolidate Dual Voice Hook Architecture

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 003
- **Tags**: architecture, voice, hooks, kiosk, server
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Pattern Recognition Specialist Agent

---

## Problem Statement

Kiosk and Server use DIFFERENT hooks for voice ordering:

- **Kiosk**: `useVoiceCommerce` (659 lines, modern implementation)
- **Server**: `useVoiceOrderWebRTC` (482 lines, legacy implementation)

This means bug fixes to one don't apply to the other. Both are buggy because they diverged.

---

## Findings

### Architecture Divergence

**Kiosk (VoiceOrderingMode.tsx)**:
```typescript
// Line 84 - Uses modern hook
const voiceCommerce = useVoiceCommerce({
  menuItems,
  onAddItem: (menuItem, quantity, modifications, specialInstructions) => {
    addItem(convertApiMenuItemToShared(menuItem), quantity, ...);
  },
  context: 'kiosk',
});
```

**Server (ServerView.tsx)**:
```typescript
// Line 31 - Uses DIFFERENT legacy hook
const voiceOrder = useVoiceOrderWebRTC({
  menuItems,
  restaurantId,
  onOrderSubmitted: handleOrderSubmitted,
});
```

### Functional Differences

| Feature | useVoiceCommerce | useVoiceOrderWebRTC |
|---------|------------------|---------------------|
| Menu matching | Fuzzy via `findMenuItemByName` | OrderParser direct |
| Order format | MenuItem from shared | Custom OrderItem |
| Checkout | VoiceCheckoutOrchestrator | Custom submitOrder |
| Multi-seat | No | Yes |
| State machine | Uses VoiceStateMachine | Manual state |

### Impact
- Bug fixes only apply to one context
- Testing burden doubled
- Users experience different bugs
- Maintenance nightmare

---

## Proposed Solutions

### Option A: Consolidate to useVoiceCommerce (Recommended)
Modify `useVoiceOrderWebRTC` to use `useVoiceCommerce` internally, keeping only multi-seat logic.

**Pros**: Single source of truth for voice logic
**Cons**: Requires careful integration
**Effort**: Medium (4-6 hours)
**Risk**: Medium

### Option B: Create Unified Voice Hook
New hook that abstracts both use cases with context-aware behavior.

**Pros**: Clean slate, best architecture
**Cons**: More work, must migrate both
**Effort**: High (8-12 hours)
**Risk**: Medium-High

### Option C: Keep Separate, Sync Manually
Document differences and manually sync bug fixes.

**Pros**: No code changes
**Cons**: Ongoing maintenance burden, bugs will diverge
**Effort**: Low initially, High ongoing
**Risk**: High (guaranteed future bugs)

---

## Recommended Action

**Option A** - Consolidate:

```typescript
// useVoiceOrderWebRTC.ts - REFACTORED
export function useVoiceOrderWebRTC(options: VoiceOrderWebRTCOptions) {
  // Use shared voice commerce logic
  const voiceCommerce = useVoiceCommerce({
    menuItems: options.menuItems,
    onAddItem: (menuItem, quantity, mods, instructions) => {
      // Convert to OrderItem format
      const orderItem = convertToOrderItem(menuItem, quantity, mods, instructions);
      setOrderItems(prev => [...prev, orderItem]);
    },
    context: 'server',
    toast: options.toast,
  });

  // Keep ONLY multi-seat and submission logic here
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  const submitOrder = async (table: Table, seat: number) => {
    // Server-specific submission logic
  };

  return {
    ...voiceCommerce,
    selectedSeat,
    setSelectedSeat,
    submitOrder,
  };
}
```

---

## Technical Details

### Affected Files
- `client/src/pages/hooks/useVoiceOrderWebRTC.ts` (refactor)
- `client/src/pages/ServerView.tsx` (update usage)
- `client/src/pages/components/VoiceOrderModal.tsx` (simplify)

### Shared Type Needed
```typescript
// shared/types/voice.ts
export interface VoiceOrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  source: 'voice' | 'touch';
  modifications: Array<{ id: string; name: string; price: number }>;
}
```

---

## Acceptance Criteria

- [ ] `useVoiceOrderWebRTC` uses `useVoiceCommerce` internally
- [ ] Voice logic is single source of truth
- [ ] Multi-seat logic preserved in server hook
- [ ] Both kiosk and server work with same voice behavior
- [ ] Shared VoiceOrderItem type created
- [ ] All voice tests pass

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From pattern recognition review |

---

## Resources

- [useVoiceCommerce](client/src/modules/voice/hooks/useVoiceCommerce.ts)
- [useVoiceOrderWebRTC](client/src/pages/hooks/useVoiceOrderWebRTC.ts)
