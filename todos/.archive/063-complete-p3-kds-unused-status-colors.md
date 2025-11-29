# TODO-063: OrderGroupCard Has Unused statusColors Object

## Metadata
- **Status**: complete
- **Priority**: P3 (Nice-to-Have)
- **Issue ID**: 063
- **Tags**: cleanup, kds, dead-code, code-review
- **Dependencies**: None
- **Created**: 2025-11-26
- **Source**: Code Review - KDS Declutter Implementation

---

## Problem Statement

`OrderGroupCard.tsx` defines a `statusColors` object (lines 92-101) that is **never used** in the component. This is dead code that should be removed or moved to a centralized location if needed elsewhere.

---

## Findings

### Evidence Location

**OrderGroupCard.tsx (lines 92-101)** - Unused object:
```typescript
const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  pending: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-purple-100 text-purple-700',
  preparing: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  'picked-up': 'bg-gray-400 text-white',
  completed: 'bg-gray-300 text-gray-600',
  cancelled: 'bg-red-100 text-red-700'
}
```

### Search Results
Searching the component for `statusColors` usage:
- Defined on line 92
- **Never referenced** in JSX or elsewhere in component

---

## Recommended Action

**Option 1: Remove if truly unused** (Recommended)
```typescript
// Delete lines 92-101
```

**Option 2: Move to kds.ts if needed elsewhere**
```typescript
// In shared/config/kds.ts
export const ORDER_STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  // ... rest of colors
} as const;
```

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/OrderGroupCard.tsx`

### Verification Steps
1. Search codebase for similar status color definitions
2. If duplicates exist, consider centralizing in `kds.ts`
3. If unique to this file and unused, delete

---

## Acceptance Criteria

- [ ] Verify `statusColors` is not used in component
- [ ] Remove dead code OR move to shared config
- [ ] TypeScript compiles without errors
- [ ] No visual changes to component

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-26 | Created | From KDS declutter code review |
| 2025-11-28 | Verified complete | statusColors object already removed - fixed in earlier refactor |
