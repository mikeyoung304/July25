---
owner: Mike Young
status: red
last_verified_date: 2025-09-15
last_verified_commit: 764d332991dd3a91ca870515b7f50cfa28208275
version: v0.1
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

### Server Side
- Receives mode in session request body
- Sets `process.env.VOICE_MODE = 'server'` (line 59 realtime.routes.ts)
- No payment validation enforced
- Orders go direct to kitchen if user has staff role

## Customer Mode (As Implemented)

### Client Side
- Sets `mode: 'customer'` (default) in WebRTCVoiceConfig
- Full TTS enabled for conversational responses
- Shows both transcript and AI responses

### Server Side
- Sets `process.env.VOICE_MODE = 'customer'`
- **CRITICAL**: No payment gate enforcement found in code
- Orders currently can reach kitchen without payment_token
- TODO: Must add payment gate in Phase C

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