# Voice UX Quick Fix: Reliability + Conversational Flow

> **Type**: Bug Fix + UX Enhancement
> **Priority**: P0
> **Status**: Revised after review
> **Created**: 2025-11-25
> **Revised**: 2025-11-25 (scoped down from 6-week plan to 1-2 day fix)

## Overview

Fix critical reliability bugs in kiosk voice ordering and enable natural conversational flow. This is a **minimal viable fix** based on user feedback and reviewer consensus.

### User-Reported Issues
1. "Clicking once says recording but nothing is recording"
2. "Click to end and it still says recording"
3. "Sometimes you get a response, sometimes nothing happens"
4. Want: Natural conversation with agent questions, pauses for barge-in

### Deferred (Future Roadmap)
- ~~Channel abstraction~~ (no telephone requirement yet)
- ~~MenuKnowledgeEngine~~ (current matcher works)
- ~~Redis session persistence~~ (overengineered)
- Telephone integration (future roadmap, not urgent)

## Problem Statement

### Actual User-Reported Bugs (P0)

1. **Button state desync**: UI shows "recording" but microphone isn't capturing
2. **State machine stuck**: Button stays in "recording" state after tap to stop
3. **Silent failures**: No response after speaking - audio not committed/processed
4. **No conversational flow**: Agent doesn't naturally ask follow-ups or handle pauses

### Root Causes (Investigation Needed)

1. **Optimistic state updates** - UI updates before WebRTC confirms
2. **Race conditions** - State machine transitions firing out of order
3. **Audio buffer not committed** - `input_audio_buffer.commit` not sent reliably
4. **VAD not enabled** - Manual PTT mode requires explicit start/stop

## Proposed Solution: Minimal Fix (1-2 Days)

### What We're Doing

1. **Fix button state sync** - Remove optimistic updates, use state machine as source of truth
2. **Fix stuck recording state** - Add timeout recovery and force-stop mechanism
3. **Enable server-side VAD** - Let OpenAI handle turn detection for natural conversation
4. **Add barge-in handling** - 5 lines to cancel AI response when user speaks

### What We're NOT Doing (Deferred)

- ~~New state machine states~~ - Fix existing states instead
- ~~Channel abstraction~~ - No telephone requirement
- ~~MenuKnowledgeEngine~~ - Current matcher works
- ~~Redis/Supabase session persistence~~ - Overengineered

---

## Technical Approach: Minimal Fix (1-2 Days)

### Task 1: Fix Button State Desync (2-3 hours)

**Problem**: UI shows "recording" but microphone isn't actually capturing.

**Root Cause**: `HoldToRecordButton.tsx` uses optimistic `isToggled` state that can desync from `VoiceStateMachine`.

**Fix** (in `client/src/modules/voice/components/HoldToRecordButton.tsx`):

```typescript
// BEFORE: Optimistic local state
const [isToggled, setIsToggled] = useState(false);
const handleClick = () => {
  setIsToggled(!isToggled);  // Updates UI immediately
  if (!isToggled) startRecording();  // WebRTC might fail silently
};

// AFTER: State machine as source of truth
const handleClick = () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
  // UI updates when state machine confirms via isRecording prop
};
```

**Files to modify**:
- `client/src/modules/voice/components/HoldToRecordButton.tsx` - Remove optimistic state
- `client/src/modules/voice/components/VoiceControlWebRTC.tsx` - Pass state machine state to button

---

### Task 2: Fix Stuck Recording State (2 hours)

**Problem**: Button stays "recording" after tap to stop.

**Root Cause**: State machine transition fails or times out silently.

**Fix** (in `client/src/modules/voice/services/VoiceStateMachine.ts`):

```typescript
// Add force-stop mechanism with timeout
stopRecording() {
  // If we're stuck in RECORDING for >30s, force transition
  if (this.currentState === 'RECORDING') {
    this.clearTimeout();
    this.transition('IDLE');
    this.emit('recording.force_stopped', { reason: 'timeout' });
  }
}

// Add recovery in AWAITING_TRANSCRIPT timeout
onTimeout(state) {
  if (state === 'AWAITING_TRANSCRIPT') {
    // Don't leave user stuck - return to IDLE
    this.transition('IDLE');
    this.emit('error', { type: 'transcript_timeout', recoverable: true });
  }
}
```

**Files to modify**:
- `client/src/modules/voice/services/VoiceStateMachine.ts` - Add force-stop and recovery

---

### Task 3: Enable Server-Side VAD (1 hour)

**Problem**: Manual PTT mode requires explicit start/stop. User wants natural conversation.

**Solution**: Enable OpenAI's server-side Voice Activity Detection.

**Fix** (in `client/src/modules/voice/services/VoiceSessionConfig.ts`):

```typescript
// BEFORE: Manual PTT (turn_detection: null)
turn_detection: null

// AFTER: Server-side VAD for natural conversation
turn_detection: {
  type: 'server_vad',
  threshold: 0.6,           // Higher for noisy restaurant
  prefix_padding_ms: 400,   // Capture lead-in speech
  silence_duration_ms: 1500, // Wait 1.5s before turn complete
  create_response: true     // Auto-generate response
}
```

**Behavior Change**:
- User taps once to activate
- OpenAI detects when user starts/stops speaking
- AI responds automatically when user pauses
- User can keep talking without re-tapping

**Files to modify**:
- `client/src/modules/voice/services/VoiceSessionConfig.ts` - Enable server_vad

---

### Task 4: Add Barge-In Handling (1 hour)

**Problem**: User can't interrupt AI mid-response.

**Solution**: Detect user speech during AI response, cancel response, capture user input.

**Fix** (in `client/src/modules/voice/services/VoiceEventHandler.ts`):

```typescript
// Add to handleInputAudioBufferSpeechStarted()
handleInputAudioBufferSpeechStarted(event: any) {
  // If user speaks while AI is responding, that's a barge-in
  if (this.stateMachine.getCurrentState() === 'AWAITING_RESPONSE') {
    // Cancel AI response
    this.sendEvent({ type: 'response.cancel' });

    // Mute AI audio output
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }

    // Transition to capture user speech
    this.stateMachine.transition('RECORDING');
    this.emit('barge_in.detected');
  }

  // ... rest of existing handler
}
```

**Files to modify**:
- `client/src/modules/voice/services/VoiceEventHandler.ts` - Add barge-in detection

---

### Task 5: Test and Validate (2-3 hours)

1. **Manual testing on kiosk**:
   - Tap once, speak, verify recording
   - Tap to stop, verify it stops
   - Speak naturally with pauses, verify AI responds appropriately
   - Interrupt AI mid-response, verify barge-in works

2. **Edge cases to verify**:
   - Network interruption during recording
   - Long pause (5+ seconds) - should end turn
   - Background noise - should not trigger recording
   - Rapid tapping - should debounce

---

## Implementation Summary

| Task | Effort | Files | Risk |
|------|--------|-------|------|
| Fix button state desync | 2-3h | HoldToRecordButton.tsx, VoiceControlWebRTC.tsx | Low |
| Fix stuck recording state | 2h | VoiceStateMachine.ts | Low |
| Enable server-side VAD | 1h | VoiceSessionConfig.ts | Medium (tune thresholds) |
| Add barge-in handling | 1h | VoiceEventHandler.ts | Low |
| Test and validate | 2-3h | - | - |
| **Total** | **8-10h** | **4 files** | **Low-Medium** |

---

## Success Criteria

- [ ] Tap button → UI shows "Listening" → microphone is actually recording
- [ ] Tap to stop → recording stops within 500ms
- [ ] Speak naturally with pauses → AI responds automatically
- [ ] Speak while AI is talking → AI stops, captures user input
- [ ] No "stuck in recording" state after 30 seconds

---

## Rollback Plan

If issues arise:
1. Revert VAD config to `turn_detection: null` (back to manual PTT)
2. Keep button state fixes (low risk)
3. Disable barge-in detection (comment out 5 lines)

---

---

# ARCHIVED: Original 6-Week Plan (Deferred)

The following sections are preserved for future reference but are NOT part of the current implementation.

---

## Original Phase 1: "Speak Naturally" UX (DEFERRED)

#### 1.1 State Machine Enhancements (DEFERRED - Using VAD instead)

**Original proposal for new states** (in `VoiceStateMachine.ts`):

```typescript
// These were proposed but NOT implementing - using server-side VAD instead
LISTENING          // Always-on listening after initial tap
BARGE_IN           // User spoke while AI was responding
PAUSED             // User paused mid-utterance
```

**Original transitions** (DEFERRED):
```
IDLE → LISTENING (user taps "Start" button)
LISTENING → RECORDING (VAD detects speech start)
RECORDING → PAUSED (silence >2s but <5s)
...
```

#### 1.2 Button Mode: Toggle → Continuous (SIMPLIFIED)

**Original proposal**:
```
Tap → RECORDING → Tap → IDLE (manual control)
```

**New Flow ("Speak Naturally")**:
```
Tap → LISTENING (always-on) → Speech → RECORDING → Pause → AI Response → LISTENING...
                                                                    ↓
                                                            "Done" or Timeout → IDLE
```

**Files to Modify**:
- `client/src/modules/voice/components/HoldToRecordButton.tsx` - Add `continuous` mode
- `client/src/modules/voice/components/VoiceControlWebRTC.tsx` - Wire up continuous mode

#### 1.3 Voice Activity Detection (VAD) Configuration

Enable server-side VAD with optimized settings for restaurant environment:

```typescript
// VoiceSessionConfig.ts - Update session configuration
turn_detection: {
  type: 'server_vad',
  threshold: 0.6,              // Higher threshold for noisy restaurant
  prefix_padding_ms: 400,      // Capture lead-in speech
  silence_duration_ms: 2000,   // Wait 2s before considering turn complete
  create_response: true        // Auto-generate response after turn
}
```

**Files to Modify**:
- `client/src/modules/voice/services/VoiceSessionConfig.ts` - VAD configuration
- `shared/src/voice/PromptConfigService.ts` - Add VAD-aware instructions

---

### Phase 2: Interruption Protection (Barge-In)

#### 2.1 Barge-In Detection

**Detection Logic** (in `VoiceEventHandler.ts`):

```typescript
// When user speech detected while AI is responding:
handleInputAudioBufferSpeechStarted(event) {
  if (this.stateMachine.getCurrentState() === 'AWAITING_RESPONSE') {
    // BARGE-IN detected!
    this.emit('barge_in.detected');
    this.stateMachine.transition('BARGE_IN');

    // Cancel AI response
    this.sendEvent({ type: 'response.cancel' });

    // Clear audio output buffer
    this.audioElement?.pause();

    // Transition to capture user's speech
    this.stateMachine.transition('RECORDING');
  }
}
```

#### 2.2 Graceful Handoff Protocol

1. **Detect overlap**: User speech during AI response
2. **Stop AI**: Cancel response, mute audio output
3. **Acknowledge**: Brief acknowledgment ("Got it, go ahead")
4. **Capture**: Record user's full utterance
5. **Process**: Handle user's request, ignore interrupted AI response
6. **Resume**: Continue conversation from user's last input

**Files to Modify**:
- `client/src/modules/voice/services/VoiceEventHandler.ts` - Barge-in detection
- `client/src/modules/voice/services/WebRTCVoiceClient.ts` - Response cancellation
- `shared/src/voice/PromptConfigService.ts` - Instructions for graceful interruption

#### 2.3 Audio Conflict Prevention

Prevent feedback loop when user and AI speak simultaneously:

```typescript
// WebRTCConnection.ts - Mute output during recording
startRecording() {
  // Mute AI audio output to prevent echo
  if (this.audioElement) {
    this.audioElement.volume = 0;
  }
  this.enableMicrophone();
}

stopRecording() {
  this.disableMicrophone();
  // Restore AI audio output
  if (this.audioElement) {
    this.audioElement.volume = 1;
  }
}
```

---

### Phase 3: Enhanced Menu Knowledge

#### 3.1 MenuKnowledgeEngine (New Service)

Replace `VoiceMenuMatcher` with enhanced engine:

```typescript
// shared/src/voice/MenuKnowledgeEngine.ts

interface MenuKnowledgeEngine {
  // Fuzzy matching with phonetic support
  matchItem(transcript: string): MatchResult[];

  // Category search
  searchByCategory(category: string): MenuItem[];

  // Dietary filtering
  filterByDiet(diet: DietaryRestriction): MenuItem[];

  // Cross-sell suggestions
  suggestAdditions(currentOrder: OrderItem[]): SuggestionResult[];

  // Modifier validation
  validateModifiers(item: MenuItem, modifiers: string[]): ValidationResult;

  // Real-time availability
  checkAvailability(itemId: string): Promise<boolean>;
}
```

#### 3.2 Phonetic Matching (Soundex + Custom)

```typescript
// Add to MenuKnowledgeEngine
const PHONETIC_ALIASES: Record<string, string[]> = {
  'greek': ['creek', 'creque', 'greque', 'greak'],
  'fajita': ['fahita', 'faheta', 'fajeta', 'fuhita'],
  'soul': ['sole', 'sol', 'so', 'sobo'],
  'peach': ['peech', 'paech', 'peachy'],
  'arugula': ['a-ruler', 'arucula', 'rugula'],
  'quinoa': ['keen-wa', 'kinwa', 'keenoa'],
  // ... expand based on transcription errors
};

// Use Soundex for fallback matching
import soundex from 'soundex-code';

matchPhonetic(word: string, menuItems: MenuItem[]): MatchResult[] {
  const wordSoundex = soundex(word);
  return menuItems
    .filter(item => soundex(item.name) === wordSoundex)
    .map(item => ({ item, confidence: 0.75, matchType: 'phonetic' }));
}
```

#### 3.3 Dietary Filtering

Track customer dietary preferences across the conversation:

```typescript
// VoiceOrderContext.tsx - Add dietary state
interface VoiceOrderState {
  items: OrderItem[];
  dietaryRestrictions: DietaryRestriction[];  // NEW: ['vegan', 'gluten-free', ...]
  allergens: string[];                         // NEW: ['peanuts', 'dairy', ...]
}

// PromptConfigService.ts - Add dietary-aware instructions
if (orderState.dietaryRestrictions.includes('vegan')) {
  instructions += `
    IMPORTANT: Customer is VEGAN. Do NOT suggest:
    - Items with meat, fish, dairy, eggs, or honey
    - If customer orders non-vegan item, CONFIRM: "That has [ingredient], still ok?"
  `;
}
```

#### 3.4 Cross-Sell Logic

```typescript
// MenuKnowledgeEngine.ts
const CROSS_SELL_RULES: CrossSellRule[] = [
  {
    trigger: { category: 'salad' },
    suggest: ['drink', 'side'],
    prompt: 'Would you like a drink or side with your salad?'
  },
  {
    trigger: { category: 'entree', count: 2 },
    suggest: ['appetizer'],
    prompt: 'With 2 entrees, our appetizer sampler is a great add!'
  },
  {
    trigger: { priceThreshold: 25 },
    suggest: ['dessert'],
    prompt: 'Save room for dessert? Our brownies are amazing!'
  }
];
```

---

### Phase 4: Channel Abstraction

#### 4.1 VoiceChannel Interface

```typescript
// shared/src/voice/VoiceChannel.ts

interface VoiceChannel {
  // Identification
  readonly channelType: 'webrtc' | 'telephone';
  readonly sessionId: string;

  // Audio configuration
  getAudioFormat(): AudioFormat;
  getLatencyMs(): number;

  // Connection lifecycle
  connect(config: SessionConfig): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;

  // Recording control
  startListening(): void;
  stopListening(): void;

  // Session state
  getSessionStore(): SessionStore;
  persistSession(): Promise<void>;
  restoreSession(sessionId: string): Promise<SessionState | null>;

  // Events
  on(event: ChannelEvent, handler: EventHandler): void;
  off(event: ChannelEvent, handler: EventHandler): void;
}
```

#### 4.2 WebRTC Implementation (Kiosk)

```typescript
// client/src/modules/voice/channels/WebRTCChannel.ts

class WebRTCChannel implements VoiceChannel {
  readonly channelType = 'webrtc';

  getAudioFormat(): AudioFormat {
    return { codec: 'pcm16', sampleRate: 24000, channels: 1 };
  }

  getLatencyMs(): number {
    return 150; // WebRTC typical latency
  }

  // ... delegate to existing WebRTCConnection and VoiceSessionConfig
}
```

#### 4.3 Telephone Implementation (Phone)

```typescript
// server/src/voice/channels/TelephoneChannel.ts

class TelephoneChannel implements VoiceChannel {
  readonly channelType = 'telephone';

  getAudioFormat(): AudioFormat {
    return { codec: 'mulaw', sampleRate: 8000, channels: 1 };
  }

  getLatencyMs(): number {
    return 350; // Telephony typical latency
  }

  // ... integrate with Twilio/SIP provider
}
```

#### 4.4 Session Persistence

```typescript
// server/src/voice/SessionStore.ts

interface SessionStore {
  save(sessionId: string, state: SessionState): Promise<void>;
  load(sessionId: string): Promise<SessionState | null>;
  delete(sessionId: string): Promise<void>;
  extend(sessionId: string, ttlMs: number): Promise<void>;
}

// Redis implementation with Supabase fallback
class HybridSessionStore implements SessionStore {
  constructor(
    private redis: RedisClient,
    private supabase: SupabaseClient
  ) {}

  async save(sessionId: string, state: SessionState): Promise<void> {
    // Write to Redis (fast) and Supabase (durable)
    await Promise.all([
      this.redis.setex(sessionId, 3600, JSON.stringify(state)),
      this.supabase.from('voice_sessions').upsert({ id: sessionId, state })
    ]);
  }
}
```

---

### Phase 5: Branch Recovery & Integration

#### 5.1 Branch Analysis

Analyze existing branches for reusable code:

| Branch | Status | Reusable Components |
|--------|--------|---------------------|
| `Voice-agent-mucking-about` | Experimental | Enterprise improvements plan, state machine refinements |
| `feature/voice-ordering-enterprise-improvements` | Archived | Phase 1-3 documentation, metrics framework |
| `voice-ordering-agent` (worktree) | Active | Current development branch |

#### 5.2 Cherry-Pick Strategy

```bash
# From voice-ordering-agent worktree:
git cherry-pick <commit-hash> # State machine improvements
git cherry-pick <commit-hash> # Enterprise metrics

# From feature/voice-ordering-enterprise-improvements:
git cherry-pick <commit-hash> # Documentation
```

#### 5.3 Integration Checklist

- [ ] Review `voice-ordering-agent` worktree for telephone patterns
- [ ] Extract telephony-agnostic improvements from `Voice-agent-mucking-about`
- [ ] Merge enterprise improvements documentation
- [ ] Reconcile state machine versions
- [ ] Update tests for unified agent

---

## Acceptance Criteria

### Feature 1: "Tap to Begin" → "Speak Naturally"

- [ ] **AC-1.1**: User taps microphone once, UI shows "Listening..." within 500ms
- [ ] **AC-1.2**: System listens continuously for 30+ seconds without re-tapping
- [ ] **AC-1.3**: Pauses >2s prompt "I got [items], anything else?" (not cut off)
- [ ] **AC-1.4**: User says "done" or 5s silence triggers checkout flow

### Feature 2: Interruption Protection

- [ ] **AC-2.1**: Barge-in detected within 300ms of user speech during AI response
- [ ] **AC-2.2**: AI audio stops immediately, user speech is captured
- [ ] **AC-2.3**: User gets confirmation: "Got it, [processing their request]"
- [ ] **AC-2.4**: No audio overlap (echo prevention working)

### Feature 3: Enhanced Menu Knowledge

- [ ] **AC-3.1**: "What salads do you have?" returns category list in <2s
- [ ] **AC-3.2**: "I'm vegan" persists across order; non-vegan items trigger confirmation
- [ ] **AC-3.3**: Invalid modifiers suggest valid alternatives
- [ ] **AC-3.4**: Phonetic matching: "fahita" → "fajita" with >0.8 confidence

### Feature 4: Unified Agent Core

- [ ] **AC-4.1**: Same VoiceOrderProcessor works for kiosk and telephone
- [ ] **AC-4.2**: Session can be restored after network interruption
- [ ] **AC-4.3**: Metrics dashboard shows channel breakdown (kiosk vs phone)

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Focus**: "Speak Naturally" UX

| Task | Effort | Owner | Dependencies |
|------|--------|-------|--------------|
| Add LISTENING, BARGE_IN, PAUSED states to VoiceStateMachine | 4h | - | None |
| Implement continuous listening mode in HoldToRecordButton | 3h | - | State machine |
| Configure server-side VAD with restaurant-tuned thresholds | 2h | - | None |
| Add pause detection and resume logic | 4h | - | State machine |
| Update VoiceControlWebRTC for new flow | 3h | - | All above |
| Write unit tests for new states | 4h | - | All above |

### Phase 2: Barge-In (Week 2-3)
**Focus**: Interruption Protection

| Task | Effort | Owner | Dependencies |
|------|--------|-------|--------------|
| Add barge-in detection in VoiceEventHandler | 4h | - | Phase 1 |
| Implement response cancellation in WebRTCVoiceClient | 3h | - | Phase 1 |
| Add audio muting during barge-in | 2h | - | None |
| Update PromptConfigService for graceful handoff | 2h | - | None |
| E2E tests for barge-in scenarios | 4h | - | All above |

### Phase 3: Menu Knowledge (Week 3-4)
**Focus**: Enhanced Matching & Filtering

| Task | Effort | Owner | Dependencies |
|------|--------|-------|--------------|
| Create MenuKnowledgeEngine service | 6h | - | None |
| Implement phonetic matching (Soundex + custom) | 4h | - | MenuKnowledgeEngine |
| Add dietary filtering with state persistence | 4h | - | VoiceOrderContext |
| Implement cross-sell rules engine | 4h | - | MenuKnowledgeEngine |
| Add modifier validation | 3h | - | MenuKnowledgeEngine |
| Integration tests | 4h | - | All above |

### Phase 4: Channel Abstraction (Week 4-5)
**Focus**: Unified Architecture

| Task | Effort | Owner | Dependencies |
|------|--------|-------|--------------|
| Define VoiceChannel interface | 2h | - | None |
| Implement WebRTCChannel wrapper | 4h | - | Interface |
| Create HybridSessionStore (Redis + Supabase) | 6h | - | None |
| Stub TelephoneChannel interface | 2h | - | Interface |
| Refactor WebRTCVoiceClient to use channel abstraction | 6h | - | WebRTCChannel |
| Cross-channel session tests | 4h | - | SessionStore |

### Phase 5: Integration & Polish (Week 5-6)
**Focus**: Branch Recovery & Production Readiness

| Task | Effort | Owner | Dependencies |
|------|--------|-------|--------------|
| Analyze and cherry-pick from abandoned branches | 4h | - | None |
| Reconcile state machine versions | 3h | - | Phase 1 |
| Production performance testing | 4h | - | All phases |
| Documentation updates | 4h | - | All phases |
| Metrics and monitoring setup | 3h | - | Phase 4 |

---

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Barge-in race conditions | 70% | High | Heavy unit testing, FSM verification |
| VAD false positives in noisy restaurant | 60% | Medium | Tune threshold, add manual override |
| Session persistence data loss | 40% | High | Dual-write Redis + Supabase |
| Telephone channel latency | 50% | Medium | Adaptive timeouts per channel |
| Token expiry during long orders | 55% | Medium | Sliding window refresh |

---

## Dependencies

### External
- OpenAI Realtime API (gpt-4o-realtime-preview-2025-06-03)
- Twilio/SIP provider (for telephone channel - future)
- Redis (for session persistence)

### Internal
- Supabase (menu data, session fallback storage)
- Existing VoiceStateMachine, WebRTCConnection, VoiceEventHandler

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Order completion rate | ~70% | >90% | Analytics |
| Average order time | ~90s | <60s | Session duration |
| Customer satisfaction (voice UX) | Unknown | >4.0/5 | Post-order survey |
| Barge-in handling success | 0% | >95% | Event logging |
| Menu match confidence | 0.6-0.8 | >0.85 | Match scoring |

---

## References

### Internal Files
- `client/src/modules/voice/services/VoiceStateMachine.ts` (current state machine)
- `client/src/modules/voice/services/VoiceMenuMatcher.ts` (current matching)
- `shared/src/voice/PromptConfigService.ts` (AI instructions)
- `docs/explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md`
- `docs/explanation/architecture-decisions/ADR-012-voice-interaction-pattern-by-context.md`

### External Documentation
- [OpenAI Realtime API Guide](https://platform.openai.com/docs/guides/realtime)
- [WebRTC MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Soundex Algorithm](https://en.wikipedia.org/wiki/Soundex)

### Related PRs/Issues
- Branch: `voice-ordering-agent` (active worktree)
- Branch: `Voice-agent-mucking-about` (experimental)
- Branch: `feature/voice-ordering-enterprise-improvements` (archived)

---

## Appendix: Edge Cases (P0-P1)

### Network
- EC-NET-001: Network drop mid-order → Session persistence
- EC-NET-002: Token expires during 60s order → Sliding refresh

### Interaction
- EC-INT-001: Barge-in (user speaks during AI) → BARGE_IN state
- EC-INT-003: Multi-touch on kiosk → Reject second finger

### Transcription
- EC-TRANS-004: Accent variations → Phonetic matching
- EC-TRANS-005: Homonyms ("Greek" vs "creek") → Soundex + context

### Menu
- EC-MENU-001: Item unavailable → Real-time availability check
- EC-MENU-004: Allergen conflict → Dietary state tracking

---

*Generated with [Claude Code](https://claude.com/claude-code)*
