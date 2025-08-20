# CRITICAL: OpenAI Setup Required

## The Problem

Voice functionality is failing because OpenAI API is not configured on Render.

## Symptoms

- TTS returns 0 bytes of audio
- Voice-chat returns 500 errors
- Transcription fails silently

## Solution

### 1. Set OpenAI API Key on Render

```bash
# In Render Dashboard:
# 1. Go to your service
# 2. Environment → Environment Variables
# 3. Add:
OPENAI_API_KEY=sk-...your-key-here
```

### 2. Verify Locally First

```bash
# Test locally to ensure API key works:
export OPENAI_API_KEY=sk-...your-key-here
npm run dev:server

# Test TTS:
curl -X POST http://localhost:3001/api/v1/ai/test-tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}'

# Should return audio data, not empty response
```

### 3. Other Required Environment Variables

```bash
# On Render, ensure these are set:
OPENAI_API_KEY=sk-...          # OpenAI API key
ALLOWED_ORIGINS=https://july25-client.vercel.app
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
KIOSK_JWT_SECRET=any-secret-string-here
```

## Quick Test After Setup

```bash
# Once deployed with API key:
curl -X POST https://july25.onrender.com/api/v1/ai/test-tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Testing"}' \
  -o test.mp3

# Check file size:
ls -la test.mp3
# Should be > 0 bytes
```

## Why This Happened

1. We focused on code bugs
2. Never verified OpenAI integration worked
3. Error handling hides real problems (returns empty buffer instead of error)

## Lesson Learned

**Always verify external dependencies (APIs, databases) work before debugging code.**
