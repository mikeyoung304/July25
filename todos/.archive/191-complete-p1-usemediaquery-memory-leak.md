---
status: complete
priority: p1
issue_id: "191"
tags: [performance, react-hooks, client, memory-leak, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-code-review
---

# CRITICAL: useMediaQuery Hook Memory Leak Risk

## Problem Statement

The `useMediaQuery` hook in `useViewport.ts` creates `MediaQueryList` objects that may not be properly cleaned up when queries change dynamically, leading to memory leaks.

## Findings

### Performance Agent Discovery

**Location:** `client/src/hooks/useViewport.ts:17-35`

**Current Implementation:**
```typescript
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    setMatches(mediaQuery.matches); // Unnecessary state update on mount
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

**Problems:**
1. If `query` prop changes frequently, old MediaQueryList listeners may not clean up properly in some browsers
2. `setMatches(mediaQuery.matches)` on line 28 causes unnecessary re-render on mount
3. No memoization of MediaQueryList object between identical queries

### Impact Assessment

- **Memory**: Leaked MediaQueryList objects over time
- **Performance**: Unnecessary render on initial mount
- **Stability**: Potential issues with hot module replacement

## Proposed Solutions

### Solution A: Fix with useRef and Better Cleanup (Recommended)

**Effort:** 1 hour | **Risk:** Low

```typescript
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  const mediaQueryRef = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    // Clean up previous query if it exists
    if (mediaQueryRef.current) {
      mediaQueryRef.current.removeEventListener('change', handler);
    }

    const mediaQuery = window.matchMedia(query);
    mediaQueryRef.current = mediaQuery;

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Only update if different (avoid unnecessary re-render)
    if (mediaQuery.matches !== matches) {
      setMatches(mediaQuery.matches);
    }

    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
      mediaQueryRef.current = null;
    };
  }, [query]);

  return matches;
}
```

### Solution B: Use useSyncExternalStore

**Effort:** 2 hours | **Risk:** Medium

More React 18-idiomatic approach using `useSyncExternalStore`.

## Recommended Action

Implement Solution A. Simpler fix with clear cleanup semantics.

## Technical Details

**Affected Files:**
- `client/src/hooks/useViewport.ts`

**Related Issues:**
- Todo #190: useViewport resize throttling

## Acceptance Criteria

- [ ] MediaQueryList properly cleaned up on query change
- [ ] No unnecessary re-render on mount
- [ ] Memory usage stable after repeated query changes
- [ ] Unit test for cleanup behavior

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review of commit 3b463dcb |

## Resources

- Performance agent findings
- [MDN: MediaQueryList](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList)
