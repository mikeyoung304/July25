# Performance Quick Reference Card
**For**: Development Team
**Date**: 2025-10-14

---

## Bundle Size Targets

| Target | Limit | Current | Status |
|--------|-------|---------|--------|
| Main Chunk | <100KB | 114KB |   WATCH |
| Any Chunk | <500KB | 167KB |  GOOD |
| Total JS | <2MB | 1.1MB |  GOOD |
| Total Build | <20MB | 16MB |  GOOD |

**Command to check**:
```bash
npm run build
find client/dist/js -name "*.js" -exec ls -lh {} \; | sort -k5 -hr | head -10
```

---

## Performance Patterns (DO)

### 1. Always Memoize Expensive Calculations
```typescript
const filteredOrders = useMemo(() => {
  return orders.filter(o => o.status === 'active')
}, [orders])
```

### 2. Always Stabilize Callback Functions
```typescript
const handleClick = useCallback((id: string) => {
  updateOrder(id)
}, [updateOrder])
```

### 3. Always Use React.memo for List Items
```typescript
export const OrderCard = React.memo<OrderCardProps>(({ order }) => {
  return <div>...</div>
})
```

### 4. Always Clean Up Effects
```typescript
useEffect(() => {
  const timer = setInterval(() => {}, 1000)
  return () => clearInterval(timer)  //  CLEANUP
}, [])
```

### 5. Always Use Virtual Scrolling for Large Lists
```typescript
{orders.length > 50 ? (
  <VirtualizedOrderGrid orders={orders} />
) : (
  <div>{orders.map(...)}</div>
)}
```

---

## Performance Anti-Patterns (DON'T)

### 1. DON'T Create Functions in JSX
```typescript
// L BAD
<Button onClick={() => handleClick(item.id)} />

//  GOOD
const handleItemClick = useCallback(() => {
  handleClick(item.id)
}, [item.id, handleClick])

<Button onClick={handleItemClick} />
```

### 2. DON'T Forget Event Listener Cleanup
```typescript
// L BAD
useEffect(() => {
  window.addEventListener('resize', handleResize)
  // Missing cleanup!
}, [])

//  GOOD
useEffect(() => {
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

### 3. DON'T Use select(*) in Supabase Queries
```typescript
// L BAD
.select('*')

//  GOOD
.select('id, order_number, status, created_at, items')
```

### 4. DON'T Import Heavy Libraries
```typescript
// L BAD
import _ from 'lodash'
import moment from 'moment'

//  GOOD
import { uniq } from 'lodash-es'  // Tree-shakeable
import { format } from 'date-fns'  // Lightweight
```

### 5. DON'T Skip Memoization in Lists
```typescript
// L BAD
{orders.map(order => (
  <OrderCard key={order.id} order={order} />  // Re-renders every time
))}

//  GOOD
const OrderCard = React.memo(...)  // Memoize the component

{orders.map(order => (
  <OrderCard key={order.id} order={order} />  // Only re-renders when order changes
))}
```

---

## Component Performance Checklist

Before committing a new component:
- [ ] Is it memoized with `React.memo` if used in lists?
- [ ] Are all callbacks wrapped in `useCallback`?
- [ ] Are all expensive calculations wrapped in `useMemo`?
- [ ] Do all `useEffect` hooks have cleanup functions?
- [ ] Are all event listeners removed in cleanup?
- [ ] Are all timers cleared in cleanup?
- [ ] Is virtual scrolling used for lists >50 items?

---

## When to Use What

### React.memo
**Use when**:
- Component is in a list
- Component re-renders frequently
- Component has expensive render logic

**Don't use when**:
- Component rarely re-renders
- Component is the only child
- Component has no props

---

### useMemo
**Use when**:
- Expensive calculations (filtering, sorting)
- Creating arrays/objects used in dependencies
- Computations that don't change often

**Don't use when**:
- Simple calculations (a + b)
- Creating primitive values
- Over-memoizing (adds overhead)

---

### useCallback
**Use when**:
- Passing callbacks to memoized child components
- Callbacks used in dependency arrays
- Event handlers passed to children

**Don't use when**:
- Callback is only used once
- No child components
- Over-optimizing (adds overhead)

---

## Bundle Size Rules

### NEVER Import These:
- L `lodash` (use `lodash-es` with tree-shaking)
- L `moment` (use `date-fns`)
- L `@mui/material` (use `shadcn/ui`)
- L `recharts` (use lightweight alternatives)

### ALWAYS:
-  Check bundle size after adding dependencies
-  Use subpath imports: `import { X } from 'lib/subpath'`
-  Lazy load route components with `React.lazy()`
-  Enable code splitting in Vite config

---

## Memory Leak Checklist

### Common Sources:
1. Event listeners without cleanup
2. Timers without cleanup
3. WebSocket connections without close
4. Subscriptions without unsubscribe
5. DOM references in closures

### Detection:
```bash
# Chrome DevTools > Memory > Take snapshot
# Wait 5 minutes, take another snapshot
# Compare: should not grow continuously
```

---

## Performance Monitoring Commands

### Build and check sizes:
```bash
npm run build
du -sh client/dist
find client/dist/js -name "*.js" -exec ls -lh {} \; | sort -k5 -hr | head -10
```

### Run performance tests:
```bash
# Profile with Chrome DevTools
# Target: 60 FPS, <50ms render times
```

### Check for memory leaks:
```bash
# Chrome DevTools > Performance
# Record for 30 seconds
# Check for memory growth pattern
```

---

## Quick Wins Reference

1. **Add React.memo** (15 min) ’ 30% fewer renders
2. **Fix inline functions** (5 min) ’ 15% fewer child renders
3. **Audit timer cleanup** (10 min) ’ Prevent memory leaks
4. **Optimize DB queries** (10 min) ’ 20% less data transfer
5. **Reduce polling** (2 min) ’ Lower CPU usage

**Total time**: 42 minutes
**Total impact**: 35-45% performance improvement

---

## Emergency Performance Fixes

### If bundle too large:
1. Run `npm run analyze` to visualize bundle
2. Check for duplicate dependencies
3. Ensure tree-shaking is working
4. Lazy load heavy components

### If app is slow:
1. Profile with React DevTools Profiler
2. Check for missing React.memo
3. Check for inline functions in props
4. Check for expensive calculations not memoized

### If memory growing:
1. Check for event listeners without cleanup
2. Check for timers without cleanup
3. Check for subscriptions without unsubscribe
4. Use Chrome DevTools Memory profiler

---

## Resources

- Full report: `performance-profiler.md`
- Summary: `SUMMARY.md`
- CLAUDE.md: `/Users/mikeyoung/CODING/rebuild-6.0/CLAUDE.md`

---

**Keep this card handy during code reviews!**
