# Voice Ordering - Complete Session Handoff
**Date**: 2025-11-07 19:25 UTC
**For**: Fresh Claude Code Session
**Project**: Restaurant Voice Ordering System (React + Express + OpenAI Realtime API)

## Current Status Summary

### ✅ FIXED: Two Critical Issues
1. **Environment Variable Newlines** - Fixed in commit `03011ced`
2. **Anonymous Authentication** - Fixed in commit `db9a1155`

### ⚠️ NEW ISSUE: Wrong Language Response + No Transcription
**User Report**: "the page responded in the wrong language when i tried to record. nothing was transcribed"

## Architecture Overview

### Deployment Structure
- **Client**: Vercel (https://july25-client.vercel.app)
- **Server**: Render (https://july25.onrender.com)
- **Database**: Supabase (xiwfhcikfdoshxwbtjxt.supabase.co)

### Voice Ordering Flow
1. User visits `/kiosk-demo` page (public, no auth required)
2. Client requests ephemeral token from `/api/v1/realtime/session` (anonymous)
3. Server returns OpenAI Realtime API token + menu context
4. Client establishes WebRTC connection directly to OpenAI
5. User speaks → OpenAI transcribes → Client displays transcription
6. AI detects order items → Submits to backend

### Tech Stack
- **Frontend**: React 19.1.0, TypeScript, Vite
- **Backend**: Express, TypeScript, Node.js
- **Voice**: OpenAI Realtime API (gpt-4o-realtime-preview-2025-06-03)
- **Connection**: WebRTC (client-side, direct to OpenAI)

## Fixed Issues (Context)

### Issue #1: Environment Variable Newlines (FIXED ✅)
**Commit**: `03011ced` (Nov 7, 2025 18:57 UTC)

**Problem**:
- OPENAI_API_KEY on Render contained literal `\n` characters
- OpenAI API rejected malformed Authorization headers
- Voice button did nothing (silent failure)

**Solution**:
- Added `.trim()` to `server/src/config/env.ts` getString/getOptionalString
- Added API key validation in `server/src/routes/realtime.routes.ts`
- Added client-side error handling in `VoiceControlWebRTC.tsx`

**Files Modified**:
- `server/src/config/env.ts` (lines 11-23)
- `server/src/routes/realtime.routes.ts` (lines 6, 109-131, 192-220)
- `client/src/modules/voice/components/VoiceControlWebRTC.tsx` (lines 126-155, 205-234)

**Status**: ✅ Server deployed and verified working

### Issue #2: Anonymous Authentication (FIXED ✅)
**Commit**: `db9a1155` (Nov 7, 2025 19:14 UTC)

**Problem**:
- kiosk-demo page is public (no authentication)
- Voice endpoint required authentication (`authenticate` middleware)
- Error: "Voice Service Error - No active authentication session"

**Solution**:
- Changed endpoint from `authenticate` → `optionalAuth` middleware
- Added `getOptionalAuthToken()` to client auth service (returns null instead of throwing)
- Updated voice services to handle optional authentication
- Sends requests without Authorization header for anonymous users

**Files Modified**:
- `server/src/routes/realtime.routes.ts` (line 2, 16)
- `client/src/services/auth/index.ts` (lines 42-66)
- `client/src/modules/voice/services/VoiceSessionConfig.ts` (lines 63-99)
- `client/src/modules/voice/services/WebRTCVoiceClient.ts` (lines 3, 77)

**Verification**:
```bash
# Server endpoint works anonymously
curl -X POST 'https://july25.onrender.com/api/v1/realtime/session' \
  -H 'Content-Type: application/json' \
  -H 'x-restaurant-id: grow'

# Returns: Valid session with client_secret ✅
```

**Status**: ✅ Server deployed | ⏳ Client deploying

## NEW ISSUE: Wrong Language + No Transcription

### User Report
> "the page responded in the wrong language when i tried to record. nothing was transcribed"

### Symptoms
- User pressed "HOLD ME" button to record
- AI responded in wrong language (not English)
- No transcription appeared on screen
- Voice was heard but not converted to text

### Possible Root Causes

#### 1. Language Configuration Issue
**Location**: `client/src/modules/voice/services/VoiceSessionConfig.ts:199-259`

The AI instructions are sent when session is created. Check:
```typescript
const instructions = `You are Grow Restaurant's friendly, fast, and accurate customer service agent...`;
```

**Potential Issues**:
- Instructions might not specify language clearly enough
- OpenAI might be auto-detecting wrong language from audio
- `input_audio_transcription` config might be missing or wrong

**Current Config** (line 276-280):
```typescript
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en', // ← Check if this is being sent
}
```

#### 2. Session Configuration Not Sent
**Location**: `client/src/modules/voice/services/WebRTCVoiceClient.ts:122-137`

After session is created, configuration is sent:
```typescript
this.eventHandler.on('session.created', () => {
  const sessionConfigObj = this.sessionConfig.buildSessionConfig();
  this.eventHandler.sendEvent({
    type: 'session.update',
    session: sessionConfigObj
  });
});
```

**Check if**:
- `session.update` event is actually being sent
- Configuration includes language settings
- Event reaches OpenAI before recording starts

#### 3. Transcription Not Enabled
**Location**: `client/src/modules/voice/services/VoiceSessionConfig.ts:267-280`

Check if transcription is properly enabled:
```typescript
modalities: ['audio', 'text'], // ← Should include 'text'
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en' // ← Language specification
}
```

#### 4. Turn Detection Configuration
**Location**: `client/src/modules/voice/services/VoiceSessionConfig.ts:281-291`

Server VAD (Voice Activity Detection) settings:
```typescript
turn_detection: this.config.enableVAD ? {
  type: 'server_vad',
  threshold: 0.5,
  prefix_padding_ms: 300,
  silence_duration_ms: 200
} : null
```

**If VAD is enabled but misconfigured**:
- Might not detect speech properly
- Could cause transcription to fail
- Might trigger in wrong language context

## Investigation Steps for New Session

### 1. Use Puppeteer to Navigate and Test
```typescript
// Navigate to page
mcp__puppeteer__puppeteer_navigate({ url: "https://july25-client.vercel.app/kiosk-demo" })

// Take screenshot
mcp__puppeteer__puppeteer_screenshot({ name: "kiosk-demo-current", width: 1920, height: 1080 })

// Check console for errors
mcp__puppeteer__puppeteer_evaluate({
  script: `
    // Capture console logs
    window.__CONSOLE_LOGS__ = [];
    const original = console.log;
    console.log = (...args) => {
      window.__CONSOLE_LOGS__.push(args);
      original.apply(console, args);
    };
    'Logging enabled';
  `
})
```

### 2. Check Session Configuration
**Read**: `client/src/modules/voice/services/VoiceSessionConfig.ts`

Look for:
- Line 199-259: AI instructions
- Line 267-280: Session configuration
- Line 276-280: `input_audio_transcription` settings

**Verify**:
- Language is set to 'en'
- Instructions mention English communication
- Transcription model is 'whisper-1'

### 3. Check WebRTC Event Flow
**Read**: `client/src/modules/voice/services/WebRTCVoiceClient.ts`

Look for:
- Line 122-137: Session creation handler
- Line 99-120: Event proxying setup
- Check if 'transcript' events are wired correctly

### 4. Test Server Endpoint Directly
```bash
curl -X POST 'https://july25.onrender.com/api/v1/realtime/session' \
  -H 'Content-Type: application/json' \
  -H 'x-restaurant-id: grow' | jq '.instructions' | head -20

# Check if instructions mention English
```

### 5. Check for Browser Console Errors
Use puppeteer to capture console errors during recording:
```typescript
mcp__puppeteer__puppeteer_evaluate({
  script: `
    // Get any errors
    window.__ERRORS__ = [];
    window.addEventListener('error', (e) => {
      window.__ERRORS__.push({ message: e.message, stack: e.error?.stack });
    });
    'Error tracking enabled';
  `
})
```

## Key Files to Examine

### Voice Session Configuration
**Path**: `client/src/modules/voice/services/VoiceSessionConfig.ts`

**Critical Sections**:
- **Line 199-259**: AI instructions (language specification)
- **Line 267-294**: `buildSessionConfig()` method
- **Line 276-280**: `input_audio_transcription` configuration

**What to Check**:
```typescript
// Is this present and correct?
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en' // ← Should be 'en' for English
}

// Are instructions in English?
const instructions = `You are Grow Restaurant's...`; // ← Check language
```

### Event Handler
**Path**: `client/src/modules/voice/services/VoiceEventHandler.ts`

**Critical Sections**:
- Transcript event handling
- Response text handling
- Error handling

**What to Check**:
- Are 'conversation.item.input_audio_transcription.completed' events handled?
- Are transcript events emitted to parent?

### WebRTC Voice Client
**Path**: `client/src/modules/voice/services/WebRTCVoiceClient.ts`

**Critical Sections**:
- Line 122-137: Session created handler
- Line 99-120: Event proxy setup

**What to Check**:
- Is 'session.update' sent after 'session.created'?
- Are transcript events proxied correctly?

### Backend Realtime Routes
**Path**: `server/src/routes/realtime.routes.ts`

**Critical Sections**:
- Line 16: Endpoint definition (now uses `optionalAuth`)
- Line 45-91: Menu context loading
- Line 108-145: OpenAI session request

**What to Check**:
- Is menu context being sent?
- Any language hints in menu context?

## Environment Variables

### Server (Render)
```bash
OPENAI_API_KEY=sk-proj-... (trimmed by env.ts)
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
```

### Client (Vercel)
```bash
VITE_API_BASE_URL=https://july25.onrender.com
VITE_DEFAULT_RESTAURANT_ID=grow
```

## Testing Commands

### Health Check
```bash
curl https://july25.onrender.com/api/v1/realtime/health | jq
# Should return: { "status": "healthy", "api_key_valid": true }
```

### Anonymous Session Request
```bash
curl -X POST https://july25.onrender.com/api/v1/realtime/session \
  -H 'Content-Type: application/json' \
  -H 'x-restaurant-id: grow' | jq '.' | head -50
# Should return: Valid session with client_secret
```

### Check Instructions
```bash
curl -X POST https://july25.onrender.com/api/v1/realtime/session \
  -H 'Content-Type: application/json' \
  -H 'x-restaurant-id: grow' | jq -r '.instructions' | head -20
# Should show English instructions
```

## Git History

### Recent Commits
```bash
git log --oneline -5

db9a1155 fix: enable anonymous voice ordering for kiosk-demo
03011ced fix: trim environment variables to remove newlines causing voice ordering failure
efe375cc fix: logout before login when switching workspace users
1b7826ec fix: server voice ordering seats/capacity schema mismatch
3117a302 fix: clear session on switch user to prevent session persistence
```

### Current Branch
```bash
git branch
# main (on main branch)
```

## Debugging Strategy

### Step 1: Verify Session Configuration
```typescript
// Use Task agent to read VoiceSessionConfig.ts
// Focus on buildSessionConfig() method
// Check input_audio_transcription settings
```

### Step 2: Test Language in Instructions
```typescript
// Check if instructions explicitly say "English"
// Verify language: 'en' in transcription config
// Look for any language detection settings
```

### Step 3: Check Event Flow
```typescript
// Verify transcript events are emitted
// Check if VoiceEventHandler processes transcription events
// Ensure events reach UI components
```

### Step 4: Browser Console Investigation
```typescript
// Use puppeteer to capture real-time console
// Check for WebRTC connection errors
// Look for transcription event logs
```

## Likely Fix Scenarios

### Scenario 1: Missing Language in Instructions
**Fix**: Update instructions to explicitly specify English
**File**: `client/src/modules/voice/services/VoiceSessionConfig.ts:199`
```typescript
const instructions = `You are Grow Restaurant's friendly English-speaking customer service agent.
IMPORTANT: Always communicate in English. Transcribe and respond in English only.
...`;
```

### Scenario 2: input_audio_transcription Not Sent
**Fix**: Ensure config is sent in session.update
**File**: `client/src/modules/voice/services/VoiceSessionConfig.ts:267-280`
```typescript
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en' // Explicitly set English
}
```

### Scenario 3: Transcription Events Not Handled
**Fix**: Check VoiceEventHandler event listeners
**File**: `client/src/modules/voice/services/VoiceEventHandler.ts`
```typescript
// Ensure this handler exists:
case 'conversation.item.input_audio_transcription.completed':
  // Handle transcription completion
```

### Scenario 4: Session Config Sent Before Ready
**Fix**: Add delay or wait for connection state
**File**: `client/src/modules/voice/services/WebRTCVoiceClient.ts:122-137`
```typescript
// Ensure data channel is ready before sending config
if (this.eventHandler.isReady()) {
  this.eventHandler.sendEvent({ type: 'session.update', session: config });
}
```

## Success Criteria

- [ ] User presses "HOLD ME" button
- [ ] Microphone permission granted
- [ ] Status shows "Connected"
- [ ] User speaks in English
- [ ] AI responds in English
- [ ] Transcription appears in UI
- [ ] Order items are detected

## Documentation References

### Project Docs
- `docs/archive/CLAUDE.md` - Project overview (outdated but has context)
- `docs/explanation/architecture/ARCHITECTURE.md` - Current architecture
- `VOICE_ORDERING_FIX_SUMMARY.md` - Environment variable fix details
- `VOICE_ORDERING_ANONYMOUS_FIX_COMPLETE.md` - Authentication fix details

### ADRs (Architecture Decision Records)
- **ADR-005**: Client-side voice ordering architecture
- **ADR-004**: WebSocket real-time architecture
- **ADR-002**: Multi-tenancy architecture
- **ADR-006**: Dual authentication pattern

### Code Documentation
- `client/src/modules/voice/services/VoiceSessionConfig.ts` - Session config + instructions
- `client/src/modules/voice/services/WebRTCVoiceClient.ts` - Main orchestrator
- `client/src/modules/voice/services/VoiceEventHandler.ts` - Event processing
- `server/src/routes/realtime.routes.ts` - Backend endpoint

## Commands for AI Agent

### Navigate and Inspect
```bash
# Read voice session config
Read file: client/src/modules/voice/services/VoiceSessionConfig.ts

# Check instructions section (lines 199-259)
Read file: client/src/modules/voice/services/VoiceSessionConfig.ts offset:199 limit:60

# Check event handler
Read file: client/src/modules/voice/services/VoiceEventHandler.ts

# Use puppeteer to test live
mcp__puppeteer__puppeteer_navigate({ url: "https://july25-client.vercel.app/kiosk-demo" })
```

### Search for Language Settings
```bash
# Search for language configuration
Grep pattern: "language.*en" path: client/src/modules/voice output_mode: content

# Search for transcription config
Grep pattern: "input_audio_transcription" path: client/src output_mode: content

# Search for instructions
Grep pattern: "instructions.*You are" path: client/src output_mode: content
```

### Test Endpoints
```bash
# Test session endpoint
Bash: curl -X POST https://july25.onrender.com/api/v1/realtime/session -H 'Content-Type: application/json' -H 'x-restaurant-id: grow' | jq '.'

# Check health
Bash: curl https://july25.onrender.com/api/v1/realtime/health | jq
```

## Priority Actions

### Immediate (Priority 1)
1. **Read VoiceSessionConfig.ts lines 199-280** - Check instructions and transcription config
2. **Test with puppeteer** - Capture console logs during recording
3. **Check language settings** - Verify 'en' is specified everywhere

### Secondary (Priority 2)
4. **Review VoiceEventHandler.ts** - Ensure transcript events are processed
5. **Test session.update timing** - Verify config is sent before recording
6. **Add language enforcement** - Explicitly specify English in multiple places

### Verification (Priority 3)
7. **Manual test** - Verify fix works end-to-end
8. **Check other languages** - Ensure no language auto-detection
9. **Document solution** - Update ADRs if needed

## Contact Points

### Deployments
- **Render**: https://dashboard.render.com (server auto-deploys on git push)
- **Vercel**: https://vercel.com/dashboard (client auto-deploys on git push)
- **GitHub**: https://github.com/mikeyoung304/July25

### Monitoring
- **Server Health**: https://july25.onrender.com/api/v1/realtime/health
- **Client**: https://july25-client.vercel.app/kiosk-demo

---

## TL;DR for AI Agent

**PROBLEM**: Voice ordering responds in wrong language and doesn't transcribe

**LIKELY CAUSE**:
1. Language not specified in AI instructions
2. `input_audio_transcription` config missing or wrong
3. Transcription events not handled properly

**FIRST STEPS**:
1. Read `client/src/modules/voice/services/VoiceSessionConfig.ts:199-280`
2. Check if `language: 'en'` is in `input_audio_transcription`
3. Check if instructions explicitly mention English
4. Use puppeteer to test live and capture console

**FILES TO CHECK**:
- `VoiceSessionConfig.ts` (instructions + config)
- `VoiceEventHandler.ts` (event processing)
- `WebRTCVoiceClient.ts` (session setup)

**TEST**:
```bash
curl -X POST https://july25.onrender.com/api/v1/realtime/session \
  -H 'x-restaurant-id: grow' | jq -r '.instructions'
```

**STATUS**: Server working ✅ | Client deployed ✅ | New language issue ⚠️
