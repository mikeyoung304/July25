# WebRTC Voice Implementation Guide

**Version:** 1.0  
**Last Updated:** August 17, 2025  
**Status:** In Development - Known Issues

## Overview

This document describes the WebRTC-based real-time voice implementation using OpenAI's Realtime API. The system provides low-latency (~200ms) voice transcription and response generation through a direct browser-to-OpenAI connection.

## Architecture

### Connection Flow

```
Browser → Backend (Ephemeral Token) → OpenAI Realtime API
   ↓                                        ↓
WebRTC Peer Connection ←─────────────→ OpenAI WebRTC
   ├── Audio Track (bidirectional)
   └── Data Channel (events)
```

### Key Components

1. **WebRTCVoiceClient** (`client/src/modules/voice/services/WebRTCVoiceClient.ts`)
   - Manages WebRTC peer connection
   - Handles audio streaming and data channel events
   - Implements message queueing for reliability

2. **useWebRTCVoice Hook** (`client/src/modules/voice/hooks/useWebRTCVoice.ts`)
   - React hook for WebRTC integration
   - Manages connection state and transcription events
   - Provides recording controls

3. **Backend Ephemeral Token Endpoint** (`server/src/routes/realtime.routes.ts`)
   - Creates short-lived tokens (60s TTL)
   - Authenticates clients before WebRTC connection
   - Prevents direct API key exposure

## Current Implementation Status

### ✅ Working Features
- WebRTC connection establishment
- Ephemeral token generation and authentication
- Audio track setup with initial muting
- Data channel for bidirectional events
- Message queueing to prevent race conditions
- Session configuration with custom instructions

### ⚠️ Known Issues

#### 1. Duplicate Recording/Response Issue
**Symptom:** When user speaks once, the system records twice and responds with duplicated text (e.g., "You You")

**Root Cause:** Under investigation. Suspected causes:
- Audio buffer not clearing properly between recordings
- VAD (Voice Activity Detection) triggering multiple times
- Event handlers being called twice

**Attempted Fixes:**
- ✅ Disabled VAD completely (`turn_detection: null`)
- ✅ Added explicit `response.create` after commit
- ✅ Implemented debounce protection (500ms)
- ✅ Fixed double event handlers (removed touch events)
- ✅ Added message queue for data channel
- ❌ Issue still persists

## Configuration Details

### Session Configuration
```javascript
{
  modalities: ['text', 'audio'],
  instructions: 'Restaurant assistant instructions...',
  voice: 'alloy',
  input_audio_format: 'pcm16',
  output_audio_format: 'pcm16',
  input_audio_transcription: {
    model: 'whisper-1'
  },
  turn_detection: null,  // Disabled for manual control
  temperature: 0.6,
  max_response_output_tokens: 20
}
```

### WebRTC Configuration
```javascript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ],
  bundlePolicy: 'max-bundle'
}
```

## Message Flow

### Recording Start
1. User presses and holds button
2. Clear audio buffer: `input_audio_buffer.clear`
3. Enable microphone (set track.enabled = true)
4. Audio streams to OpenAI via WebRTC

### Recording Stop
1. User releases button
2. Disable microphone (set track.enabled = false)
3. Commit audio buffer: `input_audio_buffer.commit`
4. Request response: `response.create` (after 100ms delay)
5. Receive transcription and AI response

## Event Types

### Client → Server Events
- `session.update` - Configure session parameters
- `input_audio_buffer.clear` - Clear audio buffer
- `input_audio_buffer.commit` - Process recorded audio
- `response.create` - Request AI response
- `response.cancel` - Cancel active response

### Server → Client Events
- `session.created` - Session established
- `session.updated` - Configuration confirmed
- `conversation.item.input_audio_transcription.delta` - Partial transcript
- `conversation.item.input_audio_transcription.completed` - Final transcript
- `response.audio_transcript.delta` - Partial AI response
- `response.audio_transcript.done` - Complete AI response
- `error` - Error events

## Debugging Guide

### Check Connection Status
```javascript
// In browser console
console.log('[WebRTCVoice] Connection state:', this.pc?.connectionState);
console.log('[WebRTCVoice] ICE state:', this.pc?.iceConnectionState);
console.log('[WebRTCVoice] Data channel state:', this.dc?.readyState);
```

### Monitor Events
All events are logged with prefix `[WebRTCVoice]`. Enable debug mode:
```javascript
const client = new WebRTCVoiceClient({
  restaurantId: '...',
  debug: true
});
```

### Common Errors

1. **"Cannot send event, data channel not open"**
   - Solution: Events are queued and sent when channel opens

2. **"Cancellation failed: no active response found"**
   - Solution: Response tracking implemented to prevent invalid cancels

3. **"Called in wrong state: stable"**
   - Solution: Connection guards prevent duplicate connections

4. **"The order of m-lines in answer doesn't match order in offer"**
   - Solution: Removed duplicate audio track addition

## Testing

### Test Page
Navigate to `/test-webrtc` to access the WebRTC test interface.

### Manual Testing Steps
1. Click "Connect Voice" button
2. Grant microphone permission if prompted
3. Hold "HOLD ME" button while speaking
4. Release button to process speech
5. Verify single transcript appears
6. Verify single AI response (not duplicated)

## Future Improvements

1. **Fix Duplicate Recording Issue**
   - Investigate audio buffer management
   - Review VAD implementation details
   - Consider alternative event handling

2. **Add Reconnection Logic**
   - Implement exponential backoff
   - Handle token expiration gracefully
   - Restore session state after disconnect

3. **Improve Error Recovery**
   - Better error messages for users
   - Automatic retry mechanisms
   - Graceful degradation options

4. **Performance Optimizations**
   - Reduce initial connection time
   - Optimize audio encoding settings
   - Implement connection pooling

## References

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/api-reference/realtime)
- [WebRTC MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [OpenAI Realtime Event Reference](https://platform.openai.com/docs/api-reference/realtime/events)