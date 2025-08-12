# BuildPanel Integration Guide

## Current Deployment Context

**⚠️ CRITICAL: Your BuildPanel instance is CLOUD-DEPLOYED, not local development.**

### Your Working BuildPanel Instance
- **Base URL**: `https://api.mike.app.buildpanel.ai`
- **Status**: ✅ RUNNING (confirmed by architect)
- **Type**: Cloud deployment (NOT localhost development)

### Confirmed Working Endpoints
| Endpoint | URL | Status | Purpose |
|----------|-----|--------|---------|
| Health | `https://api.mike.app.buildpanel.ai/api/health` | ✅ Working | Service health check |
| Voice | `https://api.mike.app.buildpanel.ai/api/voice-chat` | ✅ Working | Voice processing |
| Chat | `https://api.mike.app.buildpanel.ai/api/chatbot` | ✅ Working | Text chat processing |
| Voice UI | `https://mike.app.buildpanel.ai/voice` | ✅ Working | Voice interface |
| Chat UI | `https://mike.app.buildpanel.ai/chatbot` | ✅ Working | Chat interface |

## Restaurant Context
- **Restaurant ID**: `11111111-1111-1111-1111-111111111111`
- **Restaurant Name**: "Grow Fresh Local Food"
- **Location**: 1019 Riverside Dr, Macon, GA 31201
- **Menu Items**: 28 items across 7 categories (in Supabase)
- **Multi-tenancy**: X-Restaurant-ID headers NOT YET IMPLEMENTED

## Environment Configuration

### Correct Configuration (.env)
```bash
# BuildPanel Integration - Cloud Instance
USE_BUILDPANEL=true
BUILDPANEL_URL=https://api.mike.app.buildpanel.ai
BUILDPANEL_BASE_URL=https://api.mike.app.buildpanel.ai

# Restaurant Context
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# Endpoints (using defaults)
BUILDPANEL_CHAT_ENDPOINT=/api/chatbot
BUILDPANEL_VOICE_ENDPOINT=/api/voice-chat
```

### ❌ WRONG Configuration
```bash
# DO NOT USE - This is for LOCAL DEVELOPMENT only
BUILDPANEL_URL=http://localhost:3003
```

## API Integration Contract

### Voice Processing
- **Endpoint**: `POST /api/voice-chat`
- **Request Format**: `multipart/form-data` with `audio` field
- **Audio Input**: WebM (from browser MediaRecorder)
- **Response Format**: `audio/mpeg` (MP3 buffer)
- **File Size Limit**: 25MB
- **Authentication**: None required currently
- **Headers**: Standard multipart headers only

### Request Example
```javascript
const formData = new FormData();
formData.append('audio', audioBlob, 'voice.webm');

const response = await fetch('https://api.mike.app.buildpanel.ai/api/voice-chat', {
  method: 'POST',
  body: formData,
  headers: {
    'Accept': 'audio/mpeg',
  },
});

const audioBuffer = await response.arrayBuffer();
```

### Error Handling
- **Connection Refused**: BuildPanel service is down
- **404 Not Found**: Wrong endpoint or service not deployed
- **413 Payload Too Large**: Audio file exceeds 25MB limit
- **500 Internal Server Error**: BuildPanel processing error

## Troubleshooting Decision Tree

### Voice Processing Fails

1. **Check BuildPanel Status**
   ```bash
   curl https://api.mike.app.buildpanel.ai/api/health
   ```
   - ✅ 200 OK: BuildPanel is running
   - ❌ Connection refused: Service is down

2. **Verify Endpoint**
   - Using correct URL: `https://api.mike.app.buildpanel.ai/api/voice-chat`
   - NOT using: `localhost:3003` or other URLs

3. **Check Audio Format**
   - Input: WebM from browser MediaRecorder
   - Size: Under 25MB
   - Format: Valid audio file

4. **Verify Network**
   - CORS errors: Check browser console
   - Network failures: Check browser network tab

## Integration Testing Checklist

### Before Making Changes
- [ ] Document current working configuration
- [ ] Test voice input works with current setup
- [ ] Backup `.env` file
- [ ] Verify BuildPanel health endpoint responds

### After Configuration Changes
- [ ] Test BuildPanel health endpoint
- [ ] Test voice processing with small audio file
- [ ] Verify audio response plays correctly
- [ ] Check browser console for errors
- [ ] Test restaurant menu context in responses

### Deployment Verification
- [ ] Confirm which BuildPanel instance to use
- [ ] Verify environment variables are correct
- [ ] Test all endpoints return expected responses
- [ ] Validate audio format compatibility

## Future-Proofing Guidelines

### Before Following AI Instructions
1. **Ask Context Questions:**
   - "Are you describing LOCAL development or my CLOUD deployment?"
   - "Should I change my working configuration?"
   - "Are you familiar with my BuildPanel instance at api.mike.app.buildpanel.ai?"

2. **Verify Environment:**
   - Local development = localhost:3003
   - Your cloud instance = api.mike.app.buildpanel.ai
   - Production = (TBD)

3. **Test Before Changing:**
   - Always test current configuration first
   - Document what's working before changes
   - Make incremental changes with testing

### Communication with BuildPanel Team

When discussing with Luis or BuildPanel team, provide:
- Your specific BuildPanel URL
- Restaurant ID and context
- Current integration status
- Specific error messages or issues

## Common Pitfalls to Avoid

### ❌ Configuration Confusion
- Mixing local development instructions with cloud deployment
- Changing working configuration without testing
- Following generic setup guides for specific deployments

### ❌ Environment Mismatches
- Using localhost URLs for cloud deployments
- Hardcoding URLs instead of using environment variables
- Not verifying which BuildPanel instance to use

### ❌ Integration Assumptions
- Assuming all BuildPanel instances work the same
- Not confirming API contract before integration
- Following instructions without verifying deployment context

## Contact Information

### BuildPanel Team
- **Architect**: Luis
- **Your Instance**: https://api.mike.app.buildpanel.ai
- **Support**: Provide your specific BuildPanel URL and restaurant context

### Integration Status
- **Last Updated**: August 2, 2025
- **Status**: Cloud deployment confirmed working
- **Next Steps**: Test voice integration with correct endpoints

---

**🔑 KEY TAKEAWAY**: Your BuildPanel is a CLOUD deployment, not local development. Always use `https://api.mike.app.buildpanel.ai` endpoints.