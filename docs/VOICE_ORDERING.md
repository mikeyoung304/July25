# Voice Ordering System

## Overview

The Macon AI Restaurant OS features an advanced voice ordering system using WebRTC for real-time audio streaming and OpenAI's Realtime API for natural language processing. This enables customers to place orders using natural speech at kiosks or drive-thru stations.

## Architecture

### Technology Stack
- **Frontend**: WebRTC API for audio capture
- **Real-time Communication**: OpenAI Realtime API (WebSocket)
- **Backend**: Node.js with ephemeral token generation
- **Audio Processing**: Web Audio API for playback

### Data Flow
```
Customer Voice → WebRTC Capture → OpenAI Realtime API → Order Parsing → Order Creation
                                          ↓
                                    TTS Response → Audio Playback
```

## Implementation Details

### 1. WebRTC Audio Capture

**Component**: `/client/src/modules/voice/components/RealtimeTranscription.tsx`

```typescript
// Audio capture configuration
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 24000  // OpenAI requirement
  }
}
```

### 2. OpenAI Realtime Integration

**Ephemeral Token Generation**: `/server/src/routes/realtime.routes.ts`

The backend generates short-lived tokens for secure WebSocket connections:

```typescript
POST /api/v1/realtime/session
```

This endpoint:
1. Loads restaurant menu context
2. Requests ephemeral token from OpenAI
3. Returns token with menu data for AI context

### 3. Real-time Voice Processing

**Service**: `/client/src/modules/voice/services/RealtimeVoiceService.ts`

Key features:
- Bidirectional audio streaming
- Real-time transcription
- Context-aware responses with menu knowledge
- Order intent detection

### 4. Order Creation from Voice

**Processor**: `/client/src/modules/voice/services/VoiceOrderProcessor.ts`

Converts voice transcripts to structured orders:
```typescript
{
  items: [
    {
      name: "Greek Bowl",
      quantity: 1,
      modifiers: ["extra feta"]
    }
  ],
  type: "voice",
  specialInstructions: "No onions please"
}
```

## Configuration

### Environment Variables

**Client (.env)**
```bash
VITE_OPENAI_API_KEY=sk-...  # Not recommended in production
VITE_API_BASE_URL=http://localhost:3001
```

**Server (.env)**
```bash
OPENAI_API_KEY=sk-...  # Required for ephemeral tokens
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03
KIOSK_JWT_SECRET=your-secret  # For authentication
```

### OpenAI Realtime Configuration

The system configures the AI assistant with:
- Restaurant menu context
- Order-taking instructions
- Southern hospitality tone
- Allergen awareness

## User Interface

### Kiosk Voice Interface

Located at `/kiosk` and `/drive-thru` routes:

1. **Voice Button**: Press-and-hold or tap to toggle
2. **Visual Feedback**: 
   - Green pulse when listening
   - Processing spinner during AI response
   - Transcript display in real-time
3. **Audio Playback**: Automatic TTS response playback
4. **Order Confirmation**: Visual order summary

### Voice Control Components

- `VoiceOrderWidget` - Main voice interface
- `RealtimeTranscription` - WebRTC audio handling
- `AudioPlayer` - TTS response playback
- `OrderConfirmation` - Order review UI

## Testing

### Local Testing Setup

1. **Start Development Server**
```bash
npm run dev
```

2. **Access Voice Interface**
- Kiosk: http://localhost:5173/kiosk
- Drive-thru: http://localhost:5173/drive-thru

3. **Test Phrases**
```
"What's on the menu today?"
"I'd like a Greek Bowl with extra feta"
"Can I get two chicken sandwiches?"
"What allergens are in the peanut noodles?"
```

### Browser Requirements
- Chrome 90+ or Edge 90+ (WebRTC support)
- Microphone permissions
- Secure context (HTTPS or localhost)

## Common Issues & Solutions

### 1. Microphone Not Working

**Symptoms**: No audio input detected

**Solutions**:
- Check browser permissions for microphone
- Ensure using HTTPS or localhost
- Verify audio constraints match hardware capabilities

### 2. OpenAI Connection Failed

**Symptoms**: "Failed to create ephemeral token"

**Solutions**:
- Verify `OPENAI_API_KEY` is set on server
- Check OpenAI API quota and limits
- Ensure realtime routes are mounted (`/api/v1/realtime`)

### 3. No Audio Response

**Symptoms**: Transcription works but no audio playback

**Solutions**:
- Check browser audio permissions
- Verify TTS is enabled in OpenAI session
- Check Web Audio API compatibility

### 4. Order Not Created

**Symptoms**: Voice recognized but order fails

**Solutions**:
- Verify restaurant context is loaded
- Check order validation rules
- Ensure menu items match spoken names

## API Reference

### POST /api/v1/realtime/session

Creates ephemeral token for WebRTC session.

**Request Headers**:
```
Authorization: Bearer <jwt-token>
X-Restaurant-ID: <restaurant-uuid>
```

**Response**:
```json
{
  "id": "session_abc123",
  "object": "realtime.session",
  "model": "gpt-4o-realtime-preview-2025-06-03",
  "expires_at": 1234567890,
  "client_secret": {
    "value": "eph_token_...",
    "expires_at": 1234567890
  },
  "menu_context": "...",
  "restaurant_id": "11111111-1111-1111-1111-111111111111"
}
```

### WebSocket Events

**Client → Server**:
- `session.update` - Configure AI session
- `input_audio_buffer.append` - Stream audio chunks
- `input_audio_buffer.commit` - Finalize audio input
- `conversation.item.create` - Add text message

**Server → Client**:
- `transcript.partial` - Live transcription
- `transcript.final` - Completed transcription
- `response.audio.delta` - TTS audio chunks
- `response.done` - AI response complete

## Performance Optimization

### Audio Settings
- Sample rate: 24kHz (OpenAI requirement)
- Chunk size: 4096 samples
- Buffer strategy: Streaming with backpressure

### Latency Targets
- First token: < 500ms
- Complete response: < 3s
- Order creation: < 1s

### Caching Strategy
- Menu context cached for 5 minutes
- Ephemeral tokens: 60-second lifetime
- No audio response caching (real-time generation)

## Security Considerations

1. **Ephemeral Tokens**: Short-lived (60s) for minimal exposure
2. **Restaurant Scoping**: All orders tied to restaurant ID
3. **Authentication**: JWT required for token generation
4. **Rate Limiting**: Prevent abuse of OpenAI API
5. **Input Validation**: Sanitize transcripts before processing

## Future Enhancements

1. **Multi-language Support**: Spanish, Mandarin voice ordering
2. **Voice Biometrics**: Customer recognition for personalization
3. **Offline Mode**: Local speech recognition fallback
4. **Advanced NLU**: Better handling of complex modifications
5. **Voice Payments**: "Charge my card on file"

## Troubleshooting Checklist

- [ ] Server running on port 3001
- [ ] Client running on port 5173
- [ ] OPENAI_API_KEY configured
- [ ] Realtime routes mounted
- [ ] WebSocket connection established
- [ ] Microphone permissions granted
- [ ] Restaurant context loaded
- [ ] Demo authentication working

## Support Resources

- OpenAI Realtime Docs: https://platform.openai.com/docs/guides/realtime
- WebRTC Guide: https://webrtc.org/getting-started/overview
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API