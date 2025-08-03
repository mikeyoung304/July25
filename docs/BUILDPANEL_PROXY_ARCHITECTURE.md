# BuildPanel Proxy Architecture

## Overview

The Restaurant OS backend now acts as a proxy layer between the frontend and BuildPanel AI service. This architecture provides authentication, restaurant context, and unified API access while leveraging BuildPanel's AI capabilities.

## Architecture Diagram

```
Frontend (React) 
    ↓ HTTP/WebSocket
Backend (Express.js:3001)
    ↓ HTTP Proxy
BuildPanel Service (Node.js:3003)
    ↓ AI APIs
External AI Services (OpenAI, etc.)
```

## Proxy Flow

### 1. Authentication & Context
- Frontend sends requests to `/api/v1/ai/*` with JWT token
- Backend validates token and extracts user/restaurant context
- Restaurant ID added to all BuildPanel requests via headers

### 2. Request Transformation
- Backend transforms requests to match BuildPanel API format
- Adds restaurant context, user ID, and authentication headers
- Handles multipart form data for audio uploads

### 3. Response Processing
- BuildPanel responses enhanced with restaurant context
- Error handling and fallback behavior
- Logging and metrics collection

## Endpoint Mappings

| Frontend Request | Backend Proxy | BuildPanel Endpoint | Response Type |
|------------------|---------------|---------------------|---------------|
| `POST /ai/chat` | Transform + auth | `POST /api/chatbot` | JSON |
| `POST /ai/transcribe` | Form data + auth | `POST /api/voice-chat` | audio/mpeg |
| `POST /ai/parse-order` | Transform + auth | `POST /api/chatbot` | JSON |
| `POST /ai/menu` | Sync request | `GET /api/menu` | JSON |

### Voice Endpoint Details

The voice endpoint (`/api/voice-chat`) provides complete speech-to-text and text-to-speech capabilities:

**Request Format:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: FormData with audio file (webm, mp4, wav, etc.)

**Response Format:**
- Content-Type: `audio/mpeg`
- Body: MP3 audio buffer containing the AI response

**Processing Flow:**
1. Audio Upload: Accepts audio file via multipart form data
2. Speech-to-Text: Converts audio to text using Whisper
3. AI Processing: Generates response based on transcribed text
4. Text-to-Speech: Converts response to MP3 audio
5. Returns: MP3 audio buffer for direct playback

## Authentication Flow

```javascript
// Frontend Request
fetch('/api/v1/ai/chat', {
  headers: {
    'Authorization': 'Bearer <jwt>',
    'X-Restaurant-ID': '<uuid>'
  },
  body: JSON.stringify({ message: 'Hello' })
})

// Backend Proxy
const response = await buildPanelClient.post('/api/chatbot', {
  message: 'Hello',
  context: {
    restaurantId: '<uuid>',
    userId: '<user-id>',
    timestamp: '2025-01-01T12:00:00Z'
  }
}, {
  headers: {
    'X-Restaurant-ID': '<uuid>',
    'X-User-ID': '<user-id>'
  }
})
```

## Error Handling

### BuildPanel Service Unavailable
```json
{
  "error": "BuildPanel service unavailable",
  "message": "AI features temporarily disabled",
  "fallback": true
}
```

### Authentication Errors
```json
{
  "error": "UNAUTHORIZED",
  "message": "Valid JWT token required",
  "code": 401
}
```

### BuildPanel Errors
```json
{
  "error": "BuildPanel chat failed: Connection timeout",
  "message": "Service temporarily unavailable",
  "buildPanelError": true
}
```

## Configuration

### Environment Variables

```env
# BuildPanel Service
BUILDPANEL_URL=http://localhost:3003
BUILDPANEL_TIMEOUT=30000

# Restaurant Backend
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key

# CORS & Security
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Service Discovery

The backend automatically discovers BuildPanel health status:

```javascript
// Health check endpoint
GET /api/v1/ai/health

{
  "status": "ok",
  "hasMenu": true,
  "menuItems": 25,
  "buildPanelStatus": "connected" // or "disconnected"
}
```

## Voice Integration

### HTTP Voice Endpoint
The primary voice integration uses HTTP POST requests with multipart form data:

```javascript
// Frontend Voice Request
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');

const response = await fetch('/api/v1/ai/transcribe', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <jwt>',
    'X-Restaurant-ID': '<uuid>'
  },
  body: formData
});

// Response is audio/mpeg (MP3)
const audioBuffer = await response.arrayBuffer();
const audioUrl = URL.createObjectURL(new Blob([audioBuffer], { type: 'audio/mpeg' }));
```

### Backend Processing
```javascript
// Backend proxies to BuildPanel
const buildPanelFormData = new FormData();
buildPanelFormData.append('audio', audioBuffer, 'audio.webm');

const buildPanelResponse = await axios.post(
  'http://localhost:3003/api/voice-chat',
  buildPanelFormData,
  {
    headers: {
      ...buildPanelFormData.getHeaders(),
      'X-Restaurant-ID': restaurantId
    }
  }
);

// Return MP3 audio directly to frontend
res.set('Content-Type', 'audio/mpeg');
res.send(buildPanelResponse.data);
```

### WebSocket Integration (Alternative)
- Frontend connects to `ws://localhost:3001`
- Backend proxies voice data to BuildPanel HTTP endpoint
- Real-time transcription and responses

### Event Flow
```
Frontend → Backend (HTTP/WS) → BuildPanel HTTP → Response
    ↑                                              ↓
    ←← Audio Response ←← MP3 Audio Buffer ←←←←←←←←
```

## Rate Limiting

| Endpoint | Limit | Scope |
|----------|-------|-------|
| `/ai/chat` | 20/min | Per user |
| `/ai/transcribe` | 10/min | Per user |
| `/ai/parse-order` | 20/min | Per user |
| General API | 100/min | Per IP |

## Monitoring & Logging

### Request Tracking
```javascript
aiLogger.info('Chat request via BuildPanel', {
  restaurantId,
  userId: req.user?.id,
  messageLength: message.length
});
```

### Health Metrics
- BuildPanel connectivity status
- Response times and error rates
- Menu sync status and item counts

### Error Recovery
- Automatic retry for transient failures
- Graceful degradation when BuildPanel unavailable
- Circuit breaker pattern for service protection

## Development Setup

```bash
# Start BuildPanel service (port 3003)
cd buildpanel && npm start

# Start Restaurant OS backend (port 3001)
cd server && npm run dev

# Backend automatically proxies to BuildPanel
curl http://localhost:3001/api/v1/ai/health
```

## Security Considerations

1. **No Direct Access**: Frontend cannot directly access BuildPanel
2. **Authentication Required**: All AI endpoints require valid JWT
3. **Restaurant Isolation**: Requests isolated by restaurant ID
4. **Rate Limiting**: Prevents abuse of AI services
5. **Input Validation**: All requests validated before proxying

## Migration Notes

### From Direct OpenAI Integration
- All OpenAI API calls removed from backend
- BuildPanel handles AI service selection and management
- Menu sync replaces manual menu upload
- Authentication layer added for security

### Breaking Changes
- `/ai/upload-menu` → `/ai/menu` (POST for sync)
- Authentication now required for all AI endpoints
- Response format includes restaurant context
- Error codes updated for BuildPanel integration

## Voice Integration Examples

### React Hook Implementation
```typescript
import { useState, useRef } from 'react';

export function useVoiceChat() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options = MediaRecorder.isTypeSupported('audio/webm') 
        ? { mimeType: 'audio/webm' }
        : { mimeType: 'audio/mp4' };
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
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
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/v1/ai/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'X-Restaurant-ID': getRestaurantId()
        },
        body: formData,
      });

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const responseBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(responseBlob);
        
        const audio = new Audio(audioUrl);
        await audio.play();
        
        return audioUrl;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
  };
}
```

### Audio Format Support
- **Input Formats**: WebM (preferred), MP4/M4A, WAV, and other FFmpeg-supported formats
- **Output Format**: MP3 (audio/mpeg) for universal browser compatibility
- **File Size Limit**: 25MB for audio uploads

### Error Handling
```typescript
// Common error responses
{
  "error": "Audio file is required"  // 400 - Missing audio
}

{
  "error": "Failed to process voice message"  // 500 - Processing error
}

// Frontend error handling
try {
  const response = await fetch('/api/v1/ai/transcribe', { ... });
  if (!response.ok) {
    const error = await response.json();
    // Display user-friendly error message
    showError(error.message || 'Voice processing failed');
  }
} catch (error) {
  // Network or other errors
  showError('Unable to connect to voice service');
}
```

## Troubleshooting

### BuildPanel Connection Issues
```bash
# Check BuildPanel health
curl http://localhost:3003/health

# Check proxy health
curl http://localhost:3001/api/v1/ai/health
```

### Voice-Specific Issues
- **Empty Audio Response**: Check BuildPanel logs for TTS failures
- **Transcription Errors**: Verify audio format and quality
- **Large File Failures**: Ensure file is under 25MB limit
- **Browser Compatibility**: Verify MediaRecorder API support

### Authentication Problems
- Verify JWT token validity
- Check `X-Restaurant-ID` header
- Ensure user has required permissions

### Rate Limiting
- Monitor rate limit headers in responses
- Implement exponential backoff in frontend
- Consider user-specific limits for production