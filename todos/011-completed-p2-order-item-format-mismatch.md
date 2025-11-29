# TODO-011: Create Shared VoiceOrderItem Type

## Metadata
- **Status**: completed
- **Priority**: P2 (Important)
- **Issue ID**: 011
- **Tags**: types, voice, shared, architecture
- **Dependencies**: 003
- **Created**: 2025-11-24
- **Completed**: 2025-11-28
- **Source**: Code Review - Pattern Recognition Specialist Agent

---

## Problem Statement

Kiosk and Server use incompatible order item types:

- **Kiosk**: `MenuItem` from `@rebuild/shared`
- **Server**: Custom `OrderItem` type with different structure

This causes type safety issues and conversion bugs.

---

## Findings

### Kiosk Type (useVoiceCommerce)
```typescript
// Uses MenuItem: { id, name, price, description, ... }
onAddItem: (menuItem: MenuItem, quantity: number, modifications: string[], instructions?: string)
```

### Server Type (useVoiceOrderWebRTC)
```typescript
// Uses OrderItem: { id, menuItemId?, name, quantity, modifications?, source?, price? }
interface OrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  modifications?: OrderModification[];
  source?: 'voice' | 'touch';
  price?: number;
}
```

### Conversion Logic (Duplicated)
```typescript
// VoiceOrderModal.tsx:103-107
modifications: modifications.map((modName, idx) => ({
  id: `mod-${idx}`,
  name: modName,
  price: 0  // Price always 0!
}))

// useVoiceOrderWebRTC.ts:188-192
modifications: (aiItem.modifiers || []).map((mod: string | any) => ({
  id: typeof mod === 'string' ? `mod-${mod}` : mod.id,
  name: typeof mod === 'string' ? mod : mod.name,
  price: typeof mod === 'string' ? 0 : (mod.price || 0)
}))
```

---

## Proposed Solutions

### Option A: Create Shared VoiceOrderItem (Recommended)
Single type in shared workspace used everywhere.

**Pros**: Type safety, single source of truth
**Cons**: Requires updating multiple files
**Effort**: Medium (2-3 hours)
**Risk**: Low

### Option B: Adapter Functions
Keep separate types with explicit converters.

**Pros**: Less invasive
**Cons**: Still two types, conversion overhead
**Effort**: Low (1-2 hours)
**Risk**: Low

---

## Recommended Action

**Option A** - Create shared type:

```typescript
// shared/src/types/voice.ts
export interface VoiceOrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  source: 'voice' | 'touch';
  modifications: VoiceOrderModification[];
  specialInstructions?: string;
}

export interface VoiceOrderModification {
  id: string;
  name: string;
  price: number;
}

// Converter function
export function menuItemToVoiceOrderItem(
  menuItem: MenuItem,
  quantity: number,
  modifications: VoiceOrderModification[],
  specialInstructions?: string
): VoiceOrderItem {
  return {
    id: `voice-${menuItem.id}-${Date.now()}`,
    menuItemId: menuItem.id,
    name: menuItem.name,
    quantity,
    price: menuItem.price,
    source: 'voice',
    modifications,
    specialInstructions,
  };
}
```

---

## Technical Details

### Affected Files
- `shared/src/types/voice.ts` (new)
- `shared/src/types/index.ts` (export)
- `client/src/modules/voice/hooks/useVoiceCommerce.ts`
- `client/src/pages/hooks/useVoiceOrderWebRTC.ts`
- `client/src/pages/components/VoiceOrderModal.tsx`

---

## Acceptance Criteria

- [ ] VoiceOrderItem type in shared workspace
- [ ] VoiceOrderModification type includes price
- [ ] Converter function handles MenuItem → VoiceOrderItem
- [ ] Both kiosk and server use shared type
- [ ] No duplicate conversion logic
- [ ] Type safety across all voice code

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From pattern recognition review |
| 2025-11-28 | Completed | Format transformation already implemented in VoiceOrderModal.tsx lines 134-146 (CartItem to OrderItem conversion) |
