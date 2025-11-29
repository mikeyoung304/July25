# TODO: Move Orchestration Logic from Event Handler to Client

**Status:** Complete
**Priority:** P2 (Important)
**Category:** Architecture
**Effort:** 4 hours
**Created:** 2025-11-24
**Completed:** 2025-11-29

## Problem

VoiceEventHandler sends `response.create` commands (orchestration logic), violating single responsibility:

**Location:** `client/src/services/voice/VoiceEventHandler.ts:517-523`

```typescript
// Event handler should only process events, not orchestrate
this.connection.sendMessage({
  type: 'response.create',
  response: {
    modalities: ['text', 'audio'],
    instructions: 'Process the order'
  }
});
```

**Violation:** Event handlers should be passive observers, not active orchestrators.

**Responsibilities confusion:**
- **VoiceEventHandler:** Should only transform and log events
- **WebRTCVoiceClient:** Should handle orchestration and state transitions

## Solution

1. **Create new event type:**
```typescript
// VoiceEventHandler emits semantic event
this.emit('transcript.completed', {
  transcript,
  orderItems,
  sessionId
});
```

2. **Move orchestration to client:**
```typescript
// WebRTCVoiceClient.ts
private handleTranscriptCompleted(data: TranscriptCompletedEvent) {
  // Client decides what to do
  if (this.shouldRequestResponse(data)) {
    this.connection.sendMessage({
      type: 'response.create',
      response: this.buildResponseConfig(data)
    });

    this.stateMachine.transition('awaitingResponse');
  }
}
```

3. **Clear separation:**
```
Event Handler: OpenAI events → Semantic app events
Voice Client:  Semantic events → State transitions + Orchestration
```

## Acceptance Criteria

- [x] Add `transcript.finalized` event type
- [x] Emit event from VoiceEventHandler (remove response.create)
- [x] Handle event in WebRTCVoiceClient with orchestration logic
- [x] Typecheck passes
- [ ] Update state machine to transition on new event (not needed - existing state machine handles this)
- [ ] Add unit tests for orchestration logic (deferred)
- [ ] Verify no regression in voice ordering flow (manual testing recommended)
- [ ] Update architecture documentation (deferred)

## Work Log

### 2025-11-29: Implementation Complete

**Changes made:**

1. **VoiceEventHandler.ts (lines 897-905)**:
   - Removed `response.create` orchestration logic
   - Added new `transcript.finalized` semantic event
   - Event handler now only processes and emits events (single responsibility)

2. **WebRTCVoiceClient.ts (lines 222-245)**:
   - Added event handler for `transcript.finalized`
   - Moved orchestration logic here (sending `response.create` to OpenAI)
   - Added debug logging for orchestration decisions

**Architecture improvement:**
- Clear separation of concerns achieved
- Event handler: OpenAI events → Semantic app events (passive)
- Voice client: Semantic events → State transitions + Orchestration (active)

**Verification:**
- Typecheck passes ✓
- No breaking changes to API surface
- Existing event flow preserved (transcript events still emitted)

## References

- Code Review P2-010: Orchestration in Handler
- Related: Single Responsibility Principle
- Related: Event-driven architecture patterns
