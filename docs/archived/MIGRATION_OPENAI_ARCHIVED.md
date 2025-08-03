# OpenAI Migration Guide

This guide helps developers migrate code that incorrectly uses OpenAI in the frontend to the secure backend pattern.

## Quick Reference

| Component | Before (Insecure) | After (Secure) |
|-----------|-------------------|----------------|
| Location | `client/src/*` | `server/src/ai/*` |
| API Key | `VITE_OPENAI_API_KEY` | `OPENAI_API_KEY` |
| Import | `import OpenAI from 'openai'` | Backend only |
| Auth | None or client-side | Server validates JWT |

## Step-by-Step Migration

### Step 1: Identify Frontend OpenAI Usage

Search for OpenAI usage in client code:

```bash
# Find OpenAI imports
grep -r "from 'openai'" client/src/
grep -r 'from "openai"' client/src/

# Find OpenAI API key references
grep -r "VITE_OPENAI_API_KEY" client/
```

### Step 2: Remove OpenAI from Frontend

1. **Remove the package dependency:**
   ```bash
   cd client
   npm uninstall openai
   ```

2. **Remove environment variable:**
   ```diff
   # .env
   - VITE_OPENAI_API_KEY=sk-...
   ```

3. **Remove from env.ts:**
   ```diff
   // client/src/utils/env.ts
   interface ImportMetaEnv {
     VITE_API_BASE_URL?: string
   -  VITE_OPENAI_API_KEY?: string
   }
   ```

### Step 3: Create Backend Endpoint

Create or update the backend AI endpoint:

```typescript
// server/src/routes/ai.routes.ts
router.post('/transcribe', 
  transcriptionLimiter,      // Rate limiting
  authenticate,              // Auth required
  audioUpload.single('audio'), // File validation
  async (req: AuthenticatedRequest, res: Response) => {
    const result = await aiService.transcribeAudioFile(
      req.file.buffer,
      req.file.mimetype
    );
    return res.json(result);
  }
);
```

### Step 4: Update Frontend Service

Replace direct OpenAI calls with API calls:

**Before (Insecure):**
```typescript
// ❌ client/src/services/transcription/TranscriptionService.ts
import OpenAI from 'openai';

export class TranscriptionService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // RED FLAG!
    });
  }
  
  async transcribeAudio(audioBlob: Blob) {
    const file = new File([audioBlob], 'audio.webm');
    const transcription = await this.openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1'
    });
    return transcription.text;
  }
}
```

**After (Secure):**
```typescript
// ✅ client/src/services/transcription/TranscriptionService.ts
export class TranscriptionService {
  private apiBaseUrl: string;
  
  constructor() {
    this.apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3001';
  }
  
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    
    const token = await this.getAuthToken(); // Get from auth service
    
    const response = await fetch(`${this.apiBaseUrl}/api/v1/ai/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: data.success,
      transcript: data.text,
      error: data.error
    };
  }
}
```

### Step 5: Implement Backend Service

Move OpenAI logic to the backend:

```typescript
// server/src/services/ai.service.ts
import OpenAI from 'openai';

export class AIService {
  private openai: OpenAI;
  
  constructor() {
    // Server-side only - no browser exposure
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    this.openai = new OpenAI({ apiKey });
  }
  
  async transcribeAudioFile(buffer: Buffer, mimeType: string) {
    // Create temporary file for OpenAI
    const tempPath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
    await fs.writeFile(tempPath, buffer);
    
    try {
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: 'whisper-1'
      });
      
      return {
        success: true,
        text: transcription.text
      };
    } finally {
      // Clean up temp file
      await fs.unlink(tempPath).catch(() => {});
    }
  }
}
```

## Common Patterns to Migrate

### 1. Chat Completions

**Before:**
```typescript
// ❌ Frontend
const completion = await openai.chat.completions.create({
  messages: [{ role: 'user', content: userInput }],
  model: 'gpt-3.5-turbo'
});
```

**After:**
```typescript
// ✅ Frontend
const response = await fetch('/api/v1/ai/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ message: userInput })
});
```

### 2. Image Generation

**Before:**
```typescript
// ❌ Frontend
const image = await openai.images.generate({
  prompt: imagePrompt,
  n: 1,
  size: '1024x1024'
});
```

**After:**
```typescript
// ✅ Frontend
const response = await fetch('/api/v1/ai/generate-image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ prompt: imagePrompt })
});
```

## Testing the Migration

### 1. Security Tests

```typescript
// server/src/routes/__tests__/security.test.ts
describe('AI Security', () => {
  it('should reject unauthenticated requests', async () => {
    const response = await request(app)
      .post('/api/v1/ai/transcribe')
      .attach('audio', 'test.webm');
      
    expect(response.status).toBe(401);
  });
  
  it('should not expose API keys', async () => {
    const response = await request(app)
      .get('/api/v1/ai/health');
      
    expect(response.text).not.toContain('sk-');
  });
});
```

### 2. Frontend Tests

```typescript
// client/src/services/__tests__/TranscriptionService.test.ts
describe('TranscriptionService', () => {
  it('should not import OpenAI', () => {
    const serviceFile = fs.readFileSync(
      'src/services/transcription/TranscriptionService.ts',
      'utf-8'
    );
    expect(serviceFile).not.toContain("from 'openai'");
  });
});
```

## Verification Checklist

After migration, verify:

- [ ] No OpenAI package in client/package.json
- [ ] No VITE_OPENAI_API_KEY in any .env file
- [ ] All AI endpoints require authentication
- [ ] Rate limiting is configured
- [ ] Error messages don't expose internals
- [ ] Temporary files are cleaned up
- [ ] Tests pass for both frontend and backend

## Troubleshooting

### Error: "OpenAI is not defined"
You still have OpenAI imports in the frontend. Search and remove them.

### Error: "Authentication required"
Ensure your frontend is sending the auth token in the Authorization header.

### Error: "Rate limit exceeded"
The backend rate limiting is working. Implement exponential backoff in the frontend.

### Error: "Invalid audio format"
Ensure the backend properly handles the audio format conversion before sending to OpenAI.

## Security Benefits

After migration:
- ✅ API keys are never exposed to browsers
- ✅ All AI usage is authenticated and authorized
- ✅ Rate limiting prevents abuse
- ✅ Usage can be tracked per user
- ✅ Costs are controlled server-side
- ✅ No client-side API key rotation needed