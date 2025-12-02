---
status: pending
priority: p1
issue_id: 116
tags: [code-review, performance, memory-leak, react]
dependencies: []
---

# ExpoPage useEffect Memory Leak - Dependencies Trigger Constant Restarts

## Problem Statement
The ExpoPage component has a useEffect hook at lines 141-184 that monitors memory usage and logs order counts. However, the effect depends on `[filteredActive.length, filteredReady.length]`, which are derived from real-time order updates. Every time an order status changes, these dependencies change, causing the effect to:
1. Stop the current memory monitoring interval
2. Start a new memory monitoring interval
3. Create multiple setInterval instances that accumulate over time
4. Capture stale order counts in closures

This matches the exact anti-pattern documented in CL-MEM-001 and creates a cascading memory leak in a critical production view.

## Findings
**File**: `client/src/pages/ExpoPage.tsx:141-184`

```typescript
useEffect(() => {
  // Memory monitoring setup
  const memoryCheckInterval = setInterval(() => {
    const memory = (performance as any).memory;
    if (memory) {
      const usedMB = memory.usedJSHeapSize / 1048576;
      const limitMB = memory.jsHeapSizeLimit / 1048576;
      const percentUsed = (usedMB / limitMB) * 100;

      logger.debug('ExpoPage memory check', {
        usedMB: usedMB.toFixed(2),
        limitMB: limitMB.toFixed(2),
        percentUsed: percentUsed.toFixed(2),
        activeOrders: filteredActive.length,  // ❌ Stale closure
        readyOrders: filteredReady.length,    // ❌ Stale closure
      });
    }
  }, 30000);

  return () => clearInterval(memoryCheckInterval);
}, [filteredActive.length, filteredReady.length]); // ❌ Changes constantly
```

**Evidence of Problem**:
- Dependencies `filteredActive.length` and `filteredReady.length` change every time orders update
- Each render creates a new interval before clearing the old one
- On a busy shift with 50+ orders updating every few seconds, this creates dozens of lingering intervals
- Memory monitoring becomes unreliable as old closures report stale counts
- Matches CL-MEM-001 lesson: "setInterval in useEffect with changing dependencies"

## Proposed Solutions

### Option 1: Remove Dependencies (Recommended)
Remove the dependency array entirely or use an empty array, and accept that order counts in logs will be snapshots from mount time:

```typescript
useEffect(() => {
  const initialActive = filteredActive.length;
  const initialReady = filteredReady.length;

  const memoryCheckInterval = setInterval(() => {
    const memory = (performance as any).memory;
    if (memory) {
      const usedMB = memory.usedJSHeapSize / 1048576;
      const limitMB = memory.jsHeapSizeLimit / 1048576;
      const percentUsed = (usedMB / limitMB) * 100;

      logger.debug('ExpoPage memory check', {
        usedMB: usedMB.toFixed(2),
        limitMB: limitMB.toFixed(2),
        percentUsed: percentUsed.toFixed(2),
        activeOrdersAtMount: initialActive,
        readyOrdersAtMount: initialReady,
      });
    }
  }, 30000);

  return () => clearInterval(memoryCheckInterval);
}, []); // ✅ Runs once on mount
```

**Pros**: Simple, prevents leak, memory monitoring stays stable
**Cons**: Order counts in logs are static (but memory stats are still accurate)

### Option 2: Use Refs for Dynamic Values
Use refs to access current order counts without triggering effect restarts:

```typescript
const activeCountRef = useRef(filteredActive.length);
const readyCountRef = useRef(filteredReady.length);

// Update refs on every render
activeCountRef.current = filteredActive.length;
readyCountRef.current = filteredReady.length;

useEffect(() => {
  const memoryCheckInterval = setInterval(() => {
    const memory = (performance as any).memory;
    if (memory) {
      const usedMB = memory.usedJSHeapSize / 1048576;
      const limitMB = memory.jsHeapSizeLimit / 1048576;
      const percentUsed = (usedMB / limitMB) * 100;

      logger.debug('ExpoPage memory check', {
        usedMB: usedMB.toFixed(2),
        limitMB: limitMB.toFixed(2),
        percentUsed: percentUsed.toFixed(2),
        activeOrders: activeCountRef.current,  // ✅ Always current
        readyOrders: readyCountRef.current,    // ✅ Always current
      });
    }
  }, 30000);

  return () => clearInterval(memoryCheckInterval);
}, []); // ✅ Runs once on mount
```

**Pros**: Order counts stay current, prevents leak, memory monitoring stays stable
**Cons**: Slightly more complex code

### Option 3: Question the Need for Memory Monitoring
Consider if this memory monitoring is truly necessary in production:

```typescript
// Remove the entire useEffect if not actively debugging
// Memory issues should be caught in development/staging
```

**Pros**: Simplest solution, removes all risk
**Cons**: Loses visibility into production memory usage

## Recommended Action
**Option 2 (Use Refs)** is recommended because it:
- Fixes the memory leak completely
- Maintains accurate order counts in logs
- Preserves the intended monitoring functionality
- Aligns with React best practices for accessing latest values in intervals

## Technical Details

**Root Cause**: React's useEffect dependency array triggers cleanup + re-run whenever dependencies change. When those dependencies are derived from frequently-updating state (real-time orders), the effect becomes a thrashing source of memory leaks.

**CL-MEM-001 Lesson Application**:
- ❌ **Anti-pattern**: setInterval in useEffect with dependencies that change based on props/state
- ✅ **Correct pattern**: setInterval in useEffect with empty deps + refs for dynamic values

**Performance Impact**:
- On a busy shift (50 orders, updates every 2-3 seconds)
- Effect restarts ~20 times per minute
- After 1 hour: ~1,200 interval restarts
- Potential for 10-20 lingering intervals consuming CPU
- Each interval consumes ~0.1% CPU → 1-2% total waste

**Multi-Tenancy Impact**:
- This affects ALL tenants using the Expo view
- Problem scales with order volume (busier restaurants = worse leak)
- Memory pressure could affect other components via V8 GC pauses

## Acceptance Criteria
- [ ] Memory monitoring interval starts only once when component mounts
- [ ] Memory monitoring interval stops only once when component unmounts
- [ ] Order counts logged are current, not stale from mount time
- [ ] No interval accumulation verified by running in production for 1+ hour
- [ ] Memory profile shows flat interval count over time (use Chrome DevTools Performance Monitor)
- [ ] Manual testing: Open ExpoPage, let run for 30 minutes, check interval count stays at 1

## Work Log
| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | From code review of commit a699c6c6, identified during PR #151 follow-up analysis |

## Resources
- **Lesson**: [CL-MEM-001](.claude/lessons/CL-MEM-001-interval-leaks.md) - setInterval memory leaks
- **Commit**: a699c6c6 (introduced memory monitoring)
- **File**: client/src/pages/ExpoPage.tsx:141-184
- **Related**: Similar pattern may exist in KitchenPage (needs verification)
