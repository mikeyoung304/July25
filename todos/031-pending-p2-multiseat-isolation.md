# TODO: Extract Multi-Seat Logic from Voice Hook

**Status:** DEFERRED (See: 031-deferred-multiseat-extraction-analysis.md)
**Priority:** P2 (Important)
**Category:** Architecture
**Effort:** Would require 10-15 hours (original estimate: 5 hours)
**Created:** 2025-11-24
**Deferred:** 2025-11-27
**Deferral Reason:** High risk of atomic state machine violations and circular dependencies

## Problem

Multi-seat ordering state is mixed with voice ordering state in the same hook:

**Location:** `client/src/hooks/useVoiceOrderWebRTC.ts:44-46, 217-263`

```typescript
// Voice ordering state
const [isConnected, setIsConnected] = useState(false);
const [transcript, setTranscript] = useState('');

// Multi-seat state mixed in
const [seats, setSeats] = useState<Seat[]>([]);
const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
```

**Violations:**
- Single Responsibility Principle
- Separation of Concerns
- Makes hook difficult to test and maintain
- Creates unnecessary coupling

## Solution

Extract multi-seat logic to a dedicated hook:

```typescript
// hooks/useMultiSeatOrdering.ts
export function useMultiSeatOrdering() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);

  const addSeat = useCallback(() => {
    const newSeat = { id: generateId(), items: [] };
    setSeats(prev => [...prev, newSeat]);
    setActiveSeatId(newSeat.id);
  }, []);

  const switchSeat = useCallback((seatId: string) => {
    setActiveSeatId(seatId);
  }, []);

  return {
    seats,
    activeSeatId,
    addSeat,
    switchSeat,
    // ... other multi-seat operations
  };
}
```

**Compose hooks in component:**
```typescript
function VoiceOrderPage() {
  const voice = useVoiceOrderWebRTC();
  const multiSeat = useMultiSeatOrdering();

  // Clear separation of concerns
}
```

## Acceptance Criteria

- [ ] Create new `useMultiSeatOrdering.ts` hook
- [ ] Move all seat-related state and logic
- [ ] Remove multi-seat code from voice hook
- [ ] Update components to use both hooks
- [ ] Add unit tests for multi-seat hook
- [ ] Verify no regression in functionality
- [ ] Update documentation with hook composition pattern

## Analysis & Deferral Decision

**⚠️ IMPORTANT:** This TODO has been analyzed and **DEFERRED**. The actual codebase differs from the description above.

See detailed analysis: [031-deferred-multiseat-extraction-analysis.md](./031-deferred-multiseat-extraction-analysis.md)

### Key Findings:
1. **Actual Code:** Already uses `useReducer` (not multiple useState calls)
2. **Coupling Problem:** `ORDER_SUBMITTED` action atomically updates 7 state properties across both multi-seat and voice domains
3. **Risk:** Extraction would break atomic updates, create circular dependencies, and complicate metrics integration
4. **Recommendation:** DEFER until test coverage is added and metrics system is refactored
5. **Alternative:** Add documentation explaining the intentional co-location design

### Files Involved
- Implementation: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/hooks/useVoiceOrderWebRTC.ts`
- Consumers:
  - `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/ServerView.tsx`
  - `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/components/SeatSelectionModal.tsx`
  - `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/components/PostOrderPrompt.tsx`

## References

- Code Review P2-008: Multi-Seat Isolation
- React docs: Composing hooks
- Related: Separation of concerns patterns
- Detailed Analysis: [031-deferred-multiseat-extraction-analysis.md](./031-deferred-multiseat-extraction-analysis.md)
