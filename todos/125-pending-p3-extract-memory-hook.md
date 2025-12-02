# TODO: Extract useMemoryMonitoring Hook

**Status**: pending
**Priority**: p3
**Category**: refactor
**Created**: 2025-12-02

## Problem

45 lines of memory monitoring setup in ExpoPage.tsx (lines 141-184) could be extracted to a reusable hook. This pattern is duplicated across KDS pages and makes components harder to read.

## Location

- **File**: `client/src/pages/ExpoPage.tsx`
- **Lines**: 141-184

## Current Code

```typescript
// Memory monitoring setup embedded in component
useEffect(() => {
  // 45 lines of memory monitoring logic
  // setInterval, cleanup, logging
}, []);
```

## Proposed Solution

Create `client/src/hooks/useMemoryMonitoring.ts`:

```typescript
interface MemoryMonitoringOptions {
  interval?: number;
  logThreshold?: number;
  enabled?: boolean;
}

export function useMemoryMonitoring(
  componentName: string,
  options: MemoryMonitoringOptions = {}
) {
  const {
    interval = 30000,
    logThreshold = 50 * 1024 * 1024,
    enabled = true
  } = options;

  useEffect(() => {
    if (!enabled || !performance.memory) return;

    const intervalId = setInterval(() => {
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory;

      if (usedJSHeapSize > logThreshold) {
        logger.warn(`[${componentName}] Memory usage`, {
          used: `${(usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          total: `${(totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          percentage: `${((usedJSHeapSize / totalJSHeapSize) * 100).toFixed(1)}%`
        });
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [componentName, interval, logThreshold, enabled]);
}
```

## Usage

```typescript
// In ExpoPage.tsx
import { useMemoryMonitoring } from '@/hooks/useMemoryMonitoring';

function ExpoPage() {
  useMemoryMonitoring('ExpoPage', { interval: 30000 });
  // ... rest of component
}

// In KitchenDisplayPage.tsx
useMemoryMonitoring('KitchenDisplayPage');

// In other pages
useMemoryMonitoring('SomeOtherPage', { enabled: false }); // Disable if needed
```

## Impact

- **Code Reuse**: Single implementation across all KDS pages
- **Cleaner Components**: Reduce component complexity
- **Consistency**: Standardized memory monitoring behavior
- **Maintainability**: Fix bugs in one place

## Testing

1. Verify memory monitoring still works in ExpoPage
2. Test interval cleanup on component unmount
3. Test with enabled/disabled options
4. Verify logging thresholds work correctly

## Related

- See [CL-MEM-001](.claude/lessons/CL-MEM-001-interval-leaks.md) for interval cleanup patterns
- Consider applying to KitchenDisplayPage.tsx and other KDS pages

## Effort

~1 hour (extract hook, update ExpoPage, test)
