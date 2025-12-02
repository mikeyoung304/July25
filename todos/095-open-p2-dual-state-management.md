---
status: open
priority: p2
issue_id: "095"
tags: [architecture, react, state-management, refactor]
dependencies: []
created_date: 2025-12-02
source: code-review-architecture-agent
---

# HIGH: Dual State Management Pattern in useTableStatus

## Problem

The `useTableStatus` hook maintains its own state that duplicates data managed by `useServerView`:

```typescript
// useTableStatus.ts - maintains its own state
const [tables, setTables] = useState<Map<string, DatabaseTable>>(new Map());

// useServerView.ts - also maintains table state
const [tables, setTables] = useState<Table[]>([]);
```

This creates:
1. Potential state drift between two sources of truth
2. Unnecessary re-renders from dual state updates
3. Confusion about which state to trust

## Current Flow

```
Supabase Realtime → useTableStatus (tables Map) → onUpdate callback
                                                        ↓
                    useServerView (tables Array) ← callback updates
```

## Recommended Architecture

**Option A: Event-Only Hook (Preferred)**
```typescript
// useTableStatus becomes event-emitter only
export function useTableStatusEvents(
  restaurantId: string | undefined,
  onUpdate: (table: DatabaseTable) => void,
  onDelete: (tableId: string) => void
) {
  // No internal state, just subscription management
  useEffect(() => {
    if (!restaurantId) return;
    return subscribeToTableUpdates(restaurantId, (payload) => {
      if (payload.eventType === 'DELETE') {
        onDelete(payload.old!.id);
      } else if (payload.new) {
        onUpdate(payload.new);
      }
    });
  }, [restaurantId, onUpdate, onDelete]);

  return { isSubscribed: true };
}
```

**Option B: Single Source of Truth**
```typescript
// Move all table state into useTableStatus
// useServerView becomes a thin wrapper
```

## Impact

- Reduces bundle size (~20 lines)
- Eliminates potential race conditions
- Clearer data flow architecture
- Easier to debug state issues

## Files to Modify

- `client/src/hooks/useTableStatus.ts` - Simplify to event-only
- `client/src/pages/hooks/useServerView.ts` - Adjust integration
- `tests/` - Update related tests

## References

- React docs: "Choosing the State Structure"
- Related: TODO 096 (DatabaseTable vs Table type)
