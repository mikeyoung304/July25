# TODO: Unused State Variables in ExpoPage

**Status**: pending
**Priority**: p3
**Category**: cleanup
**Created**: 2025-12-02

## Problem

State variables `_viewMode` and `_showFilters` are declared in ExpoPage.tsx but never used. This is dead code that confuses readers and suggests incomplete features.

## Location

- **File**: `client/src/pages/ExpoPage.tsx`
- **Lines**: 137-139

## Current Code

```typescript
const [_viewMode, _setViewMode] = useState<'grid' | 'list'>('grid');
const [_showFilters, _setShowFilters] = useState(false);
```

## Analysis

These variables are:
1. Never read anywhere in the component
2. Never passed to child components
3. Prefixed with underscore (linter suppression)
4. Suggest planned but unimplemented features

## Possible Actions

### Option 1: Remove (Recommended)
If these features aren't planned, simply remove:

```typescript
// Delete lines 137-139
```

### Option 2: Implement the Features
If view mode and filters are desired:

```typescript
// Remove underscore prefix
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
const [showFilters, setShowFilters] = useState(false);

// Add UI controls
<div className="expo-toolbar">
  <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
    {viewMode === 'grid' ? 'List View' : 'Grid View'}
  </button>
  <button onClick={() => setShowFilters(!showFilters)}>
    {showFilters ? 'Hide Filters' : 'Show Filters'}
  </button>
</div>

{showFilters && <FilterPanel {...filterProps} />}

<div className={`expo-orders expo-orders--${viewMode}`}>
  {/* Conditional rendering based on viewMode */}
</div>
```

### Option 3: Keep for Future Use
Add TODO comment:

```typescript
// TODO: Implement view mode toggle and filter panel
// const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
// const [showFilters, setShowFilters] = useState(false);
```

## Recommendation

**Remove the variables** unless there's a concrete plan to implement these features soon. If needed later, they're easy to add back.

## Testing

1. Verify ExpoPage still renders correctly
2. Run typecheck: `npm run typecheck:quick`
3. Run client tests: `npm run test:client`

## Effort

~5 minutes (remove lines, test)
