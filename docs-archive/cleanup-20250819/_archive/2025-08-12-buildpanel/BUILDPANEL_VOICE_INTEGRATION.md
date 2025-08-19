# BuildPanel Voice Integration Guide

## Overview

This guide provides comprehensive documentation for integrating voice capabilities through BuildPanel's voice endpoint. The voice endpoint provides a complete speech-to-text and text-to-speech pipeline, accepting audio input and returning AI-generated audio responses.

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Frontend App      │     │   Backend Proxy     │     │   BuildPanel        │
│  (React/Mobile)     │────▶│   (Express.js)      │────▶│  (Port 3003)        │
│                     │     │                     │     │                     │
│ - Record Audio      │     │ - Auth & Validate   │     │ - Speech-to-Text    │
│ - Send FormData     │     │ - Add Context       │     │ - AI Processing     │
│ - Play MP3 Response │◀────│ - Proxy Request     │◀────│ - Text-to-Speech    │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

## Voice Endpoint Specification

### BuildPanel Voice Endpoint
- **URL**: `POST /api/voice-chat`
- **Request**: `multipart/form-data` with audio file
- **Response**: `audio/mpeg` (MP3 audio buffer)
- **Processing**: Audio → Text → AI → Speech

### Proxied Backend Endpoint
- **URL**: `POST /api/v1/ai/transcribe`
- **Authentication**: Required (JWT Bearer token)
- **Headers**: `X-Restaurant-ID` for multi-tenancy
- **Response**: MP3 audio or JSON with metadata (configurable)

## Implementation Examples

### Frontend Implementation

#### React Hook for Voice Chat

```typescript
import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRestaurant } from '../contexts/RestaurantContext';

export function useVoiceChat() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { token } = useAuth();
  const { restaurantId } = useRestaurant();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported format
      const options = MediaRecorder.isTypeSupported('audio/webm') 
        ? { mimeType: 'audio/webm' }
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? { mimeType: 'audio/mp4' }
        : {};
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        await sendVoiceMessage(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (error) {
      console.error('Recording error:', error);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/v1/ai/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Restaurant-ID': restaurantId
        },
        body: formData,
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('audio/mpeg')) {
          // Direct audio response
          const audioBuffer = await response.arrayBuffer();
          const responseBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(responseBlob);
          
          // Play audio
          const audio = new Audio(audioUrl);
          await audio.play();
          
          // Clean up after playback
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
          };
          
          return { audioUrl, type: 'audio' };
        } else {
          // JSON response with metadata
          const data = await response.json();
          return { data, type: 'json' };
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Voice processing failed');
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      setError(error instanceof Error ? error.message : 'Network error occurred');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
  };
}
```

#### Voice Component Example

```tsx
import React from 'react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { Mic, MicOff, Loader } from 'lucide-react';

export function VoiceOrderButton() {
  const { isRecording, isProcessing, error, startRecording, stopRecording } = useVoiceChat();

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="voice-order-container">
      <button
        onClick={handleClick}
        disabled={isProcessing}
        className={`voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isProcessing ? (
          <Loader className="animate-spin" size={32} />
        ) : isRecording ? (
          <MicOff size={32} />
        ) : (
          <Mic size={32} />
        )}
      </button>
      
      {isRecording && (
        <p className="status-text">Listening... Click to stop</p>
      )}
      
      {isProcessing && (
        <p className="status-text">Processing your order...</p>
      )}
      
      {error && (
        <p className="error-text" role="alert">{error}</p>
      )}
    </div>
  );
}
```

### Backend Implementation

#### Express Route Handler

```typescript
// server/src/routes/ai.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { getBuildPanelService } from '../services/buildpanel.service';
import { aiLogger } from '../utils/logger';

const router = Router();
const audioUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

router.post('/transcribe', 
  authenticate, 
  audioUpload.single('audio'), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Audio file is required'
        });
      }

      aiLogger.info('Voice request received', {
        restaurantId: req.restaurantId,
        userId: req.user?.id,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });

      const buildPanel = getBuildPanelService();
      
      // Get MP3 audio response from BuildPanel
      const audioBuffer = await buildPanel.processAuthenticatedVoice(
        req,
        req.file.buffer,
        req.file.mimetype
      );

      // Return audio response
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache'
      });
      
      res.send(audioBuffer);
    } catch (error) {
      aiLogger.error('Voice processing failed', { error });
      res.status(500).json({
        error: 'Failed to process voice message'
      });
    }
  }
);

// Alternative endpoint that returns JSON with metadata
router.post('/transcribe-with-metadata',
  authenticate,
  audioUpload.single('audio'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Audio file is required'
        });
      }

      const buildPanel = getBuildPanelService();
      
      // Get response with transcription and metadata
      const result = await buildPanel.processAuthenticatedVoiceWithMetadata(
        req,
        req.file.buffer,
        req.file.mimetype
      );

      res.json({
        success: true,
        transcription: result.transcription,
        response: result.response,
        audioUrl: result.audioUrl,
        orderData: result.orderData
      });
    } catch (error) {
      aiLogger.error('Voice processing with metadata failed', { error });
      res.status(500).json({
        error: 'Failed to process voice message'
      });
    }
  }
);
```

## Audio Format Considerations

### Supported Input Formats
- **WebM** (Preferred for web browsers)
- **MP4/M4A** (iOS/Safari fallback)
- **WAV** (Universal compatibility)
- **Other formats** supported by FFmpeg

### Output Format
- **MP3** (`audio/mpeg`) - Universal browser compatibility
- **Bitrate**: Optimized for voice (typically 64-128 kbps)
- **Sample Rate**: 16kHz or 22.05kHz for voice

### Browser Compatibility

```javascript
// Format detection helper
function getRecordingOptions() {
  const types = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/wav'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return { mimeType: type };
    }
  }
  
  // Fallback - let browser choose
  return {};
}
```

## Error Handling

### Common Error Scenarios

1. **Microphone Permission Denied**
```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
} catch (error) {
  if (error.name === 'NotAllowedError') {
    showError('Microphone access denied. Please enable microphone permissions.');
  } else if (error.name === 'NotFoundError') {
    showError('No microphone found. Please connect a microphone.');
  }
}
```

2. **Network Errors**
```typescript
try {
  const response = await fetch('/api/v1/ai/transcribe', { ... });
} catch (error) {
  if (!navigator.onLine) {
    showError('No internet connection. Please check your network.');
  } else {
    showError('Unable to connect to voice service. Please try again.');
  }
}
```

3. **BuildPanel Service Errors**
```typescript
if (response.status === 503) {
  showError('Voice service is temporarily unavailable. Please try again later.');
} else if (response.status === 429) {
  showError('Too many requests. Please wait a moment before trying again.');
}
```

## Security Considerations

### Authentication
- All voice requests must include valid JWT token
- Restaurant context validated on every request
- User permissions checked before processing

### Data Protection
- Audio files are processed in memory (not stored)
- Temporary files cleaned up immediately after processing
- No persistent storage of voice recordings
- Restaurant data isolated by tenant ID

### Rate Limiting
- Default: 10 requests per minute per user
- Configurable via environment variables
- Prevents abuse of voice processing resources

## Performance Optimization

### Client-Side
1. **Audio Compression**
```javascript
// Use lower sample rate for voice
const constraints = {
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true
  }
};
```

2. **Chunk Recording** (for long recordings)
```javascript
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    // Send chunks as they're available
    sendAudioChunk(event.data);
  }
};
mediaRecorder.start(1000); // Chunk every second
```

### Server-Side
1. **Streaming Response**
```typescript
// Stream audio response for faster playback
res.setHeader('Content-Type', 'audio/mpeg');
res.setHeader('Transfer-Encoding', 'chunked');
audioStream.pipe(res);
```

2. **Caching** (if applicable)
```typescript
// Cache common responses
const cacheKey = `voice:${restaurantId}:${messageHash}`;
const cached = await cache.get(cacheKey);
if (cached) {
  return res.send(cached);
}
```

## Testing

### Unit Tests
```typescript
describe('Voice Processing', () => {
  it('should process audio and return MP3', async () => {
    const audioBuffer = fs.readFileSync('test-audio.webm');
    const formData = new FormData();
    formData.append('audio', new Blob([audioBuffer]), 'test.webm');

    const response = await request(app)
      .post('/api/v1/ai/transcribe')
      .set('Authorization', `Bearer ${testToken}`)
      .set('X-Restaurant-ID', testRestaurantId)
      .attach('audio', audioBuffer, 'test.webm');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('audio/mpeg');
    expect(response.body).toBeInstanceOf(Buffer);
  });
});
```

### Integration Tests
```typescript
describe('Voice Chat Integration', () => {
  it('should complete voice order flow', async () => {
    // 1. Record audio
    const { audioBlob } = await recordTestAudio('I would like a large pizza');
    
    // 2. Send to backend
    const response = await sendVoiceMessage(audioBlob);
    
    // 3. Verify audio response
    expect(response.contentType).toBe('audio/mpeg');
    
    // 4. Play and verify audio content
    const audioText = await transcribeAudio(response.audioBuffer);
    expect(audioText).toContain('large pizza');
  });
});
```

## Troubleshooting

### Common Issues

1. **Empty Audio Response**
   - Check BuildPanel service logs
   - Verify TTS configuration
   - Ensure menu context is loaded

2. **Recording Not Working**
   - Check browser permissions
   - Verify HTTPS connection (required for getUserMedia)
   - Test microphone in browser settings

3. **Audio Playback Issues**
   - Verify MP3 codec support
   - Check audio element state
   - Handle autoplay policies

### Debug Logging
```typescript
// Enable verbose logging
if (process.env.NODE_ENV === 'development') {
  console.log('Audio recording started', {
    mimeType: mediaRecorder.mimeType,
    state: mediaRecorder.state,
    stream: stream.getAudioTracks()[0].getSettings()
  });
}
```

## References

- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [BuildPanel Documentation](https://buildpanel.dev/docs)
- [Express Multer](https://github.com/expressjs/multer)