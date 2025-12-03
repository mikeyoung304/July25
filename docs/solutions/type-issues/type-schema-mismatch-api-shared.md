---
title: Fix table schema field naming inconsistency and unsafe type assertions in transformers
category: type-mismatch
severity: p1
component:
  - shared-types
  - api
  - transformers
symptoms:
  - API returns `capacity` but shared types expect `seats` field
  - Silent data mismatch causing potential runtime bugs at table display layer
  - Unsafe `as any` type assertions bypassing TypeScript type safety on payment status
  - Type safety gaps between SharedOrder and ClientOrder payment status enums
root_cause: Inconsistent field naming between API transformation layer and shared type definitions; use of `as any` assertions to suppress type mismatches instead of proper union type handling
solution_type: code-fix
date_solved: 2025-12-03
related_issues:
  - TODO-142
  - TODO-143
tags:
  - typescript
  - type-safety
  - api-transformation
  - schema-consistency
  - payment-processing
  - snake-case
---

# Type Schema Mismatch: API vs Shared Types

## Problem Description

Two critical P1 type safety issues were discovered during code review of commit 0728e1ee:

### Issue 1: Table Schema Mismatch (TODO-142)

Three competing schemas existed for table data:

| Layer | Field Name | Source |
|-------|------------|--------|
| Database (Prisma) | `seats` | `seats: Int` column |
| API Response | `capacity` | `capacity: table['seats']` transformation |
| Shared Types | `seats` | `seats: number` interface |

**Impact:** TypeScript couldn't catch the mismatch. Clients accessing `table.seats` received `undefined` while `table.capacity` contained the actual value.

### Issue 2: Unsafe Type Assertions (TODO-143)

Payment status transformations used `as any` to bypass TypeScript:

```typescript
// Line 163 - transformSharedOrderToClient
paymentStatus: order.payment_status === 'paid' ? 'completed' : order.payment_status as any

// Line 197 - transformClientOrderToShared
payment_status: order.paymentStatus === 'completed' ? 'paid' : order.paymentStatus as any
```

**Impact:** Invalid payment status values could pass silently, causing payment processing bugs that are hard to debug.

## Investigation Steps

1. **Read TODO documentation** - Reviewed `todos/142-*.md` and `todos/143-*.md` for problem context
2. **Analyzed source files** - Read `tables.routes.ts`, `transformers.ts`, and `table.types.ts`
3. **Searched for client usage** - Used grep to find all uses of `.capacity` and `.seats` in client code
4. **Mapped type relationships** - Compared SharedOrder and ClientOrder payment status enums

## Root Cause Analysis

### Schema Mismatch
The API transformation layer was introduced to convert database column names (snake_case) to client-friendly names. However, `seats` was incorrectly renamed to `capacity` during this transformation, creating a mismatch with the shared type definitions.

### Type Assertions
The `as any` assertions were used as a quick fix when the payment status enums between SharedOrder and ClientOrder didn't align perfectly:
- SharedOrder: `'pending' | 'paid' | 'refunded' | 'failed'`
- ClientOrder: `'pending' | 'processing' | 'completed' | 'failed' | 'refunded'`

The common values are `'pending'`, `'failed'`, and `'refunded'`. The special mappings are `'paid'` ↔ `'completed'`.

## Solution

### Fix 1: Align API Response with Shared Types

Changed `server/src/routes/tables.routes.ts` to return `seats` instead of `capacity` in 4 locations:

**Before:**
```typescript
const transformedData = (data || []).map((table: any) => ({
  ...table,
  x: table['x_pos'],
  y: table['y_pos'],
  type: table['shape'],
  capacity: table['seats']  // WRONG: returns capacity
}));
```

**After:**
```typescript
const transformedData = (data || []).map((table: any) => ({
  ...table,
  x: table['x_pos'],
  y: table['y_pos'],
  type: table['shape'],
  seats: table['seats']  // CORRECT: matches shared types
}));
```

Locations fixed:
- Line 32: `getTables` endpoint
- Line 108: `createTable` endpoint
- Line 173: `updateTable` endpoint
- Line 368: `batchUpdateTables` endpoint

### Fix 2: Update Client Component

Changed `client/src/pages/components/SeatSelectionModal.tsx` line 35:

**Before:**
```typescript
const seats = Array.from({ length: table.capacity }, (_, i) => i + 1)
```

**After:**
```typescript
const seats = Array.from({ length: table.seats }, (_, i) => i + 1)
```

### Fix 3: Replace `as any` with Proper Union Types

Changed `shared/types/transformers.ts` lines 163 and 197:

**Before:**
```typescript
paymentStatus: order.payment_status === 'paid' ? 'completed' : order.payment_status as any
payment_status: order.paymentStatus === 'completed' ? 'paid' : order.paymentStatus as any
```

**After:**
```typescript
paymentStatus: order.payment_status === 'paid'
  ? 'completed'
  : (order.payment_status as 'pending' | 'failed' | 'refunded')

payment_status: order.paymentStatus === 'completed'
  ? 'paid'
  : (order.paymentStatus as 'pending' | 'failed' | 'refunded')
```

## Verification

1. **Shared module builds successfully:** `cd shared && npm run build` - no errors
2. **Type assertions are now explicit:** The union type clearly documents which values are expected
3. **Client code uses correct field:** All client components now access `table.seats` consistently

## Prevention Strategies

### Best Practices

1. **Schema alignment review:** When adding API transformations, verify field names match shared type definitions
2. **Grep for field usage:** Before renaming fields, search entire codebase for all usages
3. **No `as any` without justification:** Every type assertion must use explicit union types or have a TODO comment explaining why

### Automated Checks

Add ESLint rule to catch `as any`:
```json
{
  "@typescript-eslint/no-explicit-any": "error"
}
```

### Code Review Checklist

- [ ] API response field names match shared type interfaces
- [ ] No `as any` assertions (use explicit union types)
- [ ] Client components use fields defined in shared types
- [ ] Transformations are documented in type comments

## Related Documentation

- [ADR-001: Snake Case Convention](../../explanation/architecture-decisions/ADR-001-snake-case-convention.md) - All layers use snake_case
- [ADR-010: Remote Database Source of Truth](../../explanation/architecture-decisions/ADR-010-remote-database-source-of-truth.md) - Schema alignment
- [CL-DB-002: Database Constraint Drift](../../../.claude/lessons/CL-DB-002-constraint-drift-prevention.md) - Similar schema mismatch issue
- [CLAUDE.md: Type System Rules](../../../CLAUDE.md) - Import types from shared only

## Files Changed

| File | Changes |
|------|---------|
| `server/src/routes/tables.routes.ts` | 4 edits: `capacity` → `seats` |
| `client/src/pages/components/SeatSelectionModal.tsx` | 1 edit: `table.capacity` → `table.seats` |
| `shared/types/transformers.ts` | 2 edits: `as any` → explicit union types |
| `todos/142-*.md` | Marked resolved |
| `todos/143-*.md` | Marked resolved |
