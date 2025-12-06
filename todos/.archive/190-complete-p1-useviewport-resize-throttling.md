---
status: complete
priority: p1
issue_id: "190"
tags: [performance, react-hooks, client, memory-leak, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-code-review
---

# CRITICAL: useViewport Hook Missing Resize Throttling

## Problem Statement

The new `useViewport.ts` hook adds resize event listeners without throttling, causing excessive re-renders (60+ per second during resize) and potential performance degradation across all components using this hook.

## Findings

### Performance Agent Discovery

**Location:** `client/src/hooks/useViewport.ts:57-73`

**Current Implementation:**
```typescript
useEffect(() => {
  const handleResize = () => {
    const newState = calculateViewport();
    // ... state updates on EVERY resize event
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**Problem:**
- No `throttle` or `debounce` wrapper
- Browser fires resize events ~60 times/second during drag
- Each event triggers React state update → re-render cascade
- Multiple components using hook multiply the problem

### Impact Assessment

- **CPU**: High utilization during any resize operation
- **Battery**: Significant drain on mobile devices
- **UX**: Potential jank/stutter during resize
- **Memory**: Temporary allocation pressure from rapid state updates

## Proposed Solutions

### Solution A: Add Throttle (Recommended)

**Effort:** 30 minutes | **Risk:** Low

```typescript
import { throttle } from 'lodash-es'; // or implement simple throttle

useEffect(() => {
  const handleResize = throttle(() => {
    const newState = calculateViewport();
    // ... state updates
  }, 100); // 10 updates/second max

  window.addEventListener('resize', handleResize);
  return () => {
    handleResize.cancel();
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

### Solution B: Use ResizeObserver with requestAnimationFrame

**Effort:** 1 hour | **Risk:** Low

```typescript
useEffect(() => {
  let rafId: number;
  const observer = new ResizeObserver(() => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const newState = calculateViewport();
      // ... state updates
    });
  });

  observer.observe(document.documentElement);
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    observer.disconnect();
  };
}, []);
```

## Recommended Action

Implement Solution A. Throttling at 100ms is simple and effective.

## Technical Details

**Affected Files:**
- `client/src/hooks/useViewport.ts`

**Components Impacted:**
- Any component using `useViewport()` hook
- `ViewportProvider` context consumers

**Testing:**
- Add unit test for throttle behavior
- Performance test: measure renders during resize

## Acceptance Criteria

- [ ] Resize handler throttled to max 10 updates/second
- [ ] Throttle cleanup on unmount (cancel pending calls)
- [ ] Unit test verifies throttle behavior
- [ ] No visible UX degradation from throttle delay

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review of commit 3b463dcb |

## Resources

- Performance agent findings
- [Debouncing and Throttling Explained](https://css-tricks.com/debouncing-throttling-explained-examples/)
