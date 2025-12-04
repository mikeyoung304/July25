---
status: ready
priority: p2
issue_id: "170"
tags: [code-review, data-integrity, concurrency, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# Race Condition: Concurrent Updates Not Handled

## Problem Statement

No optimistic locking or conflict detection for concurrent menu item updates. Multiple managers can toggle availability simultaneously with last-write-wins behavior.

## Findings

### Agent Discovery

**Data Integrity Guardian:** Identified race condition risk

### Evidence

```typescript
// server/src/services/menu.service.ts:215-224
// No WHERE version = :expectedVersion check
const { data, error } = await supabase
  .from('menu_items')
  .update({ is_available: updates.is_available })
  .eq('id', itemId)
  .eq('restaurant_id', restaurantId)
  .single();
```

### Scenario

1. Manager A fetches item (available=true, updated_at=T1)
2. Manager B fetches item (available=true, updated_at=T1)
3. Manager A toggles to false (updated_at=T2)
4. Manager B toggles to false (updated_at=T3) - overwrites A's change
5. No detection that B's action was based on stale data

### Impact

- Last-write-wins without conflict detection
- Data loss in high-concurrency scenarios
- No user feedback when conflict occurs

## Proposed Solutions

### Solution A: Optimistic Locking with updated_at (Recommended)

**Effort:** Medium (1 hour) | **Risk:** Low

```typescript
const { data, error } = await supabase
  .from('menu_items')
  .update({
    available: updates.is_available,
    updated_at: new Date().toISOString()
  })
  .eq('id', itemId)
  .eq('restaurant_id', restaurantId)
  .eq('updated_at', currentUpdatedAt)  // Version check
  .select()
  .single();

if (!data) {
  throw new ConflictError('Item was modified by another user. Please refresh and try again.');
}
```

### Solution B: Add Version Column

**Effort:** Large | **Risk:** Medium (migration required)

Add explicit `version` integer column, increment on each update.

## Recommended Action

Implement Solution A using existing `updated_at` column as version.

## Technical Details

**Affected File:** `server/src/services/menu.service.ts:215-224`

**Client Change:** Pass `updated_at` from current item state with update request

## Acceptance Criteria

- [ ] Update includes updated_at check
- [ ] Conflict returns appropriate error (409)
- [ ] Client handles conflict by prompting refresh
- [ ] Test concurrent update scenario

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- Optimistic locking pattern
- PR #152: feat(menu): implement 86-item management
