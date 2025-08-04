# Implementing Real-Time Transcription

> **Status**: Backend WebSocket infrastructure ready, awaiting BuildPanel streaming specification  
> **Priority**: High - Core feature for voice ordering UX  
> **Last Updated**: January 2025

## 📋 Project Overview

We're implementing real-time transcription for the restaurant voice ordering system on the kiosk page. The current implementation processes complete audio files, but we need progressive transcription that updates as the user speaks.

## ✅ Current Implementation Status

### What's Working
- **Kiosk Page** (`client/src/pages/KioskPage.tsx`): Fully functional voice interface with conversation display and order management
- **Voice Capture Component** (`VoiceControlWithAudio.tsx`): Complete audio recording with microphone permissions and MediaRecorder API
- **Audio Processing Hook** (`useVoiceToAudio.ts`): Sophisticated voice-to-audio pipeline with fallback mechanisms
- **Backend Integration**: Unified backend on port 3001 with AI routes properly configured
- **WebSocket Infrastructure** (`server/src/ai/websocket.ts`): Supports streaming audio with flow control at `/voice-stream` path

### Technical Architecture

**Frontend Components:**
1. **KioskPage**: Main interface showing conversation history and real-time order updates
2. **VoiceControlWithAudio**: Hold-to-record button with visual feedback
3. **useVoiceToAudio Hook**: Handles complete voice→transcription→audio pipeline
4. **WebSocket Support**: Infrastructure exists for streaming audio

**Backend Infrastructure:**
1. **AI Routes** (`/api/v1/ai/*`): Handles voice processing through `/transcribe` endpoint
2. **WebSocket Handler** (`server/src/ai/websocket.ts`): Supports streaming audio with flow control
3. **BuildPanel Integration**: Direct connection to external AI service for processing

## ⚠️ Current Limitations

### Real-Time Issues
- **No Live Streaming**: Current implementation processes complete audio files only
- **Missing Realtime Endpoint**: `/api/v1/ai/voice-chat-realtime` referenced in code but doesn't exist
- **Fallback Only**: System always falls back to regular `/api/v1/ai/voice-chat` endpoint
- **No Progressive Transcription**: Text appears only after full recording completion

### Display Behavior
- Shows placeholder text ("Voice processed successfully") instead of actual transcription
- Audio responses work but transcript display is limited
- Conversation shows audio status ("🔊 Playing audio response...") rather than text content

## 🎯 Current vs. Target Implementation

### Current Flow
```
User holds button → Records complete audio → Sends to BuildPanel → Receives MP3 response → Plays audio
```

### Target Real-Time Flow
```
User speaks → Stream audio chunks → Progressive transcription → Live text updates → Immediate feedback
```

## 🚀 Implementation Tasks

### Phase 1: BuildPanel Integration Research
- [ ] **Verify BuildPanel streaming capabilities** (BLOCKED - awaiting BuildPanel response)
- [ ] **Confirm realtime endpoint availability**
- [ ] **Get WebSocket protocol specification**
- [ ] **Test streaming audio chunk processing**

### Phase 2: Frontend Streaming Implementation
- [ ] **Modify useVoiceToAudio hook** for chunk-based streaming
- [ ] **Update VoiceControlWithAudio** to handle progressive transcription
- [ ] **Enhance KioskPage conversation display** for real-time updates
- [ ] **Add interim transcript handling** with confidence indicators

### Phase 3: Backend WebSocket Enhancement
- [ ] **Integrate BuildPanel streaming protocol** with existing WebSocket handler
- [ ] **Add progressive transcript routing** to frontend
- [ ] **Implement fallback detection** for streaming vs. batch processing
- [ ] **Add performance monitoring** for streaming latency

### Phase 4: UX Polish
- [ ] **Add visual feedback** for streaming status
- [ ] **Implement confidence scoring** display
- [ ] **Add error handling** for streaming interruptions
- [ ] **Performance optimization** and testing

## 🔍 Questions for BuildPanel Agent

### CRITICAL QUESTIONS FOR BUILDPANEL:

**1. STREAMING TRANSCRIPTION SUPPORT**
- Does BuildPanel support streaming audio input with progressive transcription responses?
- Can we send audio chunks via WebSocket and receive partial transcripts in real-time?
- What's the recommended chunk size and frequency for optimal performance?

**2. REALTIME ENDPOINT STATUS**
- Does `/api/voice-chat-realtime` actually exist in production?
- If not, what's the correct endpoint for streaming/realtime voice processing?
- Our code currently times out after 8 seconds trying this endpoint

**3. WEBSOCKET INTEGRATION**
- Does BuildPanel support WebSocket connections for voice streaming?
- What's the WebSocket URL pattern (e.g., `wss://api.mike.app.buildpanel.ai/voice-stream`)?
- What message formats should we use for audio chunks and control messages?

**4. RESPONSE FORMAT FOR STREAMING**
For streaming transcription, will you return:
- Interim transcripts (partial/incomplete text)?
- Final transcripts (complete sentences)?
- Both with confidence scores?
Can we get transcription updates WITHOUT waiting for complete audio processing?

**5. CURRENT ARCHITECTURE COMPATIBILITY**
Our backend already has:
- WebSocket handler at `/voice-stream` with flow control
- Audio chunking and buffering
- Restaurant context (restaurant_id parameter)

Can BuildPanel integrate with this existing WebSocket infrastructure?

**6. PERFORMANCE EXPECTATIONS**
What latency should we expect for:
- First transcript chunk (time to first response)?
- Progressive updates (frequency of interim results)?
- Final processing (complete response time)?
Is the promised 50-70% latency reduction achievable with streaming?

**7. FALLBACK STRATEGY**
- Should we maintain the current `/api/voice-chat` as fallback?
- How should we detect when to use streaming vs. batch processing?
- Any specific error conditions that require fallback?

**8. MESSAGE PROTOCOL**
For WebSocket implementation, what should the message format be?

Audio chunk message:
```typescript
{ type: 'audio_chunk', data: ArrayBuffer, sequence: number }
```

Expected response format:
```typescript
{ type: 'partial_transcript', text: string, is_final: boolean, confidence: number }
```

## 📂 Key Files to Modify

### Frontend Files
- `client/src/modules/voice/hooks/useVoiceToAudio.ts` - Add streaming support
- `client/src/modules/voice/components/VoiceControlWithAudio.tsx` - Progressive transcription display
- `client/src/pages/KioskPage.tsx` - Real-time conversation updates

### Backend Files
- `server/src/ai/websocket.ts` - BuildPanel streaming integration
- `server/src/services/ai.service.ts` - Streaming transcript handling
- `server/src/routes/ai.routes.ts` - Add streaming endpoints if needed

## 🎯 Success Criteria

### Technical Metrics
- **First transcript chunk**: < 500ms from start of speech
- **Progressive updates**: Every 250-500ms during speech
- **Total latency reduction**: 50-70% vs. current implementation
- **Fallback reliability**: 99.9% success rate when streaming fails

### User Experience
- **Live text updates**: User sees transcription as they speak
- **Confidence indicators**: Visual feedback for transcription accuracy
- **Smooth transitions**: Seamless fallback to batch processing when needed
- **Error handling**: Clear feedback when streaming is unavailable

## 📝 Notes

- WebSocket infrastructure is already implemented and tested
- Current fallback to `/api/voice-chat` works reliably
- BuildPanel integration is the primary blocker for real-time implementation
- Consider implementing client-side audio buffering for offline scenarios

---

**Next Action**: Await BuildPanel agent response to critical questions, then proceed with Phase 2 implementation based on their streaming specification.