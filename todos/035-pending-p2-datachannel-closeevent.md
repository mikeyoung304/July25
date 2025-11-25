# TODO: Fix RTCDataChannel Close Event Type Casting

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Bug
**Effort:** 1 hour
**Created:** 2025-11-24

## Problem

RTCDataChannel close event is incorrectly cast to CloseEvent (WebSocket type):

**Location:** `server/src/services/voice/WebRTCConnection.ts:442-465`

```typescript
dataChannel.onclose = (event: CloseEvent) => {
  logger.info('Data channel closed', {
    wasClean: event.wasClean,      // ❌ undefined - not on RTCDataChannel events
    code: event.code,              // ❌ undefined
    reason: event.reason           // ❌ undefined
  });
};
```

**Issue:** RTCDataChannel fires a plain `Event`, not a `CloseEvent`. The CloseEvent properties (`wasClean`, `code`, `reason`) are specific to WebSockets.

## Solution

Remove incorrect CloseEvent properties and use connection state instead:

```typescript
dataChannel.onclose = (event: Event) => {
  const connectionState = this.peerConnection.connectionState;
  const iceState = this.peerConnection.iceConnectionState;

  logger.info('Data channel closed', {
    // Use actual available information
    connectionState,
    iceState,
    sessionActive: this.sessionActive,
    timestamp: Date.now(),
    // event object has no useful properties for RTCDataChannel
  });

  // Check if this was a clean closure
  const wasClean = connectionState === 'closed' && this.sessionActive;

  if (!wasClean) {
    logger.warn('Data channel closed unexpectedly', {
      connectionState,
      iceState
    });
  }
};
```

**Type safety:**
```typescript
// Add type annotation to prevent future mistakes
interface RTCDataChannelHandlers {
  onclose: (this: RTCDataChannel, ev: Event) => void; // Not CloseEvent
  onerror: (this: RTCDataChannel, ev: Event) => void;
  onmessage: (this: RTCDataChannel, ev: MessageEvent) => void;
}
```

## Acceptance Criteria

- [ ] Change event type from `CloseEvent` to `Event`
- [ ] Remove references to `wasClean`, `code`, `reason`
- [ ] Use `peerConnection.connectionState` to determine clean closure
- [ ] Update logging to use available information
- [ ] Add TypeScript interface for data channel handlers
- [ ] Test data channel closure scenarios
- [ ] Update WebRTC documentation with correct types

## References

- Code Review P2-012: DataChannel CloseEvent
- MDN: RTCDataChannel.onclose
- Related: WebRTC vs WebSocket API differences
