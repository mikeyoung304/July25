---
status: resolved
priority: p2
issue_id: "145"
tags: [code-review, performance, react]
dependencies: []
created_date: 2025-12-02
source: workflows-review-commit-0728e1ee
---

# Stats Calculation Performs 7 Array Iterations Instead of 1

## Problem Statement

The `stats` useMemo in useServerView.ts performs 7 separate array iterations over the same `tables` array, resulting in O(7n) complexity instead of O(n).

## Findings

### Evidence

```typescript
// useServerView.ts lines 160-180
tables.filter(t => t.status === 'available').length    // iteration 1
tables.filter(t => t.status === 'occupied').length     // iteration 2
tables.filter(t => t.status === 'reserved').length     // iteration 3
tables.filter(t => t.status === 'paid').length         // iteration 4
tables.reduce((acc, t) => acc + t.seats, 0)            // iteration 5
tables.filter(t => t.status === 'available')           // iteration 6
      .reduce((acc, t) => acc + t.seats, 0)            // iteration 7
```

**Impact:** With 100 tables = 700 operations. Single pass = 100 operations (7x improvement).

## Proposed Solutions

### Option A: Single-pass reduce (Recommended)
**Effort:** Small | **Risk:** Low

```typescript
const stats = useMemo(() => {
  return tables.reduce((acc, t) => {
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
  }, { totalTables: 0, availableTables: 0, occupiedTables: 0, reservedTables: 0, paidTables: 0, totalSeats: 0, availableSeats: 0 })
}, [tables])
```

## Technical Details

### Affected Files
- `client/src/pages/hooks/useServerView.ts` (lines 160-180)

## Acceptance Criteria

- [ ] Single array iteration for all stats
- [ ] Same stats values produced
- [ ] Tests pass
