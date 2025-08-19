# BuildPanel Security Boundary Documentation

## Overview

This document defines the critical security boundary for BuildPanel AI integration in Rebuild 6.0. **BuildPanel is the external AI service that handles all AI operations** through our unified backend architecture on port 3001.

## 🔒 Security Principle

**BuildPanel handles all AI processing externally**. The unified backend proxies authenticated requests to BuildPanel, maintaining security isolation and service boundaries.

## Architecture

```
┌─────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────┐
│   React Frontend    │     │    Express Backend      │     │    BuildPanel       │
│   (Port 5173)       │     │    (Port 3001)          │     │    (Port 3003)      │
│                     │     │                         │     │                     │
│ TranscriptionService│────▶│ /api/v1/ai/transcribe   │────▶│ /api/voice-chat     │
│ (No AI SDKs)        │     │ (BuildPanelService)     │     │ (External Service)  │
└─────────────────────┘     └─────────────────────────┘     └─────────────────────┘
         HTTP                           │                             │
      Authenticated                     │                             │
        Requests                        ▼                             ▼
                              ┌──────────────────┐           ┌──────────────────┐
                              │   Supabase DB    │           │   AI Models      │
                              │ (User/Order Data)│           │ (Voice/Chat/etc) │
                              └──────────────────┘           └──────────────────┘
```

## Security Boundaries

### ✅ Allowed (Secure Patterns)

**Backend Service (server/src/):**
- `server/src/services/buildpanel.service.ts` - BuildPanel client service
- `server/src/routes/ai.routes.ts` - Authenticated AI endpoints
- Backend environment variables: `USE_BUILDPANEL=true`, `BUILDPANEL_URL`

**Authentication Flow:**
- Frontend JWT tokens validated by backend
- Backend proxies to BuildPanel with restaurant context
- No direct frontend-to-BuildPanel communication

### ❌ Forbidden (Insecure Patterns)

**Client-Side Direct Access:**
- Any direct frontend calls to BuildPanel (port 3003)
- BuildPanel configuration in frontend environment variables
- Bypassing backend authentication for AI operations
- Client-side AI SDK imports (OpenAI, BuildPanel clients, etc.)

## Implementation Details

### Frontend (Client)

The frontend uses service classes that make HTTP requests to the backend only:

```typescript
// client/src/services/transcription/TranscriptionService.ts
export class TranscriptionService {
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    // Makes authenticated request to BACKEND only (not BuildPanel directly)
    const response = await fetch(`${this.apiBaseUrl}/api/v1/ai/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restaurant-ID': restaurantId
      },
      body: formData
    })
  }
}
```

### Backend (Server)

The backend handles all BuildPanel communications:

```typescript
// server/src/services/buildpanel.service.ts
export class BuildPanelService {
  private config: BuildPanelConfig;
  
  constructor() {
    // BuildPanel URL is only available server-side
    this.config = {
      baseUrl: process.env.BUILDPANEL_URL || 'http://localhost:3003',
      timeout: 30000
    };
  }
  
  async processVoice(audioBuffer: Buffer, restaurantId: string) {
    // Direct BuildPanel API usage - server only
    const formData = new FormData();
    formData.append('audio', audioBuffer, 'audio.webm');
    formData.append('restaurant_id', restaurantId);
    
    const response = await this.client.post('/api/voice-chat', formData);
    return response.data;
  }
}
```

## Authentication & Authorization Flow

1. User authenticates with Supabase
2. Frontend receives JWT token with restaurant claims
3. All AI requests include `Authorization: Bearer <token>` and `X-Restaurant-ID`
4. Backend validates token and extracts restaurant context
5. Backend makes BuildPanel API call with restaurant_id context
6. BuildPanel processes request in isolated restaurant context
7. Results returned to authenticated user through backend only

## Multi-Tenancy Security

BuildPanel integration maintains strict tenant isolation:

- **Restaurant ID Propagation**: Every BuildPanel request includes restaurant_id
- **Backend Validation**: Server validates user access to restaurant before proxying
- **Stateless BuildPanel**: BuildPanel doesn't store customer data - all persistence in Rebuild DB
- **Context Isolation**: BuildPanel processes requests in restaurant-specific contexts

## Rate Limiting & Resource Protection

The backend implements protective measures:

- **Transcription endpoint**: 30 requests per minute per user
- **Chat endpoints**: 100 requests per 15 minutes per user
- **File size limits**: Audio files limited to 10MB
- **BuildPanel timeout**: 30-second timeout on all BuildPanel requests

## Security Checklist

- [ ] No direct frontend calls to BuildPanel (port 3003)
- [ ] No BuildPanel configuration in client environment
- [ ] All AI endpoints require authentication
- [ ] Restaurant ID validation on all AI requests  
- [ ] Rate limiting configured on AI endpoints
- [ ] Audio file validation before processing
- [ ] BuildPanel health checks implemented
- [ ] Proper error handling without exposing BuildPanel internals

## Common Security Mistakes to Avoid

1. **Direct BuildPanel Access from Frontend**
   ```typescript
   // ❌ NEVER DO THIS
   const response = await fetch('http://localhost:3003/api/voice-chat', {
     body: audioFormData
   });
   ```

2. **Exposing BuildPanel Config to Browser**
   ```typescript
   // ❌ NEVER DO THIS
   VITE_BUILDPANEL_URL=http://localhost:3003 // This exposes BuildPanel to browser
   ```

3. **Unauthenticated AI Endpoints**
   ```typescript
   // ❌ NEVER DO THIS
   router.post('/transcribe', async (req, res) => {
     // No authentication check - allows anonymous access
   });
   ```

4. **Missing Restaurant Context**
   ```typescript
   // ❌ NEVER DO THIS
   await buildPanel.processVoice(audioBuffer); // Missing restaurant_id context
   ```

## Environment Configuration Security

### Secure Configuration
```env
# Backend-only BuildPanel configuration
USE_BUILDPANEL=true
BUILDPANEL_URL=http://localhost:3003

# Frontend configuration (no BuildPanel references)
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### ❌ Insecure Patterns
```env
# Never expose BuildPanel directly to frontend
VITE_BUILDPANEL_URL=http://localhost:3003  # SECURITY VIOLATION
```

## Monitoring and Compliance

- **Service Health Monitoring**: Regular BuildPanel connectivity checks
- **Request Audit Logging**: All AI operations logged with user context
- **Error Monitoring**: BuildPanel failures tracked and alerted
- **Performance Metrics**: Response times and success rates monitored
- **Security Scanning**: Regular checks for exposed BuildPanel access

## Emergency Procedures

### BuildPanel Service Failure
1. Backend gracefully handles BuildPanel unavailability
2. Users receive clear "AI features temporarily unavailable" messages
3. Non-AI features continue to function normally
4. Automatic retry logic with exponential backoff

### Security Incident Response
1. Immediate blocking of suspicious BuildPanel access patterns
2. Audit logs reviewed for unauthorized access attempts
3. Restaurant data isolation verified
4. Service recovery with enhanced monitoring

## Migration from OpenAI

This document replaces the previous OpenAI security model:

### What Changed
- **Before**: Direct OpenAI API integration with API key protection
- **After**: BuildPanel service integration with proxy security model
- **Security Focus**: Shifted from API key protection to service boundary isolation

### Security Improvements
- ✅ **No API Keys**: No sensitive keys to protect or rotate
- ✅ **Service Isolation**: BuildPanel runs as separate service with own security
- ✅ **Simplified Auth**: Single authentication point at backend
- ✅ **Better Monitoring**: Service-level health checks and monitoring

## References

- [BuildPanel Service Documentation](https://buildpanel.dev/docs)
- [Rebuild 6.0 Architecture Guide](../ARCHITECTURE.md)
- [BuildPanel Integration Guide](./BUILDPANEL_INTEGRATION.md)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

## Archived Documentation

- [SECURITY_OPENAI.md](./archived/SECURITY_OPENAI_ARCHIVED.md) - Previous OpenAI security model (archived)