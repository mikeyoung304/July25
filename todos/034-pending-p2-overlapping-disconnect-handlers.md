# TODO: Consolidate Overlapping Disconnect Handlers

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Bug Risk
**Effort:** 3 hours
**Created:** 2025-11-24

## Problem

Three different handlers can call `handleDisconnection()`, risking double disconnection:

**Location:** `server/src/services/voice/WebRTCConnection.ts:474-543`

```typescript
// Handler 1: onconnectionstatechange
peerConnection.onconnectionstatechange = () => {
  if (state === 'disconnected' || state === 'failed') {
    this.handleDisconnection();
  }
};

// Handler 2: onicegatheringstatechange
peerConnection.onicegatheringstatechange = () => {
  if (state === 'complete') {
    this.handleDisconnection(); // Could overlap with handler 1
  }
};

// Handler 3: Data channel close
dataChannel.onclose = () => {
  this.handleDisconnection(); // Could overlap with handlers 1 & 2
};
```

**Risk:**
- Multiple calls to cleanup code
- Race conditions in cleanup
- Double-logging disconnections
- Potential memory leaks if cleanup not idempotent

## Solution

Make `onconnectionstatechange` the single source of truth:

```typescript
private disconnected = false; // Guard flag

private handleDisconnection() {
  // Make idempotent
  if (this.disconnected) {
    logger.debug('handleDisconnection already called, skipping');
    return;
  }
  this.disconnected = true;

  // Cleanup logic (now safe to call multiple times)
  this.cleanup();
}

// Primary handler - single source of truth
peerConnection.onconnectionstatechange = () => {
  const state = peerConnection.connectionState;

  if (state === 'disconnected' || state === 'failed' || state === 'closed') {
    this.handleDisconnection();
  }
};

// Remove handlers 2 & 3, or make them log-only
peerConnection.onicegatheringstatechange = () => {
  logger.debug('ICE gathering state', { state });
  // No disconnection handling
};

dataChannel.onclose = () => {
  logger.debug('Data channel closed');
  // No disconnection handling - will be caught by connection state
};
```

## Acceptance Criteria

- [ ] Add `disconnected` guard flag
- [ ] Make `handleDisconnection()` idempotent
- [ ] Remove duplicate disconnect logic from handlers 2 & 3
- [ ] Keep only `onconnectionstatechange` for disconnect handling
- [ ] Add tests for multiple handler invocations
- [ ] Verify single cleanup per connection
- [ ] Update documentation on disconnect flow

## References

- Code Review P2-011: Overlapping Disconnect Handlers
- Related: WebRTC connection lifecycle
- Related: Idempotent cleanup patterns
