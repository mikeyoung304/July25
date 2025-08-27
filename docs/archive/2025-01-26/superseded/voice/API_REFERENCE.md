# WebRTC Voice API Reference

**Version:** 1.0  
**Last Updated:** August 17, 2025  
**Protocol:** WebRTC + Data Channel

## Authentication

### Ephemeral Token Endpoint

**POST** `/api/v1/realtime/session`

Creates a short-lived token for WebRTC connection to OpenAI Realtime API.

#### Request Headers
```
Authorization: Bearer <auth-token>
Content-Type: application/json
x-restaurant-id: <restaurant-id>
```

#### Response
```json
{
  "client_secret": {
    "value": "eph_xxxxxxxxxxxx",
    "expires_at": 1755449948000
  },
  "restaurant_id": "11111111-1111-1111-1111-111111111111",
  "expires_at": 1755449948000
}
```

#### Token Lifetime
- Default: 60 seconds
- Cannot be refreshed (create new token instead)
- Used only for initial WebRTC connection

## WebRTC Connection

### SDP Offer Exchange

**POST** `https://api.openai.com/v1/realtime?model=<model>`

#### Request Headers
```
Authorization: Bearer <ephemeral-token>
Content-Type: application/sdp
```

#### Request Body
```
v=0
o=- 123456 2 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126
m=application 9 UDP/DTLS/SCTP webrtc-datachannel
```

#### Response
SDP answer as plain text

## Data Channel Events

### Client → Server Events

#### session.update
Configure or update session parameters.

```typescript
{
  type: 'session.update',
  session: {
    modalities?: ['text', 'audio'],
    instructions?: string,
    voice?: 'alloy' | 'echo' | 'shimmer',
    input_audio_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw',
    output_audio_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw',
    input_audio_transcription?: {
      model: 'whisper-1'
    },
    turn_detection?: {
      type: 'server_vad',
      threshold?: number,
      prefix_padding_ms?: number,
      silence_duration_ms?: number
    } | null,
    temperature?: number,
    max_response_output_tokens?: number | 'inf'
  }
}
```

#### input_audio_buffer.clear
Clear the audio input buffer.

```typescript
{
  type: 'input_audio_buffer.clear'
}
```

#### input_audio_buffer.commit
Commit audio buffer for processing.

```typescript
{
  type: 'input_audio_buffer.commit'
}
```

#### response.create
Manually trigger a response (when VAD is disabled).

```typescript
{
  type: 'response.create',
  response?: {
    modalities?: ['text', 'audio'],
    instructions?: string,
    temperature?: number,
    max_output_tokens?: number
  }
}
```

#### response.cancel
Cancel the current response generation.

```typescript
{
  type: 'response.cancel'
}
```

### Server → Client Events

#### session.created
Session successfully created.

```typescript
{
  type: 'session.created',
  event_id: string,
  session: {
    id: string,
    object: 'realtime.session',
    model: string,
    modalities: string[],
    instructions: string,
    voice: string,
    input_audio_format: string,
    output_audio_format: string,
    turn_detection: object | null,
    tools: array,
    temperature: number,
    max_response_output_tokens: number | 'inf'
  }
}
```

#### session.updated
Session configuration updated.

```typescript
{
  type: 'session.updated',
  event_id: string,
  session: { /* same as session.created */ }
}
```

#### input_audio_buffer.speech_started
Speech detected in audio stream.

```typescript
{
  type: 'input_audio_buffer.speech_started',
  event_id: string,
  audio_start_ms: number,
  item_id: string
}
```

#### input_audio_buffer.speech_stopped
End of speech detected.

```typescript
{
  type: 'input_audio_buffer.speech_stopped',
  event_id: string,
  audio_end_ms: number,
  item_id: string
}
```

#### conversation.item.input_audio_transcription.delta
Partial transcription of user speech.

```typescript
{
  type: 'conversation.item.input_audio_transcription.delta',
  event_id: string,
  item_id: string,
  content_index: number,
  delta: string
}
```

#### conversation.item.input_audio_transcription.completed
Final transcription of user speech.

```typescript
{
  type: 'conversation.item.input_audio_transcription.completed',
  event_id: string,
  item_id: string,
  content_index: number,
  transcript: string
}
```

#### response.created
Response generation started.

```typescript
{
  type: 'response.created',
  event_id: string,
  response: {
    id: string,
    object: 'realtime.response',
    status: 'in_progress',
    output: [],
    usage: null
  }
}
```

#### response.audio_transcript.delta
Partial text of AI audio response.

```typescript
{
  type: 'response.audio_transcript.delta',
  event_id: string,
  response_id: string,
  item_id: string,
  output_index: number,
  content_index: number,
  delta: string
}
```

#### response.audio_transcript.done
Complete text of AI audio response.

```typescript
{
  type: 'response.audio_transcript.done',
  event_id: string,
  response_id: string,
  item_id: string,
  output_index: number,
  content_index: number,
  transcript: string
}
```

#### response.audio.delta
Audio data chunk (base64 encoded).

```typescript
{
  type: 'response.audio.delta',
  event_id: string,
  response_id: string,
  item_id: string,
  output_index: number,
  content_index: number,
  delta: string  // base64 encoded PCM16 audio
}
```

#### response.done
Response generation complete.

```typescript
{
  type: 'response.done',
  event_id: string,
  response: {
    id: string,
    object: 'realtime.response',
    status: 'completed',
    output: array,
    usage: {
      total_tokens: number,
      input_tokens: number,
      output_tokens: number
    }
  }
}
```

#### error
Error occurred during processing.

```typescript
{
  type: 'error',
  event_id: string,
  error: {
    type: string,
    code?: string,
    message: string,
    param?: string,
    event_id?: string
  }
}
```

## TypeScript Interfaces

### WebRTCVoiceConfig
```typescript
interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  debug?: boolean;
}
```

### TranscriptEvent
```typescript
interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
}
```

### OrderEvent
```typescript
interface OrderEvent {
  items: Array<{
    name: string;
    quantity: number;
    modifiers?: string[];
  }>;
  confidence: number;
  timestamp: number;
}
```

### ConnectionState
```typescript
type ConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'error';
```

## Usage Examples

### Initialize Client
```typescript
import { WebRTCVoiceClient } from './WebRTCVoiceClient';

const client = new WebRTCVoiceClient({
  restaurantId: '11111111-1111-1111-1111-111111111111',
  debug: true
});

// Set up event listeners
client.on('transcript', (event) => {
  console.log('User said:', event.text);
});

client.on('response.text', (text) => {
  console.log('AI response:', text);
});

client.on('error', (error) => {
  console.error('Voice error:', error);
});

// Connect
await client.connect();
```

### Recording Flow
```typescript
// Start recording (hold-to-talk)
client.startRecording();

// ... user speaks ...

// Stop recording and get response
client.stopRecording();
```

### React Hook Usage
```typescript
import { useWebRTCVoice } from './hooks/useWebRTCVoice';

function VoiceComponent() {
  const {
    connect,
    disconnect,
    isConnected,
    startRecording,
    stopRecording,
    isRecording,
    transcript,
    responseText,
    error
  } = useWebRTCVoice({
    autoConnect: false,
    debug: true,
    onTranscript: (event) => {
      console.log('Transcript:', event.text);
    }
  });

  return (
    <div>
      {!isConnected && (
        <button onClick={connect}>Connect Voice</button>
      )}
      
      {isConnected && (
        <button 
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
        >
          Hold to Talk
        </button>
      )}
      
      {transcript && <p>You said: {transcript}</p>}
      {responseText && <p>AI: {responseText}</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `rate_limit_exceeded` | Too many requests | Implement exponential backoff |
| `session_expired` | Token expired | Create new ephemeral token |
| `invalid_session_update` | Invalid configuration | Check session parameters |
| `audio_format_error` | Unsupported audio format | Use PCM16 24kHz mono |
| `turn_detection_error` | Invalid VAD config | Check threshold and duration values |

## Rate Limits

- Token creation: 100/minute per restaurant
- WebRTC connections: 10 concurrent per restaurant
- Audio processing: 15 minutes per session
- Response generation: Based on OpenAI tier

## Best Practices

1. **Connection Management**
   - Always disconnect cleanly when done
   - Implement reconnection with exponential backoff
   - Monitor connection state changes

2. **Audio Quality**
   - Use noise suppression and echo cancellation
   - Monitor audio levels before recording
   - Handle microphone permission denials gracefully

3. **Error Handling**
   - Log all errors with context
   - Provide user-friendly error messages
   - Implement fallback mechanisms

4. **Performance**
   - Minimize audio buffer size
   - Use appropriate response token limits
   - Monitor latency metrics

5. **Security**
   - Never expose API keys client-side
   - Use ephemeral tokens with short TTL
   - Validate all inputs server-side