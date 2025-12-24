# Fix: Kiosk Voice UX Reliability

> **Type**: Bug Fix
> **Priority**: P0
> **Branch**: `fix/kiosk-voice-ux-reliability`
> **Estimated Effort**: 6-8 hours (PR1 only)
> **Status**: Ready for Implementation

---

## Overview

Fix critical reliability bugs in kiosk voice ordering that cause button state desync and stuck recording states. Enable natural conversational flow with server-side VAD for a smoother user experience.

### User-Reported Issues

1. **"Clicking once says recording but nothing is recording"** - Button shows "Listening" but microphone isn't capturing
2. **"Click to end and it still says recording"** - Button stays in "recording" state after tap to stop
3. **"Sometimes you get a response, sometimes nothing happens"** - Silent failures, no AI response
4. **Want natural conversation** - Smooth flow without manual start/stop for each utterance

### Scope Decision

Based on reviewer feedback, this work is split into **two PRs**:

| PR | Scope | Risk | Status |
|----|-------|------|--------|
| **PR1** (this plan) | Tasks 1-3: Button desync, stuck state, VAD | Low-Medium | Ready |
| **PR2** (future) | Barge-in interruption handling | Medium | Deferred |

**Rationale**: Tasks 1-2 are pure bug fixes. Task 3 (VAD) enables natural conversation without the complexity of barge-in. Barge-in is a nice-to-have, not a user-reported problem.

---

## Problem Statement

### Root Causes (Confirmed via Code Analysis)

| Bug | Root Cause | File:Line |
|-----|------------|-----------|
| Button state desync | `HoldToRecordButton` uses optimistic `isToggled` state that can desync from `VoiceStateMachine` | `HoldToRecordButton.tsx:35-48` |
| Stuck recording | State machine has no timeout for RECORDING state; transitions can timeout silently | `VoiceStateMachine.ts:181-189` |
| Silent failures | Manual PTT mode (`turn_detection: null`) requires explicit stop; audio buffer may not commit | `VoiceSessionConfig.ts:281` |

---

## 2025 Best Practices Research

### OpenAI Realtime API (2025 Updates)

From [OpenAI's gpt-realtime announcement](https://openai.com/index/introducing-gpt-realtime/):
- **Latency**: 200-300ms from "user audio stops" to "first TTS byte" via WebRTC
- **Session duration**: Up to 60 minutes (increased from 30)
- **Voice quality**: New `marin` and `cedar` voices for natural conversation
- **Turn-taking**: Let the model manage turn-taking; only force turns when absolutely necessary

From [OpenAI Developer Notes](https://developers.openai.com/blog/realtime-api/):
- Keep audio pipeline lean - resample once, avoid heavy VAD on hot path
- Send smaller frames more often for better responsiveness
- Add system guardrails: "answer concisely in 1-2 sentences unless asked to elaborate"

### Voice Kiosk UX Best Practices

From [Hashstudioz Voice Ordering Guide](https://www.hashstudioz.com/blog/implementing-voice-ordering-systems-for-restaurants-architecture-and-apis/):
- Noise filtering algorithms essential for loud restaurant environments
- Multilingual voice support improves accessibility
- Hands-free interaction helps during busy times

From [Intouch Insight QSR Study](https://www.prnewswire.com/news-releases/kiosks-apps-and-ai-how-restaurants-are-winning-the-race-for-enhanced-customer-experiences-302445485.html):
- 98% of guests found kiosk ordering easy to customize
- Balance tech with hospitality - friendliness drops from 78% to 66% with kiosks

### VAD Tuning for Production

From [Picovoice VAD Guide](https://picovoice.ai/blog/complete-guide-voice-activity-detection-vad/):
- Core tradeoff: accuracy vs latency
- 25ms frames with 10ms overlap is common production setting
- Environment-specific evaluation critical - F1 can drop from 0.93 to 0.71 with noise

From [Deepgram VAD Overview](https://deepgram.com/learn/voice-activity-detection):
- VAD reduces bandwidth, compute overhead, and improves UX
- Production systems balance responsiveness vs precision based on use case
- Restaurant/kiosk context favors slightly higher thresholds to filter ambient noise

---

## Technical Approach

### Task 1: Fix Button State Desync (2-3 hours)

**Problem**: `HoldToRecordButton.tsx` uses optimistic `isToggled` state that updates UI immediately before WebRTC confirms recording started.

**File**: `client/src/modules/voice/components/HoldToRecordButton.tsx`

**Current Implementation** (lines 35-48, 103-114):
```typescript
// BEFORE: Optimistic local state can desync from actual recording state
const [isToggled, setIsToggled] = useState(false);

const handleToggleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
  e.preventDefault();

  if (!isToggled) {
    setIsToggled(true);  // UI updates immediately
    handleStart(e);      // WebRTC might fail silently
  } else {
    setIsToggled(false);
    handleStop();
  }
}, [isToggled, handleStart, handleStop]);
```

**Fix**:
```typescript
// AFTER: Remove optimistic state, derive from props only
const handleToggleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
  e.preventDefault();

  if (isRecording || isListening) {
    // Actually recording - stop it
    handleStop();
  } else {
    // Not recording - start it
    handleStart(e);
  }
  // UI updates ONLY when state machine confirms via isRecording/isListening props
}, [isRecording, isListening, handleStart, handleStop]);

// Update isActive to use props as source of truth
const isActive = mode === 'toggle'
  ? (isListening || isPendingStart)  // Props from parent, not local isToggled
  : isHoldingRef.current;
```

**Files to Modify**:
- `client/src/modules/voice/components/HoldToRecordButton.tsx`
  - Remove `isToggled` useState (line 35)
  - Update `handleToggleClick` to use props (lines 103-114)
  - Remove isToggled sync useEffect (lines 213-221)
  - Update `isActive` calculation (lines 44-48)

**Acceptance Criteria**:
- [ ] Button shows "Listening" ONLY when `isRecording` or `isListening` prop is true
- [ ] Tapping button when not recording calls `handleStart`
- [ ] Tapping button when recording calls `handleStop`
- [ ] No local `isToggled` state exists

---

### Task 2: Fix Stuck Recording State (2 hours)

**Problem**: State machine has no timeout for RECORDING state. If WebRTC fails to respond, button stays stuck.

**File**: `client/src/modules/voice/services/VoiceStateMachine.ts`

**Current Implementation** (lines 181-189):
```typescript
export const STATE_TIMEOUTS: Partial<Record<VoiceState, number>> = {
  [VoiceState.CONNECTING]: 15000,
  [VoiceState.AWAITING_SESSION_CREATED]: 5000,
  [VoiceState.AWAITING_SESSION_READY]: 5000,
  [VoiceState.COMMITTING_AUDIO]: 3000,
  [VoiceState.AWAITING_TRANSCRIPT]: 10000,
  [VoiceState.AWAITING_RESPONSE]: 30000,
  [VoiceState.DISCONNECTING]: 5000,
  // NOTE: No RECORDING timeout!
};
```

**Fix - Add RECORDING timeout with speech-aware extension**:
```typescript
export const STATE_TIMEOUTS: Partial<Record<VoiceState, number>> = {
  [VoiceState.CONNECTING]: 15000,
  [VoiceState.AWAITING_SESSION_CREATED]: 5000,
  [VoiceState.AWAITING_SESSION_READY]: 5000,
  [VoiceState.RECORDING]: 30000,            // NEW: Initial 30s, extendable
  [VoiceState.COMMITTING_AUDIO]: 3000,
  [VoiceState.AWAITING_TRANSCRIPT]: 10000,
  [VoiceState.AWAITING_RESPONSE]: 30000,
  [VoiceState.DISCONNECTING]: 5000,
};
```

**Fix - Add timeout extension logic in WebRTCVoiceClient.ts** (lines 96-116):
```typescript
onTimeout: (state) => {
  if (state === VoiceState.AWAITING_SESSION_READY) {
    // Existing graceful fallback...
  }

  // NEW: Handle RECORDING timeout with speech-aware extension
  if (state === VoiceState.RECORDING) {
    // Check if speech is still active (VAD detected recent speech)
    const lastSpeechTime = this.eventHandler.getLastSpeechTime();
    const timeSinceLastSpeech = Date.now() - lastSpeechTime;

    // If user spoke within last 5 seconds, extend timeout by 15s
    if (timeSinceLastSpeech < 5000) {
      logger.info('[WebRTCVoiceClient] Speech detected recently, extending recording timeout');
      this.stateMachine.extendTimeout(VoiceState.RECORDING, 15000);
      return;
    }

    logger.warn('[WebRTCVoiceClient] Recording timeout - forcing stop');

    // Force commit any buffered audio
    this.eventHandler.sendEvent({ type: 'input_audio_buffer.commit' });

    // Transition to COMMITTING_AUDIO to continue flow
    this.stateMachine.transition(VoiceEvent.RECORDING_STOPPED);

    // Emit event for UI feedback
    this.emit('recording.force_stopped', { reason: 'timeout', duration: 30000 });
  }
}
```

**Add to VoiceEventHandler.ts** - Track last speech time:
```typescript
private lastSpeechTime: number = 0;

private handleSpeechStarted(event: SpeechStartedEvent, logPrefix: string): void {
  this.lastSpeechTime = Date.now();
  logger.info(`${logPrefix} Speech detected - user started speaking`);
  this.emit('speech.started');
}

public getLastSpeechTime(): number {
  return this.lastSpeechTime;
}
```

**Add to VoiceStateMachine.ts** - Extend timeout method:
```typescript
public extendTimeout(state: VoiceState, additionalMs: number): void {
  if (this.currentState !== state) return;

  this.clearTimeout();
  const baseTimeout = STATE_TIMEOUTS[state] || 0;
  this.startTimeoutForState(state, baseTimeout + additionalMs);

  logger.info(`[VoiceStateMachine] Extended ${state} timeout by ${additionalMs}ms`);
}
```

**Files to Modify**:
- `client/src/modules/voice/services/VoiceStateMachine.ts`
  - Add `RECORDING: 30000` to STATE_TIMEOUTS (line 187)
  - Add `extendTimeout()` method
- `client/src/modules/voice/services/VoiceEventHandler.ts`
  - Add `lastSpeechTime` tracking
  - Add `getLastSpeechTime()` getter
- `client/src/modules/voice/services/WebRTCVoiceClient.ts`
  - Add RECORDING timeout handler with extension logic (lines 96-116)

**Acceptance Criteria**:
- [ ] Recording state times out after 30 seconds of no speech
- [ ] If user spoke within last 5 seconds, timeout extends by 15s
- [ ] Audio buffer is committed on final timeout
- [ ] State machine transitions to COMMITTING_AUDIO
- [ ] `recording.force_stopped` event is emitted

---

### Task 3: Enable Server-Side VAD (Opt-In) (1.5 hours)

**Problem**: Manual PTT mode (`turn_detection: null`) requires explicit start/stop. Users want natural conversation.

**Approach**: Make VAD **opt-in** via environment variable for gradual rollout. Test with 1-2 restaurants before enabling by default.

**File**: `client/src/modules/voice/services/VoiceSessionConfig.ts`

**Current Implementation** (lines 279-289):
```typescript
let turnDetection: any = null; // Default: manual PTT

if (this.config.enableVAD) {
  turnDetection = {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 1500,
    create_response: false,
  };
}
```

**Fix - Add feature flag with restaurant-environment tuning**:
```typescript
// Check feature flag for VAD enablement
// Opt-in via: VITE_ENABLE_VAD_DEFAULT=true or enableVAD prop
const vadFeatureEnabled = import.meta.env.VITE_ENABLE_VAD_DEFAULT === 'true';
const shouldEnableVAD = this.config.enableVAD === true ||
  (vadFeatureEnabled && this.config.enableVAD !== false && this.config.context === 'kiosk');

let turnDetection: any = null;

if (shouldEnableVAD) {
  // Tuned for restaurant environment based on 2025 best practices:
  // - Higher threshold (0.6) filters ambient noise better
  // - Longer silence duration (1500ms) prevents cutting off natural pauses
  // - create_response: true for automatic AI response when user stops
  turnDetection = {
    type: 'server_vad',
    threshold: 0.6,               // Higher for noisy restaurant (default 0.5)
    prefix_padding_ms: 400,       // Capture lead-in speech
    silence_duration_ms: 1500,    // Wait 1.5s - matches natural conversation pace
    create_response: true,        // Auto-respond when user stops speaking
  };

  logger.info('[VoiceSessionConfig] VAD enabled for kiosk', {
    threshold: 0.6,
    silence_duration_ms: 1500,
    restaurant_id: this.config.restaurantId
  });
}
```

**Add environment variable documentation** to `.env.example`:
```bash
# Voice Ordering - VAD (Voice Activity Detection)
# Set to 'true' to enable automatic speech detection for kiosk voice ordering
# Default: false (manual push-to-talk mode)
# Recommended: Test with 1-2 restaurants before enabling broadly
VITE_ENABLE_VAD_DEFAULT=false
```

**Files to Modify**:
- `client/src/modules/voice/services/VoiceSessionConfig.ts`
  - Update VAD enablement logic with feature flag
  - Add logging for observability
- `.env.example`
  - Document `VITE_ENABLE_VAD_DEFAULT` variable

**Acceptance Criteria**:
- [ ] VAD disabled by default (manual PTT)
- [ ] VAD enabled when `VITE_ENABLE_VAD_DEFAULT=true` AND context is kiosk
- [ ] VAD can be explicitly enabled via `enableVAD: true` prop (override)
- [ ] VAD can be explicitly disabled via `enableVAD: false` prop (override)
- [ ] Threshold set to 0.6 for noisy environment
- [ ] `create_response: true` for automatic AI response
- [ ] Logging includes restaurant_id for multi-tenant tracking

---

### Task 4: Add E2E Tests (1.5 hours)

**Problem**: Current plan has 20+ manual test cases with no automation.

**Approach**: Add Playwright E2E tests for critical voice ordering flows.

**File**: `client/src/modules/voice/__tests__/voice-ordering.e2e.ts` (new)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Voice Ordering - Kiosk', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to kiosk voice ordering page
    await page.goto('/kiosk/test-restaurant/voice');
  });

  test('button state syncs with recording state', async ({ page }) => {
    const recordButton = page.getByTestId('voice-record-button');

    // Initial state: not recording
    await expect(recordButton).not.toHaveClass(/recording|listening/);

    // Click to start - should show pending state
    await recordButton.click();

    // Should transition to listening (or pending) state
    // Note: Actual WebRTC may need mocking for CI
    await expect(recordButton).toHaveClass(/pending|listening/, { timeout: 5000 });
  });

  test('button does not get stuck after stop', async ({ page }) => {
    const recordButton = page.getByTestId('voice-record-button');

    // Start recording
    await recordButton.click();
    await expect(recordButton).toHaveClass(/listening/, { timeout: 5000 });

    // Stop recording
    await recordButton.click();

    // Should return to idle within 500ms
    await expect(recordButton).not.toHaveClass(/listening|recording/, { timeout: 1000 });
  });

  test('rapid taps are debounced', async ({ page }) => {
    const recordButton = page.getByTestId('voice-record-button');

    // Rapid triple-click
    await recordButton.click();
    await recordButton.click();
    await recordButton.click();

    // Should not crash, should be in a valid state
    const classes = await recordButton.getAttribute('class');
    expect(classes).toBeDefined();
  });
});
```

**Files to Create**:
- `client/src/modules/voice/__tests__/voice-ordering.e2e.ts`

**Acceptance Criteria**:
- [ ] E2E test for button state sync
- [ ] E2E test for stuck state prevention
- [ ] E2E test for debounce behavior
- [ ] Tests pass in CI (may need WebRTC mocking)

---

### Task 5: Manual Testing & Validation (1-2 hours)

**Manual Testing Checklist**:

1. **Basic Recording Flow**:
   - [ ] Tap once → UI shows "Listening" → microphone is actually recording
   - [ ] Tap to stop → recording stops within 500ms
   - [ ] Speak → AI responds (in VAD mode: after 1.5s silence)

2. **Stuck State Prevention**:
   - [ ] Recording for 30+ seconds without speech → auto-commits
   - [ ] Recording with speech → timeout extends
   - [ ] Network interruption → graceful recovery to idle

3. **VAD Behavior** (when enabled):
   - [ ] Speak naturally with pauses → AI waits for 1.5s silence
   - [ ] Background noise → does NOT trigger false recording
   - [ ] Multiple sentences → AI waits until natural pause

4. **Error Recovery**:
   - [ ] Rapid tapping → debounced (300ms between actions)
   - [ ] Tab/app backgrounding → recovers on focus

**Test Commands**:
```bash
# Start development server
npm run dev

# Navigate to kiosk voice ordering
# http://localhost:5173/kiosk/{restaurant-slug}/voice

# Enable VAD for testing
VITE_ENABLE_VAD_DEFAULT=true npm run dev
```

---

## Implementation Summary

| Task | Effort | Files | Lines Changed | Risk |
|------|--------|-------|---------------|------|
| Fix button state desync | 2-3h | `HoldToRecordButton.tsx` | ~30 | Low |
| Fix stuck recording state | 2h | `VoiceStateMachine.ts`, `VoiceEventHandler.ts`, `WebRTCVoiceClient.ts` | ~40 | Low |
| Enable server-side VAD (opt-in) | 1.5h | `VoiceSessionConfig.ts`, `.env.example` | ~25 | Low (feature flagged) |
| Add E2E tests | 1.5h | `voice-ordering.e2e.ts` | ~50 | Low |
| Manual testing | 1-2h | - | - | - |
| **Total** | **8-10h** | **6 files** | **~145 lines** | **Low** |

---

## Success Criteria

- [ ] Tap button → UI shows "Listening" → microphone is actually recording
- [ ] Tap to stop → recording stops within 500ms
- [ ] No "stuck in recording" state after 30 seconds (with speech-aware extension)
- [ ] VAD opt-in works via feature flag
- [ ] E2E tests pass in CI

---

## Rollback Plan

If issues arise in production:

1. **Disable VAD** - Set `VITE_ENABLE_VAD_DEFAULT=false` or remove env var
2. **Keep button state fixes** - Low risk, improves reliability
3. **Revert timeout extension** - Set to simple 60s timeout if extension logic has bugs

---

## Future Work (PR2)

Deferred to separate PR after this stabilizes:

- **Barge-in handling** - Cancel AI response when user speaks
- **Semantic VAD** - OpenAI's new semantic turn detection mode
- **Voice selection** - New `marin` and `cedar` voices

---

## Dependencies

### Internal
- `VoiceStateMachine` - Already has timeout infrastructure
- `VoiceEventHandler` - Already handles `speech.started` events
- `VoiceSessionConfig` - Already has VAD config structure

### External
- OpenAI Realtime API (gpt-4o-realtime-preview)
- WebRTC browser support (Chrome, Safari, Firefox)

---

## References

### Internal Files
- `client/src/modules/voice/components/HoldToRecordButton.tsx` - Button component
- `client/src/modules/voice/services/VoiceStateMachine.ts` - State machine
- `client/src/modules/voice/services/VoiceSessionConfig.ts` - Session config
- `client/src/modules/voice/services/VoiceEventHandler.ts` - Event handling
- `client/src/modules/voice/services/WebRTCVoiceClient.ts` - Orchestrator
- `plans/unified-voice-agent.md` - Original feature plan

### External Documentation (2025)
- [OpenAI gpt-realtime Announcement](https://openai.com/index/introducing-gpt-realtime/) - Latest model updates
- [OpenAI Realtime API Developer Notes](https://developers.openai.com/blog/realtime-api/) - Best practices
- [Picovoice VAD Guide 2025](https://picovoice.ai/blog/complete-guide-voice-activity-detection-vad/) - VAD tuning
- [Deepgram VAD Overview](https://deepgram.com/learn/voice-activity-detection) - Production VAD patterns
- [Voice Ordering Architecture Guide](https://www.hashstudioz.com/blog/implementing-voice-ordering-systems-for-restaurants-architecture-and-apis/)

### Related PRs
- Branch: `fix/kiosk-voice-ux-reliability` (this work - PR1)
- Future: Barge-in handling (PR2)

---

*Generated with [Claude Code](https://claude.ai/code)*
