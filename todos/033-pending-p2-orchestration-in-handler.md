# TODO: Move Orchestration Logic from Event Handler to Client

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Architecture
**Effort:** 4 hours
**Created:** 2025-11-24

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

- [ ] Add `transcript.completed` event type
- [ ] Emit event from VoiceEventHandler (remove response.create)
- [ ] Handle event in WebRTCVoiceClient with orchestration logic
- [ ] Update state machine to transition on new event
- [ ] Add unit tests for orchestration logic
- [ ] Verify no regression in voice ordering flow
- [ ] Update architecture documentation

## References

- Code Review P2-010: Orchestration in Handler
- Related: Single Responsibility Principle
- Related: Event-driven architecture patterns
