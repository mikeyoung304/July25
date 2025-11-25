# TODO: Consolidate useState to useReducer in Voice Hook

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Performance
**Effort:** 4 hours
**Created:** 2025-11-24

## Problem

The voice ordering hook uses 10 separate useState calls, causing 3-4 re-renders per user interaction:

**Location:** `client/src/hooks/useVoiceOrderWebRTC.ts`

**Current pattern:**
```typescript
const [isConnected, setIsConnected] = useState(false);
const [isListening, setIsListening] = useState(false);
const [transcript, setTranscript] = useState('');
const [orderSummary, setOrderSummary] = useState<OrderItem[]>([]);
// ... 6 more useState calls
```

**Impact:**
- Multiple state updates trigger multiple re-renders
- Wasteful DOM reconciliation (even if no visual change)
- Battery drain on mobile devices
- Poor performance on low-end devices

## Solution

Consolidate to a single useReducer for atomic state updates:

```typescript
interface VoiceState {
  isConnected: boolean;
  isListening: boolean;
  transcript: string;
  orderSummary: OrderItem[];
  error: string | null;
  sessionId: string | null;
  // ... all state in one object
}

type VoiceAction =
  | { type: 'CONNECTED'; sessionId: string }
  | { type: 'LISTENING_STARTED' }
  | { type: 'TRANSCRIPT_UPDATE'; transcript: string; orderSummary: OrderItem[] }
  | { type: 'ERROR'; error: string }
  | { type: 'DISCONNECTED' };

const [state, dispatch] = useReducer(voiceReducer, initialState);
```

**Benefits:**
- Single re-render per action (not 3-4)
- Predictable state transitions
- Easier testing of state logic
- Better debugging with Redux DevTools

## Acceptance Criteria

- [ ] Create voiceReducer with all state and actions
- [ ] Replace useState calls with useReducer
- [ ] Update all setState calls to dispatch actions
- [ ] Measure re-render count before/after (React DevTools)
- [ ] Verify no regression in functionality
- [ ] Add unit tests for reducer logic

## References

- Code Review P2-005: useState Re-renders
- React docs: useReducer for complex state
- Related: React performance optimization patterns
