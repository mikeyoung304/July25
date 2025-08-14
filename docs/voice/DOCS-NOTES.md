# OpenAI Realtime API Research Notes

**Last Updated:** January 14, 2025  
**Purpose:** Technical specifications for WebSocket-based realtime voice MVP integration

## WebSocket Connection Details

### Connection URL Format
```
wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17
```

**Components:**
- Protocol: `wss://` (secure WebSocket)
- Host: `api.openai.com`
- Path: `/v1/realtime`
- Query Parameter: `model=gpt-4o-realtime-preview-2024-12-17`

### Required Headers
```javascript
{
  "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
  "OpenAI-Beta": "realtime=v1"
}
```

### Connection Example
```javascript
const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
const ws = new WebSocket(url, {
  headers: {
    "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
    "OpenAI-Beta": "realtime=v1",
  },
});
```

## Available Models

- **Primary Model:** `gpt-4o-realtime-preview-2024-12-17`
- **Alternative:** `gpt-4o-realtime-preview-2024-10-01`

Both models support:
- Low-latency audio conversations
- Real-time transcription
- Function calling capabilities
- Bidirectional audio streaming

## Audio Format Requirements

### Supported Formats
- **Primary:** PCM16 (16-bit PCM, 24kHz, mono, little-endian)
- **Alternative:** G.711 (8kHz, u-law/a-law)

### PCM16 Specifications
- **Sample Rate:** 24,000 Hz
- **Bit Depth:** 16-bit
- **Channels:** 1 (mono)
- **Encoding:** Little-endian
- **Bitrate:** 384 kbps (nominal), ~500 kbps with base64 encoding
- **Compression:** Permessage-deflate can reduce to 300-400 kbps

### Audio Data Encoding
- All audio data is **base64-encoded** for transmission
- Audio chunks sent via `input_audio_buffer.append` events
- Received via `response.audio.delta` events

### Web Audio API Conversion
```javascript
// Convert PCM16 to Float32 for Web Audio API
function pcm16ToFloat32(buffer) {
  const view = new DataView(buffer);
  const float32 = new Float32Array(buffer.byteLength / 2);
  for (let i = 0; i < float32.length; i++) {
    const int16 = view.getInt16(i * 2, true); // little-endian
    float32[i] = int16 / 32768; // Convert to -1.0 to 1.0 range
  }
  return float32;
}
```

## Event Message Shapes

### Client → Server Events

#### Session Management
```typescript
// session.update - Configure session parameters
{
  type: "session.update",
  session: {
    modalities: ["text", "audio"],
    instructions: "You are a helpful restaurant ordering assistant",
    voice: "alloy",
    input_audio_format: "pcm16",
    output_audio_format: "pcm16",
    input_audio_transcription: {
      model: "whisper-1"
    },
    turn_detection: {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 200
    }
  }
}
```

#### Audio Input
```typescript
// input_audio_buffer.append - Send audio data
{
  type: "input_audio_buffer.append",
  audio: "base64EncodedAudioData"
}

// input_audio_buffer.commit - Process buffered audio
{
  type: "input_audio_buffer.commit"
}

// input_audio_buffer.clear - Clear audio buffer
{
  type: "input_audio_buffer.clear"
}
```

#### Conversation Management
```typescript
// conversation.item.create - Add messages/context
{
  type: "conversation.item.create",
  item: {
    id: "msg_001",
    type: "message",
    role: "user",
    content: [
      {
        type: "input_text",
        text: "I'd like to place an order"
      }
    ]
  }
}
```

#### Response Control
```typescript
// response.create - Generate response
{
  type: "response.create",
  response: {
    modalities: ["text", "audio"],
    instructions: "Help the customer place their order",
    voice: "alloy",
    output_audio_format: "pcm16"
  }
}

// response.cancel - Stop current response
{
  type: "response.cancel"
}
```

### Server → Client Events

#### Session Events
```typescript
// session.created - Initial session confirmation
{
  type: "session.created",
  session: {
    id: "sess_001",
    object: "realtime.session",
    model: "gpt-4o-realtime-preview-2024-12-17",
    // ... session configuration
  }
}

// session.updated - Session configuration confirmed
{
  type: "session.updated",
  session: { /* updated session object */ }
}
```

#### Audio Events
```typescript
// response.audio.delta - Streaming audio chunks
{
  type: "response.audio.delta",
  response_id: "resp_001",
  item_id: "item_001",
  output_index: 0,
  content_index: 0,
  delta: "base64EncodedAudioDelta"
}

// input_audio_buffer.speech_started - VAD detected speech
{
  type: "input_audio_buffer.speech_started",
  audio_start_ms: 1000,
  item_id: "item_001"
}

// input_audio_buffer.speech_stopped - VAD detected silence
{
  type: "input_audio_buffer.speech_stopped",
  audio_end_ms: 3000,
  item_id: "item_001"
}
```

#### Transcription Events
```typescript
// conversation.item.input_audio_transcription.completed
{
  type: "conversation.item.input_audio_transcription.completed",
  item_id: "item_001",
  content_index: 0,
  transcript: "I'd like to order a pizza"
}

// response.text.delta - Streaming text transcription
{
  type: "response.text.delta",
  response_id: "resp_001",
  item_id: "item_001",
  output_index: 0,
  content_index: 0,
  delta: "I'd be happy to"
}
```

#### Error Events
```typescript
// error - API or processing errors
{
  type: "error",
  error: {
    type: "invalid_request_error",
    code: "missing_audio",
    message: "The audio buffer is empty",
    param: "audio"
  }
}
```

## Voice Activity Detection (VAD)

### Turn Detection Types
- **`none`**: Manual control, no automatic turn detection
- **`server_vad`**: Server-side voice activity detection (default)
- **`semantic_vad`**: Model-based semantic understanding (experimental)

### Server VAD Configuration
```typescript
turn_detection: {
  type: "server_vad",
  threshold: 0.5,              // Sensitivity (0.0-1.0)
  prefix_padding_ms: 300,      // Audio before speech detection
  silence_duration_ms: 200     // Silence duration to end turn
}
```

## Function Calling Support

The Realtime API supports function calling for structured data extraction:

```typescript
// Define tools in session.update
tools: [
  {
    type: "function",
    name: "place_order",
    description: "Place a restaurant order",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "integer" },
              modifications: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    }
  }
]
```

## WebRTC Considerations for Future

### Current State
- OpenAI recommends WebRTC for production client-server scenarios
- WebSocket interface is primary/only option currently available
- WebRTC would provide lower latency for direct client connections

### Migration Path
1. **Phase 1:** WebSocket-based MVP (current scope)
2. **Phase 2:** Evaluate WebRTC integration when available
3. **Benefits of WebRTC:**
   - Lower latency (sub-100ms potential)
   - Better network resilience
   - Optimized for real-time media

## Twilio Media Streams Integration

### WebSocket Message Formats

#### Connected Event
```json
{
  "event": "connected",
  "protocol": "websocket",
  "version": "1.0.0"
}
```

#### Start Event
```json
{
  "event": "start",
  "sequenceNumber": "1",
  "start": {
    "streamSid": "MZ18ad3ab5a668481ce02b83e7395059f0",
    "accountSid": "AC...",
    "callSid": "CA...",
    "tracks": ["inbound"],
    "mediaFormat": {
      "encoding": "audio/x-mulaw",
      "sampleRate": 8000,
      "channels": 1
    }
  }
}
```

#### Media Event (Incoming Audio)
```json
{
  "event": "media",
  "sequenceNumber": "311",
  "media": {
    "track": "inbound",
    "chunk": "310", 
    "timestamp": "6200",
    "payload": "[base64 encoded μ-law audio]"
  },
  "streamSid": "MZ..."
}
```

#### Media Event (Outgoing Audio to Twilio)
```json
{
  "event": "media",
  "streamSid": "MZ18ad3ab5a668481ce02b83e7395059f0",
  "media": {
    "payload": "[base64 encoded μ-law audio]"
  }
}
```

#### Mark Event (Playback Confirmation)
```json
{
  "event": "mark",
  "streamSid": "MZ...",
  "mark": {
    "name": "audio_chunk_001"
  }
}
```

### Audio Format Bridging
- **Twilio Input/Output:** μ-law, 8kHz, mono
- **OpenAI Requirement:** PCM16, 24kHz, mono
- **Conversion Required:** Resample 8kHz→24kHz, μ-law→PCM16

### Bidirectional Flow Architecture
```
Phone Call → Twilio Media Streams → WebSocket → Audio Converter → OpenAI Realtime API
                                                       ↓
Phone Call ← Twilio Media Streams ← WebSocket ← Audio Converter ← OpenAI Realtime API
```

## Performance Considerations

### Key Metrics to Track
- **TTFP (Time to First Packet):** < 500ms target
- **Audio Latency:** < 200ms end-to-end target  
- **Connection Stability:** 99.9% uptime target
- **Transcription Accuracy:** > 95% for clear speech

### Optimization Strategies
1. **Connection Pooling:** Maintain persistent WebSocket connections
2. **Audio Buffering:** Balance latency vs. stability (50-100ms buffers)
3. **Error Recovery:** Graceful degradation and reconnection logic
4. **Compression:** Enable permessage-deflate for bandwidth efficiency

## Rate Limits & Quotas

### OpenAI Realtime API Limits
- **Tier-based pricing:** Usage-based billing model
- **Connection limits:** TBD based on plan tier
- **Audio processing:** Charged per audio minute processed
- **Function calls:** Standard API pricing applies

### Best Practices
- Implement connection pooling
- Use VAD to minimize unnecessary audio transmission
- Cache common responses when possible
- Monitor usage patterns for optimization

## Security Considerations

### API Key Management
- Store OpenAI API keys securely (environment variables)
- Use least-privilege access principles
- Rotate keys regularly
- Monitor for unusual usage patterns

### Audio Data Handling
- Audio data is ephemeral (not stored by OpenAI)
- Implement client-side audio encryption if required
- Consider data residency requirements
- Audit logging for compliance

---

**Next Steps:**
1. Implement WebSocket connection manager
2. Create audio format conversion utilities  
3. Build event-driven state machine
4. Add comprehensive error handling
5. Implement metrics collection
6. Plan Twilio integration bridge