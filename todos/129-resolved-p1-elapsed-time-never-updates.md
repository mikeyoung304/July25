---
status: pending
priority: p1
issue_id: "129"
tags: [code-review, performance, ux, kitchen]
dependencies: []
---

# TODO-129: ReadyOrderCard elapsed time never updates after mount

## Problem Statement

The `ReadyOrderCard` component in `ExpoTabContent.tsx` calculates elapsed time using `useMemo` with only `order.created_at` as a dependency. This means the timer value is frozen at mount time and never updates, causing orders to display incorrect wait times.

**Why it matters:** Kitchen staff rely on accurate timing to prioritize orders. An order waiting 25 minutes will still show "5m" if that was the elapsed time when the component mounted. This breaks urgency indicators and user trust.

## Findings

### Evidence
```typescript
// ExpoTabContent.tsx:22-36
const { elapsedMinutes, urgencyColor, cardColor } = useMemo(() => {
  const created = new Date(order.created_at)
  const now = new Date()  // This "now" is captured at mount time only!
  const elapsed = Math.floor((now.getTime() - created.getTime()) / 60000)
  // ...
}, [order.created_at])  // Missing dependency on current time
```

### Impact
- Orders show stale elapsed times (could be 20+ minutes off)
- Urgency colors don't change (stuck at green even for 30min orders)
- Staff may deprioritize urgent orders thinking they're recent

## Proposed Solutions

### Solution 1: Add interval-based timer (Recommended)
Add a `useEffect` that updates elapsed time every 60 seconds.

**Pros:** Accurate times, consistent with OrderCard pattern
**Cons:** Additional re-renders every minute
**Effort:** Small
**Risk:** Low

```typescript
const [now, setNow] = useState(Date.now())

useEffect(() => {
  const interval = setInterval(() => setNow(Date.now()), 60000)
  return () => clearInterval(interval)
}, [])

const elapsedMinutes = Math.floor((now - new Date(order.created_at).getTime()) / 60000)
```

### Solution 2: Use shared clock hook
Create a global clock hook that all time-dependent components subscribe to.

**Pros:** Single source of truth, efficient
**Cons:** More infrastructure, overkill for 2-3 components
**Effort:** Medium
**Risk:** Low

### Solution 3: Remove useMemo entirely
Calculate on every render since it's a simple operation.

**Pros:** Always accurate, simplest fix
**Cons:** Slightly less efficient (negligible for this calculation)
**Effort:** Small
**Risk:** Low

## Recommended Action
<!-- To be filled during triage -->

## Technical Details

**Affected Files:**
- `client/src/components/kitchen/ExpoTabContent.tsx:22-36`

**Related Patterns:**
- `OrderCard.tsx` uses similar pattern but issue may exist there too
- `KDS_THRESHOLDS` from shared config should be used for threshold values

## Acceptance Criteria

- [ ] Elapsed time updates while component is mounted
- [ ] Urgency colors change appropriately (green → red at 20min)
- [ ] No memory leaks from intervals (proper cleanup)
- [ ] Timer synchronized with minute boundaries for consistency

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Identified during parallel agent review |

## Resources

- PR: Current uncommitted changes
- Similar pattern: `client/src/components/kitchen/OrderCard.tsx`
- KDS config: `shared/config/kds.ts`
