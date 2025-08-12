# Voice Transcription Service

This service provides real-time voice transcription through the unified backend API and BuildPanel service integration.

## Architecture

Voice transcription follows a WebSocket-to-REST bridge pattern:
- Audio is streamed via WebSocket to `ws://localhost:3001/voice-stream`
- Backend buffers audio chunks during recording
- On recording stop, complete audio is sent via HTTP to BuildPanel service (port 3003)
- BuildPanel processes audio and returns transcription + AI response
- Results are returned to frontend via WebSocket

```
Frontend WebSocket → Backend Buffer → HTTP to BuildPanel → AI Processing → WebSocket Response
```

## Setup

BuildPanel integration should be configured in the **backend** only:
1. Add to root `.env`:
   ```
   USE_BUILDPANEL=true
   # BuildPanel URL configured server-side only
   ```
2. Ensure BuildPanel service is running (backend will handle connection)
3. The frontend connects to the backend API - no client-side service configuration needed

## Usage

The transcription is automatically integrated into the `useAudioCapture` hook. Audio is streamed to the backend buffer and then processed via BuildPanel service.

## WebSocket-to-REST Bridge Pattern

The system uses a unique pattern where:
1. **Real-time streaming**: WebSocket receives audio chunks for immediate feedback
2. **Batch processing**: Complete audio sent to BuildPanel via HTTP for better AI processing
3. **Context preservation**: Restaurant context maintained throughout the pipeline

```typescript
// WebSocket receives chunks
ws.on('message', (data) => {
  if (isRecording) {
    audioBuffer.push(data);
  }
});

// HTTP processes complete audio
const response = await buildPanel.processVoice(
  Buffer.concat(audioBuffer),
  'audio/webm',
  restaurantId
);
```

## Error Handling

The service handles various error cases:

- **Backend Connection Failed**: Check if backend is running on port 3001
- **BuildPanel Service Down**: Check if BuildPanel is running on port 3003
- **No BuildPanel Config**: Set USE_BUILDPANEL=true in root .env
- **Network Errors**: Automatic reconnection with exponential backoff
- **Invalid Audio Format**: Backend validates audio format before sending to BuildPanel

## Security

✅ **Production-Ready Architecture**:

1. No AI service keys exposed to the browser
2. All transcription happens server-side via BuildPanel service
3. Proper authentication via Supabase JWT
4. Rate limiting implemented at API level
5. BuildPanel service isolated from direct frontend access

## Supported Audio Formats

The MediaRecorder API typically produces audio in webm format, which is processed by BuildPanel service. BuildPanel supports various audio formats including:
- webm (primary)
- wav
- mp3
- m4a
- other formats as supported by BuildPanel

## Testing

The service is automatically mocked in tests. The mock returns "Mock transcription result" for all audio inputs. BuildPanel service calls are mocked to avoid external dependencies during testing.