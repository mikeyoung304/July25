# Phased Todo Resolution Plan

**Created:** 2025-12-03
**Updated:** 2025-12-04
**Context:** 75 total todos, 9 `ready-` todos remaining (4 were resolved in commit 27fd734a)

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

## Recent Changes (2025-12-04)

### Resolved in commit 27fd734a:
- ✅ #162 - P1 database field mismatch (`is_available` → `available`)
- ✅ #163 - P1 missing menu update tests (15 security tests added)
- ✅ #164 - P1 console.error in MenuService (replaced with logger)
- ✅ #165 - P1 snake_case violation (no additional violations found)

**These need to be archived from `todos/` directory.**

---

## Phase Overview

| Phase | Focus | Effort | Todos |
|-------|-------|--------|-------|
| 0 | Prerequisites & Cleanup | 15 min | Archive #162-165 |
| 1 | Security & RBAC | 1-2 hrs | #152 |
| 2 | CSS/Design System | 1-2 hrs | #153, #154, #156 |
| 3 | Performance Quick Wins | 30 min | #157, #158 |
| 4 | Code Quality | 1 hr | #159, #160, #161 |
| 5 | PR #152 Follow-ups (Performance) | 2-3 hrs | #166, #167, #168, #172 |
| 6 | PR #152 Follow-ups (Security/Compliance) | 2-3 hrs | #169, #170, #171 |
| 7 | PR #152 Follow-ups (Code Quality) | 1-2 hrs | #173, #174 |

**Total New Todos:** 9 (from PR #152 code review)
- P2: #166, #167, #168, #169, #170, #171, #172, #173
- P3: #174

---

## Phase 0: Prerequisites & Cleanup (15 min)

### 0.1 Archive Resolved Todos (#162-165)

```bash
cd todos
mv 162-ready-p1-database-field-mismatch.md .archive/
mv 163-ready-p1-missing-menu-update-tests.md .archive/
mv 164-ready-p1-console-error-menu-service.md .archive/
mv 165-ready-p1-snake-case-violation.md .archive/
```

### 0.2 Check Open GitHub Issues

```bash
gh issue list --state open
```

Currently: #142 Database Schema Drift - investigate if blocking.

---

## Phase 1: Security & RBAC (1-2 hrs)

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

## Phase 5: PR #152 Follow-ups - Performance (2-3 hrs)

### Todo #166: Missing Database Indexes [P2]

**File:** `todos/166-ready-p2-missing-database-indexes.md`

**Problem:** Menu queries filter on `restaurant_id` AND `active` but only single-column index exists.

**Solution:** Create migration with composite indexes:

```sql
CREATE INDEX CONCURRENTLY idx_menu_items_restaurant_active
  ON menu_items (restaurant_id, active)
  WHERE active = true;
```

---

### Todo #167: Inefficient Cache Invalidation [P2]

**File:** `todos/167-ready-p2-inefficient-cache-invalidation.md`

**Problem:** `clearCache()` iterates ALL cache keys (O(n)) instead of targeted deletion (O(1)).

**Solution:** Use targeted cache deletion with specific keys:

```typescript
static clearCache(restaurantId: string, itemId?: string): void {
  menuCache.del(`${CACHE_KEYS.FULL_MENU}${restaurantId}`);
  menuCache.del(`${CACHE_KEYS.ITEMS}${restaurantId}`);
  if (itemId) {
    menuCache.del(`${CACHE_KEYS.ITEM}${restaurantId}:${itemId}`);
  }
}
```

---

### Todo #168: Sequential API Calls [P2]

**File:** `todos/168-ready-p2-sequential-api-calls.md`

**Problem:** `getMenuItems()` makes sequential calls (waterfall pattern) adding 100-200ms latency.

**Solution:** Use `Promise.all()` for parallel fetches:

```typescript
const [categories, response] = await Promise.all([
  this.getMenuCategories(),
  httpClient.get<any[]>('/api/v1/menu/items')
]);
```

---

### Todo #172: Unbounded Client Cache [P2]

**File:** `todos/172-ready-p2-unbounded-client-cache.md`

**Problem:** `categoriesCache` Map grows indefinitely without TTL or eviction.

**Solution:** Remove redundant client-side cache (backend already caches with 300s TTL).

**Commit for Phase 5:**
```
perf(menu): optimize cache invalidation and API calls

- Add composite indexes for menu queries (#166)
- Fix O(n) → O(1) cache invalidation (#167)
- Parallelize API calls in MenuService (#168)
- Remove redundant client cache (#172)
```

---

## Phase 6: PR #152 Follow-ups - Security/Compliance (2-3 hrs)

### Todo #169: Missing Audit Logging [P2]

**File:** `todos/169-ready-p2-missing-audit-logging.md`

**Problem:** No audit trail for menu availability changes - compliance risk.

**Solution:** Integrate with AuditService:

```typescript
await AuditService.logMenuItemChange({
  eventType: 'MENU_ITEM_AVAILABILITY_CHANGED',
  userId, restaurantId, itemId,
  oldValue, newValue,
  timestamp: new Date().toISOString()
});
```

---

### Todo #170: Race Condition on Concurrent Updates [P2]

**File:** `todos/170-ready-p2-race-condition-concurrent-updates.md`

**Problem:** No optimistic locking - last-write-wins without conflict detection.

**Solution:** Add `updated_at` check in WHERE clause:

```typescript
.eq('updated_at', currentUpdatedAt)  // Version check
```

---

### Todo #171: No Rate Limiting on Menu Update [P2]

**File:** `todos/171-ready-p2-no-rate-limiting-menu-update.md`

**Problem:** Menu updates clear cache - potential for abuse/cache thrashing.

**Solution:** Add menu-specific rate limiter (30 updates/min).

**Commit for Phase 6:**
```
fix(security): add audit logging, optimistic locking, rate limiting

- Add audit trail for menu availability changes (#169)
- Implement optimistic locking for concurrent updates (#170)
- Add rate limiting to menu update endpoint (#171)
```

---

## Phase 7: PR #152 Follow-ups - Code Quality (1-2 hrs)

### Todo #173: Type System Redundancy [P2]

**File:** `todos/173-ready-p2-type-system-redundancy.md`

**Problem:** 4+ different `MenuItem` type definitions violate "types from shared only" principle.

**Solution:** Consolidate to single definition in `shared/types/menu.types.ts`.

---

### Todo #174: Missing React Memoization [P3]

**File:** `todos/174-ready-p3-missing-react-memoization.md`

**Problem:** `groupedItems` and `unavailableCount` recompute on every render.

**Solution:** Wrap in `useMemo`:

```typescript
const groupedItems = useMemo(() =>
  items.reduce(...), [items]
);
```

**Commit for Phase 7:**
```
refactor(types): consolidate MenuItem definitions and add memoization

- Single MenuItem type in shared/types (#173)
- Add useMemo for derived state in MenuManagement (#174)
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
2. **Check dependencies** - some todos depend on others (e.g., #173 depends on #165 which is now resolved)
3. **Run tests frequently** - after each file change if possible
4. **Use TodoWrite tool** to track progress within the session
5. **Snake_case convention** - all API/DB fields use snake_case (see CLAUDE.md)
6. **Multi-tenant isolation** - all queries must filter by `restaurant_id`

---

## Priority Matrix

| Immediate (P1) | Important (P2) | Nice-to-have (P3) |
|----------------|----------------|-------------------|
| #152 RBAC Split | #157 WebP Images | #161 Sold Out Visual |
| #153 macon-orange | #158 formatPrice | #174 React Memoization |
| #154 WCAG Contrast | #159 Name Collision | |
| #156 Sticky Filter | #160 Touch Targets | |
| | #166 DB Indexes | |
| | #167 Cache Invalidation | |
| | #168 Parallel API | |
| | #169 Audit Logging | |
| | #170 Race Condition | |
| | #171 Rate Limiting | |
| | #172 Client Cache | |
| | #173 Type Consolidation | |

---

## Open GitHub Issues

| Issue | Title | Impact |
|-------|-------|--------|
| #142 | Database Schema Drift | Investigate before DB migrations in Phase 5 |
