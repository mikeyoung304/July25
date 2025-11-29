---
status: pending
priority: p1
issue_id: "096"
tags: [code-review, data-integrity, race-condition, pr-148]
dependencies: []
---

# Non-Atomic Payment Success Flow - Table State Inconsistency

## Problem Statement

The `handlePaymentSuccess` function performs multiple operations (table status update, state reset, toast) that are NOT atomic. If any operation fails mid-flow, the system ends up in an inconsistent state where payment succeeded but table remains "occupied."

**Why it matters:** Silent failures in payment success flow create "ghost tables" that appear occupied but have no active orders, requiring manual database intervention.

## Findings

### Data Integrity Guardian
- **File:** `client/src/pages/ServerView.tsx:178-205`
- **Evidence:**
```typescript
const handlePaymentSuccess = useCallback(async () => {
  logger.info('[handlePaymentSuccess] Payment completed', {
    tableId: paymentState.table_id
  })

  // ⚠️ NON-ATOMIC OPERATIONS - Can fail partway through
  if (paymentState.table_id) {
    try {
      await patch(`/api/v1/tables/${paymentState.table_id}/status`, {
        status: 'available'
      })
      // ❌ If this succeeds but next operations fail, state is inconsistent
    } catch (error) {
      logger.error('[handlePaymentSuccess] Failed to update table status', { error })
      // ⚠️ Error is logged but not propagated - silent failure
    }
  }

  // ❌ State reset happens EVEN IF table update failed
  setPaymentState(initialPaymentState)
  voiceOrder.handleFinishTable()
  setSelectedTableId(null)
  setSelectedSeat(null)
  setShowSeatSelection(false)

  toast.success('Payment complete! Table is now available.')  // ⚠️ Shown even if failed
}, [...])
```

### Architecture Strategist
- **Additional Issue:** `onUpdateTableStatus` callback (lines 214-221) duplicates this logic, creating two code paths for table status updates

### Failure Scenarios
1. Payment succeeds → Table update fails → Client shows success → Table stuck as "occupied"
2. Payment succeeds → Table update succeeds → `voiceOrder.handleFinishTable()` throws → State partially reset
3. Network timeout during table update → User sees success but table not updated

## Proposed Solutions

### Option A: Wrap in Try-Catch with Rollback (Recommended)
**Pros:** Prevents false success messages, clear error handling
**Cons:** More complex error handling
**Effort:** Medium (20 minutes)
**Risk:** Low

```typescript
const handlePaymentSuccess = useCallback(async () => {
  try {
    // Update table status first - this is the critical operation
    if (paymentState.table_id) {
      await patch(`/api/v1/tables/${paymentState.table_id}/status`, {
        status: 'available'
      });
    }

    // Only reset state and show success if table update succeeded
    setPaymentState(initialPaymentState);
    voiceOrder.handleFinishTable();
    setSelectedTableId(null);
    setSelectedSeat(null);
    setShowSeatSelection(false);

    toast.success('Payment complete! Table is now available.');
  } catch (error) {
    logger.error('[handlePaymentSuccess] Failed to complete payment flow', { error });
    toast.error('Payment recorded but table status update failed. Please refresh.');
    // Keep modal open or show retry option
  }
}, [...]);
```

### Option B: Optimistic UI with Background Retry
**Pros:** Better UX, eventual consistency
**Cons:** More complex, potential for stuck state
**Effort:** Large
**Risk:** Medium

### Option C: Remove Table Status Update from Client
**Pros:** Simpler, server handles everything
**Cons:** Requires backend changes
**Effort:** Medium
**Risk:** Low

Have the payment API endpoint update table status atomically on the server.

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:** `client/src/pages/ServerView.tsx:178-205, 214-221`
- **Components:** ServerView, handlePaymentSuccess, handleUpdateTableStatus
- **Database Changes:** None
- **Related API:** `PATCH /api/v1/tables/:id/status`

## Acceptance Criteria

- [ ] Table update failure prevents false success message
- [ ] User sees clear error if any operation fails
- [ ] Duplicate table update logic consolidated
- [ ] Tests verify error handling scenarios

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
- **Pattern:** Atomic operations in distributed systems
