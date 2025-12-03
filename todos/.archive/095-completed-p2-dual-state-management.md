---
status: completed
priority: p2
issue_id: "095"
tags: [architecture, react, state-management, refactor]
dependencies: []
created_date: 2025-12-02
completed_date: 2025-12-02
source: code-review-architecture-agent
---

# HIGH: Dual State Management Pattern in useTableStatus

## Problem

The `useTableStatus` hook maintained its own state that duplicated data managed by `useServerView`:

```typescript
// useTableStatus.ts - maintains its own state
const [tables, setTables] = useState<Map<string, DatabaseTable>>(new Map());

// useServerView.ts - also maintains table state
const [tables, setTables] = useState<Table[]>([]);
```

This created:
1. Potential state drift between two sources of truth
2. Unnecessary re-renders from dual state updates
3. Confusion about which state to trust

## Solution Implemented

**Adopted "Option A: Event-Only Hook" approach** - Completely removed the `useTableStatus` hook and inlined the Supabase subscription directly into `useServerView`.

### Implementation Details

The Supabase real-time subscription is now directly integrated into `useServerView` (lines 26-71):

```typescript
// Inline Supabase subscription - no useTableStatus hook needed (B1: deleted useTableStatus.ts)
useEffect(() => {
  if (!restaurant?.id) {
    setIsSubscribed(false)
    return
  }

  const channel = supabase
    .channel(`tables:${restaurant.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tables',
        filter: `restaurant_id=eq.${restaurant.id}`
      },
      (payload) => {
        logger.info('[useServerView] Real-time table update', {
          eventType: payload.eventType,
          tableId: (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id
        })

        if (payload.eventType === 'DELETE' && payload.old) {
          setTables(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id))
        } else if (payload.new) {
          const newData = payload.new as { id: string; status: string }
          setTables(prev => prev.map(t =>
            t.id === newData.id
              ? { ...t, status: newData.status as Table['status'] }
              : t
          ))
        }
      }
    )
    .subscribe((status) => {
      setIsSubscribed(status === 'SUBSCRIBED')
      if (status === 'SUBSCRIBED') {
        logger.info('[useServerView] Subscribed to table updates')
      }
    })

  return () => {
    supabase.removeChannel(channel)
    setIsSubscribed(false)
  }
}, [restaurant?.id])
```

## Benefits Achieved

1. **Single Source of Truth**: Only `useServerView` maintains table state
2. **Reduced Complexity**: Eliminated ~50 lines of duplicate code
3. **No State Drift**: Impossible to have conflicting table states
4. **Clearer Data Flow**: Direct subscription → state update (no intermediate callbacks)
5. **Better Performance**: Fewer re-renders from dual state updates

## Files Modified

- ❌ **DELETED**: `client/src/hooks/useTableStatus.ts`
- ✅ **UPDATED**: `client/src/pages/hooks/useServerView.ts` - Inlined subscription
- ✅ **NO TEST CHANGES**: No tests referenced the deleted hook

## Verification

```bash
# Confirmed no imports of useTableStatus exist
$ grep -r "import.*useTableStatus" client/
# No results

# Confirmed no test dependencies
$ grep -r "useTableStatus" client/**/*.test.ts*
# No results
```

## Architecture Impact

The new flow is simplified:

```
Before:
Supabase Realtime → useTableStatus (tables Map) → onUpdate callback
                                                        ↓
                    useServerView (tables Array) ← callback updates

After:
Supabase Realtime → useServerView (tables Array) ✅
```

## References

- Comment in code: `useServerView.ts:25` - "Inline Supabase subscription - no useTableStatus hook needed (B1: deleted useTableStatus.ts)"
- Related: TODO 096 (DatabaseTable vs Table type)
- Related: TODO 097 (Polling/Realtime race conditions)
