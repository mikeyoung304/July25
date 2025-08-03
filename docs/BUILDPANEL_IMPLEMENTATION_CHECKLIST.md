# BuildPanel Implementation Checklist

## Overview
This checklist ensures proper BuildPanel integration in your Restaurant OS. BuildPanel is the external AI service that handles all AI operations through your unified backend on port 3001.

## ✅ Pre-Implementation Verification

### Environment Setup
- [ ] **No OpenAI API keys** in any environment files
- [ ] `USE_BUILDPANEL=true` in root `.env` file
- [ ] `BUILDPANEL_URL=http://localhost:3003` configured
- [ ] No references to port 3002 (old AI Gateway)
- [ ] No VITE_BUILDPANEL_URL or similar frontend exposure

### Documentation Status
- [x] ARCHITECTURE.md updated with BuildPanel config
- [x] .env.example files updated (both root and server)
- [x] Voice endpoint documentation complete
- [x] API.md updated with correct response types

## 🚀 Implementation Steps

### 1. Start BuildPanel Service
```bash
# BuildPanel should be running on port 3003
# Verify with:
curl http://localhost:3003/api/health
```

### 2. Configure Environment
```bash
# In root .env file:
USE_BUILDPANEL=true
BUILDPANEL_URL=http://localhost:3003

# Remove any OPENAI_API_KEY references
```

### 3. Start Restaurant OS
```bash
npm install
npm run dev
```

### 4. Verify Integration
```bash
# Check health endpoint
curl http://localhost:3001/api/v1/ai/health

# Expected response:
{
  "status": "ok",
  "hasMenu": true,
  "menuItems": 25,
  "buildPanelStatus": "connected"
}
```

## 🔍 Code Integration Points

### Backend Service Layer
- **File**: `server/src/services/buildpanel.service.ts`
- **Methods**:
  - `processVoice(audioBuffer, mimeType, restaurantId)` → Returns MP3 audio
  - `processVoiceWithMetadata(...)` → Returns JSON with transcription
  - `processChat(message, restaurantId)` → Chat responses
  - `healthCheck()` → Service connectivity

### AI Routes
- **File**: `server/src/routes/ai.routes.ts`
- **Endpoints**:
  - `POST /api/v1/ai/transcribe` → MP3 audio response
  - `POST /api/v1/ai/transcribe-with-metadata` → JSON response
  - `POST /api/v1/ai/parse-order` → Order parsing
  - `POST /api/v1/ai/chat` → Chat interface
  - `GET /api/v1/ai/health` → Health check

### Frontend Integration
- **Voice Hook**: Use the provided `useVoiceChat` hook
- **Service Calls**: Always go through authenticated backend endpoints
- **No Direct Access**: Never call BuildPanel directly from frontend

## 🔒 Security Checklist

- [ ] No BuildPanel URLs in frontend code
- [ ] All AI endpoints require authentication
- [ ] Restaurant context included in all requests
- [ ] Rate limiting configured on AI endpoints
- [ ] No AI SDKs imported in client code

## 🧪 Testing

### Manual Testing
1. **Voice Test**:
   ```javascript
   // Navigate to voice ordering page
   // Click record button
   // Say: "I'd like a large pepperoni pizza"
   // Verify MP3 audio response plays
   ```

2. **Health Check**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        -H "X-Restaurant-ID: <restaurant-id>" \
        http://localhost:3001/api/v1/ai/health
   ```

3. **Chat Test**:
   ```bash
   curl -X POST http://localhost:3001/api/v1/ai/chat \
        -H "Authorization: Bearer <token>" \
        -H "X-Restaurant-ID: <restaurant-id>" \
        -H "Content-Type: application/json" \
        -d '{"message": "What pizzas do you have?"}'
   ```

### Automated Testing
- Mock BuildPanel service in tests
- Set `USE_BUILDPANEL=false` in test environment
- Use provided mock implementations

## ⚠️ Common Issues

### BuildPanel Not Connected
- **Symptom**: "BuildPanel service unavailable" errors
- **Fix**: Ensure BuildPanel is running on port 3003
- **Verify**: `curl http://localhost:3003/api/health`

### Authentication Errors
- **Symptom**: 401 Unauthorized responses
- **Fix**: Include valid JWT token and X-Restaurant-ID header
- **Verify**: Token not expired, restaurant ID valid

### Voice Not Working
- **Symptom**: No audio response or recording fails
- **Fix**: Check browser microphone permissions
- **Verify**: HTTPS connection (required for getUserMedia)

### Wrong Response Format
- **Symptom**: Expecting JSON but getting audio
- **Fix**: Use `/transcribe-with-metadata` for JSON responses
- **Note**: Standard `/transcribe` returns MP3 audio only

## 📋 Final Verification

### Core Functionality
- [ ] Voice ordering works (record → transcribe → play response)
- [ ] Chat interface responds correctly
- [ ] Order parsing extracts menu items
- [ ] Health endpoint shows BuildPanel connected

### Security
- [ ] Frontend cannot access BuildPanel directly
- [ ] All requests authenticated
- [ ] Restaurant isolation working
- [ ] No API keys exposed

### Performance
- [ ] Audio responses play smoothly
- [ ] Reasonable response times (<3s)
- [ ] Error handling graceful
- [ ] Timeout handling works

## 🚨 Emergency Procedures

### If BuildPanel Fails
1. AI features automatically disabled
2. Core restaurant functions continue
3. Users see "AI features temporarily unavailable"
4. To disable manually: `USE_BUILDPANEL=false`

### Recovery
1. Fix BuildPanel connectivity
2. Set `USE_BUILDPANEL=true`
3. Restart application
4. Verify with health check

## 📚 References

- [BuildPanel Proxy Architecture](./BUILDPANEL_PROXY_ARCHITECTURE.md)
- [Voice Integration Guide](./BUILDPANEL_VOICE_INTEGRATION.md)
- [Security Documentation](./SECURITY_BUILDPANEL.md)
- [Migration Guide](./MIGRATION_BUILDPANEL.md)

---
Last Updated: August 2025