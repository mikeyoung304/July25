# OpenAI Security Boundary Documentation

## Overview

This document defines the critical security boundary for OpenAI API usage in Rebuild 6.0. **OpenAI must ONLY be used server-side** through our unified backend architecture on port 3001.

## 🔒 Security Principle

**NEVER expose OpenAI API keys to the browser**. All AI operations must be proxied through authenticated backend endpoints.

## Architecture

```
┌─────────────────────┐     ┌─────────────────────────┐
│   React Frontend    │     │    Express Backend      │
│   (Port 5173)       │     │    (Port 3001)          │
│                     │     │                         │
│ TranscriptionService│────▶│ /api/v1/ai/transcribe   │
│ (No OpenAI imports) │     │ (OpenAI SDK here only)  │
└─────────────────────┘     └─────────────────────────┘
         HTTP                           │
      Authenticated                     │
        Requests                        ▼
                              ┌──────────────────┐
                              │   OpenAI API     │
                              │ (External Service)│
                              └──────────────────┘
```

## Security Boundaries

### ✅ Allowed (Server-Side Only)

- `server/src/services/ai.service.ts` - OpenAI SDK usage
- `server/src/routes/ai.routes.ts` - Authenticated API endpoints
- Backend environment variables: `OPENAI_API_KEY`

### ❌ Forbidden (Client-Side)

- Any `import OpenAI from 'openai'` in client code
- `VITE_OPENAI_API_KEY` environment variable
- Direct OpenAI API calls from browser
- Exposing API keys in frontend bundles

## Implementation Details

### Frontend (Client)

The frontend uses a service class that makes HTTP requests to the backend:

```typescript
// client/src/services/transcription/TranscriptionService.ts
export class TranscriptionService {
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    // Makes authenticated request to backend
    const response = await fetch(`${this.apiBaseUrl}/api/v1/ai/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    })
  }
}
```

### Backend (Server)

The backend handles all OpenAI operations:

```typescript
// server/src/services/ai.service.ts
export class AIService {
  private openai: OpenAI;
  
  constructor() {
    // API key is only available server-side
    const apiKey = process.env.OPENAI_API_KEY;
    this.openai = new OpenAI({ apiKey });
  }
  
  async transcribeAudioFile(buffer: Buffer, mimeType: string) {
    // Direct OpenAI API usage - server only
    const transcription = await this.openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1'
    });
  }
}
```

## Authentication Flow

1. User authenticates with Supabase
2. Frontend receives JWT token
3. All AI requests include `Authorization: Bearer <token>`
4. Backend validates token before processing
5. Backend makes OpenAI API call with server-side key
6. Results returned to authenticated user only

## Rate Limiting

The backend implements rate limiting to prevent abuse:

- Transcription endpoint: 30 requests per minute per user
- General AI endpoints: 100 requests per 15 minutes per user

## Security Checklist

- [ ] No OpenAI imports in client code
- [ ] No VITE_OPENAI_API_KEY in environment
- [ ] All AI endpoints require authentication
- [ ] Rate limiting configured on AI endpoints
- [ ] Audio file validation before processing
- [ ] Proper error handling without exposing internals

## Common Mistakes to Avoid

1. **Direct OpenAI Usage in React Components**
   ```typescript
   // ❌ NEVER DO THIS
   import OpenAI from 'openai';
   const openai = new OpenAI({ apiKey: process.env.VITE_OPENAI_API_KEY });
   ```

2. **Exposing API Keys via Environment Variables**
   ```typescript
   // ❌ NEVER DO THIS
   VITE_OPENAI_API_KEY=sk-... // This exposes the key to the browser
   ```

3. **Unauthenticated AI Endpoints**
   ```typescript
   // ❌ NEVER DO THIS
   router.post('/transcribe', async (req, res) => {
     // No authentication check
   });
   ```

## Monitoring and Compliance

- Pre-commit hooks prevent OpenAI imports in client code
- Regular security audits check for exposed keys
- Backend logs all AI API usage for audit trails
- Monitoring alerts for unusual API usage patterns

## References

- [OpenAI API Security Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Rebuild 6.0 Architecture Guide](../ARCHITECTURE.md)