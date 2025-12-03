---
status: resolved
priority: p2
issue_id: "138"
tags: [code-review, consistency, kitchen, config]
dependencies: []
resolved_date: 2025-12-02
---

# TODO-138: Hardcoded urgency threshold inconsistent with KDS config

## Problem Statement

`ReadyOrderCard` uses hardcoded 20-minute threshold for urgency, while other components use `KDS_THRESHOLDS.URGENT_MINUTES` (15 minutes). This creates inconsistent behavior where ready orders get 5 extra minutes before showing red.

## Findings

### Current Implementation (ExpoTabContent.tsx:30-33)
```typescript
if (elapsed >= 20) {  // Hardcoded!
  color = 'text-red-600'
  bg = 'bg-red-50 border-red-300'
}
```

### Shared config (shared/config/kds.ts)
```typescript
export const KDS_THRESHOLDS = {
  WARNING_MINUTES: 10,
  URGENT_MINUTES: 15,  // Should use this!
  // ...
}
```

### Other components use shared config
`OrderCard.tsx:31-42` uses `getOrderUrgency()` and `getUrgencyColorClass()`

## Proposed Solutions

### Solution 1: Use shared KDS utilities (Recommended)
**Effort:** Small | **Risk:** Low

```typescript
import { getOrderUrgency, getUrgencyColorClass } from '@rebuild/shared/config/kds'

const urgency = getOrderUrgency(order)
const colorClass = getUrgencyColorClass(urgency)
```

## Technical Details

**Affected Files:**
- `client/src/components/kitchen/ExpoTabContent.tsx:30-33`

## Acceptance Criteria

- [x] Uses KDS_THRESHOLDS from shared config
- [x] Urgency colors match other KDS components
- [x] No hardcoded timing values

## Resolution

Replaced hardcoded 20-minute threshold with `KDS_THRESHOLDS.URGENT_MINUTES` (15 minutes) and added warning state at 10 minutes using `KDS_THRESHOLDS.WARNING_MINUTES`. This ensures consistency with other KDS components.

**Changes made:**
1. Added import: `import { KDS_THRESHOLDS } from '@rebuild/shared/config/kds'`
2. Replaced hardcoded threshold check with:
   - Red urgency: `elapsed >= KDS_THRESHOLDS.URGENT_MINUTES` (15 min)
   - Yellow warning: `elapsed >= KDS_THRESHOLDS.WARNING_MINUTES` (10 min)
   - Green normal: Less than 10 minutes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Inconsistency with shared config |
| 2025-12-02 | Resolved | Used KDS_THRESHOLDS for consistency across all KDS components |
