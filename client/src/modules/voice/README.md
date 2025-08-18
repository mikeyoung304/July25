# Voice Module

Real-time voice transcription and ordering system using WebRTC and OpenAI's Realtime API.

## Overview

This module provides low-latency voice capture and transcription capabilities for restaurant ordering. It uses WebRTC for direct browser-to-OpenAI communication, achieving ~200ms response times.

## Architecture

```
Components/
├── VoiceControlWebRTC.tsx    # Main UI component with hold-to-talk button
├── HoldToRecordButton.tsx     # Recording button component
├── ConnectionIndicator.tsx    # Visual connection status
├── TranscriptionDisplay.tsx   # Shows transcribed text
└── VoiceDebugPanel.tsx        # Debug information panel

Services/
├── WebRTCVoiceClient.ts       # Core WebRTC implementation
└── VoiceSocketManager.ts      # WebSocket fallback (legacy)

Hooks/
├── useWebRTCVoice.ts          # React hook for WebRTC voice
└── useVoiceToAudio.ts         # Legacy audio streaming hook

Contexts/
└── VoiceOrderContext.tsx      # Order state management
```

## Quick Start

### Basic Usage

```typescript
import { VoiceControlWebRTC } from '@/modules/voice/components/VoiceControlWebRTC';

function OrderingKiosk() {
  const handleTranscript = (text: string) => {
    console.log('Customer said:', text);
  };

  const handleOrderDetected = (order: any) => {
    console.log('Order detected:', order);
  };

  return (
    <VoiceControlWebRTC
      onTranscript={handleTranscript}
      onOrderDetected={handleOrderDetected}
      debug={true}
    />
  );
}
```

### Using the Hook

```typescript
import { useWebRTCVoice } from '@/modules/voice/hooks/useWebRTCVoice';

function CustomVoiceInterface() {
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
    debug: true
  });

  // Your custom UI here
}
```

## Configuration

### Environment Variables

```bash
# Required
VITE_OPENAI_API_KEY=sk-...           # OpenAI API key
VITE_OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03

# Optional
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_API_BASE_URL=http://localhost:3001
```

### Session Configuration

The WebRTC client configures the OpenAI session with:

```javascript
{
  modalities: ['text', 'audio'],
  voice: 'alloy',
  input_audio_format: 'pcm16',
  output_audio_format: 'pcm16',
  input_audio_transcription: {
    model: 'whisper-1'
  },
  turn_detection: null,  // Manual control
  temperature: 0.6,
  max_response_output_tokens: 20
}
```

## Features

### Hold-to-Talk Recording
- Press and hold button to record
- Release to process speech
- Visual feedback during recording
- Automatic microphone management

### Real-time Transcription
- Streaming partial transcripts
- Final transcription on release
- Confidence scores
- Timestamp tracking

### AI Responses
- Context-aware responses
- Restaurant-specific instructions
- Order intent detection
- Limited response length

### Connection Management
- Automatic reconnection
- Ephemeral token refresh
- Connection state monitoring
- Error recovery

## Known Issues

⚠️ **Critical Issue: Duplicate Recording**
- Speech is recorded and processed twice
- Results in duplicate transcriptions
- AI responds with repeated text
- See [KNOWN_ISSUES.md](../../../docs/voice/KNOWN_ISSUES.md)

## Testing

### Test Page
Navigate to `/test-webrtc` for the WebRTC test interface.

### Manual Testing
1. Grant microphone permission
2. Click "Connect Voice"
3. Hold button while speaking
4. Release to get response
5. Check console for debug logs

### Debug Mode
Enable debug logging:
```typescript
<VoiceControlWebRTC debug={true} />
```

## Browser Support

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90+ | ✅ Full support | Recommended |
| Edge | 90+ | ✅ Full support | Works well |
| Safari | 15+ | ⚠️ Partial | Permission issues |
| Firefox | 95+ | ⚠️ Partial | WebRTC differences |

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Connection time | <1s | ~500ms |
| Speech-to-text | <500ms | ~300ms |
| AI response | <1s | ~800ms |
| End-to-end | <2s | ~1.6s |

## API Endpoints

### Backend Endpoints
- `POST /api/v1/realtime/session` - Create ephemeral token
- `GET /api/v1/realtime/health` - Service health check

### WebRTC Connection
- Direct connection to OpenAI Realtime API
- Uses ephemeral tokens (60s TTL)
- PCM16 audio format at 24kHz

## Dependencies

```json
{
  "openai": "^4.20.0",  // OpenAI SDK
  "events": "^3.3.0",   // Event emitter
  "lucide-react": "^0.263.1"  // Icons
}
```

## Migration from WebSocket

If migrating from the WebSocket implementation:

1. Replace `VoiceControl` with `VoiceControlWebRTC`
2. Update from `useVoiceToAudio` to `useWebRTCVoice`
3. Remove WebSocket connection code
4. Update error handling for WebRTC errors

## Troubleshooting

### Common Issues

1. **No audio input**
   - Check microphone permissions
   - Verify audio track is enabled
   - Check browser console for errors

2. **Connection fails**
   - Verify ephemeral token endpoint
   - Check network connectivity
   - Ensure API keys are valid

3. **No transcription**
   - Verify audio is being transmitted
   - Check session configuration
   - Monitor data channel events

### Debug Commands

```javascript
// Get client instance (in browser console)
const client = document.querySelector('[data-webrtc-client]')?.__client;

// Check connection
console.log(client?.getConnectionState());

// Monitor recording
console.log(client?.isCurrentlyRecording());

// Force reconnect
client?.disconnect();
setTimeout(() => client?.connect(), 1000);
```

## Future Improvements

- [ ] Fix duplicate recording issue
- [ ] Add voice activity visualization
- [ ] Implement speaker diarization
- [ ] Add language detection
- [ ] Support multiple languages
- [ ] Add offline fallback
- [ ] Implement voice commands
- [ ] Add accessibility features

## Resources

- [WebRTC Voice Implementation Guide](../../../docs/voice/WEBRTC_IMPLEMENTATION.md)
- [Troubleshooting Guide](../../../docs/voice/TROUBLESHOOTING.md)
- [API Reference](../../../docs/voice/API_REFERENCE.md)
- [Known Issues](../../../docs/voice/KNOWN_ISSUES.md)
- [OpenAI Realtime Docs](https://platform.openai.com/docs/api-reference/realtime)