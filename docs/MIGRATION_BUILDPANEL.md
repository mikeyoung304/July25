# BuildPanel Migration Guide

This guide helps developers understand the migration from OpenAI direct integration to BuildPanel service integration in Rebuild 6.0.

## Quick Reference

| Component | Before (OpenAI) | After (BuildPanel) |
|-----------|-----------------|-------------------|
| Location | `server/src/services/ai.service.ts` | `server/src/services/buildpanel.service.ts` |
| Configuration | `OPENAI_API_KEY` | `USE_BUILDPANEL=true`, `BUILDPANEL_URL` |
| AI Processing | Direct OpenAI SDK calls | HTTP requests to BuildPanel |
| Service Port | N/A (external API) | Port 3003 (local/external service) |
| Authentication | API key authentication | Service-to-service HTTP |

## Architecture Change

### Before: Direct OpenAI Integration
```
Frontend → Backend → OpenAI API (External)
           ↓
    process.env.OPENAI_API_KEY
```

### After: BuildPanel Service Integration
```
Frontend → Backend → BuildPanel Service → AI Models
           ↓            (Port 3003)
    BuildPanelService    ↓
                    Restaurant Context
```

## Migration Benefits

### ✅ What Improved
- **No API Key Management**: No sensitive OpenAI keys to protect or rotate
- **Service Isolation**: AI processing runs in separate service with own security
- **Better Context Management**: Restaurant-specific AI contexts maintained by BuildPanel
- **Simplified Authentication**: Single authentication point at backend, service-to-service for BuildPanel
- **Enhanced Monitoring**: Service-level health checks and performance monitoring
- **Stateless AI**: BuildPanel doesn't store data - all persistence in Rebuild DB

### 🔄 What Changed
- **Service Dependency**: Now depends on BuildPanel service availability
- **Configuration**: Different environment variables for BuildPanel connection
- **Error Handling**: Network-level errors in addition to AI processing errors
- **Development Setup**: Requires BuildPanel service running locally

## Implementation Comparison

### OpenAI Direct (Before)
```typescript
// server/src/services/ai.service.ts
import OpenAI from 'openai';

export class AIService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async transcribeAudio(buffer: Buffer) {
    const transcription = await this.openai.audio.transcriptions.create({
      file: createReadStream(tempFile),
      model: 'whisper-1'
    });
    return transcription.text;
  }
}
```

### BuildPanel Service (After)
```typescript
// server/src/services/buildpanel.service.ts
import axios from 'axios';
import FormData from 'form-data';

export class BuildPanelService {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: process.env.BUILDPANEL_URL || 'http://localhost:3003',
      timeout: 30000
    });
  }
  
  async processVoice(audioBuffer: Buffer, restaurantId: string) {
    const formData = new FormData();
    formData.append('audio', audioBuffer, 'audio.webm');
    formData.append('restaurant_id', restaurantId);
    
    const response = await this.client.post('/api/voice-chat', formData);
    return {
      transcription: response.data.transcription,
      response: response.data.response,
      orderData: response.data.orderData
    };
  }
}
```

## Environment Configuration Changes

### Before (OpenAI)
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Frontend
VITE_API_BASE_URL=http://localhost:3001
```

### After (BuildPanel)
```env
# BuildPanel Configuration  
USE_BUILDPANEL=true
BUILDPANEL_URL=http://localhost:3003

# Frontend (unchanged)
VITE_API_BASE_URL=http://localhost:3001
```

## Security Model Changes

### OpenAI Security Model
- **Focus**: Protect API keys from browser exposure
- **Threat**: Exposed keys in frontend bundles
- **Mitigation**: Server-side only OpenAI SDK usage

### BuildPanel Security Model
- **Focus**: Prevent direct frontend access to BuildPanel service
- **Threat**: Bypassing authentication/authorization through direct service calls
- **Mitigation**: Backend proxy with restaurant context validation

## Development Workflow Changes

### Before: OpenAI Development
```bash
# 1. Set OpenAI API key
export OPENAI_API_KEY=sk-...

# 2. Start application
npm run dev

# 3. Test AI features (direct OpenAI calls)
```

### After: BuildPanel Development
```bash
# 1. Start BuildPanel service (separate process)
# Download and run BuildPanel on port 3003

# 2. Configure environment
export USE_BUILDPANEL=true
export BUILDPANEL_URL=http://localhost:3003

# 3. Start application
npm run dev

# 4. Test AI features (proxied through BuildPanel)
```

## API Changes

### Transcription Endpoint
**Implementation change** (API contract unchanged):

```typescript
// Before: Direct OpenAI
router.post('/transcribe', async (req, res) => {
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1'
  });
  res.json({ text: transcription.text });
});

// After: BuildPanel proxy
router.post('/transcribe', async (req, res) => {
  const result = await buildPanel.processVoice(
    req.file.buffer,
    req.user.restaurant_id
  );
  res.json({ 
    text: result.transcription,
    response: result.response,
    orderData: result.orderData
  });
});
```

## Error Handling Changes

### Before: OpenAI Errors
```typescript
try {
  const result = await openai.audio.transcriptions.create(params);
} catch (error) {
  if (error.status === 401) {
    // API key issue
  } else if (error.status === 429) {
    // Rate limit
  }
}
```

### After: BuildPanel Errors
```typescript
try {
  const result = await buildPanel.processVoice(buffer, restaurantId);
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    // BuildPanel service down
  } else if (error.response?.status === 429) {
    // Rate limit from BuildPanel
  }
}
```

## Testing Changes

### Before: Mock OpenAI
```typescript
jest.mock('openai', () => ({
  OpenAI: jest.fn(() => ({
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({ text: 'mock transcript' })
      }
    }
  }))
}));
```

### After: Mock BuildPanel Service
```typescript
jest.mock('../services/buildpanel.service', () => ({
  getBuildPanelService: jest.fn(() => ({
    processVoice: jest.fn().mockResolvedValue({
      transcription: 'mock transcript',
      response: 'mock response'
    }),
    healthCheck: jest.fn().mockResolvedValue(true)
  }))
}));
```

## Troubleshooting Migration Issues

### BuildPanel Service Not Running
**Error**: `ECONNREFUSED` when calling AI endpoints
**Solution**: Ensure BuildPanel is running on port 3003 before starting the application

### Missing Restaurant Context
**Error**: AI responses don't have proper restaurant context
**Solution**: Verify `restaurant_id` is being passed to all BuildPanel calls

### Configuration Issues
**Error**: `USE_BUILDPANEL=true` not working
**Solution**: Check environment variable is set and BuildPanel URL is correct

### Health Check Failures
**Error**: `/api/v1/ai/health` shows BuildPanel disconnected
**Solution**: Verify BuildPanel service is accessible from backend

## Migration Checklist

### Code Changes
- [x] Replace `AIService` OpenAI calls with `BuildPanelService` calls
- [x] Update environment configuration from `OPENAI_API_KEY` to `USE_BUILDPANEL`/`BUILDPANEL_URL`
- [x] Add restaurant context to all AI service calls
- [x] Update error handling for service-to-service communication
- [x] Implement BuildPanel health checks

### Infrastructure Changes
- [x] Deploy BuildPanel service (port 3003)
- [x] Remove OpenAI API key from environment
- [x] Configure BuildPanel URL in production environment
- [x] Update monitoring for BuildPanel service connectivity

### Documentation Changes
- [x] Archive OpenAI security documentation
- [x] Create BuildPanel security documentation
- [x] Update architecture diagrams
- [x] Update development setup instructions

### Testing Changes
- [x] Update unit tests to mock BuildPanel service
- [x] Add integration tests for BuildPanel connectivity
- [x] Update security tests to check for direct BuildPanel access
- [x] Verify AI features work with BuildPanel integration

## Rollback Plan

If BuildPanel integration issues occur:

1. **Immediate**: Set `USE_BUILDPANEL=false` to disable AI features
2. **Temporary**: Core restaurant functionality continues without AI
3. **Recovery**: Fix BuildPanel connectivity and re-enable with `USE_BUILDPANEL=true`

Note: Direct OpenAI fallback is not available - BuildPanel is now the only AI integration path.

## References

- [BuildPanel Service Documentation](https://buildpanel.dev/docs)
- [SECURITY_BUILDPANEL.md](./SECURITY_BUILDPANEL.md) - New security model
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Updated architecture
- [Archived OpenAI Documentation](./archived/) - Previous implementation

## Support

For migration issues:
1. Check [DEVELOPMENT.md](../DEVELOPMENT.md) for setup instructions
2. Verify BuildPanel service is running and accessible
3. Review security guidelines in [SECURITY_BUILDPANEL.md](./SECURITY_BUILDPANEL.md)
4. Test with security check script: `./scripts/check-buildpanel-security.sh`