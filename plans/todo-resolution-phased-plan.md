# Phased Todo Resolution Plan

**Created:** 2025-12-03
**Context:** 62 total todos, 9 pending (rest already complete)

This plan guides Claude Code through resolving all pending todos in a new conversation without prior context.

---

## Quick Start for New Chat

Copy this prompt to start a fresh session:

```
I need help resolving pending todos in this codebase. Please:
1. Read `plans/todo-resolution-phased-plan.md` for the execution plan
2. Follow the phases in order
3. Run tests after each phase before committing
4. Create one commit per phase with conventional format
```

---

## Phase Overview

| Phase | Focus | Effort | Todos |
|-------|-------|--------|-------|
| 0 | Prerequisites (test env, open issues) | 30 min | N/A |
| 1 | Security & RBAC | 2-3 hrs | #152 |
| 2 | CSS/Design System | 1-2 hrs | #153, #154, #156 |
| 3 | Performance Quick Wins | 30 min | #157, #158 |
| 4 | Code Quality | 1 hr | #159, #160, #161 |

---

## Phase 0: Prerequisites (30 min)

### 0.1 Fix Test Environment Isolation

**Problem:** CI tests failing due to `.env.test` containing production Vercel config.

**Plan:** `plans/fix-test-env-isolation.md`

**Steps:**
1. Rename `.env.test` → `.env.vercel.development`
2. Create new `.env.test`:
   ```env
   NODE_ENV=test
   VITE_API_BASE_URL=http://localhost:3001
   VITE_SUPABASE_URL=https://test.supabase.co
   VITE_SUPABASE_ANON_KEY=test-anon-key
   VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
   VITE_ENVIRONMENT=test
   ```
3. Add `.env.vercel.*` to `.gitignore`
4. Run `npm test` to verify

### 0.2 Check Open GitHub Issues

```bash
gh issue list --state open
```

Currently: #142 Database Schema Drift - investigate if blocking.

---

## Phase 1: Security & RBAC (2-3 hrs)

### Todo #152: RBAC Menu Scope Split [P1 SECURITY]

**File:** `todos/152-complete-p1-rbac-menu-scope-split.md`

**Problem:** `customer` and `kiosk_demo` roles have `MENU_MANAGE` scope, allowing them to modify menu items.

**Solution:**
1. Add `MENU_READ` scope to `server/src/middleware/rbac.ts`
2. Grant `MENU_READ` to all roles
3. Grant `MENU_MANAGE` only to `owner`/`manager`
4. Update scope assignments in `ROLE_SCOPES`

**Files to Modify:**
- `server/src/middleware/rbac.ts`

**Code Changes:**
```typescript
// Add to ApiScope enum
MENU_READ = 'menu:read',

// Update ROLE_SCOPES
owner: [...existingScopes, ApiScope.MENU_READ, ApiScope.MENU_MANAGE],
manager: [...existingScopes, ApiScope.MENU_READ, ApiScope.MENU_MANAGE],
server: [...existingScopes, ApiScope.MENU_READ],  // Remove MENU_MANAGE
kitchen: [...existingScopes, ApiScope.MENU_READ], // Remove MENU_MANAGE
customer: [...existingScopes, ApiScope.MENU_READ], // Remove MENU_MANAGE
kiosk_demo: [...existingScopes, ApiScope.MENU_READ], // Remove MENU_MANAGE
```

**Verification:**
```bash
npm run test:server -- --grep "rbac\|RBAC\|scope"
```

**Commit:**
```
fix(security): split MENU_MANAGE scope - remove from customer roles

BREAKING: customer/kiosk_demo can no longer modify menu items
- Add MENU_READ scope for viewing menu
- Restrict MENU_MANAGE to owner/manager only
- Fixes security vulnerability in 86-item management
```

---

## Phase 2: CSS/Design System (1-2 hrs)

### Todo #153: macon-orange Missing from Tailwind [P1]

**File:** `todos/153-complete-p1-macon-orange-tailwind-config.md`

**Problem:** `ItemDetailModal.tsx` uses `bg-macon-orange` but it's not in Tailwind config.

**Solution:** Add to `client/tailwind.config.js` theme.extend.colors:

```javascript
'macon-orange': {
  DEFAULT: '#fb923c',
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
},
```

**Verification:**
```bash
npm run build:client  # Ensure no purge errors
```

---

### Todo #154: Orange Button WCAG Contrast [P1 ACCESSIBILITY]

**File:** `todos/154-complete-p1-color-contrast-wcag.md`

**Problem:** `orange-500` with white text = 3.12:1 ratio (WCAG AA requires 4.5:1)

**Solution:** Audit and fix all orange button usages:

```bash
# Find violations
grep -rn "bg-orange-[345]00" client/src --include="*.tsx"
```

Replace with `orange-700` (#c2410c = 5.81:1) or darker for text on light backgrounds.

**Key Files:**
- `client/src/pages/Login.tsx` line 160
- Any CTA buttons with orange background + white text

---

### Todo #156: Category Filter Sticky Position [P1 UX]

**File:** `todos/156-complete-p1-category-filter-sticky-position.md`

**Problem:** Category filter uses `sticky top-0` but header is 144px tall, causing filter to hide behind header.

**Solution:** Change in `client/src/modules/order-system/components/CategoryFilter.tsx`:

```tsx
// Before
<div className="sticky top-0 z-10 bg-white shadow-sm">

// After
<div className="sticky top-20 md:top-24 z-10 bg-white shadow-sm">
```

**Verification:** Open customer order page, scroll down, verify filter stays visible below header.

**Commit for Phase 2:**
```
fix(ui): resolve design system and accessibility issues

- Add macon-orange color palette to Tailwind config
- Fix WCAG AA contrast violations on orange buttons
- Correct category filter sticky positioning
```

---

## Phase 3: Performance Quick Wins (30 min)

### Todo #157: Enable WebP Images [P2]

**File:** `todos/157-complete-p2-enable-webp-images.md`

**Problem:** WebP images exist but code is commented out.

**Solution:** Uncomment in `client/src/components/shared/OptimizedImage.tsx`:

```tsx
<picture>
  <source
    type="image/webp"
    srcSet={src.replace(/\.(jpg|jpeg|png)$/i, '.webp')}
  />
  <img src={src} ... />
</picture>
```

**Expected Impact:** ~48% image size reduction

---

### Todo #158: Extract formatPrice Utility [P2]

**File:** `todos/158-complete-p2-extract-formatprice-utility.md`

**Problem:** Price formatting duplicated across components.

**Solution:**
1. Create `client/src/utils/formatPrice.ts` (or verify it exists in shared)
2. Replace inline implementations with import
3. Already exists in `@rebuild/shared` - just ensure consistent usage

**Commit for Phase 3:**
```
perf(images): enable WebP support and consolidate formatPrice
```

---

## Phase 4: Code Quality (1 hr)

### Todo #159: Rename MenuItemCard Collision [P2]

**File:** `todos/159-complete-p2-rename-menuitemcard-collision.md`

**Problem:** Two components named `MenuItemCard` in different modules.

**Solution:** Rename to distinguish by context (e.g., `CustomerMenuItemCard` vs `AdminMenuItemCard`).

---

### Todo #160: Category Filter Touch Targets [P2]

**File:** `todos/160-complete-p2-category-filter-touch-targets.md`

**Problem:** Touch targets too small on mobile.

**Solution:** Ensure minimum 44x44px touch targets per WCAG guidelines.

---

### Todo #161: Unavailable Item Visual Treatment [P3]

**File:** `todos/161-complete-p3-unavailable-item-visual-treatment.md`

**Problem:** Sold out items need clearer visual distinction.

**Solution:** Already partially implemented in MenuItemCard.tsx - verify and enhance if needed.

**Commit for Phase 4:**
```
refactor(ui): improve component naming and touch accessibility
```

---

## Verification Checklist

After all phases, run:

```bash
# Type check
npm run typecheck

# Full test suite
npm test

# Build both client and server
npm run build
npm run build:client

# Lint
npm run lint
```

---

## Commit Strategy

Create one PR per phase, or bundle all into single PR with multiple commits:

```bash
git checkout -b fix/todo-resolution-batch
# Complete each phase, commit
git push -u origin fix/todo-resolution-batch
gh pr create --title "fix: resolve pending P1/P2 todos" --body "..."
```

---

## Notes for Claude Code

1. **Read each todo file** before implementing - they contain detailed context
2. **Check dependencies** - some todos depend on others (e.g., #154 depends on #153)
3. **Run tests frequently** - after each file change if possible
4. **Use TodoWrite tool** to track progress within the session
5. **Snake_case convention** - all API/DB fields use snake_case (see CLAUDE.md)
6. **Multi-tenant isolation** - all queries must filter by `restaurant_id`

---

## Priority Matrix

| Immediate (P1) | Important (P2) | Nice-to-have (P3) |
|----------------|----------------|-------------------|
| #152 RBAC Split | #157 WebP Images | #161 Sold Out Visual |
| #153 macon-orange | #158 formatPrice | |
| #154 WCAG Contrast | #159 Name Collision | |
| #156 Sticky Filter | #160 Touch Targets | |
