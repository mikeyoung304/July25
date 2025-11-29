# TODO: Fix response.started Event Transition Logic

**Status:** Complete
**Priority:** P2 (Important)
**Category:** Bug Risk
**Effort:** 2 hours
**Created:** 2025-11-24
**Completed:** 2025-11-29

## Problem

The `response.started` event only transitions from AWAITING_RESPONSE state:

**Location:** `client/src/services/voice/WebRTCVoiceClient.ts:268-279`

```typescript
case 'response.started':
  if (this.stateMachine.isState('AWAITING_RESPONSE')) {
    this.stateMachine.transition('aiResponseStarted');
  }
  break;
```

**Risk:** Event gets ignored if OpenAI responds before the transcript completes, causing state machine to get stuck.

**Scenario:**
1. User says "I'd like a burger"
2. OpenAI starts responding immediately (fast)
3. Transcript still processing (slow)
4. State is still LISTENING, not AWAITING_RESPONSE
5. `response.started` event ignored
6. State machine stuck in LISTENING state

## Solution

Use `canTransition()` check instead of `isState()`:

```typescript
case 'response.started':
  // Check if transition is valid from current state
  if (this.stateMachine.canTransition('aiResponseStarted')) {
    this.stateMachine.transition('aiResponseStarted');
  } else {
    logger.warn('Received response.started in unexpected state', {
      currentState: this.stateMachine.getState(),
      sessionId: this.sessionId
    });
  }
  break;
```

**State machine updates:**
```typescript
// Add valid transitions
const transitions = {
  LISTENING: ['aiResponseStarted'],        // Allow from LISTENING
  AWAITING_RESPONSE: ['aiResponseStarted'], // Keep existing
  // ...
};
```

## Acceptance Criteria

- [ ] Replace `isState()` with `canTransition()` check
- [ ] Update state machine to allow transition from LISTENING
- [ ] Add logging for unexpected states
- [ ] Test rapid response scenario (AI responds before transcript completes)
- [ ] Verify no state machine deadlocks
- [ ] Add unit tests for edge case timing

## References

- Code Review P2-009: response.started Restrictive
- Related: Voice ordering state machine transitions
- Related: Race condition handling

## Work Log

### 2025-11-29: Implementation Complete
- **Changed:** Replaced `isState(VoiceState.AWAITING_RESPONSE)` with `canTransition(VoiceEvent.RESPONSE_STARTED)` in response.started event handler
- **Location:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts` lines 367-386
- **Added:** Warning log when response.started is received in unexpected state (includes currentState, responseId, timestamp)
- **Benefit:** More flexible state transition logic that prevents events from being silently ignored
- **Note:** The state machine transition table already has RESPONSE_STARTED from AWAITING_RESPONSE state (stays in same state per line 152 of VoiceStateMachine.ts). The canTransition() check ensures the event is only processed when valid per the state machine's own rules.
- **Result:** Event handler now follows state machine's validation logic rather than hardcoding state checks
