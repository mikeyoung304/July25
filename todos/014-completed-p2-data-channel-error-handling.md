# TODO-014: Improve Data Channel Error Handling

## Metadata
- **Status**: completed
- **Priority**: P2 (Important)
- **Issue ID**: 014
- **Tags**: webrtc, voice, error-handling
- **Dependencies**: 006
- **Created**: 2025-11-24
- **Completed**: 2025-11-28
- **Source**: Code Review - WebRTC Specialist Agent

---

## Problem Statement

Data channel errors are logged but:
1. Emit raw Event instead of Error object
2. No distinction between normal close and error
3. State machine doesn't receive error notifications

---

## Findings

### Current Code
```typescript
// WebRTCConnection.ts:431-442
this.dc.onerror = (event: Event) => {
  console.error('[WebRTCConnection] Data channel error event:', {...});
  this.emit('error', event);  // ❌ Emits Event, not Error
};

this.dc.onclose = (event: Event) => {
  console.error('[WebRTCConnection] Data channel closed:', {...});
  this.handleDisconnection();  // ❌ No distinction between normal/error close
};
```

### VoiceEventHandler
```typescript
// VoiceEventHandler.ts:210-213
this.dc.onerror = (error) => {
  console.error('[VoiceEventHandler] Data channel error:', error);
  this.emit('error', error);  // Error recovery unclear
};
```

---

## Proposed Solutions

### Option A: Proper Error Objects (Recommended)
Emit Error objects with context for state machine handling.

**Effort**: Low (1 hour)
**Risk**: Low

---

## Recommended Action

```typescript
// WebRTCConnection.ts
this.dc.onerror = (event: Event) => {
  const error = new Error('Data channel error');
  error.name = 'DataChannelError';
  (error as any).originalEvent = event;

  logger.error('[WebRTCConnection] Data channel error', {
    readyState: this.dc?.readyState,
  });

  this.emit('error', error);
};

this.dc.onclose = (event: Event) => {
  const wasError = this.dc?.readyState === 'closing';

  logger.info('[WebRTCConnection] Data channel closed', {
    wasError,
    readyState: this.dc?.readyState,
  });

  if (wasError) {
    this.emit('error', new Error('Data channel closed unexpectedly'));
  }

  this.handleDisconnection();
};
```

---

## Technical Details

### Affected Files
- `client/src/modules/voice/services/WebRTCConnection.ts:431-442`
- `client/src/modules/voice/services/VoiceEventHandler.ts:210-213`

---

## Acceptance Criteria

- [ ] Error events emit proper Error objects
- [ ] Error includes context (readyState, etc.)
- [ ] Distinguish normal close from error close
- [ ] State machine transitions to ERROR state on data channel error
- [ ] User sees feedback when connection fails

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From WebRTC review |
| 2025-11-28 | Completed | Already fixed - WebRTCConnection.ts lines 441-477 implement proper Error objects, distinguish normal/error close via sessionActive flag |
