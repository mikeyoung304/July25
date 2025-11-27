# TODO-031: Extract Multi-Seat Logic from Voice Hook
## ANALYSIS & DEFERRAL DECISION

**Status:** DEFERRED (Previously: Pending)
**Priority:** P2 (Important)
**Category:** Architecture Refactoring
**Decision Date:** 2025-11-27
**Analysis Duration:** 1 hour
**Risk Assessment:** High

---

## Executive Summary

**RECOMMENDATION: DEFER THIS EXTRACTION**

After thorough code analysis, extracting multi-seat logic from `useVoiceOrderWebRTC` is **too risky** relative to the benefits. The multi-seat state is tightly coupled to voice ordering through atomic state transitions, making safe separation non-trivial.

---

## Actual Current State vs. TODO Description

### Discrepancy Found
The TODO-031 description references old code patterns that don't match the current implementation:
- **TODO says:** Multiple `useState` calls for seats, activeSeatId
- **Actual code:** Uses `useReducer` with consolidated state management
- **Implication:** The TODO description is stale and doesn't reflect the 2025-11-24 refactoring

### Current Implementation Review

**File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/hooks/useVoiceOrderWebRTC.ts` (415 lines)

#### Multi-Seat State Variables (Lines 39-42)
```typescript
interface VoiceOrderState {
  // ... voice state
  orderedSeats: number[]              // Track which seats have orders
  showPostOrderPrompt: boolean         // Multi-seat UI state
  lastCompletedSeat: number | null    // Track most recent completion
}
```

#### Related Reducer Actions
```typescript
| { type: 'ADD_ORDERED_SEAT'; payload: number }
| { type: 'SET_SHOW_POST_ORDER_PROMPT'; payload: boolean }
| { type: 'SET_LAST_COMPLETED_SEAT'; payload: number | null }
| { type: 'ORDER_SUBMITTED'; payload: number }  // ← CRITICAL COUPLING
```

---

## Risk Analysis: Why Extraction is Problematic

### 1. **Atomic State Machine Violation** (HIGHEST RISK)

The `ORDER_SUBMITTED` action updates 7 state properties **atomically**:

```typescript
case 'ORDER_SUBMITTED':
  return {
    ...state,
    // Multi-seat state
    orderedSeats: [...state.orderedSeats, action.payload],
    lastCompletedSeat: action.payload,
    showPostOrderPrompt: true,

    // Voice state (TIGHTLY COUPLED)
    orderItems: [],        // Clear current order
    orderNotes: '',        // Reset notes
    orderSessionId: null,  // End session
    isSubmitting: false    // Unblock UI
  }
```

**The Problem:**
- Splitting this into two reducers breaks atomicity
- Would require complex synchronization logic
- Risk of race conditions (e.g., showPostOrderPrompt updates before orderItems clear)
- Metrics tracking tied to this action would need refactoring

### 2. **Circular Dependencies** (HIGH RISK)

If extracted to `useMultiSeatOrder`:
```typescript
// Current working pattern
const submitOrder = useCallback(async (selectedTable, selectedSeat) => {
  // ... submission
  dispatch({ type: 'ORDER_SUBMITTED', payload: selectedSeat })
}, [state.orderItems, metrics, ...])

// After extraction: How does metrics flow?
// useMultiSeatOrder → needs metrics from voice hook?
// useVoiceOrderWebRTC → needs to know about seat changes?
```

The metrics system (line 124) depends on both voice state and seat completion. Extraction creates bidirectional dependency.

### 3. **Reset Logic Complexity** (MEDIUM-HIGH RISK)

Current code has **intentional semantic differences**:

```typescript
case 'RESET_VOICE_ORDER':
  // Preserves orderedSeats (user continues with table)
  return {
    showVoiceOrder: false,
    orderItems: [],
    orderNotes: '',
    showPostOrderPrompt: false,
    // orderedSeats INTENTIONALLY NOT CLEARED
  }

case 'RESET_ALL_STATE':
  // Clears everything (finishing table)
  return initialVoiceOrderState
```

**Extraction Problem:** These reset patterns are tightly coupled to the voice workflow. Separate hooks would need to coordinate resets, adding complexity.

### 4. **Component Integration Fragility** (MEDIUM RISK)

Current consumers (3 components):

**ServerView.tsx (lines 31-85):**
```typescript
const voiceOrder = useVoiceOrderWebRTC()

// Uses multi-seat state
orderedSeats={voiceOrder.orderedSeats}
completedSeat={voiceOrder.lastCompletedSeat}
showPostOrderPrompt={voiceOrder.showPostOrderPrompt}

// Mixed with voice handlers
onSubmit={handleSubmitOrder}
setShowVoiceOrder={voiceOrder.setShowVoiceOrder}
```

**After extraction:**
```typescript
const voiceOrder = useVoiceOrderWebRTC()
const multiSeat = useMultiSeatOrder()
// Now need to wire them together - increased prop drilling
```

This spreads the responsibility and makes the orchestration less clear.

### 5. **Testing Impact** (MEDIUM RISK)

- Current test file is `.skip`'d (line 1)
- No regression tests exist to verify extraction doesn't break functionality
- `ORDER_SUBMITTED` action has complex side effects that would be hard to test in isolation

### 6. **Lack of Test Coverage** (ADDS RISK)

The test file `useVoiceOrderWebRTC.test.tsx.skip` is **skipped**, meaning:
- Cannot confidently verify extraction doesn't break functionality
- No existing tests to validate multi-seat behavior
- Any extraction would be flying blind

---

## What Would Be Required for Safe Extraction

If we were to proceed (NOT RECOMMENDED), these steps would be necessary:

1. **Enable existing tests** first (if possible)
2. **Add comprehensive tests** for multi-seat logic:
   - Adding/completing seats
   - Reset behavior preservation
   - Metrics integration
   - Atomic transitions

3. **Refactor metrics system** to decouple from state machine:
   - Create metrics wrapper hook
   - Handle both voice and multi-seat metrics separately

4. **Create coordination logic** in parent component:
   - Show how hooks communicate
   - Handle complex reset scenarios
   - Ensure atomicity at component level

5. **Update all 3 consumers** (ServerView, SeatSelectionModal, PostOrderPrompt)

6. **Integration testing** across all three components

**Estimated Effort if Done Right:** 10-15 hours (vs. original 5-hour estimate)

---

## Current Code Quality Assessment

### What's Good About Current Implementation
- Uses `useReducer` for consolidated state (already follows composition patterns)
- Clear action types document all state transitions
- Semantic reset operations preserve UI state correctly
- Metrics integration is working

### What Could Be Improved (Without Extraction)
- Add comments explaining why multi-seat state lives here
- Document the atomic `ORDER_SUBMITTED` pattern
- Add unit tests for the reducer (when test file is enabled)
- Consider documentation of the reset semantics

---

## Recommended Alternative: Documentation Only

Instead of extraction, add inline documentation:

```typescript
// ============================================================================
// MULTI-SEAT STATE (Intentionally co-located with voice state)
// ============================================================================
// NOTE: Multi-seat state (orderedSeats, lastCompletedSeat, showPostOrderPrompt)
// lives in this hook because ORDER_SUBMITTED action must atomically update
// both multi-seat AND voice state together. Extracting these creates:
// 1. Race conditions (UI state vs. order items out of sync)
// 2. Circular dependencies (metrics system needs both)
// 3. Complex synchronization logic in parent component
//
// If these become problematic:
// - Option A: Enable the test file and add tests first
// - Option B: Create a higher-level state management (Context/Zustand)
// - Option C: Refactor metrics to decouple from state machine
// ============================================================================
```

---

## Decision Matrix

| Factor | Weight | Current | After Extraction | Impact |
|--------|--------|---------|------------------|--------|
| **Code organization** | 20% | ✓ Good (useReducer) | ✓ Better (separate) | Minor improvement |
| **Safety/Risk** | 35% | ✓ Working | ✗ Complex | **Major regression** |
| **Testability** | 20% | ✗ No tests | ✓ Easier to test | Helps, but doesn't offset |
| **Maintenance** | 15% | ✓ Contained | ✗ Distributed | **Major concern** |
| **Performance** | 10% | ✓ Optimal | ≈ Same | No difference |
| **TOTAL** | 100% | **GOOD** | **RISKY** | **DEFER** |

---

## When to Revisit This Decision

Extraction becomes viable when:
1. ✗ Test file is enabled and passing
2. ✗ Metrics system is refactored to be hook-agnostic
3. ✗ Component uses Context/Zustand (higher-level state management)
4. ✓ Multi-seat requirements expand significantly (current scope is minimal)

Current status: **0/4 conditions met**

---

## Lessons Learned Reference

This decision aligns with project principles:
- [CL-WS-001](/.claude/lessons/CL-WS-001-handler-timing-race.md): Avoid timing races with state splitting
- [ADR-006](explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md): Strategic co-location is acceptable when coupled

---

## Action Items

- [x] Analyze actual code vs. TODO description
- [x] Document coupling risks
- [x] Create decision matrix
- [x] Recommend deferral with detailed reasoning
- [ ] Update TODO status to "Deferred"
- [ ] Leave TODO file as reference for future decisions
- [ ] Consider adding documentation comments (optional)

---

## Conclusion

**DO NOT EXTRACT** multi-seat logic at this time.

The atomic state machine pattern and metrics coupling make this a higher-risk change than the organizational benefit justifies. The current `useReducer` approach already provides good separation of concerns through actions and clear state structure.

**Cost/Benefit Analysis:**
- **Benefit:** Slightly better code organization (minor)
- **Cost:** Potential for race conditions, coupling problems, maintenance complexity (major)
- **Verdict:** Risk > Benefit → DEFER

**Recommended Path Forward:** Add documentation inline explaining the co-location design decision, enable and fix tests when feasible.

---

**Decision Authority:** Code Architecture Review (2025-11-27)
**Review Status:** APPROVED - Deferred with documented reasoning
**Next Review:** When metrics system is refactored or test coverage improves
