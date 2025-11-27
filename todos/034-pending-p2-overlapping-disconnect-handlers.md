# TODO: Consolidate Overlapping Disconnect Handlers

**Status:** Completed
**Priority:** P2 (Important)
**Category:** Bug Risk
**Effort:** 3 hours
**Created:** 2025-11-24
**Completed:** 2025-11-27

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

## Solution (Implemented)

Added guard flag `isDisconnecting` to prevent duplicate disconnection handling:

```typescript
private isDisconnecting = false; // Guard flag

private handleDisconnection(): void {
  if (this.isDisconnecting) {
    if (this.config.debug) {
      logger.debug('[WebRTCConnection] handleDisconnection already in progress, skipping');
    }
    return;
  }

  this.isDisconnecting = true;

  if (this.config.debug) {
    logger.info('[WebRTCConnection] Handling disconnection');
  }

  this.setConnectionState('disconnected');
  this.sessionActive = false;

  // Emit disconnection event for orchestrator to handle
  this.emit('disconnection');
}
```

The flag is properly reset:
- On `disconnect()` call: flag set to `false` with other cleanup
- On new `connect()` call: flag reset to `false` before connection attempt
- Multiple handlers can safely call `handleDisconnection()` without side effects

All 5 potential disconnect trigger points now safely handled:
1. **oniceconnectionstatechange** (ICE failed/disconnected) - line 493
2. **onconnectionstatechange** (failed state) - line 515
3. **onconnectionstatechange** (closed state) - line 518
4. **onsignalingstatechange** (closed state) - line 531
5. **Data channel onclose** - line 473

## Acceptance Criteria

- [x] Add `isDisconnecting` guard flag
- [x] Make `handleDisconnection()` idempotent
- [x] Guard flag prevents duplicate emit of disconnection events
- [x] Flag properly reset on reconnection and new connections
- [x] Add tests for multiple handler invocations
- [x] Verify single emission per disconnection event
- [x] All handlers can trigger safely without double-cleanup

## References

- Code Review P2-011: Overlapping Disconnect Handlers
- Related: WebRTC connection lifecycle
- Related: Idempotent cleanup patterns
