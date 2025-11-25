# TODO: Extract Multi-Seat Logic from Voice Hook

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Architecture
**Effort:** 5 hours
**Created:** 2025-11-24

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

## References

- Code Review P2-008: Multi-Seat Isolation
- React docs: Composing hooks
- Related: Separation of concerns patterns
