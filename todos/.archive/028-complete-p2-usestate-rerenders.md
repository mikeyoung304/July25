# TODO: Consolidate useState to useReducer in Voice Hook

**Status:** Complete
**Priority:** P2 (Important)
**Category:** Performance
**Effort:** 4 hours
**Created:** 2025-11-24
**Completed:** 2025-11-29 (verified already implemented)

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

- [x] Create voiceReducer with all state and actions
- [x] Replace useState calls with useReducer
- [x] Update all setState calls to dispatch actions
- [ ] Measure re-render count before/after (React DevTools) - N/A (implemented before measurement)
- [x] Verify no regression in functionality
- [ ] Add unit tests for reducer logic - Deferred (test file exists but skipped)

## Work Log

**2025-11-29:** Verified implementation already complete in `client/src/pages/hooks/useVoiceOrderWebRTC.ts`:
- Lines 1: `import { useReducer, useCallback, useRef, useEffect } from 'react'`
- Lines 33-42: `VoiceOrderState` interface with 8 consolidated state properties
- Lines 44-57: `VoiceOrderAction` discriminated union type
- Lines 70-110+: `voiceOrderReducer` function with all action handlers
- Comment on line 31: "VOICE ORDER STATE & REDUCER (Consolidated from 8 useState calls)"

The refactor was completed as part of the original voice ordering implementation.

## References

- Code Review P2-005: useState Re-renders
- React docs: useReducer for complex state
- Related: React performance optimization patterns
