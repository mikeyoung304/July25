---
status: complete
priority: p2
issue_id: "135"
tags: [code-review, architecture, ux, routing]
dependencies: []
---

# TODO-135: Tab state not persisted in URL

## Problem Statement

The `stationTab` state is stored only in React component state. Refreshing the page always returns to 'kitchen' tab, breaking:
- Direct linking to expo station
- Browser back/forward navigation
- Bookmarking preferred view
- Expo role users always seeing kitchen first

## Findings

### Current Implementation (KitchenDisplayOptimized.tsx:48)
```typescript
const [stationTab, setStationTab] = useState<StationTab>('kitchen')
```

### /expo redirect also loses context (AppRoutes.tsx:164)
```typescript
<Route path="/expo" element={<Navigate to="/kitchen" replace />} />
// Should be: <Navigate to="/kitchen?tab=expo" replace />
```

## Proposed Solutions

### Solution 1: Use URL search params (Recommended)
**Effort:** Medium | **Risk:** Low

```typescript
import { useSearchParams } from 'react-router-dom'

const [searchParams, setSearchParams] = useSearchParams()
const stationTab = (searchParams.get('tab') as StationTab) || 'kitchen'

const handleTabChange = (tab: StationTab) => {
  setSearchParams({ tab })
}
```

### Solution 2: Role-based default tab
Auto-select based on user role.

**Effort:** Small | **Risk:** Low

## Technical Details

**Affected Files:**
- `client/src/pages/KitchenDisplayOptimized.tsx:48`
- `client/src/components/layout/AppRoutes.tsx:164`
- Multiple navigation references to `/expo`

## Acceptance Criteria

- [x] Tab state reflected in URL (`?tab=expo`)
- [x] /expo redirects to /kitchen?tab=expo
- [x] Browser back/forward works
- [x] Refresh preserves tab
- [ ] Expo role defaults to expo tab (deferred - not required for core fix)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Architecture improvement identified |
| 2025-12-02 | Implemented URL search params solution | Used `useSearchParams` hook with `replace: true` option to prevent polluting browser history |
