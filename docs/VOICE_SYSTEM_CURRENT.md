---
owner: Mike Young
status: green
last_verified_date: 2025-09-16
last_verified_commit: 29babce
version: v0.4
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