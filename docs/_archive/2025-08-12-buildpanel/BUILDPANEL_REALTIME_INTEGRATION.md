# BuildPanel Real-time Integration Architecture

## Executive Summary

This document outlines the technical architecture for integrating real-time voice streaming with BuildPanel, leveraging our existing WebSocket infrastructure while maintaining authentication, error handling, and fallback capabilities.

## Current State Analysis

### ✅ Assets Ready for Streaming
- **WebSocket Server** (port 3001): Production-ready with flow control
- **VoiceSocketManager**: Singleton pattern with enterprise cleanup
- **MediaRecorder Integration**: Supports chunked recording via `start(interval)`
- **Authentication System**: JWT + restaurant context validation
- **Error Recovery**: Exponential backoff, connection pooling
- **UI Components**: Real-time ready with loading states

### 🔍 Integration Points to Validate
- **BuildPanel Streaming Endpoint**: `/api/voice-chat-realtime` existence and capabilities
- **WebSocket Support**: `ws://localhost:3003/realtime-voice` availability
- **Audio Format Compatibility**: WebM/Opus → BuildPanel expected format
- **Menu Context**: Streaming mode context propagation

## Integration Architecture Options

### Option A: Direct Client → BuildPanel WebSocket
```
┌─────────────────┐     ┌─────────────────┐
│   React Client  │────▶│  BuildPanel WS  │
│                 │     │  (port 3003)    │
│ - MediaRecorder │     │ - Voice Stream  │
│ - Audio Chunks  │     │ - AI Processing │
│ - UI Updates    │◀────│ - Response      │
└─────────────────┘     └─────────────────┘
```

**Pros:**
- Lower latency (direct connection)
- Simpler architecture
- Reduced server load

**Cons:**
- Loss of authentication control
- No request/response logging
- Difficult monitoring and debugging
- Restaurant context validation complexity

### Option B: Proxy Through Our WebSocket Server (RECOMMENDED)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Client  │────▶│  Our WebSocket  │────▶│  BuildPanel     │
│                 │     │  (port 3001)    │     │  (port 3003)    │
│ - MediaRecorder │     │ - Auth & Valid  │     │ - AI Processing │
│ - Audio Chunks  │     │ - Request Proxy │     │ - Voice Stream  │
│ - UI Updates    │◀────│ - Response Fwd  │◀────│ - Response      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Pros:**
- Maintains authentication/authorization
- Centralized logging and monitoring
- Request/response transformation capability
- Easier debugging and error handling
- Restaurant context enforcement
- Graceful BuildPanel service failures

**Cons:**
- Additional latency (one extra hop)
- More complex server-side logic
- Higher server resource usage

### Option C: Hybrid Approach
```
Standard Flow: Client → Our Server → BuildPanel HTTP API
Streaming Flow: Client → Our Server → BuildPanel WebSocket
Fallback: Automatic degradation to batch processing
```

## Recommended Implementation: Option B (Proxy Architecture)

### WebSocket Message Protocol

#### Client → Server Messages
```typescript
// Start streaming session
{
  type: 'start_voice_streaming',
  sessionId: string,
  restaurantId: string,
  userId?: string,
  audioConfig: {
    sampleRate: number,
    channels: number,
    format: 'webm' | 'mp4' | 'wav'
  }
}

// Audio chunk
{
  type: 'audio_chunk',
  sessionId: string,
  sequenceNumber: number,
  audioData: ArrayBuffer,
  timestamp: number
}

// End streaming session
{
  type: 'end_voice_streaming',
  sessionId: string
}
```

#### Server → Client Messages
```typescript
// Session started
{
  type: 'streaming_session_started',
  sessionId: string,
  buildPanelConnected: boolean
}

// Real-time transcription update
{
  type: 'transcription_update',
  sessionId: string,
  text: string,
  confidence: number,
  isFinal: boolean
}

// Streaming audio response
{
  type: 'audio_response_chunk',
  sessionId: string,
  audioData: ArrayBuffer,
  sequenceNumber: number,
  isComplete: boolean
}

// Final result
{
  type: 'streaming_complete',
  sessionId: string,
  finalTranscription: string,
  orderData?: ParsedOrder,
  audioComplete: boolean
}

// Error handling
{
  type: 'streaming_error',
  sessionId: string,
  error: string,
  fallbackToBatch: boolean
}
```

### Server-Side Integration Implementation

#### Enhanced BuildPanel Service
```typescript
// server/src/services/buildpanel.service.ts

export class BuildPanelService {
  private streamingSessions = new Map<string, StreamingSession>();
  private buildPanelWS: WebSocket | null = null;

  async initializeStreaming(): Promise<boolean> {
    try {
      const wsUrl = this.config.baseUrl.replace('http', 'ws') + '/realtime-voice';
      this.buildPanelWS = new WebSocket(wsUrl);
      
      this.buildPanelWS.on('open', () => {
        buildPanelLogger.info('BuildPanel WebSocket connected for streaming');
      });
      
      this.buildPanelWS.on('message', (data) => {
        this.handleBuildPanelStreamingMessage(data);
      });
      
      return true;
    } catch (error) {
      buildPanelLogger.warn('BuildPanel streaming not available, using batch fallback');
      return false;
    }
  }

  async startVoiceStreaming(
    sessionId: string,
    restaurantId: string,
    userId?: string
  ): Promise<boolean> {
    if (!this.buildPanelWS || this.buildPanelWS.readyState !== WebSocket.OPEN) {
      return false; // Fallback to batch processing
    }

    const session: StreamingSession = {
      sessionId,
      restaurantId,
      userId,
      startTime: Date.now(),
      audioChunks: [],
      buildPanelConnected: true
    };

    this.streamingSessions.set(sessionId, session);

    // Send session start to BuildPanel
    this.buildPanelWS.send(JSON.stringify({
      type: 'start_session',
      sessionId,
      restaurantId,
      userId,
      menuContext: this.menuContext
    }));

    return true;
  }

  async processStreamingAudioChunk(
    sessionId: string,
    audioData: ArrayBuffer,
    sequenceNumber: number
  ): Promise<void> {
    const session = this.streamingSessions.get(sessionId);
    if (!session || !this.buildPanelWS) {
      throw new Error('Streaming session not found or BuildPanel not connected');
    }

    // Forward chunk to BuildPanel
    this.buildPanelWS.send(JSON.stringify({
      type: 'audio_chunk',
      sessionId,
      sequenceNumber,
      timestamp: Date.now()
    }));
    
    // Send binary audio data
    this.buildPanelWS.send(audioData);

    // Track for fallback if needed
    session.audioChunks.push({ data: audioData, sequence: sequenceNumber });
  }

  private handleBuildPanelStreamingMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      const session = this.streamingSessions.get(message.sessionId);
      
      if (!session) return;

      // Forward to appropriate client via our WebSocket
      this.forwardToClient(session, message);
      
    } catch (error) {
      // Handle binary audio responses
      this.handleBinaryStreamingResponse(data);
    }
  }
}

interface StreamingSession {
  sessionId: string;
  restaurantId: string;
  userId?: string;
  startTime: number;
  audioChunks: Array<{ data: ArrayBuffer; sequence: number }>;
  buildPanelConnected: boolean;
  clientWebSocket?: WebSocket;
}
```

#### Enhanced WebSocket Handler
```typescript
// server/src/ai/websocket.ts

export function setupAIWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: ExtendedWebSocket, request) => {
    // Enhanced WebSocket handling for streaming
    
    ws.on('message', async (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        // Try JSON first (control messages)
        if (typeof data === 'string' || data.toString().startsWith('{')) {
          const message = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'start_voice_streaming':
              await handleStartVoiceStreaming(ws, message);
              break;
              
            case 'audio_chunk':
              await handleStreamingAudioChunk(ws, message, data);
              break;
              
            case 'end_voice_streaming':
              await handleEndVoiceStreaming(ws, message);
              break;
              
            default:
              // Existing batch processing logic
              await handleControlMessage(ws, connectionId, message);
          }
        } else {
          // Binary audio data - determine if streaming or batch
          const session = streamingSessions.get(ws.sessionId);
          if (session) {
            await handleStreamingAudioData(ws, data);
          } else {
            // Existing batch processing
            await aiService.processAudioStream(connectionId, data);
          }
        }
      } catch (error) {
        wsLogger.error('Message handling error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process message'
        }));
      }
    });
  });
}

async function handleStartVoiceStreaming(
  ws: ExtendedWebSocket,
  message: any
): Promise<void> {
  const buildPanel = getBuildPanelService();
  const streamingStarted = await buildPanel.startVoiceStreaming(
    message.sessionId,
    message.restaurantId,
    message.userId
  );
  
  ws.send(JSON.stringify({
    type: 'streaming_session_started',
    sessionId: message.sessionId,
    buildPanelConnected: streamingStarted,
    fallbackToBatch: !streamingStarted
  }));
  
  if (!streamingStarted) {
    // Initialize batch fallback
    aiService.handleVoiceConnection(ws, message.sessionId);
  }
}
```

### Client-Side Implementation Updates

#### Enhanced useAudioCapture Hook
```typescript
// client/src/modules/voice/hooks/useAudioCapture.ts

interface UseAudioCaptureOptions {
  onTranscription?: (transcription: string, isInterim: boolean) => void;
  onError?: (error: Error) => void;
  enableStreaming?: boolean; // New option
  streamingChunkSize?: number; // Default 500ms
}

export const useAudioCapture = ({
  onTranscription,
  onError,
  enableStreaming = true,
  streamingChunkSize = 500
}: UseAudioCaptureOptions = {}): UseAudioCaptureReturn => {
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setPermissionStatus('granted');
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      if (enableStreaming && streamingSupported) {
        // Start streaming mode
        const sessionId = `stream-${Date.now()}-${Math.random()}`;
        setStreamingSessionId(sessionId);
        setIsStreaming(true);
        
        // Initialize streaming session via WebSocket
        webSocketService.send({
          type: 'start_voice_streaming',
          sessionId,
          restaurantId: getCurrentRestaurantId(),
          audioConfig: {
            sampleRate: 48000,
            channels: 1,
            format: 'webm'
          }
        });
        
        // Set up chunked recording
        let sequenceNumber = 0;
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && sessionId) {
            webSocketService.send({
              type: 'audio_chunk',
              sessionId,
              sequenceNumber: sequenceNumber++,
              timestamp: Date.now()
            });
            
            // Send binary audio data
            webSocketService.sendBinary(event.data);
          }
        };
        
        mediaRecorder.start(streamingChunkSize); // Chunks every 500ms
      } else {
        // Fallback to batch mode
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const result = await transcriptionService.transcribeAudio(audioBlob);
          
          if (result.success && result.transcript) {
            onTranscription?.(result.transcript, false);
          }
        };
        
        mediaRecorder.start();
      }
      
      setIsRecording(true);
      
    } catch (err) {
      // Error handling
    }
  }, [enableStreaming, streamingChunkSize, onTranscription]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamingSessionId) {
      // End streaming session
      webSocketService.send({
        type: 'end_voice_streaming',
        sessionId: streamingSessionId
      });
      
      setStreamingSessionId(null);
      setIsStreaming(false);
    }
    
    // Cleanup
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    setIsRecording(false);
  }, [streamingSessionId]);
};
```

#### Enhanced VoiceSocketManager
```typescript
// client/src/modules/voice/services/VoiceSocketManager.ts

class VoiceSocketManager extends ManagedService {
  private streamingSessions = new Map<string, StreamingSession>();
  
  sendStreamingMessage(message: StreamingMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    this.ws.send(JSON.stringify(message));
    return true;
  }
  
  sendBinaryAudio(audioData: ArrayBuffer | Blob): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    // Apply flow control for streaming
    if (this.unacknowledgedChunks >= this.maxUnacknowledgedChunks) {
      console.warn('Flow control: dropping audio chunk for streaming');
      return false;
    }
    
    this.ws.send(audioData);
    this.unacknowledgedChunks++;
    return true;
  }
  
  private handleStreamingMessage(message: any): void {
    const session = this.streamingSessions.get(message.sessionId);
    if (!session) return;
    
    switch (message.type) {
      case 'transcription_update':
        session.onTranscriptionUpdate?.(message.text, message.isFinal);
        break;
        
      case 'audio_response_chunk':
        session.onAudioChunk?.(message.audioData, message.isComplete);
        break;
        
      case 'streaming_complete':
        session.onComplete?.(message.finalTranscription, message.orderData);
        this.streamingSessions.delete(message.sessionId);
        break;
        
      case 'streaming_error':
        session.onError?.(new Error(message.error));
        if (message.fallbackToBatch) {
          session.onFallback?.();
        }
        break;
    }
  }
}

interface StreamingSession {
  sessionId: string;
  onTranscriptionUpdate?: (text: string, isFinal: boolean) => void;
  onAudioChunk?: (audioData: ArrayBuffer, isComplete: boolean) => void;
  onComplete?: (transcription: string, orderData?: any) => void;
  onError?: (error: Error) => void;
  onFallback?: () => void;
}
```

## Performance Expectations

### Current Batch Processing
- **Recording Phase**: 0-30+ seconds (user controlled)
- **Upload**: 200-1000ms (file size dependent)
- **BuildPanel Processing**: 2-5 seconds
- **Download**: 300-800ms
- **Total Latency**: 3-6 seconds after recording stops

### Expected Streaming Performance
- **First Transcription**: 500-1000ms after speech starts
- **Real-time Updates**: 100-300ms per chunk
- **Audio Response Start**: 1-2 seconds after speech ends
- **Total Improvement**: 50-70% latency reduction

## Testing Strategy

### Phase 1: Validation (Current)
- BuildPanel streaming capability test
- WebSocket connection validation
- Audio format compatibility check
- Performance baseline measurement

### Phase 2: Integration Testing
- End-to-end streaming flow
- Fallback mechanism validation
- Error recovery testing
- Cross-browser compatibility

### Phase 3: Performance Testing
- Latency measurement under various conditions
- Network instability resilience
- Concurrent user load testing
- Memory and CPU usage monitoring

### Phase 4: Production Readiness
- A/B testing framework
- Feature flag implementation
- Monitoring and alerting setup
- Gradual rollout strategy

## Risk Mitigation

### Primary Risk: BuildPanel Streaming Limitations
**Mitigation**: Automatic fallback to optimized batch processing
- Feature flag: `ENABLE_REALTIME_STREAMING`
- Graceful degradation when BuildPanel streaming unavailable
- Performance monitoring to detect streaming issues

### Secondary Risks
**Audio Synchronization Issues**
- Buffer management with sequence numbering
- Chunk ordering and gap detection
- Automatic resynchronization

**Network Instability**
- WebSocket reconnection with state recovery
- Chunk replay capability
- Quality adaptation based on connection

**Browser Compatibility**
- Progressive enhancement approach
- MediaRecorder API feature detection
- Fallback to batch mode for unsupported browsers

## Monitoring and Observability

### Key Metrics
```typescript
// Streaming-specific metrics
export const streamingMetrics = {
  streamingSessionsTotal: new Counter({
    name: 'streaming_sessions_total',
    help: 'Total streaming sessions initiated'
  }),
  
  streamingLatency: new Histogram({
    name: 'streaming_latency_seconds',
    help: 'Time from speech to transcription'
  }),
  
  streamingFallbacks: new Counter({
    name: 'streaming_fallbacks_total', 
    help: 'Number of fallbacks to batch processing'
  }),
  
  audioChunksDropped: new Counter({
    name: 'audio_chunks_dropped_total',
    help: 'Audio chunks dropped due to flow control'
  })
};
```

### Health Checks
- BuildPanel WebSocket connectivity
- Streaming session success rate
- Average latency measurements
- Error rate monitoring

## Implementation Timeline

### Week 1: Validation & Architecture
- [ ] Complete BuildPanel streaming capability test
- [ ] Finalize integration architecture
- [ ] Set up development environment
- [ ] Create test harness and measurement tools

### Week 2: Core Streaming Implementation
- [ ] Implement WebSocket proxy architecture
- [ ] Add streaming session management
- [ ] Create enhanced MediaRecorder integration
- [ ] Build basic end-to-end streaming flow

### Week 3: Advanced Features & Testing
- [ ] Add real-time transcription display
- [ ] Implement streaming audio playback
- [ ] Build comprehensive error handling
- [ ] Create automated testing suite

### Week 4: Production Readiness
- [ ] Performance optimization and tuning
- [ ] Feature flag and A/B testing setup
- [ ] Monitoring and alerting configuration
- [ ] Documentation and deployment preparation

## Success Criteria

### Technical Performance
- [ ] 50%+ reduction in perceived latency
- [ ] 95%+ streaming session success rate
- [ ] <100ms transcription update intervals
- [ ] Graceful fallback in 99% of failure cases

### User Experience
- [ ] Real-time transcription feedback
- [ ] Seamless streaming/batch mode switching
- [ ] Improved voice ordering completion rates
- [ ] Reduced user-reported issues

### System Reliability
- [ ] No degradation in batch mode performance
- [ ] Stable WebSocket connections under load
- [ ] Proper resource cleanup and memory management
- [ ] Comprehensive error logging and monitoring

---

This architecture provides a robust foundation for implementing real-time voice streaming while maintaining the reliability and security of our existing infrastructure.