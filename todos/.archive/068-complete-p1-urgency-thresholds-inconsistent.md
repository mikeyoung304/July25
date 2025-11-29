# TODO-068: Urgency Thresholds Inconsistent Across Hooks

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 068
- **Tags**: architecture, kds, consistency, code-review
- **Dependencies**: None
- **Created**: 2025-11-27
- **Source**: Code Review - Architecture Strategist

---

## Problem Statement

There are THREE different sets of urgency thresholds in the codebase:
1. `KDS_THRESHOLDS` in shared/config/kds.ts: 10, 15 minutes
2. `useOrderGrouping` hook: 12, 18, 25 minutes
3. `useTableGrouping` hook: 15, 20, 30 minutes

This inconsistency means orders are evaluated differently depending on which view/hook processes them, leading to confusing and potentially dangerous behavior in a kitchen environment.

---

## Findings

### Evidence Location

**shared/config/kds.ts (lines 30, 36)**:
```typescript
WARNING_MINUTES: 10,
URGENT_MINUTES: 15,
```

**client/src/hooks/useOrderGrouping.ts (lines 136-143)**:
```typescript
if (age_minutes >= 25) {
  group.urgency_level = 'critical'
} else if (age_minutes >= 18) {
  group.urgency_level = 'urgent'
} else if (age_minutes >= 12) {
  group.urgency_level = 'warning'
}
```

**client/src/hooks/useTableGrouping.ts (similar hardcoded values)**

### Impact
- Same order shows different urgency in different views
- Kitchen staff may miss urgent orders
- Confusing user experience
- Potential food safety/quality issues

---

## Proposed Solutions

### Option A: Use getOrderUrgency() in all hooks (RECOMMENDED)
**Pros:** Single source of truth, consistent behavior
**Cons:** Requires hook refactoring
**Effort:** Medium (1 hour)
**Risk:** Low

```typescript
// In useOrderGrouping.ts - remove manual urgency calculation
// Let consumers call: getOrderUrgency(orderGroup.age_minutes)

// Or calculate using shared function:
import { getOrderUrgency } from '@rebuild/shared/config/kds'
group.urgency_level = getOrderUrgency(age_minutes)
```

### Option B: Document intentional differences
**Pros:** No code changes
**Cons:** Doesn't fix the inconsistency
**Effort:** Small
**Risk:** High (leaves problem unfixed)

---

## Recommended Action

Option A - Use getOrderUrgency() in all hooks

---

## Technical Details

### Affected Files
- `client/src/hooks/useOrderGrouping.ts`
- `client/src/hooks/useTableGrouping.ts`
- `shared/config/kds.ts` (may need to add 'critical' level)

### Database Changes
None

---

## Acceptance Criteria

- [ ] All hooks use same urgency thresholds
- [ ] getOrderUrgency() is single source of truth
- [ ] Existing unit tests updated
- [ ] Manual testing confirms consistent urgency display

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-27 | Created | From code review architecture findings |
