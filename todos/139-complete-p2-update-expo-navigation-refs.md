---
status: resolved
priority: p2
issue_id: "139"
tags: [code-review, architecture, routing, navigation]
dependencies: ["135"]
---

# TODO-139: Multiple navigation references still point to /expo

## Problem Statement

Multiple files have hardcoded `/expo` references that now redirect to `/kitchen` without the expo tab context. Users clicking these links end up on kitchen tab instead of expo tab.

## Findings

### Files with /expo references
1. `HomePage.tsx:81` - navigation card href
2. `Dashboard.tsx:81` - quick access link
3. `StationLogin.tsx:30` - default route for expo station
4. `demoCredentials.ts:47` - expo role route
5. `BrandHeaderPresets.ts:28` - header config
6. `orderUpdates.ts:211` - notification check

## Solution Implemented

Updated all navigation references to use `/kitchen?tab=expo`:
- **HomePage.tsx**: Updated Expo navigation card href to `/kitchen?tab=expo`
- **Dashboard.tsx**: Updated Expo dashboard card href to `/kitchen?tab=expo`
- **StationLogin.tsx**: Updated expo station default route to `/kitchen?tab=expo`
- **demoCredentials.ts**: Updated expo workspace route to `/kitchen?tab=expo`
- **BrandHeaderPresets.ts**: Added new entry for `/kitchen?tab=expo` while preserving `/expo` for redirect compatibility
- **orderUpdates.ts**: Updated notification check to use `window.location.search.includes('tab=expo')` instead of pathname check

## Technical Details

**Affected Files:**
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/HomePage.tsx`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/Dashboard.tsx`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/StationLogin.tsx`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/config/demoCredentials.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/layout/BrandHeaderPresets.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/websocket/orderUpdates.ts`

**Note:** The `/expo` redirect in `AppRoutes.tsx` was already updated in TODO-135 and remains unchanged.

## Acceptance Criteria

- [x] All /expo references updated to /kitchen?tab=expo
- [x] Expo station login goes to expo tab
- [x] Demo credentials route to correct tab
- [x] Navigation links work correctly
- [x] Typecheck passes without errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Architecture drift identified |
| 2025-12-02 | Resolved - updated all references | Query params need different detection logic (search vs pathname) |
