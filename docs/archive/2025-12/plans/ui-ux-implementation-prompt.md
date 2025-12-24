# UI/UX Improvement Implementation Prompt

**Copy this entire prompt to start a new Claude Code session on a clean branch.**

---

## Context

I need to implement UI/UX improvements for our restaurant ordering system. An 8-agent review was conducted and identified critical issues with the original plan. The review is complete and todos have been created in `todos/152-161*.md`.

## Key Decisions from Review

1. **DO NOT create BaseMenuCard** - The proposed DRY refactoring was rejected. Customer and server MenuItemCards are only 12.5% similar and should remain separate.

2. **Priority order matters** - Some todos have dependencies (e.g., RBAC fix must happen before 86-item feature).

3. **Many "fixes" already exist** - Touch targets in MenuItemCard are already 44px. Focus on remaining gaps.

## Your Task

Start on a new branch and work through the pending todos in priority order:

```bash
git checkout -b feature/ui-ux-improvements
```

### P1 - Critical (Do First)

| Todo | Description | Est. Time |
|------|-------------|-----------|
| 152 | RBAC: Split MENU_READ/MENU_MANAGE scopes | 2-3 hours |
| 153 | Add macon-orange to Tailwind config | 15 min |
| 154 | Fix orange color contrast for WCAG | 1-2 hours |
| 155 | Write 86-item management specification | 4-8 hours |
| 156 | Fix CategoryFilter sticky position (top-0 → top-24) | 5 min |

### P2 - Important (Do Next)

| Todo | Description | Est. Time |
|------|-------------|-----------|
| 157 | Enable WebP images (uncomment existing code) | 5 min |
| 158 | Extract formatPrice utility to shared/utils | 10 min |
| 159 | Rename MenuItemCard in MenuItemGrid → MenuGridCard | 5 min |
| 160 | CategoryFilter buttons need min-h-[44px] | 5 min |

### P3 - Nice to Have

| Todo | Description | Est. Time |
|------|-------------|-----------|
| 161 | Add "Sold Out" visual treatment for unavailable items | 30 min |

## File Locations

**Todos:** `todos/152-pending-p1-*.md` through `todos/161-pending-p3-*.md`

**Key Files to Modify:**
- `server/src/middleware/rbac.ts` - RBAC scopes (todo 152)
- `client/tailwind.config.js` - Add macon-orange (todo 153)
- `client/src/pages/Login.tsx` - Color contrast (todo 154)
- `client/src/modules/order-system/components/CategoryFilter.tsx` - Sticky fix (todo 156)
- `client/src/components/shared/OptimizedImage.tsx` - WebP (todo 157)
- `shared/utils/currency.ts` - New file for formatPrice (todo 158)
- `client/src/components/shared/MenuItemGrid.tsx` - Rename card (todo 159)
- `client/src/modules/order-system/components/MenuItemCard.tsx` - Sold out state (todo 161)

## What NOT to Do

- **DO NOT create BaseMenuCard or any variant-based shared component**
- **DO NOT implement 86-item UI until specification (todo 155) is complete**
- **DO NOT change touch targets in MenuItemCard** - they're already 44px
- **DO NOT add dark mode** - not suitable for restaurant ops
- **DO NOT add micro-animations** - harmful on mobile performance
- **DO NOT implement srcSet** - no image generation pipeline exists yet

## Commands

```bash
# Read a todo
cat todos/152-pending-p1-rbac-menu-scope-split.md

# List all UI/UX todos
ls todos/15[2-9]*.md todos/16[0-1]*.md

# After completing a todo, rename it
mv todos/152-pending-p1-rbac-menu-scope-split.md todos/152-complete-p1-rbac-menu-scope-split.md

# Run tests after changes
npm run test:server  # For RBAC changes
npm run test:client  # For UI changes
npm run typecheck    # Verify no type errors
```

## Success Criteria

1. All P1 todos completed and tests pass
2. P2 todos completed where possible
3. WCAG color contrast verified with WebAIM checker
4. CategoryFilter stays visible when scrolling
5. WebP images loading in browser DevTools
6. No TypeScript errors

## Workflow

1. Read the todo file for full context
2. Implement the solution
3. Run relevant tests
4. Mark todo as complete (rename file)
5. Commit with descriptive message
6. Move to next todo

Start with todo 152 (RBAC scope split) since it's a security issue and blocks the 86-item feature.

---

**Branch name:** `feature/ui-ux-improvements`
**Estimated total time:** 8-12 hours for P1+P2
