# Agent 5: Performance Profiler

**Priority**: MEDIUM
**Estimated Runtime**: 35-45 minutes
**Focus**: Performance bottlenecks, bundle size, and memory optimization

## Mission

Scan the codebase for performance issues including oversized bundles, memory leaks, inefficient re-renders, and slow operations. Based on recent commits ("fix(monitoring): disable analytics endpoint causing infinite load"), performance issues are impacting production.

## Why This Matters

Performance issues lead to:
- **Poor user experience** (slow loading, frozen UI)
- **Lost revenue** (users abandon slow apps)
- **Higher hosting costs** (inefficient resource usage)
- **Mobile degradation** (large bundles kill mobile UX)
- **Memory crashes** (leaks cause browser crashes)

Your CLAUDE.md specifies:
- Bundle size: main chunk <100KB
- Memory limit: 6GB dev, 12GB build
- Manual chunks MUST be enabled

## Scan Strategy

### 1. Bundle Size Analysis
**Target**: Build output, import statements

**Detection Steps**:
1. Run `npm run build` and analyze output
2. Check chunk sizes in dist/ directory
3. Flag chunks >500KB (too large)
4. Flag main chunk >100KB (exceeds limit)
5. Analyze which libraries contribute most to bundle size

**Example Analysis**:
```bash
# Run build and capture output
npm run build 2>&1 | tee build-output.txt

# Look for chunk sizes
dist/assets/index-abc123.js     450.23 kB  ← Good
dist/assets/vendor-def456.js    1,234.56 kB ← TOO LARGE!
dist/assets/charts-ghi789.js    678.90 kB  ← TOO LARGE!
```

**Common Culprits**:
- Lodash (import entire library instead of functions)
- Moment.js (use date-fns instead, 10x smaller)
- Material-UI (import entire library)
- Chart libraries (import all chart types)

### 2. Import Optimization
**Target Files**: `client/src/**/*.tsx`, `client/src/**/*.ts`

**Detection Steps**:
1. Grep for import statements
2. Flag imports of large libraries without tree-shaking:
   - `import _ from 'lodash'` (bad, imports everything)
   - `import * as _ from 'lodash'` (bad)
   - `import moment from 'moment'` (bad, use date-fns)
   - `import { Button } from '@mui/material'` (bad, import from subpath)
3. Suggest tree-shakeable alternatives

**Example Violation**:
```typescript
// ❌ VIOLATION - Importing entire lodash (24KB)
import _ from 'lodash';

function MyComponent() {
  const unique = _.uniq(items);  // Using one function, importing 24KB!
}

// ❌ VIOLATION - Importing entire moment (67KB!)
import moment from 'moment';

const formatted = moment(date).format('YYYY-MM-DD');

// ✅ CORRECT - Import only what you need
import { uniq } from 'lodash-es';  // Tree-shakeable, ~2KB

function MyComponent() {
  const unique = uniq(items);
}

// ✅ CORRECT - Use date-fns instead (6KB for format function)
import { format } from 'date-fns';

const formatted = format(date, 'yyyy-MM-dd');

// ✅ CORRECT - Import from subpath for MUI
import Button from '@mui/material/Button';  // Only Button code
```

### 3. React Re-render Detection
**Target Files**: `client/src/**/*.tsx`

**Detection Steps**:
1. Glob for React component files
2. Search for expensive components without optimization:
   - Components receiving object/array props
   - Missing React.memo on pure components
   - Inline function definitions in props
   - Creating new objects in render
3. Flag performance anti-patterns

**Example Violation**:
```typescript
// ❌ VIOLATION - Re-renders on every parent render
function ExpensiveList({ items }: { items: Item[] }) {
  // Expensive computation runs every render!
  const processed = items.map(item => complexTransform(item));

  return (
    <div>
      {processed.map(item => (
        <ExpensiveItem
          key={item.id}
          data={item}
          onClick={() => handleClick(item)}  // ← New function every render!
        />
      ))}
    </div>
  );
}

// ✅ CORRECT - Optimized with memo and useMemo
const ExpensiveList = React.memo(function ExpensiveList({ items }: { items: Item[] }) {
  // Memoize expensive computation
  const processed = useMemo(
    () => items.map(item => complexTransform(item)),
    [items]
  );

  // Memoize callback
  const handleClick = useCallback((item: Item) => {
    // Handle click
  }, []);

  return (
    <div>
      {processed.map(item => (
        <ExpensiveItem
          key={item.id}
          data={item}
          onClick={handleClick}
        />
      ))}
    </div>
  );
});
```

### 4. Memory Leak Detection
**Target Files**: `client/src/**/*.tsx`

**Detection Steps**:
1. Search for useEffect hooks
2. Flag patterns that leak memory:
   - Event listeners without cleanup
   - Timers (setInterval, setTimeout) without cleanup
   - Subscriptions without cleanup
   - Large data structures not cleared
3. Check for cleanup functions

**Example Violation**:
```typescript
// ❌ VIOLATION - Memory leak (no cleanup)
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // ← No cleanup! Listener stays active after unmount
}, []);

// ❌ VIOLATION - Timer leak
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  // ← No cleanup! Interval keeps running after unmount
}, []);

// ✅ CORRECT - Proper cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);  // ← Cleanup
  };
}, []);

// ✅ CORRECT - Timer cleanup
useEffect(() => {
  const interval = setInterval(fetchData, 5000);

  return () => {
    clearInterval(interval);  // ← Cleanup
  };
}, []);
```

### 5. Expensive Operation Detection
**Target Files**: `**/*.ts`, `**/*.tsx`

**Detection Steps**:
1. Search for potentially expensive operations:
   - Nested loops (O(n²) or worse)
   - Array methods in render (filter, map, sort without memo)
   - Deep object cloning
   - Regular expressions in hot paths
2. Flag operations that could be optimized

**Example Violation**:
```typescript
// ❌ VIOLATION - O(n²) nested loop
function findDuplicates(items: Item[]) {
  const duplicates: Item[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {  // ← O(n²)
      if (items[i].id === items[j].id) {
        duplicates.push(items[i]);
      }
    }
  }
  return duplicates;
}

// ❌ VIOLATION - Expensive operation in render
function OrderList({ orders }: { orders: Order[] }) {
  return (
    <div>
      {orders
        .sort((a, b) => b.created_at - a.created_at)  // ← Sorts on every render!
        .map(order => <OrderItem key={order.id} order={order} />)}
    </div>
  );
}

// ✅ CORRECT - O(n) with Set
function findDuplicates(items: Item[]) {
  const seen = new Set<string>();
  const duplicates: Item[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      duplicates.push(item);
    } else {
      seen.add(item.id);
    }
  }

  return duplicates;
}

// ✅ CORRECT - Memoize expensive operations
function OrderList({ orders }: { orders: Order[] }) {
  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => b.created_at - a.created_at),
    [orders]
  );

  return (
    <div>
      {sortedOrders.map(order => <OrderItem key={order.id} order={order} />)}
    </div>
  );
}
```

### 6. Database Query Optimization
**Target Files**: `server/src/**/*.ts`

**Detection Steps**:
1. Search for Supabase queries
2. Flag potential N+1 query problems:
   - Loops containing queries
   - Missing .select() optimization (selecting * when only need few fields)
   - Missing pagination on large datasets
3. Suggest optimization strategies

**Example Violation**:
```typescript
// ❌ VIOLATION - N+1 query problem
async function getOrdersWithItems(restaurantId: string) {
  const orders = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId);

  // ← This creates N queries (one per order)!
  for (const order of orders.data) {
    order.items = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);
  }

  return orders;
}

// ❌ VIOLATION - Selecting all fields when only need few
const orders = await supabase
  .from('orders')
  .select('*');  // ← Fetching all columns unnecessarily

// ✅ CORRECT - Single query with join
async function getOrdersWithItems(restaurantId: string) {
  const { data } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      order_items (
        id,
        quantity,
        menu_item_id
      )
    `)
    .eq('restaurant_id', restaurantId);

  return data;
}

// ✅ CORRECT - Select only needed fields
const orders = await supabase
  .from('orders')
  .select('id, status, customer_name, total_amount')
  .eq('restaurant_id', restaurantId);
```

### 7. Vite Configuration Review
**Target File**: `vite.config.ts`

**Detection Steps**:
1. Read vite.config.ts
2. Verify manual chunks are enabled
3. Check build.rollupOptions.output.manualChunks
4. Flag if manual chunks are disabled (CLAUDE.md says MUST be enabled)

**Expected Configuration**:
```typescript
// ✅ CORRECT - Manual chunks enabled
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'charts': ['recharts', 'chart.js']
        }
      }
    }
  }
});
```

## Detection Patterns

### Critical Issues (Severity: HIGH)
- [ ] Main bundle chunk >500KB
- [ ] Memory leak (missing cleanup in useEffect)
- [ ] N+1 query problem
- [ ] Infinite re-render loop

### Medium Issues (Severity: MEDIUM)
- [ ] Bundle chunk 100-500KB (could be smaller)
- [ ] Large library import (lodash, moment)
- [ ] Missing React.memo on expensive component
- [ ] Expensive operation in render

### Low Priority (Severity: LOW)
- [ ] Missing useMemo on moderate computations
- [ ] Selecting more fields than needed
- [ ] Minor import optimization opportunities

## Report Template

Generate report at: `/scans/reports/[timestamp]/performance-profiler.md`

```markdown
# Performance Profiler - Overnight Scan Report

**Generated**: [ISO timestamp]
**Scan Duration**: [time in minutes]
**Files Scanned**: [count]

## Executive Summary

[2-3 sentence overview of performance status]

**Total Performance Issues Found**: X
- HIGH: X (critical performance impact)
- MEDIUM: X (moderate optimization needed)
- LOW: X (minor improvements)

**Estimated Improvement**: -XKB bundle size, -Y% render time
**Fix Effort**: Z hours

## Bundle Analysis

### Current Bundle Sizes
```
dist/assets/index-abc123.js      78.45 kB  ✅ Under 100KB limit
dist/assets/vendor-def456.js    523.12 kB  ⚠️ Large vendor bundle
dist/assets/charts-ghi789.js    345.67 kB  ⚠️ Could be optimized
---
Total:                          947.24 kB
Gzipped:                        302.15 kB
```

### Bundle Size Target
- **Current**: 947KB (302KB gzipped)
- **Target**: <800KB (<250KB gzipped)
- **Potential Savings**: 147KB (-15%)

### Largest Dependencies
1. recharts: 234 KB ← Consider lazy loading
2. @mui/material: 189 KB ← Import from subpaths
3. lodash: 67 KB ← Use lodash-es and tree-shake
4. moment: 67 KB ← Replace with date-fns (6KB)

## High-Priority Issues

### 1. [File Path:Line] - Importing Entire Lodash
**Severity**: HIGH
**Impact**: +67KB to bundle

**Current Code**:
```typescript
import _ from 'lodash';
const unique = _.uniq(items);
```

**Recommended Fix**:
```typescript
import { uniq } from 'lodash-es';
const unique = uniq(items);
```

**Impact**: Save ~65KB
**Effort**: 5 minutes

[Repeat for each HIGH finding]

## Memory Leak Findings

### 1. [File Path:Line] - Event Listener Without Cleanup
**Severity**: HIGH
**Impact**: Memory leak on component unmount

**Current Code**:
```typescript
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);
```

**Fix**: Add cleanup function

**Effort**: 2 minutes

## Re-render Optimization

### Components Needing React.memo
1. OrderList.tsx:45 - Re-renders 50+ times per minute
2. MenuItem.tsx:23 - Re-renders on every parent update
3. CustomerInfo.tsx:67 - Pure component, should be memoized

### Inline Function Definitions (Performance Anti-pattern)
- Found X components creating new functions in render
- Recommend using useCallback

## Database Query Optimization

### N+1 Query Problems Found
1. server/src/routes/orders.ts:89 - Fetching items in loop
   - **Impact**: 50 orders = 50 queries (should be 1)
   - **Fix**: Use Supabase join syntax

### Over-fetching Data
1. server/src/routes/menu.ts:34 - Selecting all fields
   - **Currently**: Fetching 20 columns
   - **Needed**: Only 5 columns
   - **Savings**: 75% less data transfer

## Statistics

### Performance Issues by Type
- Bundle size: X issues
- Memory leaks: Y issues
- Re-render optimization: Z issues
- Database queries: W issues
- Expensive operations: V issues

### Most Problematic Files
1. client/src/pages/Dashboard.tsx - 5 performance issues
2. client/src/components/OrderList.tsx - 4 memory leaks
[etc.]

### Impact Distribution
```
HIGH:   ████████░░ 8 issues (fix first)
MEDIUM: ██████████ 12 issues (significant improvement)
LOW:    █████░░░░░ 6 issues (nice to have)
```

## Quick Wins (High Impact, Low Effort)

1. Replace moment with date-fns: -61KB, 10 minutes
2. Import lodash functions individually: -65KB, 15 minutes
3. Add React.memo to OrderList: -30% renders, 5 minutes
4. Fix N+1 query in orders route: -98% queries, 10 minutes

**Total Impact**: -126KB, faster renders, 98% fewer queries
**Total Effort**: 40 minutes

## Next Steps

### Immediate Actions (Today)
1. Fix HIGH severity issues (memory leaks)
2. Replace moment with date-fns
3. Fix N+1 query problems

### Short-term (This Week)
1. Optimize lodash imports
2. Add React.memo to identified components
3. Implement query pagination

### Long-term (This Sprint)
1. Set up bundle size monitoring
2. Add performance budgets to CI
3. Implement lazy loading for heavy routes
4. Add React DevTools profiling to workflows

## Recommended Optimizations

### 1. Lazy Loading for Routes
```typescript
// Instead of eager imports
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';

// Use lazy loading
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Orders = lazy(() => import('./pages/Orders'));

// Wrap in Suspense
<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/orders" element={<Orders />} />
  </Routes>
</Suspense>
```

### 2. Bundle Size Monitoring
```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "analyze": "vite-bundle-visualizer"
  }
}
```

### 3. Performance Budget
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep vendor chunks under 200KB each
        }
      }
    },
    chunkSizeWarningLimit: 500  // Warn if chunk >500KB
  }
});
```

## Validation Checklist

Before marking this scan as complete, verify:
- [ ] Build completed successfully
- [ ] Bundle sizes analyzed
- [ ] Import statements reviewed
- [ ] React components checked for optimization
- [ ] Memory leak patterns identified
- [ ] Database queries optimized
- [ ] File:line references are accurate
```

## Success Criteria

- [ ] Build completed and analyzed
- [ ] Bundle sizes documented
- [ ] All import statements reviewed
- [ ] React components checked for memo/useMemo
- [ ] useEffect cleanup verified
- [ ] Database queries analyzed
- [ ] Quick wins identified
- [ ] Performance budget recommendations provided

## Tools to Use

- **Bash**: Run `npm run build` and analyze output
- **Glob**: Find all component and route files
- **Grep**: Search for import statements, useEffect, queries
- **Read**: Examine vite.config.ts and suspect files

## Exclusions

Do NOT flag:
- Small utility libraries (<5KB)
- Components that genuinely need to re-render
- useEffect cleanup for mount-only effects that are safe
- Development-only dependencies

## End of Agent Definition
