# TODO-021: Add State Machine Transition for Error Events

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 021
- **Tags**: bug, voice, state-machine, error-handling, code-review
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Architecture Analysis

---

## Problem Statement

Error event handlers in `WebRTCVoiceClient` emit error events but do NOT transition the state machine to the ERROR state. This leaves the state machine stuck in its current state (e.g., AWAITING_TRANSCRIPT) even when an unrecoverable error has occurred, preventing user recovery.

The state machine has an ERROR state defined, but it's never actually used.

---

## Findings

### Evidence Location
- `client/src/modules/voice/services/WebRTCVoiceClient.ts:163-165` - Error handler (no transition)
- `client/src/modules/voice/services/VoiceStateMachine.ts:42-51` - VoiceState enum (ERROR exists)
- `client/src/modules/voice/services/VoiceStateMachine.ts:220-330` - STATE_TRANSITIONS (no ERROR paths)

### Current Code (No State Transition)
```typescript
// Line 163-165: Error emitted but state machine not updated
private handleError(error: Error): void {
  logger.error('[WebRTC] Error occurred', { error: error.message });
  this.emit('error', error); // ❌ Emits error but doesn't transition state
}

// State machine stays in previous state (e.g., AWAITING_TRANSCRIPT)
// User sees "listening" UI but system is broken
```

### Error State Exists But Unused
```typescript
// VoiceStateMachine.ts line 42-51
export enum VoiceState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECORDING = 'RECORDING',
  // ... other states
  ERROR = 'ERROR', // ✅ Defined but never transitioned to
}
```

### Error Scenario
```typescript
// User flow:
// 1. User starts voice order → State: RECORDING
// 2. WebRTC connection drops → handleError() called
// 3. Error emitted → User sees error toast
// 4. State machine: STILL in RECORDING
// 5. User tries to speak again → System appears ready but is broken
// 6. No way to recover without page reload
```

### Impact
- State machine stuck in non-error state after error
- UI shows "ready" but system is broken
- User cannot retry or recover
- Error state never tracked in state history
- Debugging difficult (state doesn't reflect reality)

---

## Proposed Solutions

### Option A: Add ERROR_OCCURRED Event Transition (Recommended)
**Pros**: Clean, uses existing FSM system, traceable
**Cons**: Must define transitions from all states
**Effort**: Medium (3-4 hours)
**Risk**: Low - standard FSM pattern

**Implementation**:
```typescript
// VoiceStateMachine.ts: Add ERROR_OCCURRED event
export enum VoiceEvent {
  // ... existing events
  ERROR_OCCURRED = 'ERROR_OCCURRED',
}

// VoiceStateMachine.ts: Allow ERROR from any state
const STATE_TRANSITIONS: Record<VoiceState, Partial<Record<VoiceEvent, VoiceState>>> = {
  [VoiceState.IDLE]: {
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    // ... other transitions
  },
  [VoiceState.CONNECTING]: {
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    // ... other transitions
  },
  [VoiceState.RECORDING]: {
    [VoiceEvent.ERROR_OCCURRED]: VoiceState.ERROR,
    // ... other transitions
  },
  // ... repeat for all states
  [VoiceState.ERROR]: {
    [VoiceEvent.RESET]: VoiceState.IDLE, // Allow recovery
  },
};

// WebRTCVoiceClient.ts: Transition on error
private handleError(error: Error): void {
  logger.error('[WebRTC] Error occurred', { error: error.message });
  this.stateMachine.transition(VoiceEvent.ERROR_OCCURRED); // ✅ Update state
  this.emit('error', error);
}
```

### Option B: Use forceState() for Errors
**Pros**: Simple, works immediately
**Cons**: Bypasses FSM validation, loses transition history
**Effort**: Low (1-2 hours)
**Risk**: Medium - less traceable

**Implementation**:
```typescript
// WebRTCVoiceClient.ts: Force error state
private handleError(error: Error): void {
  logger.error('[WebRTC] Error occurred', { error: error.message });
  this.stateMachine.forceState(VoiceState.ERROR, 'error');
  this.emit('error', error);
}
```

### Option C: Add Global ERROR Wildcard Transition
**Pros**: Single definition, works from any state
**Cons**: Requires FSM refactor to support wildcards
**Effort**: High (6-8 hours)
**Risk**: High - major FSM architecture change

---

## Recommended Action

**Option A** - Add ERROR_OCCURRED event and transitions:

1. Add `ERROR_OCCURRED` to VoiceEvent enum
2. Add `ERROR_OCCURRED` transition from ALL states → ERROR
3. Add `RESET` event transition from ERROR → IDLE (for recovery)
4. Update `handleError()` to call `stateMachine.transition(ERROR_OCCURRED)`
5. Update UI to show error state with "Retry" button
6. Add unit tests for error transitions from each state
7. Add integration test: error during recording transitions to ERROR
8. Add integration test: RESET from ERROR returns to IDLE

---

## Technical Details

### Affected Files
- `client/src/modules/voice/services/VoiceStateMachine.ts` (add event/transitions)
- `client/src/modules/voice/services/WebRTCVoiceClient.ts` (call transition)
- `client/src/modules/voice/components/VoiceOrderModal.tsx` (handle ERROR state)
- `client/src/modules/voice/services/__tests__/VoiceStateMachine.test.ts` (add tests)

### State Transition Map
```typescript
// All states should allow ERROR transition:
IDLE → ERROR_OCCURRED → ERROR
CONNECTING → ERROR_OCCURRED → ERROR
CONNECTED → ERROR_OCCURRED → ERROR
RECORDING → ERROR_OCCURRED → ERROR
COMMITTING_AUDIO → ERROR_OCCURRED → ERROR
AWAITING_TRANSCRIPT → ERROR_OCCURRED → ERROR
AWAITING_RESPONSE → ERROR_OCCURRED → ERROR

// Error recovery path:
ERROR → RESET → IDLE
```

### UI Changes Required
```typescript
// VoiceOrderModal.tsx: Handle ERROR state
function VoiceOrderModal() {
  const { voiceState } = useVoiceCommerce();

  if (voiceState === VoiceState.ERROR) {
    return (
      <div className="error-state">
        <p>Voice ordering encountered an error</p>
        <button onClick={handleReset}>Try Again</button>
      </div>
    );
  }

  // ... rest of component
}
```

### Error Recovery Flow
```typescript
// User clicks "Try Again" button
const handleReset = () => {
  // Transition ERROR → IDLE via RESET event
  stateMachine.transition(VoiceEvent.RESET);

  // Reconnect
  startVoiceOrder();
};
```

---

## Acceptance Criteria

- [ ] `ERROR_OCCURRED` event added to VoiceEvent enum
- [ ] `ERROR_OCCURRED` transition defined from all states to ERROR
- [ ] `RESET` event transition defined from ERROR to IDLE
- [ ] `handleError()` calls `stateMachine.transition(ERROR_OCCURRED)`
- [ ] UI shows error state with "Try Again" button
- [ ] Unit test: ERROR_OCCURRED from RECORDING → ERROR
- [ ] Unit test: ERROR_OCCURRED from AWAITING_TRANSCRIPT → ERROR
- [ ] Unit test: RESET from ERROR → IDLE
- [ ] Integration test: WebRTC error transitions to ERROR state
- [ ] Manual test: disconnect WiFi during voice order, verify ERROR state
- [ ] Manual test: click "Try Again", verify returns to IDLE and can retry

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From code review architecture analysis |

---

## Resources

- [ADR-012: Voice State Machine](docs/explanation/architecture-decisions/ADR-012-voice-state-machine.md)
- [Finite State Machine Error Handling](https://statecharts.dev/glossary/error-handling.html)
- [VoiceStateMachine Tests](client/src/modules/voice/services/__tests__/VoiceStateMachine.test.ts)

---

## Notes

Error recovery is critical for production voice ordering. Users should be able to retry after errors without reloading the page.

Consider adding telemetry to track ERROR state frequency and common error types.
