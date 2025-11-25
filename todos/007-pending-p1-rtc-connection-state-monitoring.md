# TODO-007: Add RTC Connection State Monitoring

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 007
- **Tags**: webrtc, voice, monitoring, reliability
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - WebRTC Specialist Agent

---

## Problem Statement

The WebRTC connection only monitors ICE connection state but ignores other critical connection events:

1. `onconnectionstatechange` - Set up but handler is EMPTY
2. `onsignalingstatechange` - NEVER set up
3. `onicecandidate` - NEVER monitored

This creates blind spots where connections can fail silently.

---

## Findings

### Current Code
```typescript
// WebRTCConnection.ts:476-480 - EMPTY HANDLER
this.pc.onconnectionstatechange = () => {
  if (this.config.debug) {
    logger.info('[WebRTCConnection] Connection state:', this.pc?.connectionState);
  }
  // NO HANDLING OF FAILED/DISCONNECTED STATES!
};
```

### Missing Handlers
```typescript
// Never set up:
this.pc.onsignalingstatechange = ???
this.pc.onicecandidate = ???
```

### Cleared But Never Set
```typescript
// Line 533: Clearing handler that was never set
this.pc.onicecandidate = null;
```

### Impact
- `connectionState` failure not detected if ICE stays connected
- No visibility into ICE candidate gathering problems
- STUN/TURN failures invisible
- Users stuck in broken state with no feedback

---

## Proposed Solutions

### Option A: Complete Handler Implementation (Recommended)
Add all missing handlers with proper state management.

**Pros**: Full visibility, proper error handling
**Cons**: More code
**Effort**: Low (1-2 hours)
**Risk**: Very Low

### Option B: Minimal - Connection State Only
Just fix the empty `onconnectionstatechange` handler.

**Pros**: Quick fix
**Cons**: Still missing ICE candidate monitoring
**Effort**: Very Low (30 min)
**Risk**: Low

---

## Recommended Action

**Option A** - Complete implementation:

```typescript
// WebRTCConnection.ts - add in setupPeerConnection()

// Connection state handler (currently empty)
this.pc.onconnectionstatechange = () => {
  const state = this.pc?.connectionState;
  logger.info('[WebRTCConnection] Connection state changed', { state });

  switch (state) {
    case 'connected':
      this.emit('connected');
      break;
    case 'disconnected':
      logger.warn('[WebRTCConnection] Connection disconnected');
      this.emit('disconnected');
      break;
    case 'failed':
      logger.error('[WebRTCConnection] Connection failed');
      this.emit('error', new Error('WebRTC connection failed'));
      this.handleDisconnection();
      break;
    case 'closed':
      this.handleDisconnection();
      break;
  }
};

// Signaling state handler (new)
this.pc.onsignalingstatechange = () => {
  const state = this.pc?.signalingState;
  if (this.config.debug) {
    logger.debug('[WebRTCConnection] Signaling state', { state });
  }

  if (state === 'closed') {
    this.handleDisconnection();
  }
};

// ICE candidate handler (new)
this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
  if (!event.candidate) {
    logger.info('[WebRTCConnection] ICE candidate gathering complete');
  } else if (this.config.debug) {
    logger.debug('[WebRTCConnection] ICE candidate', {
      type: event.candidate.type,
      protocol: event.candidate.protocol,
    });
  }
};

// ICE gathering state (new)
this.pc.onicegatheringstatechange = () => {
  const state = this.pc?.iceGatheringState;
  if (this.config.debug) {
    logger.debug('[WebRTCConnection] ICE gathering state', { state });
  }
};
```

---

## Technical Details

### Affected Files
- `client/src/modules/voice/services/WebRTCConnection.ts:463-481`

### Connection State Values
| State | Meaning | Action |
|-------|---------|--------|
| new | Just created | Wait |
| connecting | Attempting connection | Wait |
| connected | Successfully connected | Emit connected |
| disconnected | Temporarily disconnected | Emit disconnected |
| failed | Connection failed | Error + disconnect |
| closed | Connection closed | Cleanup |

---

## Acceptance Criteria

- [ ] `onconnectionstatechange` handles all states
- [ ] `onsignalingstatechange` monitored
- [ ] `onicecandidate` monitored for debugging
- [ ] Failed state triggers error handling
- [ ] Disconnected state triggers reconnection flow
- [ ] Debug logs provide visibility into connection issues
- [ ] All handlers cleaned up on disconnect

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From WebRTC review |

---

## Resources

- [WebRTCConnection](client/src/modules/voice/services/WebRTCConnection.ts)
- [MDN: RTCPeerConnection Events](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
