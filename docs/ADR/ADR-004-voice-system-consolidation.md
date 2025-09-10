# ADR-004: Voice System Consolidation

**Status**: Accepted ✅ **IMPLEMENTED & ACTIVE**  
**Date**: September 2, 2025  
**Deciders**: AI/Voice Team

**Status Update (September 2025)**: WebRTC + OpenAI Realtime implementation is consolidated and operational as designed.

## Context

Multiple voice implementations existed:
- WebSocket + blob recording
- MediaRecorder API
- WebRTC + OpenAI Realtime
- Server-side transcription

This caused:
- Confusing user experience
- Maintenance overhead
- Inconsistent quality
- Browser compatibility issues

## Decision

We will use **ONLY WebRTC + OpenAI Realtime API** for all voice interactions.

## Consequences

### Positive
- Single, high-quality implementation
- Real-time bidirectional communication
- Native OpenAI integration
- Better latency and quality
- Simplified maintenance

### Negative
- Requires OpenAI API key
- WebRTC complexity
- Browser requirements (modern browsers only)

### Implementation

```typescript
// Single implementation
client/src/modules/voice/services/WebRTCVoiceClient.ts

// Single UI component
client/src/components/voice/VoiceControlWebRTC.tsx

// Single API endpoint
/api/v1/realtime/session
```

## Migration

All voice-related code consolidated to:
- Remove: WebSocket blob implementations
- Remove: MediaRecorder implementations  
- Remove: Server-side transcription
- Keep: WebRTC + OpenAI Realtime only

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14.1+
- Edge 90+

## Related
- Voice implementation: `/client/src/modules/voice/`
- ADR-002: Unified Backend Architecture
- OpenAI Realtime API documentation