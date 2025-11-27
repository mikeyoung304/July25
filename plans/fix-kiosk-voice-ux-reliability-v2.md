# fix: Kiosk Voice UX Reliability - Button State Desync & Stuck Recording

**Issue:** [#143](https://github.com/mikeyoung304/rebuild-6.0/issues/143)
**Branch:** `fix/kiosk-voice-ux-reliability`
**Priority:** High
**Estimated Effort:** 2-3 hours

---

## Summary

Fix critical reliability bugs in kiosk voice ordering that cause button state desync and stuck recording states. Simple, focused fixes for real user-reported issues.

### User-Reported Issues

1. **"Clicking once says recording but nothing is recording"** - Button shows "Listening" but microphone isn't capturing
2. **"Click to end and it still says recording"** - Button stays in "recording" state after tap to stop
3. **"Sometimes you get a response, sometimes nothing happens"** - Silent failures, no AI response

---

## Root Cause Analysis

| Bug | Root Cause | File |
|-----|------------|------|
| Button state desync | `HoldToRecordButton` uses optimistic `isToggled` state that can desync from `VoiceStateMachine` | `HoldToRecordButton.tsx:36-48` |
| Stuck recording | State machine has no timeout for RECORDING state | `VoiceStateMachine.ts:181-189` |
| Silent failures | No graceful error handling on network disconnection during recording | `WebRTCVoiceClient.ts` |

---

## Proposed Solution (MVP)

### Task 1: Fix Button State Desync (45 min)
**File:** `client/src/modules/voice/components/HoldToRecordButton.tsx`

**Problem:** Dual source of truth - local `isToggled` state vs props.

**Solution:** Remove `isToggled` state, derive ALL button state from props (`isListening`, `isPendingStart`).

```typescript
// BEFORE (line 36)
const [isToggled, setIsToggled] = useState(false);

// AFTER - DELETE this line entirely
// Derive state from props only:
const isActive = mode === 'toggle'
  ? (isListening || isPendingStart)
  : isHoldingRef.current;
```

**Changes:**
- Delete `isToggled` state (line 36)
- Delete sync effect (lines 217-221)
- Simplify `handleToggleClick` to not update local state
- Keep debounce logic intact

---

### Task 2: Fix Stuck Recording State (30 min)
**Files:**
- `client/src/modules/voice/services/VoiceStateMachine.ts`
- `client/src/modules/voice/services/WebRTCVoiceClient.ts`

**Problem:** RECORDING state has no timeout - can stay stuck forever.

**Solution:** Add simple fixed 45s timeout. No speech-aware extension (YAGNI).

```typescript
// VoiceStateMachine.ts - Add to STATE_TIMEOUTS
export const STATE_TIMEOUTS: Partial<Record<VoiceState, number>> = {
  [VoiceState.CONNECTING]: 15000,
  [VoiceState.AWAITING_SESSION_CREATED]: 5000,
  [VoiceState.AWAITING_SESSION_READY]: 5000,
  [VoiceState.COMMITTING_AUDIO]: 5000,    // Increased from 3s
  [VoiceState.AWAITING_TRANSCRIPT]: 10000,
  [VoiceState.AWAITING_RESPONSE]: 30000,
  [VoiceState.DISCONNECTING]: 5000,
  [VoiceState.RECORDING]: 45000,          // NEW: 45s fixed timeout
};
```

```typescript
// WebRTCVoiceClient.ts - Handle RECORDING timeout
// Use shared stopRecording() to avoid race condition with manual stop
onTimeout: (state) => {
  if (state === VoiceState.RECORDING) {
    // Guard: only proceed if still in RECORDING state
    if (!this.stateMachine.canStopRecording()) {
      logger.debug('[WebRTCVoiceClient] State changed before timeout, skipping');
      return;
    }

    logger.warn('[WebRTCVoiceClient] RECORDING timeout - stopping');
    this.stopRecording();  // Reuse existing method (no duplicate logic)
    this.emit('recording.timeout', { message: 'Recording timed out after 45s' });
  }
  // ... existing timeout handling for other states
}
```

---

### Task 3: Handle Network Disconnection During Recording (30 min)
**File:** `client/src/modules/voice/services/WebRTCVoiceClient.ts`

**Problem:** Network failure during recording leaves button stuck.

**Solution:** Transition state machine to ERROR on ICE disconnection.

```typescript
// WebRTCVoiceClient.ts - In setupConnectionListeners()
this.connection.on('disconnection', () => {
  const currentState = this.stateMachine.getState();
  const activeRecordingStates = [
    VoiceState.RECORDING,
    VoiceState.COMMITTING_AUDIO,
    VoiceState.AWAITING_TRANSCRIPT
  ];

  if (activeRecordingStates.includes(currentState)) {
    logger.warn(`[WebRTCVoiceClient] Network disconnected during ${currentState}`);
    this.connection.disableMicrophone();
    this.stateMachine.forceState(VoiceState.ERROR, 'Network disconnection');
    this.emit('error', new Error('Network connection lost during recording'));
  }

  this.handleDisconnection();
});
```

Also ensure `WebRTCConnection.ts` emits the disconnection event:

```typescript
// WebRTCConnection.ts - In ICE connection state handler
this.pc.oniceconnectionstatechange = () => {
  const iceState = this.pc?.iceConnectionState;
  logger.info('[WebRTCConnection] ICE state:', iceState);

  if (iceState === 'failed' || iceState === 'disconnected') {
    this.emit('disconnection', { reason: 'ice_' + iceState });
    this.handleDisconnection();
  }
};
```

---

### Task 4: Enable VAD by Default for Kiosk (15 min)
**File:** `client/src/modules/voice/services/VoiceSessionConfig.ts`

**Problem:** Manual PTT requires explicit start/stop. Users want natural conversation.

**Solution:** Enable VAD by default for kiosk context. No feature flag needed.

```typescript
// VoiceSessionConfig.ts - In buildSessionConfig()
buildSessionConfig(): RealtimeSessionConfig {
  // Enable VAD by default for kiosk mode
  const shouldEnableVAD = this.config.context === 'kiosk' || this.config.enableVAD === true;

  let turnDetection: TurnDetectionConfig | null = null;

  if (shouldEnableVAD) {
    turnDetection = {
      type: 'server_vad',
      threshold: 0.6,              // Higher for noisy restaurant
      prefix_padding_ms: 400,      // Capture lead-in audio
      silence_duration_ms: 2000,   // 2s silence = end of speech (generous for complex orders)
      create_response: false,      // Manual control for now
    };

    logger.info('[VoiceSessionConfig] VAD enabled for kiosk mode');
  }

  // ... rest of session config
}
```

---

### Task 5: Verify Existing Tests (15 min)

Run existing E2E tests to confirm they pass:

```bash
npm run test:e2e -- --grep "voice"
```

**Test files:**
- `tests/e2e/voice-ordering.spec.ts`
- `tests/e2e/voice-order.spec.ts`

If tests fail, fix them. If they pass, no new tests needed.

---

## Acceptance Criteria

- [ ] Tap button → UI shows "Listening" → microphone is actually recording
- [ ] Tap to stop → recording stops, button returns to idle
- [ ] No "stuck in recording" state (45s max timeout)
- [ ] Network disconnection → graceful error, button returns to idle
- [ ] VAD enabled by default for kiosk mode
- [ ] Existing E2E tests pass

---

## Implementation Summary

| Task | Effort | Files | Risk |
|------|--------|-------|------|
| Fix button state desync | 45 min | 1 file | Low |
| Fix stuck recording (45s timeout) | 30 min | 2 files | Low |
| Handle network disconnection | 30 min | 2 files | Low |
| Enable VAD for kiosk | 15 min | 1 file | Low |
| Verify existing tests | 15 min | 0 files | Low |
| **Total** | **~2.5 hours** | **5 files** | **Low** |

---

## Files Changed

- `client/src/modules/voice/components/HoldToRecordButton.tsx`
- `client/src/modules/voice/services/VoiceStateMachine.ts`
- `client/src/modules/voice/services/WebRTCVoiceClient.ts`
- `client/src/modules/voice/services/WebRTCConnection.ts`
- `client/src/modules/voice/services/VoiceSessionConfig.ts`

---

## What's NOT in This PR (Future Work)

- Speech-aware timeout extension (add if users complain about 45s being too short)
- Keyboard accessibility (kiosk is touchscreen only)
- Permission revocation monitoring (browser handles this)
- New E2E tests (existing tests are sufficient)
- `create_response: true` for automatic AI responses (manual control for now)
- Barge-in handling
- Circuit breaker for repeated failures

---

## Rollback Plan

1. **Revert button state changes** - Restore `isToggled` state if needed
2. **Increase/decrease timeout** - Adjust 45s if too short/long
3. **Disable VAD** - Set `enableVAD: false` in kiosk config

---

## Testing Checklist

### Manual Testing (Required)
- [ ] Test on physical kiosk device
- [ ] Tap to start → verify "Listening" shows and mic is recording
- [ ] Tap to stop → verify stops within 500ms
- [ ] Wait 45s without speaking → verify auto-timeout
- [ ] Disconnect network during recording → verify graceful error
- [ ] VAD detects end of speech → verify recording stops automatically

### Automated Testing
- [ ] Existing voice E2E tests pass
- [ ] TypeScript compilation succeeds

---

## References

- Issue: [#143](https://github.com/mikeyoung304/rebuild-6.0/issues/143)
- ADR: `docs/explanation/architecture-decisions/ADR-012-voice-state-machine.md`
- Original plan: `plans/fix-kiosk-voice-ux-reliability.md`

---

Generated with [Claude Code](https://claude.com/claude-code)
