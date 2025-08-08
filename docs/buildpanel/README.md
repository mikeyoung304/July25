# BuildPanel Integration

## Overview

BuildPanel is the cloud-based AI service that powers voice ordering, natural language processing, and intelligent order parsing for the Restaurant OS.

**Service URL**: `https://api.mike.app.buildpanel.ai`

## Architecture

```
Client → Backend (3001) → BuildPanel Cloud API
           ↓
    Authentication
    Rate Limiting  
    Restaurant Context
```

## Key Features

### Voice Processing
- Speech-to-text transcription
- Natural language understanding
- Text-to-speech responses
- Multi-language support

### Order Intelligence
- Menu item recognition
- Modifier parsing
- Quantity detection
- Special instructions handling

### Restaurant Context
- Multi-tenant support via X-Restaurant-ID headers
- Menu synchronization
- Custom vocabulary training

## API Endpoints

### Voice Chat
```
POST /api/v1/ai/transcribe
Content-Type: multipart/form-data
Body: audio (WebM/MP3)
Response: MP3 audio + transcription
```

### Text Chat
```
POST /api/v1/ai/parse-order
Content-Type: application/json
Body: { text: "order text" }
Response: { items: [...], confidence: 0.95 }
```

### Menu Sync
```
POST /api/v1/ai/menu
Content-Type: application/json
Body: { items: [...], categories: [...] }
Response: { success: true }
```

## Configuration

### Environment Variables
```bash
USE_BUILDPANEL=true
BUILDPANEL_URL=https://api.mike.app.buildpanel.ai
USE_BUILDPANEL_VOICE=true
USE_BUILDPANEL_CHAT=true
USE_BUILDPANEL_MENU=true
```

### Backend Service
The `BuildPanelService` class in `server/src/services/buildpanel.service.ts` handles:
- Request proxying
- Authentication
- Error handling
- Response transformation

## Security

### Authentication Flow
1. Client requests go to backend only
2. Backend validates user session
3. Backend adds restaurant context
4. Backend proxies to BuildPanel
5. Response sanitized before client delivery

### Data Privacy
- No client-side BuildPanel configuration
- Audio processed in memory only
- PII stripped from logs
- Restaurant isolation enforced

## Testing

### Health Check
```bash
curl https://api.mike.app.buildpanel.ai/api/health
# Expected: {"status":"OK"}
```

### Voice Test
```bash
cd server
npm run test:buildpanel:streaming
```

### Integration Test
```bash
npm run check:integration
```

## Troubleshooting

### Common Issues

**No audio response**
- Check microphone permissions
- Verify audio format (WebM preferred)
- Check browser console for errors

**Menu items not recognized**
- Verify menu sync completed
- Check item names match spoken phrases
- Review BuildPanel logs

**High latency**
- Current: 3-6 seconds end-to-end
- Target: 1-3 seconds (optimization ongoing)
- Consider connection speed

**Restaurant context errors**
- Verify restaurant ID in requests
- Check X-Restaurant-ID header
- Ensure menu data synced

## Performance

### Current Metrics
- Transcription: 1-2 seconds
- Processing: 1-2 seconds  
- Response generation: 1-2 seconds
- Total: 3-6 seconds

### Optimization Roadmap
1. Implement streaming responses
2. Add response caching
3. Optimize audio encoding
4. Edge deployment consideration

## Support

For BuildPanel-specific issues:
- Check service status: https://api.mike.app.buildpanel.ai/api/health
- Review logs: `server/logs/buildpanel.log`
- Contact: BuildPanel support team