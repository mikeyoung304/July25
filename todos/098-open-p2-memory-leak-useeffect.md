---
status: resolved
priority: p2
issue_id: "098"
tags: [performance, memory-leak, react, hooks]
dependencies: []
created_date: 2025-12-02
resolved_date: 2025-12-02
source: code-review-performance-agent
resolution: Using toastRef pattern to prevent callback recreation
---

# HIGH: Memory Leak from useEffect Dependencies

## Problem

The `useServerView` hook has `loadFloorPlan` in useEffect dependencies, but `loadFloorPlan` is recreated on every render due to `toast` dependency:

```typescript
// useServerView.ts:37-103
const loadFloorPlan = useCallback(async () => {
  // ...
  if (isInitialLoad.current) {
    toast.error('Failed to load floor plan...');  // toast reference
  }
  // ...
}, [restaurant?.id, toast]);  // toast causes recreation

// useServerView.ts:105-121
useEffect(() => {
  loadFloorPlan();
  const interval = setInterval(() => { ... }, pollInterval);
  return () => clearInterval(interval);
}, [loadFloorPlan, restaurant?.id, isSubscribed]);  // loadFloorPlan recreation triggers effect
```

## Issue

1. `toast` from `useToast()` is a new object reference each render
2. This recreates `loadFloorPlan` callback
3. Effect re-runs, creating new intervals
4. Cleanup runs, but rapid re-creation can cause issues
5. Potential for interval accumulation in edge cases

## Evidence

```typescript
const { toast } = useToast();  // New reference each render
// ...
}, [restaurant?.id, toast]);   // toast in deps = callback recreation
```

## Recommended Fix

**Option A: Remove toast from callback dependencies**
```typescript
const toastRef = useRef(toast);
toastRef.current = toast;

const loadFloorPlan = useCallback(async () => {
  // Use toastRef.current instead of toast
  if (isInitialLoad.current) {
    toastRef.current.error('Failed to load floor plan...');
  }
}, [restaurant?.id]);  // No toast dependency
```

**Option B: Stable toast hook**
```typescript
// In useToast.ts - return stable reference
const toast = useMemo(() => ({
  error: (msg) => addToast({ type: 'error', message: msg }),
  success: (msg) => addToast({ type: 'success', message: msg }),
}), [addToast]);
```

**Option C: Move toast outside callback**
```typescript
const loadFloorPlan = useCallback(async () => {
  // Return error status instead of calling toast
  return { success: false, error: 'Failed to load' };
}, [restaurant?.id]);

useEffect(() => {
  loadFloorPlan().then(result => {
    if (!result.success && isInitialLoad.current) {
      toast.error(result.error);
    }
  });
}, [loadFloorPlan, toast]);  // toast only in effect, not callback
```

## Recommended Approach

Option A (useRef) is the simplest fix with minimal code changes.

## Files to Modify

- `client/src/pages/hooks/useServerView.ts` - Use toast ref pattern

## Testing

1. Add React DevTools Profiler
2. Monitor component re-renders
3. Verify interval creation count matches cleanup count

## References

- React docs: "Removing Effect Dependencies"
- Related: CL-MEM-001 (interval leaks lesson)
- Related: TODO 097 (polling/realtime race)
