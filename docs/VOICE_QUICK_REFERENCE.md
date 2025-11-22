# Voice Ordering - Quick Reference Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT (Browser)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ VoiceSessionConfig: Token & session mgmt             │   │
│  │ WebRTCConnection: Peer connection & audio           │   │
│  │ WebRTCVoiceClient: Orchestrator                      │   │
│  │ VoiceEventHandler: Event routing (20+ types)        │   │
│  │ VoiceOrderProcessor: Voice→Order conversion         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓ ↑
                    (WebRTC + JSON RPC)
                          ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                   SERVER (Express)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ POST /api/v1/realtime/session                        │   │
│  │   ├─ Load menu items & categories                    │   │
│  │   ├─ Format menu context (5KB max)                   │   │
│  │   └─ Request ephemeral token from OpenAI             │   │
│  │ GET /api/v1/realtime/health                          │   │
│  │ GET /api/v1/realtime/menu-check/:restaurantId       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓ ↑
                  (HTTP + REST API)
                          ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│              OpenAI Realtime API (gpt-4o-realtime)          │
│  ├─ Session creation & ephemeral tokens (60s)             │
│  ├─ WebRTC media & data channel                           │
│  ├─ Audio transcription (gpt-4o-transcribe)              │
│  ├─ LLM response generation                               │
│  └─ Function calling (add_to_order, confirm, remove)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components

### Client-side Services (Responsibilities)

| Service | Responsibility |
|---------|-----------------|
| **VoiceSessionConfig** | Token fetching, refresh scheduling, session config building, menu context |
| **WebRTCConnection** | Peer connection lifecycle, microphone/audio management, data channel |
| **WebRTCVoiceClient** | Orchestration, turn state machine (5 states), service coordination |
| **VoiceEventHandler** | Parse 20+ Realtime API events, function call parsing, transcript accumulation |
| **VoiceOrderProcessor** | Transcription→menu items, quantity/modifier extraction, order submission |
| **VoiceOrderContext** | React context for cart state (React only) |

### Server-side Endpoints

```
POST /api/v1/realtime/session
├─ Headers: x-restaurant-id, Authorization (optional)
├─ Process: Load menu → Format context → Request token from OpenAI
└─ Response: { id, client_secret, expires_at, menu_context, restaurant_id }

GET /api/v1/realtime/health
├─ Response: { status, checks: { api_key, api_key_valid, model_configured } }
└─ Use: Monitor voice service health

GET /api/v1/realtime/menu-check/:restaurantId
├─ Response: { status, item_count, available_item_count, category_count }
└─ Use: Verify voice ordering capability
```

---

## Turn State Machine

```
┌──────────────────────────────────────────────────────────┐
│                       IDLE                               │
│  (Ready to start recording - no timeout)                │
└────────────────┬─────────────────────────────────────────┘
                 │ user presses mic button
                 ↓
┌──────────────────────────────────────────────────────────┐
│                    RECORDING                             │
│  (Microphone enabled - transmitting audio)              │
│  Audio track: enabled=true                              │
└────────────────┬─────────────────────────────────────────┘
                 │ user releases mic button
                 ↓
┌──────────────────────────────────────────────────────────┐
│                    COMMITTING                            │
│  (Audio buffer being sent)                              │
│  Action: input_audio_buffer.commit                      │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────────────────────┐
│               WAITING_USER_FINAL                         │
│  (Waiting for transcript completion)                    │
│  Timeout: 10 seconds (prevents stuck state)             │
└────────────────┬─────────────────────────────────────────┘
                 │ conversation.item.input_audio_transcription.completed
                 ↓
┌──────────────────────────────────────────────────────────┐
│                 WAITING_RESPONSE                         │
│  (Waiting for AI response)                              │
│  Action: response.create sent                           │
└────────────────┬─────────────────────────────────────────┘
                 │ response.done
                 ↓
┌──────────────────────────────────────────────────────────┐
│                       IDLE                               │
│  (Turn complete - ready for next)                       │
└──────────────────────────────────────────────────────────┘
```

---

## Critical Fixes Applied

| Issue | Fix | Date |
|-------|-----|------|
| Whisper API deprecated | Changed to gpt-4o-transcribe | 2025-01-18 |
| Spanish auto-detection | Force `language: 'en'` | 2025-01-18 |
| Data channel race condition | Set onmessage BEFORE channel opens | Recent |
| Menu context not validated | Fail fast if empty with 503 | Recent |
| API key with newlines | Detect & reject with helpful error | Recent |
| Session config oversized | Limit menu context to 5KB | Recent |

---

## OpenAI API Configuration

```typescript
{
  modalities: ['text', 'audio'],           // Input + output
  voice: 'alloy',                          // Options: alloy, echo, fable, onyx, nova, shimmer
  temperature: 0.6,                        // Min for Realtime API
  max_response_output_tokens: 200|500,     // Server: 200, Kiosk: 500
  input_audio_format: 'pcm16',             // 16-bit PCM @ 24kHz (fixed)
  output_audio_format: 'pcm16',
  input_audio_transcription: {
    model: 'gpt-4o-transcribe',            // NOT whisper-1
    language: 'en'                         // Force English
  },
  turn_detection: null | { type: 'server_vad', ... },  // Optional
  instructions: "<AI instructions>",       // Context-specific (kiosk vs server)
  tools: [ ... ]                           // Function calling definitions
}
```

---

## Function Calling

### Kiosk Mode (Customer)

```typescript
add_to_order(items: [{ name, quantity, modifications?, specialInstructions? }])
confirm_order(action: 'checkout'|'review'|'cancel')
remove_from_order(itemName: string, quantity?: number)
```

### Server Mode (Staff)

```typescript
add_to_order(items: [...] + allergyNotes, rushOrder)
confirm_seat_order(action: 'submit'|'review'|'next_seat'|'finish_table')
remove_from_order(itemName, quantity?)
```

---

## AI Instructions

### Kiosk Mode

- **Tone:** Educational, 1-2 sentences, friendly
- **Speed:** Natural conversational pace
- **Actions:** Call `add_to_order` immediately when items mentioned
- **Follow-ups:** Smart category questions (dressing for salads, bread for sandwiches)
- **Confirmations:** Final order, price, pickup/dine-in
- **Language:** English default, Spanish if explicitly requested

### Server Mode

- **Tone:** Professional, rapid-fire, 5-10 words max
- **Speed:** Fast, no explanations (staff knows menu)
- **Defaults:** Use standard defaults, only ask if staff pauses
- **Batches:** Handle multi-item orders in single turn
- **Flags:** Allergies, rush orders, next_seat commands
- **Confirmations:** Item count + total only

---

## Audio Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Sample Rate | 24kHz | Fixed by OpenAI |
| Bit Depth | 16-bit | PCM format |
| Channels | Mono | Single channel |
| Frame Size | 384 samples | ~16ms per frame |
| Buffer | ~512 samples | Client queuing |

---

## Environment Variables

### Required (Server)

```env
OPENAI_API_KEY=sk_realtime_...              # NO NEWLINES!
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03
DEFAULT_RESTAURANT_ID=11111111-...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

### Optional (Client)

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_DEMO_PANEL=1
VITE_OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Invalid characters in API key" | Newlines in OPENAI_API_KEY | Use `echo -n` not `echo` |
| "CRITICAL: Backend returned no menu context" | Empty menu items | Add items to database |
| No transcript received | Audio track not enabled | Check enableMicrophone() called |
| "Message too large" from OpenAI | Config > 50KB | Menu auto-truncated to 5KB |
| Connection timeout after 15s | Network issue | Check firewall, proxy settings |
| Data channel never opens | SDP exchange failed | Check WebRTC STUN servers |
| Session.update rejected | Invalid instructions | Check instruction length |

---

## Testing

```bash
# Health check
curl http://localhost:3001/api/v1/realtime/health

# Menu check
curl http://localhost:3001/api/v1/realtime/menu-check/11111111-1111-1111-1111-111111111111

# Create session
curl -X POST http://localhost:3001/api/v1/realtime/session \
  -H "x-restaurant-id: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json"

# Client-side tests (skipped in CI)
npm test -- VoiceSessionConfig.test.ts
npm test -- WebRTCConnection.test.ts
npm test -- VoiceEventHandler.test.ts

# Server-side tests
npm run test:server -- realtime-menu-tools.test.ts
```

---

## Performance Targets

| Metric | Target | Typical |
|--------|--------|---------|
| Token fetch | <200ms | 100-150ms |
| WebRTC connection | <1s | 500-800ms |
| First transcript | <500ms | 200-400ms |
| AI response | <3s | 1-2s |
| Audio playback | <1s | 500-800ms |
| **Total E2E** | **<5s** | **2-4s** |

---

## File Locations

```
client/src/modules/voice/
├── services/
│   ├── VoiceSessionConfig.ts         # Token mgmt + config
│   ├── WebRTCConnection.ts           # Peer connection
│   ├── WebRTCVoiceClient.ts          # Orchestrator
│   ├── VoiceEventHandler.ts          # Event routing
│   ├── VoiceOrderProcessor.ts        # Voice→Order
│   └── VoiceCheckoutOrchestrator.ts  # Checkout flow
├── contexts/
│   ├── VoiceOrderContext.tsx         # React context
│   ├── context.ts                    # Context helper
│   └── types.ts                      # Type definitions
├── hooks/
│   ├── useVoiceOrder.ts              # Use context hook
│   └── useWebRTCVoice.ts             # Use client hook
└── components/
    ├── HoldToRecordButton.tsx        # UI component
    ├── TranscriptionDisplay.tsx      # Transcript display
    └── VoiceDebugPanel.tsx           # Debug panel

server/src/
├── routes/
│   └── realtime.routes.ts            # API endpoints
├── ai/
│   ├── adapters/openai/
│   │   └── openai-transcriber.ts     # Whisper integration
│   └── functions/
│       └── realtime-menu-tools.ts    # Menu tools for function calling
└── voice/
    └── types.ts                      # Server type definitions
```

---

## Quick Debugging Checklist

- [ ] Check `OPENAI_API_KEY` has no newlines
- [ ] Verify menu items exist for restaurant_id
- [ ] Confirm WebRTC STUN servers reachable
- [ ] Check audio track enabled (not muted)
- [ ] Verify ephemeral token not expired
- [ ] Check function calling instructions in config
- [ ] Monitor browser console for detailed errors
- [ ] Verify x-restaurant-id header sent correctly
- [ ] Check browser microphone permissions
- [ ] Review WebRTC stats for audio transmission

---

## Further Reading

- Full Architecture: `/docs/voice-ordering-architecture.md`
- OpenAI Docs: https://platform.openai.com/docs/guides/realtime
- WebRTC Spec: https://webrtc.org/
- Realtime API: gpt-4o-realtime-preview-2025-06-03

