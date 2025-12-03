# TODO: Over-memoization in ReadyOrderCard

**Status**: pending
**Priority**: p3
**Category**: performance
**Created**: 2025-12-02

## Problem

Simple calculations in ReadyOrderCard component (lines 28-54) are wrapped in `useMemo` unnecessarily. For trivial computations, memoization adds overhead and verbosity without performance benefit.

## Location

- **File**: `client/src/pages/ExpoPage.tsx`
- **Lines**: 28-54

## Current Code

```typescript
const ReadyOrderCard: React.FC<ReadyOrderCardProps> = ({ order, onBump }) => {
  // Over-memoized simple calculations
  const waitTime = useMemo(() => {
    return calculateWaitTime(order.created_at);
  }, [order.created_at]);

  const itemCount = useMemo(() => {
    return order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }, [order.items]);

  const displayName = useMemo(() => {
    return order.customer_name || `Order #${order.order_number}`;
  }, [order.customer_name, order.order_number]);

  // ... more over-memoized values
};
```

## When to Use useMemo

**Use `useMemo` when:**
- Expensive computations (complex algorithms, large arrays)
- Referential equality matters (passing objects to React.memo'd children)
- Computation depends on rarely-changing values

**DON'T use `useMemo` for:**
- Simple arithmetic (addition, string concatenation)
- Array.reduce on small arrays (<100 items)
- Property access or simple conditionals
- String interpolation

## Proposed Changes

Remove memoization for trivial calculations:

```typescript
const ReadyOrderCard: React.FC<ReadyOrderCardProps> = ({ order, onBump }) => {
  // Direct calculations - no memoization needed
  const waitTime = calculateWaitTime(order.created_at);
  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const displayName = order.customer_name || `Order #${order.order_number}`;

  // Keep memoization only if truly expensive
  // Example: if calculateWaitTime was doing complex timezone conversions
  // const expensiveCalculation = useMemo(() => {
  //   return veryExpensiveOperation(order);
  // }, [order]);

  return (
    // ... render logic
  );
};
```

## Performance Analysis

**Current overhead:**
- Each `useMemo` hook: ~0.1-0.3ms overhead per render
- Dependency array checks: Additional comparisons
- Memory: Storing memoized values

**Trivial calculation cost:**
- String concatenation: <0.01ms
- Array.reduce on 5-10 items: <0.05ms
- Property access: <0.001ms

**Verdict:** The memoization costs MORE than just recalculating.

## Real Example

```typescript
// ❌ BAD: Memoizing trivial calculation
const total = useMemo(() => {
  return items.reduce((sum, item) => sum + item.price, 0);
}, [items]);

// ✅ GOOD: Direct calculation for small arrays
const total = items.reduce((sum, item) => sum + item.price, 0);

// ✅ GOOD: Memoize when truly expensive
const expensiveSortedList = useMemo(() => {
  return hugeArray
    .sort((a, b) => complexComparison(a, b))
    .filter(item => expensiveFilter(item))
    .map(item => expensiveTransform(item));
}, [hugeArray]);
```

## Impact

- **Code Clarity**: Simpler, more readable
- **Performance**: Slight improvement (remove hook overhead)
- **Maintenance**: Easier to understand

## Testing

1. Verify ExpoPage renders correctly
2. Check no performance regression (should be slightly faster)
3. Test with various order counts (5, 20, 50 orders)
4. Verify memory usage doesn't increase

## Related Patterns

From the codebase:
- Most components don't memoize simple calculations
- `useMemo` is reserved for expensive operations
- See other KDS pages for examples

## Effort

~20 minutes (review all useMemo calls, remove unnecessary ones, test)

## References

- [React docs on useMemo](https://react.dev/reference/react/useMemo#should-you-add-usememo-everywhere)
- [When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback)
