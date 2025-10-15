# Agent 3: Race Condition Detective

**Priority**: HIGH
**Estimated Runtime**: 40-50 minutes
**Focus**: Async/await patterns and race condition detection

## Mission

Scan the codebase to identify race conditions, improper async/await usage, and concurrency bugs. Based on recent git commits ("fix(kds): resolve grid mode infinite loading due to race condition"), these bugs are actively causing production issues.

## Why This Matters

Recent commits show you're fighting:
- **Infinite loading states** (race conditions in KDS)
- **State update conflicts** (concurrent setState calls)
- **Unhandled promise rejections** (missing error handling)
- **WebSocket race conditions** (real-time updates conflicting)

These bugs are particularly nasty because:
- They're intermittent (timing-dependent)
- They're hard to reproduce
- They cause infinite loops and memory leaks
- They break user experience

## Scan Strategy

### 1. useEffect Race Conditions
**Target Files**: `client/src/**/*.tsx`, `client/src/**/*.ts`

**Detection Steps**:
1. Glob for all React component files
2. Grep for `useEffect` hooks
3. Analyze each useEffect for:
   - Missing dependencies in dependency array
   - setState calls without cleanup
   - Async operations without cancellation
   - Multiple setState calls in sequence (race condition)
4. Flag suspicious patterns

**Example Violation**:
```typescript
// ❌ CRITICAL VIOLATION - Race condition in useEffect
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  fetchData().then(result => {
    setData(result);      // ← Race: component might unmount before this
    setLoading(false);    // ← Race: setState after unmount
  });
}, []);  // ← Missing dependencies

// ✅ CORRECT - Proper cleanup and cancellation
useEffect(() => {
  let cancelled = false;

  setLoading(true);
  fetchData().then(result => {
    if (!cancelled) {      // ← Check if still mounted
      setData(result);
      setLoading(false);
    }
  }).catch(error => {
    if (!cancelled) {
      console.error(error);
      setLoading(false);
    }
  });

  return () => {
    cancelled = true;      // ← Cleanup function
  };
}, []);  // Dependencies correct (empty for mount-only)
```

### 2. Missing Await Detection
**Target Files**: `**/*.ts`, `**/*.tsx`

**Detection Steps**:
1. Grep for async functions
2. Analyze each async function for:
   - Promise-returning functions called without `await`
   - Promise chains without `.catch()`
   - Concurrent promises without `Promise.all()`
3. Flag missing awaits that could cause race conditions

**Example Violation**:
```typescript
// ❌ VIOLATION - Missing await
async function processOrder(orderId: string) {
  updateOrderStatus(orderId, 'processing');  // ← Should be await!
  const result = await chargePayment(orderId);
  updateOrderStatus(orderId, 'completed');   // ← Race: first update may not be done
  return result;
}

// ✅ CORRECT - Proper await
async function processOrder(orderId: string) {
  await updateOrderStatus(orderId, 'processing');
  const result = await chargePayment(orderId);
  await updateOrderStatus(orderId, 'completed');
  return result;
}
```

### 3. Promise.all Error Handling
**Target Files**: `**/*.ts`, `**/*.tsx`

**Detection Steps**:
1. Grep for `Promise.all`
2. Check each Promise.all for:
   - Missing error handling (.catch or try/catch)
   - Failing fast vs. allSettled (which is better?)
   - Race condition if promises modify shared state
3. Flag risky patterns

**Example Violation**:
```typescript
// ❌ VIOLATION - Promise.all without error handling
async function loadDashboard() {
  const [orders, menu, stats] = await Promise.all([
    fetchOrders(),
    fetchMenu(),
    fetchStats()
  ]);  // ← If any fails, all fail and crash!
  return { orders, menu, stats };
}

// ✅ CORRECT - Using allSettled for resilience
async function loadDashboard() {
  const results = await Promise.allSettled([
    fetchOrders(),
    fetchMenu(),
    fetchStats()
  ]);

  return {
    orders: results[0].status === 'fulfilled' ? results[0].value : [],
    menu: results[1].status === 'fulfilled' ? results[1].value : [],
    stats: results[2].status === 'fulfilled' ? results[2].value : {}
  };
}
```

### 4. WebSocket Race Conditions
**Target Files**: `client/src/**/*websocket*.ts`, `server/src/**/*websocket*.ts`

**Detection Steps**:
1. Glob for WebSocket-related files
2. Analyze event handlers for:
   - Multiple handlers modifying same state
   - No debouncing/throttling on high-frequency events
   - State updates without checking current state
   - Missing connection state checks
3. Flag concurrent update risks

**Example Violation**:
```typescript
// ❌ VIOLATION - WebSocket race condition
let orderCount = 0;

ws.on('new_order', (order) => {
  orderCount++;              // ← Race: multiple events could arrive concurrently
  setOrders([...orders, order]);  // ← Race: orders might be stale
});

ws.on('cancel_order', (orderId) => {
  orderCount--;              // ← Race: decrement could be lost
  setOrders(orders.filter(o => o.id !== orderId));  // ← Race: stale closure
});

// ✅ CORRECT - Functional updates
ws.on('new_order', (order) => {
  setOrderCount(prev => prev + 1);      // ← Atomic update
  setOrders(prev => [...prev, order]);  // ← Based on current state
});

ws.on('cancel_order', (orderId) => {
  setOrderCount(prev => prev - 1);
  setOrders(prev => prev.filter(o => o.id !== orderId));
});
```

### 5. State Update Sequences
**Target Files**: `client/src/**/*.tsx`

**Detection Steps**:
1. Search for multiple setState calls in sequence
2. Flag patterns where order matters (race condition risk)
3. Look for missing batching or functional updates

**Example Violation**:
```typescript
// ❌ VIOLATION - Sequential setState (race condition)
function submitOrder() {
  setLoading(true);
  setError(null);
  setSuccess(false);
  // ← These 3 updates might not happen in order!

  submitOrderAPI().then(() => {
    setLoading(false);   // ← More race conditions
    setSuccess(true);
  });
}

// ✅ CORRECT - Single state object or batched updates
function submitOrder() {
  setOrderState({
    loading: true,
    error: null,
    success: false
  });

  submitOrderAPI().then(() => {
    setOrderState({
      loading: false,
      error: null,
      success: true
    });
  });
}
```

### 6. Infinite Loop Detection
**Target Files**: `client/src/**/*.tsx`

**Detection Steps**:
1. Search for useEffect with object/array dependencies
2. Flag useEffect that creates new objects/arrays in dependency array
3. Look for useEffect that triggers itself

**Example Violation**:
```typescript
// ❌ CRITICAL VIOLATION - Infinite loop
useEffect(() => {
  fetchData();
}, [{ restaurant_id }]);  // ← New object every render = infinite loop!

useEffect(() => {
  setCount(count + 1);  // ← Infinite loop: causes re-render
}, [count]);             // ← which triggers this again!

// ✅ CORRECT - Primitive dependencies
useEffect(() => {
  fetchData();
}, [restaurant_id]);  // ← Primitive value, stable

useEffect(() => {
  setCount(prev => prev + 1);  // ← Run once
}, []);  // ← Empty array = mount only
```

## Detection Patterns

### Critical Violations (Severity: CRITICAL)
- [ ] Infinite loop in useEffect
- [ ] setState after component unmount (memory leak)
- [ ] WebSocket handler modifying shared state without atomicity
- [ ] Unhandled promise rejection in critical path

### High-Risk Patterns (Severity: HIGH)
- [ ] Missing await in async function
- [ ] useEffect with missing dependencies
- [ ] Promise.all without error handling
- [ ] Sequential setState calls that create race conditions

### Medium-Risk Patterns (Severity: MEDIUM)
- [ ] useEffect without cleanup function (potential leak)
- [ ] Object/array in dependency array (performance issue)
- [ ] Missing loading/error states

## Report Template

Generate report at: `/scans/reports/[timestamp]/race-condition-detective.md`

```markdown
# Race Condition Detective - Overnight Scan Report

**Generated**: [ISO timestamp]
**Scan Duration**: [time in minutes]
**Files Scanned**: [count]

## Executive Summary

[2-3 sentence overview of async/race condition issues]

**Total Issues Found**: X
- CRITICAL: X (infinite loops, memory leaks)
- HIGH: X (race conditions, missing await)
- MEDIUM: X (missing cleanup, performance)

**Estimated Fix Effort**: X hours
**Production Impact**: Y CRITICAL issues are likely causing bugs right now

## Critical Findings

### 1. [File Path:Line] - Infinite Loop in useEffect
**Severity**: CRITICAL
**Type**: Infinite Re-render
**Impact**: Page freezes, memory leak, poor UX

**Current Code**:
```typescript
useEffect(() => {
  fetchOrders();
}, [{ restaurant_id }]);  // ← New object every render!
```

**Recommended Fix**:
```typescript
useEffect(() => {
  fetchOrders();
}, [restaurant_id]);  // ← Use primitive value
```

**Effort**: 1 minute
**Testing**: Verify component doesn't re-render infinitely

[Repeat for each CRITICAL finding]

## High-Risk Findings

### 1. [File Path:Line] - Missing Await
**Severity**: HIGH
**Type**: Race Condition
**Impact**: Order status might update out of sequence

[Same format as above]

## Medium-Risk Findings

[Same format as above]

## Statistics

### Issue Distribution
- useEffect issues: X
- Missing await: Y
- Promise.all risks: Z
- WebSocket races: W
- State update races: V

### Most Problematic Files
1. client/src/pages/KitchenDisplay.tsx - 5 race conditions
2. client/src/components/OrderList.tsx - 3 infinite loops
[etc.]

### Patterns by Severity
```
CRITICAL: ████████░░ 8 issues (infinite loops, unmount bugs)
HIGH:     ███████████ 15 issues (missing await, race conditions)
MEDIUM:   ██████░░░░ 10 issues (missing cleanup)
```

## Common Patterns Found

### Pattern 1: setState After Unmount
Found in X files. Example:
```typescript
// Anti-pattern
useEffect(() => {
  fetchData().then(setData);  // ← Component might unmount
}, []);

// Fix
useEffect(() => {
  let cancelled = false;
  fetchData().then(data => !cancelled && setData(data));
  return () => { cancelled = true; };
}, []);
```

### Pattern 2: Missing Await
Found in Y files. Always await async operations in sequence.

## Next Steps

### Immediate Actions (Today)
1. Fix all CRITICAL infinite loops
2. Add cleanup to useEffect hooks with async operations
3. Review KitchenDisplay.tsx (5 issues)

### Short-term (This Week)
1. Fix HIGH severity missing awaits
2. Add error handling to Promise.all
3. Refactor WebSocket handlers for atomicity

### Long-term (This Sprint)
1. Add ESLint rules for useEffect dependencies
2. Implement useAsync custom hook for common pattern
3. Add race condition tests to critical flows

## Recommended Utilities

Create these custom hooks to prevent future issues:

```typescript
// useAsync - Handles cleanup automatically
function useAsync<T>(asyncFn: () => Promise<T>, deps: any[]) {
  const [state, setState] = useState<{
    loading: boolean;
    data: T | null;
    error: Error | null;
  }>({ loading: true, data: null, error: null });

  useEffect(() => {
    let cancelled = false;

    asyncFn()
      .then(data => !cancelled && setState({ loading: false, data, error: null }))
      .catch(error => !cancelled && setState({ loading: false, data: null, error }));

    return () => { cancelled = true; };
  }, deps);

  return state;
}

// useWebSocket - Handles cleanup and race conditions
function useWebSocket(url: string) {
  // Implementation with proper cleanup
}
```

## Validation Checklist

Before marking this scan as complete, verify:
- [ ] All React components with useEffect scanned
- [ ] All async functions analyzed for missing await
- [ ] All Promise.all calls checked for error handling
- [ ] WebSocket handlers reviewed
- [ ] File:line references are accurate
- [ ] Fix suggestions tested and valid
```

## Success Criteria

- [ ] All .tsx and .ts files scanned
- [ ] At least 100 useEffect hooks analyzed
- [ ] All async functions checked for await
- [ ] All Promise.all calls reviewed
- [ ] Report generated with accurate findings
- [ ] Utility functions suggested for prevention
- [ ] Priority fixes identified

## Tools to Use

- **Glob**: Find all .tsx and .ts files
- **Grep**: Search for `useEffect`, `async`, `Promise.all`, `ws.on`
- **Read**: Examine suspicious patterns in detail
- **Bash**: Run ESLint to find missing dependencies

## Exclusions

Do NOT flag:
- Intentional empty dependency arrays (mount-only effects)
- useEffect with all dependencies correctly listed
- Promise.all with proper error handling
- Properly implemented race condition guards

## End of Agent Definition
