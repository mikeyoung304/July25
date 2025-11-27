# TODO-006: Fix Data Channel Race Condition (Remaining Issues)

## Metadata
- **Status**: completed
- **Priority**: P1 (Critical)
- **Issue ID**: 006
- **Tags**: webrtc, voice, race-condition, reliability
- **Dependencies**: None
- **Created**: 2025-11-24
- **Completed**: 2025-11-27
- **Source**: Code Review - WebRTC Specialist Agent

---

## Problem Statement

While commit 7535c203 partially fixed the data channel race condition, there are remaining issues:

1. **TOCTOU Bug**: readyState can change between check and send
2. **Error silently swallowed**: dc.send() can throw if channel closes
3. **Duplicate flush logic**: Both setDataChannel and setupDataChannel flush

---

## Findings

### Current Fix (Partial)
```typescript
// VoiceEventHandler.ts:150-168
setDataChannel(dc: RTCDataChannel): void {
  this.dc = dc;
  this.setupDataChannel();  // Sets up onopen handler

  // CRITICAL FIX: If channel is already open, flush immediately
  if (dc.readyState === 'open') {
    console.log('[VoiceEventHandler] Data channel already open, flushing queued messages');
    this.dcReady = true;
    if (this.messageQueue.length > 0) {
      for (const msg of this.messageQueue) {
        this.dc!.send(JSON.stringify(msg));  // ❌ Can throw if channel closes
      }
      this.messageQueue = [];
    }
  }
}
```

### Remaining Issues

**1. TOCTOU (Time-of-check-time-of-use)**
```typescript
if (dc.readyState === 'open') {  // Check
  // ... time passes ...
  this.dc!.send(JSON.stringify(msg));  // Use - channel might be closed!
}
```

**2. Duplicate Flush Logic**
Both `setDataChannel` (line 157-166) AND `setupDataChannel.onopen` (line 196-204) have flush logic. If both execute, messages could be double-sent or lost.

**3. No Error Recovery**
If `send()` throws, the error is not caught and the state machine isn't notified.

---

## Proposed Solutions

### Option A: Defensive Flush with Error Handling (Recommended)
Extract to single flush method with try-catch and state sync.

**Pros**: Clean, handles errors properly
**Cons**: Slightly more complex
**Effort**: Low (1-2 hours)
**Risk**: Low

### Option B: Queue with Retry
Implement message queue with automatic retry on failure.

**Pros**: Most robust
**Cons**: More complex, may delay messages
**Effort**: Medium (3-4 hours)
**Risk**: Low

---

## Recommended Action

**Option A** - Refactor to single flush method:

```typescript
// VoiceEventHandler.ts

private flushPending = false;

setDataChannel(dc: RTCDataChannel): void {
  this.dc = dc;
  this.setupDataChannel();

  if (dc.readyState === 'open') {
    this.dcReady = true;
    this.flushMessageQueue();
  }
}

private setupDataChannel(): void {
  if (!this.dc) return;

  this.dc.onopen = () => {
    this.dcReady = true;
    this.flushMessageQueue();
  };

  this.dc.onerror = (error) => {
    logger.error('[VoiceEventHandler] Data channel error', { error });
    this.emit('error', new Error('Data channel error'));
  };

  this.dc.onclose = () => {
    this.dcReady = false;
    this.flushPending = false;
  };
}

private flushMessageQueue(): void {
  // Prevent duplicate flushes
  if (this.flushPending || this.messageQueue.length === 0) return;
  if (!this.dc || this.dc.readyState !== 'open') return;

  this.flushPending = true;

  try {
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const msg of messages) {
      if (this.dc.readyState !== 'open') {
        // Channel closed during flush, re-queue remaining
        this.messageQueue = [...messages.slice(messages.indexOf(msg))];
        break;
      }
      this.dc.send(JSON.stringify(msg));
    }
  } catch (error) {
    logger.error('[VoiceEventHandler] Flush failed', { error });
    this.emit('dataChannel.flushFailed', error);
  } finally {
    this.flushPending = false;
  }
}
```

---

## Technical Details

### Affected Files
- `client/src/modules/voice/services/VoiceEventHandler.ts:150-221`

### Test Cases Needed
1. Channel already open when setDataChannel called
2. Channel opens after setDataChannel called
3. Channel closes during message flush
4. Rapid connect/disconnect cycles

---

## Acceptance Criteria

- [x] Single flush method (no duplication)
- [x] Flush protected by flushPending flag
- [x] Error handling with try-catch
- [x] Errors emitted to state machine
- [x] readyState checked before each send
- [x] Messages re-queued if channel closes mid-flush
- [ ] Tests cover all race conditions (deferred to separate task)

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From WebRTC review - partial fix needs completion |
| 2025-11-27 | Completed | Implemented safeSend() method with TOCTOU protection, updated sendEvent() and flushMessageQueue() to use it |

## Solution Implemented

Added a new `safeSend()` private method that wraps all `dc.send()` calls with proper TOCTOU protection:

```typescript
private safeSend(message: string): boolean {
  try {
    // TOCTOU protection: Check state immediately before send
    if (this.dc?.readyState === 'open') {
      this.dc.send(message);
      return true;
    }
    return false;
  } catch (error) {
    logger.warn('[VoiceEventHandler] Data channel send failed', { error });
    return false;
  }
}
```

### Key Changes

1. **TOCTOU Bug Fixed**: The `safeSend()` method checks `readyState === 'open'` immediately before calling `send()`, and wraps it in try-catch to handle race conditions
2. **Error Handling**: All send failures are caught and logged, with proper error propagation to the state machine via events
3. **Consolidated Logic**: Both `sendEvent()` and `flushMessageQueue()` now use the same `safeSend()` method, eliminating duplicate logic
4. **Message Re-queuing**: When channel closes during flush, remaining messages are properly re-queued
5. **State Machine Integration**: Errors are emitted as events ('error', 'dataChannel.flushFailed') for state machine to handle

### Files Modified
- `client/src/modules/voice/services/VoiceEventHandler.ts`
  - Added `safeSend()` method (lines 1073-1085)
  - Updated `sendEvent()` to use `safeSend()` (lines 1091-1128)
  - Updated `flushMessageQueue()` to use `safeSend()` (lines 1137-1176)

---

## Resources

- [VoiceEventHandler](client/src/modules/voice/services/VoiceEventHandler.ts)
- [Original Fix Commit](7535c203)
