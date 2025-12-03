---
status: resolved
priority: p1
issue_id: "142"
tags: [code-review, architecture, types, data-integrity]
dependencies: []
created_date: 2025-12-02
resolved_date: 2025-12-03
source: workflows-review-commit-0728e1ee
---

# CRITICAL: Table Type Schema Mismatch (seats vs capacity)

## Problem Statement

The "unified" table types in `shared/types/table.types.ts` don't match the actual API response. The API returns `capacity` but the shared types expect `seats`, causing a silent data mismatch that could cause runtime bugs.

**Why it matters:** Type safety is broken - TypeScript can't catch DB-API mismatches, and clients may receive undefined values when accessing `seats` while the API sends `capacity`.

## Findings

### Three Competing Schemas

1. **Database (Prisma):** `seats: Int`
2. **API (tables.routes.ts:27-33):** Returns `capacity: table['seats']`
3. **Shared Types (table.types.ts):** Expects `seats: number`

### Evidence

```typescript
// Server API (tables.routes.ts line 27-33):
const transformedData = (data || []).map((table: any) => ({
  ...table,
  x: table['x_pos'],
  y: table['y_pos'],
  type: table['shape'],
  capacity: table['seats']  // API returns capacity!
}));

// Shared Table type (table.types.ts):
export interface Table {
  seats: number;     // Claims API uses "seats" - WRONG
}
```

## Proposed Solutions

### Option A: Fix API to return `seats` (Recommended)
**Pros:** Matches database and shared types, minimal client changes
**Cons:** May break existing client code expecting `capacity`
**Effort:** Small
**Risk:** Medium - need to check all client usages

```typescript
// tables.routes.ts
const transformedData = (data || []).map((table: any) => ({
  ...table,
  x: table['x_pos'],
  y: table['y_pos'],
  type: table['shape'],
  seats: table['seats']  // Keep as seats
}));
```

### Option B: Update shared types to use `capacity`
**Pros:** Matches current API behavior
**Cons:** Inconsistent with database, more changes needed
**Effort:** Medium
**Risk:** Low

## Technical Details

### Affected Files
- `server/src/routes/tables.routes.ts` (lines 27-33)
- `shared/types/table.types.ts` (line 22)
- `shared/types/transformers.ts` (DATABASE_FIELD_MAPS)

## Acceptance Criteria

- [x] API returns same field name as shared types expect
- [x] TypeScript compilation catches mismatches
- [x] All client components work correctly with tables

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during code review of commit 0728e1ee |
| 2025-12-03 | Resolved | Fixed API to return `seats` instead of `capacity`. Updated client SeatSelectionModal to use `table.seats`. |

## Resources

- Commit: 0728e1ee
- Related: TODO-096 (type consistency)
