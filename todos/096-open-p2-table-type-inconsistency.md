---
status: resolved
priority: p2
issue_id: "096"
tags: [architecture, typescript, types, refactor]
dependencies: []
created_date: 2025-12-02
resolved_date: 2025-12-02
source: code-review-architecture-agent
resolution: Unified types in shared/types/table.types.ts, updated imports in client
---

# HIGH: Type Inconsistency - DatabaseTable vs Table

## Problem

Two different `Table` types are used across the codebase:

```typescript
// client/src/core/supabase.ts - DatabaseTable
export interface DatabaseTable {
  id: string;
  number: string;
  restaurant_id: string;
  seats: number;
  status: string;
  current_order_id?: string | null;
}

// client/src/modules/floor-plan/types/index.ts - Table
export interface Table {
  id: string;
  type: 'circle' | 'rectangle' | 'square' | 'chip_monkey';
  x: number;
  y: number;
  width: number;
  height: number;
  seats: number;
  label: string;
  rotation: number;
  status: 'available' | 'occupied' | 'reserved' | 'unavailable' | 'cleaning' | 'paid';
  z_index: number;
  current_order_id?: string | null;
  // ...
}
```

## Issues

1. **Type mismatch:** `status` is `string` in DatabaseTable but union type in Table
2. **Missing fields:** DatabaseTable lacks `x`, `y`, `type`, etc.
3. **Different naming:** `number` vs `label`
4. **Conversion required:** Manual mapping in `useTableStatus.ts:87-98`

## Current Workaround

```typescript
// useTableStatus.ts - Manual conversion
const updateTablesFromExternal = useCallback((externalTables: Table[]) => {
  setTables(new Map(
    externalTables.map(t => [t.id, {
      id: t.id,
      number: t.label,  // Field name mismatch
      restaurant_id: t.restaurant_id || '',
      seats: t.seats,
      status: t.status,  // Type mismatch (union → string)
      current_order_id: t.current_order_id
    }])
  ));
}, []);
```

## Recommended Solution

1. **Single Source of Truth:** Use `shared/types/table.types.ts` as canonical type
2. **Database Type Extension:** DatabaseTable extends base Table type
3. **Strict Status Type:** Use `TableStatus` union everywhere

```typescript
// shared/types/table.types.ts
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'unavailable' | 'cleaning' | 'paid';

export interface TableBase {
  id: string;
  restaurant_id: string;
  seats: number;
  status: TableStatus;
  current_order_id?: string | null;
}

export interface TableWithPosition extends TableBase {
  type: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  rotation: number;
  z_index: number;
}

// Alias for backward compatibility
export type Table = TableWithPosition;
export type DatabaseTable = TableBase & { number: string };
```

## Files to Modify

- `shared/types/table.types.ts` - Define canonical types
- `client/src/core/supabase.ts` - Import from shared
- `client/src/modules/floor-plan/types/index.ts` - Import from shared
- `client/src/hooks/useTableStatus.ts` - Use shared types

## References

- ADR-001: Snake case convention
- Related: TODO 095 (dual state management)
