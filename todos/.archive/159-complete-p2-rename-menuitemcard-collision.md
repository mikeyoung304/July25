---
status: complete
priority: p2
issue_id: "159"
tags: [refactoring, naming, maintainability, ui-ux-review]
dependencies: []
created_date: 2025-12-03
completed_date: 2025-12-03
source: ui-ux-plan-review
---

# Rename MenuItemCard in MenuItemGrid to Avoid Collision

## Problem Statement

Two completely different components share the name `MenuItemCard`:
1. `modules/order-system/components/MenuItemCard.tsx` - Customer cart integration
2. `components/shared/MenuItemGrid.tsx:MenuItemCard` - Server display card

This naming collision causes import confusion and maintenance issues.

## Findings

### Code Quality Agent Discovery

**Import Confusion:**
```typescript
// Which MenuItemCard?
import { MenuItemCard } from '@/modules/order-system/components/MenuItemCard';
import { MenuItemCard } from '@/components/shared/MenuItemGrid';
```

**Different Purposes:**
- Customer MenuItemCard: 187 lines, cart state, quantity selector
- Server MenuItemCard: 86 lines, stateless, onClick callback

**README Misleading:**
> "MenuItemCard: Individual menu item card component (can be used standalone)."

But it's NOT standalone - it's defined inside MenuItemGrid.tsx.

## Proposed Solutions

### Solution A: Rename to MenuGridCard (Recommended)

**Effort:** 5 minutes | **Risk:** Low

```typescript
// components/shared/MenuItemGrid.tsx
export const MenuGridCard: React.FC<MenuGridCardProps> = ({ ... }) => {
  // ...
};
```

Pattern: Container + Card naming (MenuItemGrid contains MenuGridCard).

### Solution B: Rename to ServerMenuCard

**Effort:** 5 minutes | **Risk:** Low

```typescript
export const ServerMenuCard: React.FC<ServerMenuCardProps> = ({ ... }) => {
  // ...
};
```

Pattern: Role + Card naming.

## Recommended Action

Solution A - follows container/child naming convention.

## Technical Details

**File to Modify:**
- `client/src/components/shared/MenuItemGrid.tsx`

**Renames:**
- `MenuItemCard` → `MenuGridCard`
- `MenuItemCardProps` → `MenuGridCardProps`

**Update Imports (if exported separately):**
```bash
grep -rn "MenuItemCard" client/src --include="*.tsx" | grep -v "order-system"
```

## Acceptance Criteria

- [ ] Server card renamed to MenuGridCard
- [ ] Props interface renamed to MenuGridCardProps
- [ ] No import collisions possible
- [ ] README updated if needed
- [ ] TypeScript compiles without errors

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-03 | Created | From UI/UX plan code quality review |

## Resources

- Naming conventions in existing codebase
- React component naming best practices
