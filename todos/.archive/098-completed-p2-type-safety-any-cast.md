---
status: pending
priority: p2
issue_id: "098"
tags: [code-review, typescript, architecture, pr-148]
dependencies: []
---

# Type Safety Violation - `any[]` Cast Without Validation

## Problem Statement

The order response is cast to `any[]` without validation, violating the codebase's TypeScript strict policy ("No `any`, no type assertions without reason" per CLAUDE.md).

**Why it matters:** Loses type safety, runtime errors if API response shape changes won't be caught during refactoring.

## Findings

### Architecture Strategist
- **File:** `client/src/pages/ServerView.tsx:133`
- **Evidence:**
```typescript
const ordersResponse = await get(`/api/v1/orders`, {
  params: {
    table_number: selectedTable.label,
    payment_status: 'pending'
  }
}) as any[]  // ❌ Violates TypeScript strict policy
```

### Data Integrity Guardian
- **Risk:** Typos in property access (e.g., `order.subTotal` instead of `order.subtotal`) won't be caught by TypeScript
- **Impact:** Data shape changes won't be detected at compile time

## Proposed Solutions

### Option A: Import and Use Order Type (Recommended)
**Pros:** Full type safety, IDE autocomplete
**Cons:** Requires import from shared
**Effort:** Small (5 minutes)
**Risk:** Low

```typescript
import { Order } from 'shared/types';

const ordersResponse = await get<Order[]>(`/api/v1/orders`, {
  params: {
    table_number: selectedTable.label,
    payment_status: 'pending'
  }
});

// Add runtime validation
if (!Array.isArray(ordersResponse)) {
  throw new Error('Invalid orders response');
}
```

### Option B: Create Local Interface
**Pros:** Minimal imports
**Cons:** Duplication, can drift from actual type
**Effort:** Small
**Risk:** Medium

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:** `client/src/pages/ServerView.tsx:133`
- **Components:** ServerView
- **Related Types:** `shared/types/order.types.ts`

## Acceptance Criteria

- [ ] No `any` types in order handling code
- [ ] Order response properly typed
- [ ] TypeScript errors if accessing wrong properties

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
- **CLAUDE.md:** TypeScript strict requirements
