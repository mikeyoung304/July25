---
status: open
priority: p2
issue_id: "097"
tags: [architecture, performance, race-condition, react]
dependencies: []
created_date: 2025-12-02
source: code-review-architecture-agent
---

# HIGH: Race Conditions Between Polling and Real-time Updates

## Problem

`useServerView` uses both polling (setInterval) and real-time Supabase subscriptions. These can race:

```typescript
// useServerView.ts:105-121
useEffect(() => {
  loadFloorPlan();  // Initial load

  // Polling continues even with real-time subscription
  const pollInterval = isSubscribed ? 120000 : 30000;
  const interval = setInterval(() => {
    if (restaurant?.id) {
      loadFloorPlan();  // Replaces ALL tables
    }
  }, pollInterval);

  return () => clearInterval(interval);
}, [loadFloorPlan, restaurant?.id, isSubscribed]);
```

Meanwhile, real-time updates happen:
```typescript
// useTableStatus callback in useServerView
useCallback((updatedTable) => {
  setTables(prev => prev.map(t =>
    t.id === updatedTable.id
      ? { ...t, status: updatedTable.status }
      : t
  ));
}, [])
```

## Race Scenario

1. T=0: Real-time update: Table A status → 'paid'
2. T=1: Poll starts, fetches stale data from server cache
3. T=2: Poll completes, replaces tables with stale data
4. Result: Table A shows old status, user sees flicker

## Impact

- UI flickers when poll overwrites real-time updates
- Brief periods of stale data visible to users
- Confusing UX during high-activity periods

## Recommended Solutions

**Option A: Timestamp-Based Reconciliation**
```typescript
const loadFloorPlan = useCallback(async () => {
  const { tables: loadedTables, fetchedAt } = await tableService.getTables();

  // Only update if poll data is newer than last real-time update
  setTables(prev => {
    if (lastRealtimeUpdate.current > fetchedAt) {
      return prev; // Keep real-time data
    }
    return loadedTables;
  });
}, []);
```

**Option B: Disable Polling When Subscribed**
```typescript
useEffect(() => {
  loadFloorPlan();

  // Only poll when real-time is unavailable
  if (!isSubscribed) {
    const interval = setInterval(loadFloorPlan, 30000);
    return () => clearInterval(interval);
  }
}, [loadFloorPlan, isSubscribed]);
```

**Option C: Merge Instead of Replace**
```typescript
setTables(prev => {
  const merged = new Map(prev.map(t => [t.id, t]));
  loadedTables.forEach(t => {
    const existing = merged.get(t.id);
    // Keep local status if it was updated more recently
    if (existing?.localUpdatedAt > t.updated_at) {
      merged.set(t.id, { ...t, status: existing.status });
    } else {
      merged.set(t.id, t);
    }
  });
  return Array.from(merged.values());
});
```

## Recommended Approach

Option B is simplest and aligns with the intent - real-time should be sufficient when available. Polling is a fallback, not a supplement.

## Files to Modify

- `client/src/pages/hooks/useServerView.ts` - Disable polling when subscribed
- Consider: Add connection status indicator for real-time

## References

- Related: TODO 095 (dual state management)
- Related: CL-WS-001 (WebSocket timing race lesson)
