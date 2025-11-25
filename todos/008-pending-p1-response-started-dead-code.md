# TODO-008: Fix RESPONSE_STARTED Dead Code Path

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 008
- **Tags**: state-machine, voice, dead-code, architecture
- **Dependencies**: 001 (related to state management)
- **Created**: 2025-11-24
- **Source**: Code Review - State Machine Debugger Agent

---

## Problem Statement

The `VoiceEvent.RESPONSE_STARTED` event is defined in the state machine but NEVER fired from VoiceEventHandler. This means:

1. Dead code path in transition table
2. FSM is blind to response lifecycle
3. Can't track when AI starts responding

---

## Findings

### Defined But Never Used
```typescript
// VoiceStateMachine.ts:70 - Event defined
export enum VoiceEvent {
  // ...
  RESPONSE_STARTED = 'RESPONSE_STARTED',  // ❌ Never fired
  // ...
}

// VoiceStateMachine.ts:151 - Transition defined (self-loop)
[VoiceState.AWAITING_RESPONSE]: {
  [VoiceEvent.RESPONSE_STARTED]: VoiceState.AWAITING_RESPONSE,  // ❌ Unreachable
  [VoiceEvent.RESPONSE_COMPLETE]: VoiceState.IDLE,
}
```

### VoiceEventHandler - No Emission
```typescript
// VoiceEventHandler.ts:303-304
case 'response.created':
  this.handleResponseCreated(event as ResponseCreatedEvent);
  break;

// handleResponseCreated (line 544-556) - No state machine transition!
private handleResponseCreated(event: ResponseCreatedEvent): void {
  this.currentAssistantTranscript = '';
  // ... initializes response but NEVER emits RESPONSE_STARTED
}
```

### WebRTCVoiceClient - No Handler
```typescript
// WebRTCVoiceClient.ts:155-252 - Missing response.created handler
// Has handlers for:
// - session.created ✓
// - session.updated ✓
// - transcript ✓
// But NOT response.created!
```

---

## Proposed Solutions

### Option A: Wire Up the Event (Recommended)
Connect response.created to RESPONSE_STARTED transition.

**Pros**: FSM tracks full lifecycle, enables response timing
**Cons**: Adds one event listener
**Effort**: Very Low (30 min)
**Risk**: Very Low

### Option B: Remove Dead Code
Delete RESPONSE_STARTED from FSM entirely.

**Pros**: Clean up unused code
**Cons**: Lose ability to track response start
**Effort**: Very Low (15 min)
**Risk**: Very Low

---

## Recommended Action

**Option A** - Wire up the event:

```typescript
// VoiceEventHandler.ts - emit event
private handleResponseCreated(event: ResponseCreatedEvent): void {
  this.currentAssistantTranscript = '';
  // ... existing code ...

  // NEW: Emit event for state machine
  this.emit('response.started', {
    responseId: event.response?.id,
    timestamp: Date.now()
  });
}

// WebRTCVoiceClient.ts - handle event
this.eventHandler.on('response.started', (data) => {
  this.stateMachine.transition(VoiceEvent.RESPONSE_STARTED, data);
});
```

This enables:
- Tracking response timing
- Preventing race conditions (RESPONSE_COMPLETE before STARTED)
- Better debugging visibility

---

## Technical Details

### Affected Files
- `client/src/modules/voice/services/VoiceEventHandler.ts:544-556`
- `client/src/modules/voice/services/WebRTCVoiceClient.ts` (add handler)

### State Diagram Update
```
AWAITING_RESPONSE
    │
    ├── RESPONSE_STARTED ──► AWAITING_RESPONSE (self-loop, now reachable)
    │
    └── RESPONSE_COMPLETE ──► IDLE
```

---

## Acceptance Criteria

- [ ] VoiceEventHandler emits 'response.started' event
- [ ] WebRTCVoiceClient listens for 'response.started'
- [ ] State machine receives RESPONSE_STARTED transition
- [ ] Self-loop executes correctly (stays in AWAITING_RESPONSE)
- [ ] Debug logs show response lifecycle
- [ ] Tests cover response.started event flow

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From state machine review |

---

## Resources

- [VoiceStateMachine](client/src/modules/voice/services/VoiceStateMachine.ts)
- [VoiceEventHandler](client/src/modules/voice/services/VoiceEventHandler.ts)
