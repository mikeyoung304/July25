# Voice Ordering Architecture (WebRTC)
**Last Updated:** 2025-01-23
**Status:** ACTIVE (Production)
**Critical Update:** OpenAI transcription model changed from `whisper-1` to `gpt-4o-transcribe` (Jan 2025)

## Overview
Voice ordering uses OpenAI's Realtime API via direct browser-to-OpenAI WebRTC connections for low-latency, natural voice interactions.

## Architecture Decision
After evaluating three approaches, we selected **Client-Side WebRTC** for production:

| Approach | Latency | Lines of Code | Status |
|----------|---------|---------------|--------|
| Server-Side WebSocket Proxy | 150-250ms | ~1,665 | ❌ Abandoned (Nov 2024) |
| Twilio Phone Integration | 300-400ms | ~1,020 | ❌ Never Deployed |
| **Client WebRTC (ACTIVE)** | **50-100ms** | **~2,500** | **✅ Production** |

**Why WebRTC Won:**
- **50-70% lower latency** (no server proxy hop)
- **Simpler scaling** (OpenAI handles infrastructure)
- **Native browser support** (no audio encoding complexity)
- **Cost efficient** (no server audio processing)

---

## System Components

### 1. Shared Services (Cross-Platform)
```
shared/src/voice/
└── PromptConfigService.ts              # AI prompt configuration (Phase 1)
                                        # Single source of truth for:
                                        # - Kiosk/Server instructions
                                        # - Function tools (add_to_order, etc.)
                                        # - Menu context injection
```

**Why:** Eliminates 316 lines of duplication, ensures prompt consistency
**Tests:** `shared/src/voice/__tests__/PromptConfigService.test.ts` (27 tests)

### 2. Client-Side (Browser)
```
client/src/modules/voice/
├── components/
│   └── VoiceControlWebRTC.tsx          # Main UI component
├── services/
│   ├── VoiceStateMachine.ts            # 12-state FSM (Phase 2)
│   ├── WebRTCVoiceClient.ts            # Orchestrator (uses VoiceStateMachine FSM)
│   ├── VoiceSessionConfig.ts           # Session config + token management
│   ├── WebRTCConnection.ts             # RTCPeerConnection lifecycle
│   └── VoiceEventHandler.ts            # Realtime API event processing
└── hooks/
    ├── useWebRTCVoice.ts               # React hook wrapper
    └── useVoiceCommerce.ts             # Voice commerce logic (Phase 3)
                                        # Shared between kiosk and server modes:
                                        # - Fuzzy menu matching
                                        # - Order data processing
                                        # - Recently added feedback
                                        # - Processing state indicators
```

**Why:** Eliminates 40% UI duplication, standardizes cart interactions
**Tests:** `client/src/modules/voice/hooks/__tests__/useVoiceCommerce.test.ts` (57 tests)

### 3. Server-Side (Backend)
```
server/src/routes/
└── realtime.routes.ts                  # POST /api/v1/realtime/session
                                        #   → Fetch ephemeral token
                                        #   → Load menu context
                                        #   → Return session data
```

---

## Data Flow

```
┌─────────────┐
│   Browser   │
│  (Kiosk UI) │
└──────┬──────┘
       │ 1. User clicks "Order by Voice"
       ▼
┌────────────────────────────────┐
│  VoiceOrderingMode.tsx         │
│  (Kiosk page wrapper)          │
└───────────┬────────────────────┘
            │ 2. Renders <VoiceControlWebRTC context="kiosk" />
            ▼
┌────────────────────────────────────────────────┐
│  VoiceControlWebRTC.tsx                        │
│  • Renders Hold-to-Talk button                │
│  • Renders transcript/response UI              │
│  • Calls useWebRTCVoice hook                   │
└────────────┬───────────────────────────────────┘
             │ 3. Hook initializes client
             ▼
┌────────────────────────────────────────────────┐
│  WebRTCVoiceClient (Orchestrator)              │
│  • Manages turn state machine                  │
│  • Delegates to 3 services                     │
└─┬──────────┬──────────────┬─────────────────┘
  │          │              │
  │ 4a       │ 4b           │ 4c
  ▼          ▼              ▼
┌────────┐ ┌──────────┐ ┌──────────────┐
│Session │ │ WebRTC   │ │ Event        │
│Config  │ │Connection│ │ Handler      │
└────┬───┘ └────┬─────┘ └──────┬───────┘
     │          │               │
     │ 5. Fetch ephemeral token│
     └──────────┼───────────────┘
                ▼
        ┌──────────────────┐
        │  Backend Server  │
        │ realtime.routes  │
        └────────┬─────────┘
                 │ 6. POST /api/v1/realtime/session
                 ▼
        ┌──────────────────────────┐
        │  OpenAI Realtime API     │
        │  (Ephemeral token issuer)│
        └────────┬─────────────────┘
                 │ 7. Returns:
                 │   • client_secret.value (ephemeral token)
                 │   • expires_at (60 seconds)
                 ▼
        ┌──────────────────┐
        │  Backend Server  │
        │ realtime.routes  │
        └────────┬─────────┘
                 │ 8. Adds menu_context (5KB max)
                 │    + restaurant_id
                 ▼
        ┌──────────────────┐
        │  VoiceSession    │
        │  Config Service  │
        └────────┬─────────┘
                 │ 9. Stores token + menu
                 ▼
        ┌──────────────────┐
        │  WebRTC          │
        │  Connection      │
        └────────┬─────────┘
                 │ 10. Connects to OpenAI
                 ▼
        ┌───────────────────────────┐
        │  OpenAI Realtime API      │
        │  wss://api.openai.com/v1  │
        │  /realtime?model=gpt-4o-  │
        │  realtime-preview-2025-   │
        │  06-03                    │
        └─────────┬─────────────────┘
                  │ 11. WebRTC SDP negotiation
                  │     (RTCPeerConnection)
                  │
                  │ 12. RTCDataChannel ready
                  ▼
        ┌──────────────────┐
        │  Event Handler   │
        │  Service         │
        └────────┬─────────┘
                 │ 13. Listens for session.created
                 ▼
        ┌──────────────────┐
        │  VoiceSession    │
        │  Config Service  │
        └────────┬─────────┘
                 │ 14. Builds session config:
                 │   • instructions (menu + context)
                 │   • tools (add_to_order, confirm_order, remove_from_order)
                 │   • voice: "alloy"
                 │   • turn_detection: server_vad
                 ▼
        ┌──────────────────┐
        │  Event Handler   │
        │  Service         │
        └────────┬─────────┘
                 │ 15. Sends session.update to OpenAI
                 ▼
        ┌───────────────────────────┐
        │  OpenAI Realtime API      │
        │  (Configured with menu +  │
        │   tools)                  │
        └─────────┬─────────────────┘
                  │ 16. Returns session.updated
                  ▼
        ┌──────────────────┐
        │  Event Handler   │
        │  Service         │
        └────────┬─────────┘
                 │ 17. Emits 'session.created' event
                 ▼
        ┌──────────────────┐
        │  VoiceControl    │
        │  WebRTC.tsx      │
        └────────┬─────────┘
                 │ 18. Shows "Ready" UI
                 │
                 │ [USER HOLDS BUTTON]
                 │
                 │ 19. startRecording()
                 ▼
        ┌──────────────────┐
        │  WebRTC          │
        │  VoiceClient     │
        └────────┬─────────┘
                 │ 20. Turn state: idle → recording
                 │     Enables microphone
                 │     Clears audio buffer
                 ▼
        ┌──────────────────┐
        │  WebRTC          │
        │  Connection      │
        └────────┬─────────┘
                 │ 21. Streams PCM16 audio chunks
                 │     via RTCDataChannel
                 ▼
        ┌───────────────────────────┐
        │  OpenAI Realtime API      │
        │  (Receives live audio)    │
        └─────────┬─────────────────┘
                  │ 22. Sends input_audio_buffer.speech_started
                  ▼
        ┌──────────────────┐
        │  Event Handler   │
        │  Service         │
        └────────┬─────────┘
                 │ 23. Emits 'speech.started'
                 │
                 │ [USER RELEASES BUTTON]
                 │
                 │ 24. stopRecording()
                 ▼
        ┌──────────────────┐
        │  WebRTC          │
        │  VoiceClient     │
        └────────┬─────────┘
                 │ 25. Mutes microphone IMMEDIATELY
                 │     Turn state: recording → committing
                 │     Sends input_audio_buffer.commit
                 │     Turn state: committing → waiting_user_final
                 ▼
        ┌───────────────────────────┐
        │  OpenAI Realtime API      │
        │  (Processes committed     │
        │   audio)                  │
        └─────────┬─────────────────┘
                  │ 26. Sends conversation.item.input_audio_transcription.completed
                  ▼
        ┌──────────────────┐
        │  Event Handler   │
        │  Service         │
        └────────┬─────────┘
                 │ 27. Emits 'transcript' event
                 │     Turn state: waiting_user_final → waiting_response
                 │
                 │ 28. Sends response.create (triggers AI response)
                 ▼
        ┌───────────────────────────┐
        │  OpenAI Realtime API      │
        │  (Generates response)     │
        └─────────┬─────────────────┘
                  │ 29. May call function (add_to_order)
                  ▼
        ┌──────────────────┐
        │  Event Handler   │
        │  Service         │
        └────────┬─────────┘
                 │ 30. Executes function locally:
                 │   • Fuzzy menu matching
                 │   • Adds items to cart
                 │   • Returns result to OpenAI
                 │
                 │ 31. Sends response.function_call_arguments.done
                 ▼
        ┌───────────────────────────┐
        │  OpenAI Realtime API      │
        │  (Continues response with │
        │   function result)        │
        └─────────┬─────────────────┘
                  │ 32. Sends response.audio.delta chunks
                  ▼
        ┌──────────────────┐
        │  Event Handler   │
        │  Service         │
        └────────┬─────────┘
                 │ 33. Emits 'response.text' (for UI)
                 │     Plays audio via <audio> element
                 │
                 │ 34. Sends response.audio.done
                 │     Turn state: waiting_response → idle
                 ▼
        ┌──────────────────┐
        │  VoiceControl    │
        │  WebRTC.tsx      │
        └────────┬─────────┘
                 │ 35. Updates UI:
                 │   • Shows transcript
                 │   • Shows AI response text
                 │   • Updates cart visually
                 │
                 │ [REPEAT: User holds button again]
```

---

## Critical Configuration: Context Prop

**THE FIX THAT SOLVED MENU KNOWLEDGE:**

```tsx
// ❌ WRONG (defaults to 'kiosk' but doesn't pass prop)
<VoiceControlWebRTC
  onTranscript={handleTranscript}
  onOrderDetected={handleOrder}
/>

// ✅ CORRECT (explicit context prop)
<VoiceControlWebRTC
  context="kiosk"  // <-- CRITICAL!
  onTranscript={handleTranscript}
  onOrderDetected={handleOrder}
/>
```

**Why this matters:**
- `VoiceSessionConfig.ts` builds different instructions based on context
- `context="kiosk"` → Full menu + function tools
- `context="server"` → No menu, different instructions
- **Missing prop** → Defaults to `undefined` → wrong config sent to OpenAI

---

## Voice State Machine (FSM)

**Phase 2 Architecture:** Replaced boolean flags with deterministic Finite State Machine

**Implementation:** `client/src/modules/voice/services/VoiceStateMachine.ts:58-83`

**All 12 States:**
1. `DISCONNECTED` - No WebRTC connection
2. `CONNECTING` - WebRTC connection in progress
3. `AWAITING_SESSION_CREATED` - Waiting for OpenAI session.created event
4. `AWAITING_SESSION_READY` - Waiting for session.updated confirmation
5. `IDLE` - Ready for user input
6. `RECORDING` - Actively capturing user audio
7. `COMMITTING_AUDIO` - Finalizing audio buffer
8. `AWAITING_TRANSCRIPT` - Waiting for transcription
9. `AWAITING_RESPONSE` - Waiting for AI response
10. `ERROR` - Recoverable error state
11. `TIMEOUT` - Session timeout occurred
12. `DISCONNECTING` - Graceful shutdown in progress

**State Guards:**
- Enforced via `canStartRecording()` and `canStopRecording()`
- Invalid transitions rejected before execution
- No debouncing needed - state machine prevents race conditions

**Transition History:**
- Last 50 transitions tracked for debugging
- Access via `client.stateMachine.getTransitionHistory()`
- Includes timestamps and metadata for each transition

---

## Menu Context Injection

**Backend (`realtime.routes.ts:25-132`):**
1. Fetch menu items from database
2. Fetch categories to map IDs → names
3. Format menu with human-readable categories
4. **CRITICAL:** Limit to 5KB to prevent OpenAI rejection
5. Include in session data: `menu_context`

**Frontend (`VoiceSessionConfig.ts:95-149`):**
1. Receive `menu_context` from backend
2. Build instructions: `KIOSK_INSTRUCTIONS + menu_context`
3. Build tools: `add_to_order`, `confirm_order`, `remove_from_order`
4. Send `session.update` with full config

---

## Function Calling

### Available Functions

#### 1. `add_to_order`
```json
{
  "name": "add_to_order",
  "description": "Add items to the customer's order",
  "parameters": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": "string",
            "quantity": "number",
            "modifications": "array<string>",
            "special_instructions": "string"
          }
        }
      }
    },
    "required": ["items"]
  }
}
```

#### 2. `confirm_order`
```json
{
  "name": "confirm_order",
  "description": "Confirm the complete order for checkout",
  "parameters": {
    "type": "object",
    "properties": {
      "order_type": {
        "type": "string",
        "enum": ["dine_in", "to_go"]
      }
    },
    "required": ["order_type"]
  }
}
```

#### 3. `remove_from_order`
```json
{
  "name": "remove_from_order",
  "description": "Remove specific items from the order",
  "parameters": {
    "type": "object",
    "properties": {
      "item_name": "string"
    },
    "required": ["item_name"]
  }
}
```

### Function Execution Flow

1. **OpenAI calls function** → `response.function_call_arguments.delta`
2. **Event handler receives** → `VoiceEventHandler:269-331`
3. **Execute handler:**
   - `add_to_order` → Fuzzy menu matching → Add to cart
   - `confirm_order` → Set order type → Trigger checkout
   - `remove_from_order` → Find item → Remove from cart
4. **Return result** → `conversation.item.create` (function_call_output)
5. **Continue response** → `response.create`

---

## Fuzzy Menu Matching

**Extracted to useVoiceCommerce Hook (Phase 3)**

**Problem:** User says "greek salad" but menu has "The Greek Salad"

**Solution:** The fuzzy matching logic has been centralized in `useVoiceCommerce.ts:271-324` to eliminate duplication between kiosk and server modes.

**3-Level Matching Strategy:**
1. Exact match (case-insensitive)
2. Contains match (bidirectional)
3. Variations dictionary (e.g., 'sobo' → 'soul bowl')

**Default Variations:**
```typescript
export const DEFAULT_MENU_VARIATIONS: MenuVariations = {
  'soul bowl': ['soul', 'bowl', 'sobo', 'solo bowl', 'soul ball'],
  'greek salad': ['greek', 'greek salad', 'geek salad'],
  'peach arugula': ['peach', 'arugula', 'peach salad'],
  'jalapeño pimento': ['jalapeno', 'pimento', 'cheese bites'],
  'succotash': ['succotash', 'suck a toss', 'sock a tash'],
};
```

**Usage:**
```typescript
const { voiceControlProps } = useVoiceCommerce({
  menuItems,
  onAddItem,
  menuVariations: CUSTOM_VARIATIONS, // Optional override
});
```

**Future:** Phase 4 will move variations to database (`menu_items.transcription_aliases`)

---

## Error Handling

### 1. Connection Failures
```typescript
// WebRTCConnection emits 'error' event
this.connection.on('error', (error: Error) => {
  this.emit('error', error);
  // UI shows: "Connection lost. Please try again."
});
```

### 2. Session Expiration
```typescript
// Token expires after 60 seconds
this.eventHandler.on('session_expired', async () => {
  await this.handleSessionExpired(); // Fetch new token + reconnect
});
```

### 3. Rate Limits
```typescript
// OpenAI rate limit exceeded
this.eventHandler.on('rate_limit_error', () => {
  // UI shows: "Service busy. Please wait a moment."
});
```

### 4. Transcript Timeout
```typescript
// No transcript received within 10 seconds
this.turnStateTimeout = setTimeout(() => {
  if (this.turnState === 'waiting_user_final') {
    this.resetTurnState(); // Back to idle
  }
}, 10000);
```

---

## Performance Optimizations

### 1. Lazy Loading
```tsx
// VoiceOrderingMode.tsx
const VoiceControlWebRTC = lazy(() =>
  import('@/modules/voice/components/VoiceControlWebRTC')
    .then(m => ({ default: m.VoiceControlWebRTC }))
);
```

### 2. Audio Buffer Management
```typescript
// Clear buffer before recording starts
this.eventHandler.sendEvent({
  type: 'input_audio_buffer.clear'
});
```

### 3. Immediate Mic Mute
```typescript
// stopRecording() mutes BEFORE sending commit
this.connection.disableMicrophone(); // <-- FIRST
this.eventHandler.sendEvent({
  type: 'input_audio_buffer.commit'
});
```

### 4. Menu Context Size Limit
```typescript
// Backend limits menu to 5KB
const MAX_MENU_CONTEXT_LENGTH = 5000;
if (menuContext.length > MAX_MENU_CONTEXT_LENGTH) {
  menuContext = menuContext.substring(0, MAX_MENU_CONTEXT_LENGTH) +
    '\n\n[Menu truncated - complete menu available on screen]';
}
```

---

## Testing

### Manual Testing Checklist
- [ ] Hold button → Mic enables
- [ ] Release button → Mic mutes immediately
- [ ] Transcript appears within 2 seconds
- [ ] AI response plays with audio
- [ ] Function calls add items to cart
- [ ] Cart updates visually
- [ ] Checkout confirmation works
- [ ] Error states show helpful messages

### Common Issues
1. **"Agent has no menu knowledge"**
   - ✅ **Fixed:** Add `context="kiosk"` prop to VoiceControlWebRTC

2. **"Race condition: session.update sent before session.created"**
   - ✅ **Fixed:** Event handler waits for session.created before sending config

3. **"Menu context too large (>50KB)"**
   - ✅ **Fixed:** Backend truncates to 5KB before sending

---

## Future Enhancements

### 1. Barge-in Support
Currently missing from WebRTC implementation. User cannot interrupt AI response.

**Plan:** Port from abandoned `EnhancedOpenAIAdapter.ts:232-257`:
```typescript
// Detect user speech during AI response
if (this.isSpeaking && userSpeechDetected) {
  this.sendToOpenAI({ type: 'response.cancel' });
  this.clearAudioBuffers();
}
```

### 2. Phone Integration (Post-MVP)
Reuse salvaged code from `docs/archive/2025-01/VOICE_CODE_SALVAGE.md`:
- G.711 μ-law audio conversion
- Twilio Media Streams integration
- Debug dashboard for monitoring

### 3. Debug Dashboard
Adapt salvaged dashboard for WebRTC monitoring:
- Real-time session tracking
- Transcript logging
- Function call inspection
- Audio buffer visualization

---

## Related Documentation
- [Salvaged Voice Code](../../archive/2025-01/VOICE_CODE_SALVAGE.md)
- [OpenAI Realtime API](../../reference/api/api/README.md)
- [Voice Ordering How-To](VOICE_ORDERING_WEBRTC.md)

---

## Troubleshooting

### Agent doesn't know the menu
**Symptom:** AI says "I don't have access to the menu"
**Cause:** Missing `context="kiosk"` prop
**Fix:** Add prop to VoiceControlWebRTC component

### Transcript never appears (CRITICAL - Jan 2025 Issue)
**Symptom:** Recording indicator shows, audio transmits, but no transcript text appears
**Causes:**
1. **Using deprecated `whisper-1` model** (Most Common - Fixed Jan 2025)
   - OpenAI deprecated `whisper-1` for Realtime API in early 2025
   - Fix: Update to `gpt-4o-transcribe` model in VoiceSessionConfig.ts
   - See: `docs/archive/2025-01/VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md`
2. Audio buffer not committed or token expired
3. Network interruption during transmission

**Diagnostic Steps:**
1. Check browser console for transcription events:
   - `conversation.item.input_audio_transcription.delta` (should appear during speech)
   - `conversation.item.input_audio_transcription.completed` (should appear after speech ends)
2. If NO transcription events appear:
   - Verify model is `gpt-4o-transcribe` (NOT `whisper-1`)
   - Check console for `session.update` logs showing correct model
3. Check for `input_audio_buffer.commit` events
4. Verify token hasn't expired (check timestamp)

**Expected Console Output (After Fix):**
```
📤 [WebRTCVoiceClient] Sending session.update:
  model: "gpt-4o-transcribe"

📝 [VoiceEventHandler] Got transcript delta: "I'd like"
📝 [VoiceEventHandler] Got transcript delta: " a greek"
📝 [VoiceEventHandler] Got transcript delta: " salad"
✅ [VoiceEventHandler] Got transcript completed: "I'd like a greek salad"
```

### Cart doesn't update
**Symptom:** AI confirms order but cart unchanged
**Cause:** Function call failing or fuzzy matching not finding item
**Fix:** Check browser console for `order.items.added` events

### "Session expired" error
**Symptom:** Connection works for ~60s then fails
**Cause:** Ephemeral token expired (60s lifespan)
**Fix:** Normal - client auto-reconnects with new token

---

## OpenAI API Breaking Change (January 2025)

**CRITICAL:** On approximately January 2025, OpenAI silently deprecated the `whisper-1` model for Realtime API transcription, causing complete voice ordering failure.

**Symptoms:**
- ✅ Session connects successfully
- ✅ Audio transmits (49KB+ sent)
- ✅ Agent responds with voice
- ❌ NO transcription events received
- ❌ State machine stuck in `waiting_user_final` (10s timeout)
- ❌ Orders cannot be processed

**Root Cause:**
OpenAI deprecated `whisper-1` without advance notice. The configuration was accepted without error, but transcription was silently ignored.

**Fix (Applied Jan 18, 2025):**
```typescript
// BEFORE (Broken)
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en'
}

// AFTER (Fixed)
input_audio_transcription: {
  model: 'gpt-4o-transcribe'  // Auto-detects language
}
```

**Files Updated:**
- `client/src/modules/voice/services/VoiceSessionConfig.ts:252-254`
- Commit: `3a5d126f`

**References:**
- Detailed RCA: `docs/archive/2025-01/VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md`
- OpenAI Community: https://community.openai.com/t/cant-get-the-user-transcription-in-realtime-api/1076308

**Monitoring Recommendations:**
1. Add alerts for missing transcription events
2. Monitor OpenAI community forums for API changes
3. Log all transcription event timestamps for analysis
4. Test transcription after any OpenAI API updates

---

**Maintainers:** @mikeyoung
**Last Reviewed:** 2025-01-18
