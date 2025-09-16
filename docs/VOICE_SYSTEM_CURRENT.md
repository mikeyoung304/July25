---
owner: Mike Young
status: green
last_verified_date: 2025-09-15
last_verified_commit: ab234e6
version: v0.6
---

# Voice System Current

## Implementation Location

- **Client**: `client/src/modules/voice/services/WebRTCVoiceClient.ts`
- **Server**: `server/src/routes/realtime.routes.ts`
- **UI Component**: `VoiceControlWebRTC.tsx`
- **Test Page**: `/voice-test` route exists

## Employee Mode (As Implemented)

### Client Side
- Sets `mode: 'employee'` in WebRTCVoiceConfig
- Sets `visualFeedbackOnly: true` (no TTS output)
- UI shows visual transcript only
- **Listen-only with safe parsing**: Uses RealtimeGuards module for secure event handling

### Server Side
- Receives mode in session request body
- Sets `process.env.VOICE_MODE = 'server'` (line 59 realtime.routes.ts)
- No payment validation enforced
- Orders go direct to kitchen if user has staff role

### Security Architecture
- **RealtimeGuards Module**: Provides safe event parsing without dynamic code execution
- **No Dynamic Code Policy**: Browser environment restricts require() and eval() operations
- **Event Whitelist Approach**: Only predefined OpenAI Realtime events are processed
- **ESM-Safe Implementation**: All client-side voice code uses ES modules only
- **SessionConfigNormalizer**: Clamps all session parameters to OpenAI Realtime API limits
  - Temperature: 0.6-2.0 (employee default 0.7, customer default 0.85)
  - Prevents "Invalid session.temperature" errors that block connections
  - **Server-side normalizer**: Mirrors client validation on server
  - **Environment overrides**: Supports VOICE_TEMPERATURE, VOICE_TOP_P, etc. (all clamped)
  - **Restaurant overrides**: Per-venue customization via database settings

## Customer Mode (As Implemented)

### Client Side
- Sets `mode: 'customer'` (default) in WebRTCVoiceConfig
- Full TTS enabled for conversational responses
- Shows both transcript and AI responses

### Server Side
- Sets `process.env.VOICE_MODE = 'customer'`
- **✅ PAYMENT INTEGRATION COMPLETE**: Payment gate enforced server-side with client token acquisition
- Client acquires token via VoicePaymentStrategy (web/QR link) before order submission
- Orders blocked without payment_token, proceed with valid token

### Payment Token Security (v0.3)
- **One-Time Use**: Each payment token can only be used once
- **Amount Validation**: Token amount must match order total exactly
- **Restaurant Scoped**: Token must be for the correct restaurant
- **Atomic Consumption**: Token marked as used immediately after order creation
- **Replay Protection**: Used tokens return 402 Payment Required

## WebRTC Session Flow

1. Client calls `POST /api/v1/realtime/session` with:
   ```json
   {
     "mode": "employee" | "customer",
     "restaurantId": "uuid"
   }
   ```

2. Server creates ephemeral token via OpenAI API

3. Client establishes WebRTC connection with token

4. Events flow via DataChannel:
   - `session.created`
   - `conversation.item.created`
   - `response.done`
   - `transcript` (custom event)

## Event Names (From Code)

Client listens for:
- `session.created`
- `session.updated`
- `conversation.item.created`
- `response.audio.delta`
- `response.done`
- `input_audio_buffer.speech_started`
- `input_audio_buffer.speech_stopped`

## Mode Decision Point

- **Client**: Decided by component props/context
- **Server**: Set via environment variable on session creation
- **Not Persistent**: Mode is per-session, not stored in DB

## Voice Test Features

The `/voice-test` page provides:
- Mode toggle (Employee/Customer)
- Restaurant context selector
- Transcript display
- Connection status indicator
- Manual push-to-talk option

## Reliability Features (v0.6)

### Reconnection & Error Handling
- **Exponential backoff**: 200ms → 500ms → 1s → 2s → 5s (max 5 attempts)
- **Mic permission errors**: Friendly UI with browser settings guidance
- **Device change detection**: Auto-detect via navigator.mediaDevices.ondevicechange
- **Network resilience**: Automatic reconnection on connection loss
- **Provider errors**: 429/5xx handled with backoff and user notification

### Observability
- **Structured metrics**: voice.session.created/normalized/reconnect/fail events
- **Latency tracking**: Connection establishment and time-to-first-transcript
- **Session lifecycle**: Full tracking with unique session IDs
- **PII-safe logging**: No sensitive data in metrics

### CI Guards
- **ESLint rules**: Ban require() and Node globals in client code
- **Temperature validation**: Unit tests ensure defaults ≥ 0.6
- **GitHub workflow**: Automated checks for client code safety