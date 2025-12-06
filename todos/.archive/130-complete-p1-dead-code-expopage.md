---
status: complete
priority: p1
issue_id: "130"
tags: [code-review, architecture, dead-code, cleanup]
dependencies: []
---

# TODO-130: ExpoPage.tsx is orphaned dead code

## Problem Statement

`ExpoPage.tsx` (289 lines) still exists but is no longer routed after the Kitchen/Expo tab consolidation. The `/expo` route now redirects to `/kitchen`, making this file dead code that:
- Confuses developers about which component is used
- Creates maintenance burden (developers may edit wrong file)
- Contains duplicate `ReadyOrderCard` component (185 lines overlap with ExpoTabContent)
- Still exported in `LazyRoutes.tsx` (wasting bundle potential)

## Findings

### Evidence
1. **AppRoutes.tsx:164** - Route redirects, doesn't render ExpoPage:
   ```typescript
   <Route path="/expo" element={<Navigate to="/kitchen" replace />} />
   ```

2. **LazyRoutes.tsx:34-36** - Still exports unused component:
   ```typescript
   ExpoPage: lazy(() =>
     import(/* webpackChunkName: "expo" */ '@/pages/ExpoPage')
   ),
   ```

3. **Duplicate ReadyOrderCard** - Nearly identical implementations:
   - `ExpoPage.tsx:20-124` (105 lines)
   - `ExpoTabContent.tsx:16-101` (86 lines)

### Impact
- 289 lines of unmaintained code
- Potential for confusion and wasted effort
- Technical debt accumulation

## Proposed Solutions

### Solution 1: Delete ExpoPage.tsx entirely (Recommended)
Remove the file since ExpoTabContent serves the same purpose.

**Pros:** Clean codebase, no confusion
**Cons:** Loses memory monitoring code (lines 140-170)
**Effort:** Small
**Risk:** Low (functionality preserved in ExpoTabContent)

### Solution 2: Extract shared ReadyOrderCard first, then delete
Create shared component before removing duplicates.

**Pros:** Cleaner extraction, reusable component
**Cons:** More work
**Effort:** Medium
**Risk:** Low

### Solution 3: Archive with deprecation notice
Move to `archive/` folder with clear comment.

**Pros:** Preserves history for reference
**Cons:** Still clutters codebase
**Effort:** Small
**Risk:** Low

## Recommended Action
<!-- To be filled during triage -->

## Technical Details

**Affected Files:**
- `client/src/pages/ExpoPage.tsx` - DELETE
- `client/src/routes/LazyRoutes.tsx:34-36` - Remove export
- `client/src/components/kitchen/ReadyOrderCard.tsx` - CREATE (extract shared component)

**Memory Monitoring Code to Consider:**
ExpoPage has memory monitoring (lines 140-170) that ExpoTabContent doesn't. Consider if this should be added to KitchenDisplayOptimized for long expo sessions.

## Acceptance Criteria

- [x] ExpoPage.tsx deleted or archived
- [x] LazyRoutes.tsx no longer exports ExpoPage
- [ ] ReadyOrderCard extracted to shared component (optional - not needed)
- [x] No broken imports
- [x] Tests still pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Identified orphaned file after route consolidation |
| 2025-12-03 | Verified completion | File already deleted, LazyRoutes clean, no broken imports, type check passes |

## Resources

- PR: Current uncommitted changes
- New component: `client/src/components/kitchen/ExpoTabContent.tsx`
