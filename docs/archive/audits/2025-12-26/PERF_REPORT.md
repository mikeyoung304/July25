# Performance Analysis Report - rebuild-6.0

**Generated:** 2025-12-26
**Agent:** C3 - Performance & Runtime Efficiency
**Scope:** Server services, API routes, React hooks, components, database indexes

---

## Executive Summary

| Category | P1 (Critical) | P2 (Moderate) | P3 (Low) | Quick Wins |
|----------|--------------|---------------|----------|------------|
| N+1 Queries | 0 | 2 | 1 | 1 |
| Missing Indexes | 0 | 1 | 0 | 1 |
| Unbounded Queries | 0 | 3 | 2 | 3 |
| Memory Patterns | 0 | 0 | 2 | 0 |
| Re-render Issues | 0 | 1 | 2 | 2 |
| Bundle Size | 0 | 0 | 1 | 0 |
| Missing Caching | 0 | 1 | 1 | 1 |

**Overall Assessment:** The codebase demonstrates mature performance patterns with proper memoization, virtualization, and caching. Most issues are P2/P3 optimization opportunities rather than critical problems.

---

## Detailed Findings

### [server/src/services/orders.service.ts:168-177] - Sequential Async in Map

- **Category**: Potential N+1
- **Severity**: P3
- **Impact**: Sequential menu ID mapping for each order item. Currently uses placeholder ID passthrough.
- **Evidence**:
```typescript
const itemsWithUuids = await Promise.all(
  orderData.items.map(async (item) => {
    const uuid = item.id; // Placeholder - using original ID for now
    // ...
  })
);
```
- **Quick Win**: NO (placeholder code)
- **Fix**: If menu ID mapping is implemented, ensure batch lookup rather than per-item queries
- **Verification**: Monitor SQL query count per order creation

---

### [server/src/services/orders.service.ts:726-738] - Unbounded Count Query

- **Category**: Unbounded Query
- **Severity**: P2
- **Impact**: Daily order count query without index optimization. Grows with order volume.
- **Evidence**:
```typescript
const { count, error } = await supabase
  .from('orders')
  .select('*', { count: 'exact', head: true })
  .eq('restaurant_id', restaurantId)
  .gte('created_at', startOfDay.toISOString());
```
- **Quick Win**: YES
- **Fix**: Add composite index `(restaurant_id, created_at)` for efficient counting
- **Verification**: `EXPLAIN ANALYZE` on count query, target < 10ms

---

### [server/src/services/scheduledOrders.service.ts:37-44] - Missing LIMIT on Scheduled Orders

- **Category**: Unbounded Query
- **Severity**: P2
- **Impact**: Fetches ALL scheduled orders for restaurant without pagination
- **Evidence**:
```typescript
const { data: ordersToFire, error } = await supabase
  .from('orders')
  .select('*')
  .eq('restaurant_id', restaurantId)
  .eq('is_scheduled', true)
  // No LIMIT clause
```
- **Quick Win**: YES
- **Fix**: Add `.limit(100)` and process in batches if more exist
- **Verification**: Monitor query execution time under load

---

### [server/src/services/table.service.ts:67-73] - Unbounded Orders Query

- **Category**: Unbounded Query
- **Severity**: P2
- **Impact**: Fetches ALL non-cancelled orders for a table to check payment status
- **Evidence**:
```typescript
const { data: orders, error: ordersError } = await supabase
  .from('orders')
  .select('id, payment_status, status, table_number')
  .eq('restaurant_id', restaurantId)
  .eq('table_number', table.label)
  .neq('status', 'cancelled'); // No LIMIT
```
- **Quick Win**: YES
- **Fix**: Add `.limit(50)` or filter by recent date range
- **Verification**: Count returned rows in production logs

---

### [server/src/services/menu.service.ts:41-56] - SELECT * in Menu Queries

- **Category**: Over-fetching
- **Severity**: P3
- **Impact**: Fetches all columns including potentially large `description`, `image_url` fields when not needed
- **Evidence**: Multiple `.select('*')` calls throughout menu service
- **Quick Win**: NO (would require mapper updates)
- **Fix**: Specify exact columns needed per query
- **Verification**: Compare payload sizes before/after

---

### [server/src/services/payment.service.ts:39-76] - Duplicate Tax Rate Fetch

- **Category**: Missing Caching / N+1 Pattern
- **Severity**: P2
- **Impact**: Tax rate queried separately in PaymentService and OrdersService for same order
- **Evidence**:
```typescript
// PaymentService.getRestaurantTaxRate() - line 39
// OrdersService.getRestaurantTaxRate() - line 87
// Both fetch from restaurants table
```
- **Quick Win**: YES
- **Fix**: Add short-lived cache (5-10s) for restaurant config or pass tax rate through order object
- **Verification**: Reduce DB queries per payment from 3 to 2

---

### [supabase/migrations/] - Missing Orders Index

- **Category**: Missing Index
- **Severity**: P2
- **Impact**: Orders queries filter on `(restaurant_id, status)` and `(restaurant_id, created_at)` frequently
- **Evidence**: No composite index found for common order query patterns. Menu indexes added in 20251204_menu_composite_indexes.sql but orders table not covered.
- **Quick Win**: YES
- **Fix**: Create migration:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_status
  ON orders (restaurant_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_created
  ON orders (restaurant_id, created_at DESC);
```
- **Verification**: `EXPLAIN ANALYZE` on getOrders query

---

### [client/src/components/kitchen/OrderCard.tsx:31-46] - Date.now() in useMemo

- **Category**: Re-render / Stale Calculation
- **Severity**: P3
- **Impact**: Elapsed time only updates when `order.created_at` changes. Timer appears frozen between renders.
- **Evidence**:
```typescript
const { elapsedMinutes, urgencyColor, urgencyAccent } = useMemo(() => {
  const created = new Date(order.created_at)
  const now = new Date() // Only calculated on dependency change
  // ...
}, [order.created_at])
```
- **Quick Win**: NO (intentional - parent VirtualizedOrderGrid handles refresh)
- **Fix**: Already fixed in ElapsedTimer component with setInterval pattern. OrderCard relies on parent re-render.
- **Verification**: Visual inspection of elapsed time updates

---

### [client/src/components/shared/MenuItemGrid.tsx:44-116] - Missing React.memo

- **Category**: Re-render
- **Severity**: P2
- **Impact**: MenuGridCard re-renders on any parent state change even with unchanged props
- **Evidence**:
```typescript
export const MenuGridCard: React.FC<MenuGridCardProps> = ({
  // ... no React.memo wrapper
```
- **Quick Win**: YES
- **Fix**: Wrap with `React.memo`:
```typescript
export const MenuGridCard = React.memo(({ item, onClick, ... }) => {
  // component body
});
```
- **Verification**: React DevTools highlight updates, measure render count

---

### [client/src/components/shared/MenuItemGrid.tsx:119-207] - Filter on Every Render

- **Category**: Re-render
- **Severity**: P3
- **Impact**: Category filtering runs on every parent render even with unchanged items
- **Evidence**:
```typescript
const filteredItems = selectedCategory
  ? items.filter((item) => item.category_id === selectedCategory)
  : items;
```
- **Quick Win**: YES
- **Fix**: Wrap in useMemo:
```typescript
const filteredItems = useMemo(() =>
  selectedCategory
    ? items.filter((item) => item.category_id === selectedCategory)
    : items,
  [items, selectedCategory]
);
```
- **Verification**: React DevTools profiler

---

### [client/src/hooks/useKitchenOrdersRealtime.ts:30-48] - Empty Dependencies for loadOrders

- **Category**: Re-render / Memory
- **Severity**: P3
- **Impact**: Intentional but creates stale closure if order service methods change. Well-documented with eslint-disable.
- **Evidence**:
```typescript
const loadOrders = useCallback(async () => {
  // ...
}, []) // Empty deps - stable reference
```
- **Quick Win**: NO (intentional pattern)
- **Fix**: N/A - documented design decision
- **Verification**: Ensure orderService is singleton

---

### [client/src/components/ui/*.tsx] - Namespace Import Pattern

- **Category**: Bundle Size
- **Severity**: P3
- **Impact**: `import * as React from 'react'` includes entire React namespace. Minor impact with modern bundlers.
- **Evidence**: Multiple UI components use namespace import
```typescript
import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
```
- **Quick Win**: NO (standard shadcn/ui pattern, tree-shaken in production)
- **Fix**: Convert to named imports if bundle analysis shows benefit
- **Verification**: `npm run build && npx source-map-explorer dist/assets/*.js`

---

### [client/src/services/http/httpClient.ts:46-52] - Static Cache TTL Config

- **Category**: Missing Caching
- **Severity**: P3
- **Impact**: Tables endpoint has TTL of 0 (no caching) which is appropriate for real-time but could use stale-while-revalidate
- **Evidence**:
```typescript
const CACHE_TTL: Record<string, number> = {
  '/api/v1/tables': 0,  // No caching for tables
```
- **Quick Win**: NO (intentional for real-time)
- **Fix**: Consider SWR pattern with 5s stale threshold for floor plan view
- **Verification**: Monitor API call frequency in production

---

## Positive Patterns Found

### Well-Implemented Performance Patterns

1. **VirtualizedOrderGrid** (`client/src/components/kitchen/VirtualizedOrderGrid.tsx`)
   - Uses `react-window` for virtualized rendering
   - Proper `useMemo` for itemData
   - Handles dynamic column count

2. **OrderCard Memoization** (`client/src/components/kitchen/OrderCard.tsx:159-163`)
   - Custom `React.memo` comparison function
   - Only re-renders on meaningful prop changes

3. **ResponseCache with LRU** (`client/src/services/cache/ResponseCache.ts`)
   - Proper TTL-based expiration
   - LRU eviction when max size reached
   - Cleanup interval properly cleared

4. **Menu Service Caching** (`server/src/services/menu.service.ts:10`)
   - NodeCache with configurable TTL
   - O(1) targeted cache invalidation

5. **Composite Indexes** (`supabase/migrations/20251204_menu_composite_indexes.sql`)
   - Partial indexes for active items
   - Covers common query patterns

6. **Timer Cleanup Patterns** (Multiple files)
   - Consistent `clearInterval` in useEffect cleanup
   - Refs used to prevent stale closures

7. **Stats Single-Pass Calculation** (`client/src/pages/hooks/useServerView.ts:164-193`)
   - O(n) reduce instead of O(7n) multiple filters
   - Properly memoized with useMemo

---

## Quick Wins Summary

| Priority | File | Fix | Effort |
|----------|------|-----|--------|
| 1 | supabase/migrations/ | Add orders composite indexes | 30 min |
| 2 | table.service.ts:67 | Add LIMIT to orders query | 5 min |
| 3 | scheduledOrders.service.ts:37 | Add LIMIT and batch processing | 15 min |
| 4 | orders.service.ts:726 | Add index for created_at filtering | 30 min |
| 5 | MenuItemGrid.tsx | Add useMemo for filteredItems | 5 min |
| 6 | MenuItemGrid.tsx | Wrap MenuGridCard in React.memo | 5 min |
| 7 | payment.service.ts | Cache restaurant tax rate | 20 min |

---

## Metrics to Track

1. **API Response Times** (P95, P99)
   - `/api/v1/orders` GET - target < 100ms
   - `/api/v1/menu` GET - target < 50ms (cached)
   - `/api/v1/payments/create-payment-intent` POST - target < 500ms

2. **Database Query Performance**
   - Orders count query - target < 10ms
   - Orders list with filters - target < 50ms
   - Menu fetch - target < 20ms

3. **Client Metrics**
   - First Contentful Paint (FCP) - target < 1.5s
   - Largest Contentful Paint (LCP) - target < 2.5s
   - Total Blocking Time (TBT) - target < 200ms
   - Kitchen Display render time - target < 16ms (60fps)

4. **Memory**
   - Server heap usage - target < 512MB
   - Client heap usage - target < 100MB
   - WebSocket connection pool - monitor for leaks

---

## Conclusion

The codebase demonstrates solid performance engineering with proper use of:
- React virtualization for large lists
- Server-side caching with NodeCache
- Client-side caching with LRU eviction
- Proper cleanup of timers and subscriptions
- Composite database indexes for common queries

The identified issues are optimization opportunities (P2/P3) rather than critical problems. The quick wins can be implemented incrementally with low risk.

**Recommended Priority:**
1. Add orders table indexes (highest impact for KDS performance)
2. Add LIMIT clauses to unbounded queries (safety improvement)
3. Memoize MenuItemGrid components (customer-facing UX)
4. Cache restaurant configuration (reduce DB round-trips)
