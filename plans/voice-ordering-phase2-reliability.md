# Voice Ordering Phase 2: Reliability Fixes

**Status**: Ready for Implementation
**Estimated Time**: 4-6 hours with parallel agents
**Prerequisites**: None - self-contained

---

## Context (For New Window)

The kiosk voice ordering "Tap to Start" button has reliability issues making it feel "buggy". Phase 1 (UX fixes) is separate. This plan focuses on **reliability and edge case handling**.

### Files You'll Be Working With

```
client/src/modules/voice/components/HoldToRecordButton.tsx    # Touch handling, debounce
client/src/modules/voice/components/VoiceControlWebRTC.tsx    # Main voice control
client/src/modules/voice/services/WebRTCConnection.ts         # WebRTC, microphone
client/src/modules/voice/services/WebRTCVoiceClient.ts        # Orchestrator, events
client/src/modules/voice/hooks/useWebRTCVoice.ts              # React hook
```

### Key Architecture Facts

- **State Machine**: 12 states in `VoiceStateMachine.ts` (DISCONNECTED → CONNECTING → AWAITING_SESSION_CREATED → AWAITING_SESSION_READY → IDLE → RECORDING → etc.)
- **Button Modes**: `toggle` (kiosk - tap on/off) vs `hold` (server - hold to talk)
- **Debounce**: Currently 100ms between actions (too aggressive for kiosk)
- **Connection Timeout**: 15s hardcoded in WebRTCConnection

---

## Phase 2 Tasks

### Task 2.1: Reject Multi-Touch Interactions
**Priority**: P1 - Critical
**File**: `client/src/modules/voice/components/HoldToRecordButton.tsx`
**Lines**: ~126-133 (handleTouchStart)

**Problem**: Second finger on button causes unexpected recording start/stop.

**Solution**:
```typescript
const handleTouchStart = useCallback((e: React.TouchEvent) => {
  e.preventDefault();

  // NEW: Reject multi-touch in toggle mode (kiosk)
  if (e.touches.length > 1) {
    if (showDebounceWarningProp) {
      logger.warn('[HoldToRecordButton] Multi-touch rejected');
    }
    return;
  }

  if (mode === 'toggle') {
    handleToggleClick(e);
  } else {
    handleStart();
  }
}, [mode, handleToggleClick, handleStart, showDebounceWarningProp]);
```

**Test**: Place two fingers on button simultaneously - should be ignored.

---

### Task 2.2: Increase Kiosk Debounce to 300ms
**Priority**: P1 - Critical
**File**: `client/src/modules/voice/components/HoldToRecordButton.tsx`
**Lines**: ~41, 59, 80 (debounce checks)

**Problem**: 100ms debounce blocks legitimate quick resume attempts.

**Solution**: Add `debounceMs` prop with mode-aware default.

```typescript
// Add to interface (~line 5-16)
interface HoldToRecordButtonProps {
  // ... existing props
  debounceMs?: number; // Default: 300ms for toggle (kiosk), 100ms for hold
}

// In component (~line 18)
export const HoldToRecordButton: React.FC<HoldToRecordButtonProps> = ({
  // ... existing props
  debounceMs,
}) => {
  // Calculate effective debounce (~line 35)
  const effectiveDebounce = debounceMs ?? (mode === 'toggle' ? 300 : 100);

  // Replace all `< 100` checks with `< effectiveDebounce`
  // Line ~41: if (now - lastActionTimeRef.current < effectiveDebounce) {
  // Line ~59: if (now - lastActionTimeRef.current < effectiveDebounce) {
  // Line ~80: if (now - lastActionTimeRef.current < effectiveDebounce) {
```

**Test**: Rapid tap-tap in kiosk mode - second tap should work if >300ms apart.

---

### Task 2.3: Add Microphone Permission Revocation Detection
**Priority**: P2 - High
**File**: `client/src/modules/voice/services/WebRTCConnection.ts`
**Lines**: ~264-299 (setupMicrophone method)

**Problem**: If OS/browser mutes microphone mid-recording, no error is shown. User records silence.

**Solution**: Add track event handlers.

```typescript
async setupMicrophone(): Promise<void> {
  try {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const audioTrack = this.mediaStream.getAudioTracks()[0];
    if (this.pc && audioTrack) {
      // Existing: mute track initially
      audioTrack.enabled = false;

      // NEW: Monitor track state changes
      audioTrack.onmute = () => {
        logger.error('[WebRTCConnection] Audio track muted by OS/browser');
        this.emit('error', new Error('Microphone was muted. Please check your permissions.'));
      };

      audioTrack.onended = () => {
        logger.error('[WebRTCConnection] Audio track ended unexpectedly');
        this.emit('error', new Error('Microphone stream ended unexpectedly.'));
      };

      // Existing: add track to peer connection
      this.pc.addTrack(audioTrack, this.mediaStream);

      if (this.config.debug) {
        logger.info('[WebRTCConnection] Microphone connected with track monitoring');
      }
    }
  } catch (error) {
    logger.error('[WebRTCConnection] Microphone setup failed:', error);
    throw new Error('Microphone access denied or unavailable');
  }
}
```

**Test**: Start recording, then revoke microphone permission in browser settings - should show error.

---

### Task 2.4: Fix Connection Timeout Event Propagation
**Priority**: P2 - High
**File**: `client/src/modules/voice/services/WebRTCVoiceClient.ts`
**Lines**: ~120-150 (constructor, event wiring section)

**Problem**: `WebRTCConnection` emits `connection.timeout` event but `WebRTCVoiceClient` never listens to it. Users get generic error instead of "timed out" message.

**Solution**: Add listener in constructor.

```typescript
// In constructor, after existing connection event listeners (~line 136)

// NEW: Handle connection timeout specifically
this.connection.on('connection.timeout', (data: { duration: number }) => {
  logger.warn(`[WebRTCVoiceClient] Connection timed out after ${data.duration}ms`);

  const error = new Error(`Connection timed out after ${Math.round(data.duration / 1000)} seconds. Please check your internet connection.`);
  (error as any).type = 'CONNECTION_TIMEOUT';
  (error as any).recoverable = true;

  try {
    this.stateMachine.transition(VoiceEvent.TIMEOUT_OCCURRED, {
      type: 'connection',
      duration: data.duration
    });
  } catch (transitionError) {
    logger.error('[WebRTCVoiceClient] Failed to transition on timeout:', transitionError);
    // Force to error state as fallback
    this.stateMachine.forceState(VoiceState.TIMEOUT, 'Connection timeout');
  }

  this.emit('error', error);
});
```

**Test**: Disconnect network, tap "Tap to Start" - should show "Connection timed out" within 15s.

---

### Task 2.5: Add Touch Cancel State Reset
**Priority**: P2 - High
**File**: `client/src/modules/voice/components/HoldToRecordButton.tsx`
**Lines**: ~160-166 (handleTouchEnd), ~236 (onTouchCancel)

**Problem**: When system cancels touch (notification popup, etc.), `isToggled` state doesn't reset. Button shows "Listening..." but recording stopped.

**Solution**: Create dedicated touch cancel handler.

```typescript
// NEW: Add after handleTouchEnd (~line 167)
const handleTouchCancel = useCallback((e: React.TouchEvent) => {
  e.preventDefault();

  if (mode === 'toggle' && isToggled) {
    // Reset toggle state on system touch cancel
    setIsToggled(false);
    isHoldingRef.current = false;
    onMouseUp();

    if (showDebounceWarningProp) {
      logger.info('[HoldToRecordButton] Touch cancelled by system, reset toggle state');
    }
  } else if (mode === 'hold') {
    handleStop();
  }
}, [mode, isToggled, onMouseUp, handleStop, showDebounceWarningProp]);

// Update JSX (~line 236): Replace onTouchCancel={handleTouchEnd} with:
onTouchCancel={handleTouchCancel}
```

**Test**: Start recording, trigger system notification - recording should stop cleanly.

---

### Task 2.6: Fix aria-pressed Accessibility Binding
**Priority**: P3 - Medium
**File**: `client/src/modules/voice/components/HoldToRecordButton.tsx`
**Lines**: ~240 (aria-pressed attribute)

**Problem**: `aria-pressed={isListening}` is wrong for toggle mode. Screen readers announce incorrect state.

**Solution**: Use correct state based on mode.

```typescript
// Before the return statement (~line 207), add:
const ariaPressed = mode === 'toggle'
  ? (isToggled || isListening)  // In toggle mode, use local toggle state
  : isListening;                 // In hold mode, use actual listening state

// Update JSX (~line 240):
aria-pressed={ariaPressed}
```

**Test**: Use screen reader (VoiceOver/NVDA), tap button - should announce "pressed" immediately.

---

## Execution Strategy

### Option A: Sequential (Safe, ~4 hours)

```bash
# In Claude Code, run each task sequentially
# Start with Task 2.1, verify, then Task 2.2, etc.
```

### Option B: Parallel Subagents (Fast, ~2 hours)

Use this prompt in a new Claude Code window:

```
I need to implement Phase 2 reliability fixes for voice ordering. Run these tasks in parallel using subagents:

**Agent 1 - Touch Handling** (Tasks 2.1, 2.5, 2.6)
File: client/src/modules/voice/components/HoldToRecordButton.tsx
- Add multi-touch rejection in handleTouchStart
- Create handleTouchCancel handler
- Fix aria-pressed binding
- Increase debounce to 300ms for toggle mode (add debounceMs prop)

**Agent 2 - WebRTC Events** (Tasks 2.3, 2.4)
Files:
- client/src/modules/voice/services/WebRTCConnection.ts
- client/src/modules/voice/services/WebRTCVoiceClient.ts
Tasks:
- Add audioTrack.onmute and onended handlers in setupMicrophone()
- Add connection.timeout event listener in WebRTCVoiceClient constructor

Read the detailed plan at: plans/voice-ordering-phase2-reliability.md

After both agents complete, run the test suite:
npm run test:client -- --grep "HoldToRecord|WebRTC"
```

---

## Verification Checklist

After implementation, verify each fix:

- [ ] **Multi-touch**: Two fingers on button → ignored, no console errors
- [ ] **Debounce**: Tap-tap at 200ms apart → second tap blocked. At 400ms → works
- [ ] **Mic mute detection**: Revoke permission mid-recording → error shown
- [ ] **Timeout propagation**: Disconnect network → "timed out" message in UI
- [ ] **Touch cancel**: Trigger notification during recording → clean stop
- [ ] **Accessibility**: Screen reader announces "pressed" on tap

---

## Rollback Plan

All changes are additive/configurable. To rollback:

1. **Debounce**: Remove `debounceMs` prop, revert to hardcoded `100`
2. **Multi-touch**: Remove `touches.length` check
3. **Track handlers**: Remove `onmute`/`onended` assignments
4. **Timeout listener**: Remove `connection.on('connection.timeout', ...)` block

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `HoldToRecordButton.tsx` | +debounceMs prop, +multi-touch check, +handleTouchCancel, fix aria-pressed |
| `WebRTCConnection.ts` | +audioTrack.onmute, +audioTrack.onended handlers |
| `WebRTCVoiceClient.ts` | +connection.timeout event listener |

---

## Next Phase

After Phase 2, proceed to Phase 3 (Accessibility & Polish) or Phase 4 (Error Recovery) based on priority. See `plans/voice-ordering-enterprise-improvements.md` for full roadmap.
