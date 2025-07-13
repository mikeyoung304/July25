# Voice Transcription Service

This service provides real-time voice transcription through the unified backend API.

## Architecture

Voice transcription is handled by the unified backend on port 3001:
- Audio is streamed via WebSocket to `ws://localhost:3001`
- Backend processes audio using OpenAI's Whisper API
- Transcription results are returned in real-time

## Setup

The OpenAI API key should be configured in the **backend** only:
1. Add to `server/.env`:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
2. The frontend connects to the backend API - no client-side API keys needed

## Usage

The transcription is automatically integrated into the `useAudioCapture` hook. Audio is streamed to the backend for secure processing.

## Error Handling

The service handles various error cases:

- **Backend Connection Failed**: Check if backend is running on port 3001
- **No API Key**: Configure OPENAI_API_KEY in server/.env
- **Rate Limiting**: Backend handles rate limiting gracefully
- **Network Errors**: Automatic reconnection with exponential backoff
- **Invalid Audio Format**: Backend validates audio format

## Security

✅ **Production-Ready Architecture**:

1. API keys are never exposed to the browser
2. All transcription happens server-side via unified backend
3. Proper authentication via Supabase JWT
4. Rate limiting implemented at API level

## Supported Audio Formats

The MediaRecorder API typically produces audio in webm format, which is supported by OpenAI's Whisper API. Other supported formats include:
- mp3
- mp4
- mpeg
- mpga
- m4a
- wav
- webm

## Testing

The service is automatically mocked in tests. The mock returns "Mock transcription result" for all audio inputs.