---
title: "P2 Code Review Backlog: Security Hardening, Performance, and Dead Code Cleanup"
category: code-quality-issues
tags:
  - security-hardening
  - performance-optimization
  - dead-code-removal
  - type-safety
  - input-validation
components:
  - server/src/routes/metrics.ts
  - client/src/pages/hooks/useServerView.ts
  - shared/types/transformers.ts
severity: p2
date_solved: 2025-12-03
source: workflows-review-commit-0728e1ee
todos_resolved:
  - TODO-144
  - TODO-145
  - TODO-146
  - TODO-147
  - TODO-148
  - TODO-150
---

# P2 Code Review Backlog: Multi-Layer Hardening

## Problem Summary

Code review of commit `0728e1ee` identified 6 issues across security, performance, and code quality:

| Issue | Component | Problem | Severity |
|-------|-----------|---------|----------|
| TODO-144 | metrics.ts | Prototype pollution via stats object | P2 |
| TODO-145 | useServerView.ts | O(7n) stats calculation | P2 |
| TODO-146 | transformers.ts | ~340 lines dead code | P2 |
| TODO-147 | useServerView.ts | Unsafe error property access | P2 |
| TODO-148 | metrics.ts | No timestamp validation | P2 |
| TODO-150 | metrics.ts | parseInt missing radix | P3 |

## Solutions

### 1. TODO-144: Prototype Pollution Prevention

**Problem**: Stats object accepted arbitrary nested objects without sanitization, creating prototype pollution vulnerability.

**Solution**: Added `sanitizeStatsObject()` that filters dangerous keys.

```typescript
// server/src/routes/metrics.ts
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

function sanitizeStatsObject(stats: unknown): Record<string, unknown> {
  if (typeof stats !== 'object' || stats === null || Array.isArray(stats)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(stats as Record<string, unknown>).filter(
      ([key]) => !DANGEROUS_KEYS.includes(key)
    )
  );
}
```

### 2. TODO-145: Single-Pass Stats Calculation

**Problem**: 7 separate array iterations (O(7n)) for stats calculation.

**Solution**: Single-pass reduce (O(n)) calculating all stats in one iteration.

```typescript
// client/src/pages/hooks/useServerView.ts
const stats = useMemo(() => {
  return tables.reduce(
    (acc, t) => {
      acc.totalTables++
      acc.totalSeats += t.seats

      if (t.status === 'available') {
        acc.availableTables++
        acc.availableSeats += t.seats
      } else if (t.status === 'occupied') {
        acc.occupiedTables++
      } else if (t.status === 'reserved') {
        acc.reservedTables++
      } else if (t.status === 'paid') {
        acc.paidTables++
      }

      return acc
    },
    {
      totalTables: 0,
      availableTables: 0,
      occupiedTables: 0,
      reservedTables: 0,
      paidTables: 0,
      totalSeats: 0,
      availableSeats: 0
    }
  )
}, [tables])
```

### 3. TODO-146: Dead Code Removal

**Problem**: ~340 lines of unused Client* types and transformer functions.

**Solution**: Removed all unused code, kept only essential utilities.

**Removed**:
- `ClientOrder`, `ClientOrderItem`, `ClientModifier`, `ClientMenuItem`, `ClientTable` types
- All `transform*ToClient()` and `transform*ToShared()` functions
- `transformDatabaseToShared`, `transformSharedToDatabase`, `DATABASE_FIELD_MAPS`

**Kept**:
- `Restaurant` interface (widely used)
- `TypeTransformationError` class
- `uiOrderTypeToDb()` and `dbOrderTypeToUI()` (used by VoiceOrderProcessor)

**Rationale**: Codebase uses snake_case consistently (ADR-001), eliminating need for camelCase transformations.

### 4. TODO-147: Type-Safe Error Access

**Problem**: `error.message` and `error.status` accessed without type guards.

**Solution**: Added comprehensive type guards.

```typescript
// client/src/pages/hooks/useServerView.ts
} catch (error: unknown) {
  logger.error('Failed to load floor plan:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    status: (error && typeof error === 'object' && 'status' in error &&
             typeof (error as { status?: unknown }).status === 'number')
      ? (error as { status: number }).status
      : undefined,
    isInitial: isInitialLoad.current
  })
```

### 5. TODO-148: Timestamp Validation

**Problem**: User-supplied timestamps accepted without validation, risking log injection.

**Solution**: Added `sanitizeTimestamp()` with ISO 8601 validation and length limits.

```typescript
// server/src/routes/metrics.ts
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function sanitizeTimestamp(timestamp: unknown): string {
  if (
    typeof timestamp === 'string' &&
    ISO_TIMESTAMP_PATTERN.test(timestamp)
  ) {
    return timestamp.substring(0, 30); // Limit length
  }
  return new Date().toISOString();
}
```

### 6. TODO-150: parseInt Radix

**Problem**: `parseInt()` calls missing radix parameter.

**Solution**: Added explicit radix `10`.

```typescript
slowRenders: Math.max(0, parseInt(metrics.slowRenders, 10) || 0),
slowAPIs: Math.max(0, parseInt(metrics.slowAPIs, 10) || 0),
```

## Prevention Strategies

### Input Validation Checklist

- [ ] Filter dangerous keys from user objects (`__proto__`, `constructor`, `prototype`)
- [ ] Validate string formats (timestamps, UUIDs, emails)
- [ ] Limit string lengths to prevent injection
- [ ] Always specify radix in `parseInt()`
- [ ] Add upper bounds to numeric inputs

### Error Handling Pattern

```typescript
// Always use type guards
const message = error instanceof Error ? error.message : 'Unknown error';
const status = ('status' in error && typeof error.status === 'number')
  ? error.status
  : undefined;
```

### Performance Pattern

```typescript
// Single-pass aggregation instead of multiple filters
const stats = items.reduce((acc, item) => {
  // Calculate all stats in one iteration
  return acc;
}, initialState);
```

### Code Cleanup Triggers

- Quarterly dead code audits
- Check for unused exports before releases
- Remove Client* types when snake_case is standard

## Related Documentation

- [ADR-001: Snake Case Convention](../../explanation/architecture-decisions/ADR-001-snake-case-convention.md)
- [CL-TYPE-001: Schema Mismatch](../type-safety-issues/CL-TYPE-001-schema-mismatch-type-assertions.md)
- [CL-MEM-001: Memory Leaks](../../../.claude/lessons/CL-MEM-001-interval-leaks.md)

## Verification

All healthy tests pass (396 tests). Changes verified with:

```bash
npm run test:healthy  # 396 passed
cd shared && npx tsc --noEmit  # No errors
```
