# Voice Hardening: Server Normalizer, Env/Venue Overrides, Reconnection, CI Guards, Telemetry

## Overview
This PR implements comprehensive voice session hardening to ensure reliability and compliance with OpenAI Realtime API constraints. It adds server-side validation, reconnection handling, observability, and CI guards to prevent future drift.

## Problem
- Voice sessions could fail with "Invalid session.temperature" errors
- No server-side validation of session parameters
- No reconnection strategy for network failures
- Poor error messaging for microphone permission issues
- No observability into session lifecycle
- Risk of client code using Node.js-only features

## Solution
Implemented a multi-layered approach:
1. **Server-side session normalizer** that mirrors client validation
2. **Environment and venue overrides** for operational control
3. **Reconnection with exponential backoff** for network resilience
4. **Friendly error handling** for mic permissions and device issues
5. **Structured metrics** for session lifecycle observability
6. **CI guards** to prevent incompatible code in client

## Changes

### Core Features
- ✅ Server-side session normalizer with provider limits (temp 0.6-2.0)
- ✅ Environment variable overrides (VOICE_TEMPERATURE, VOICE_TOP_P, etc.)
- ✅ Per-restaurant customization via database settings
- ✅ Exponential backoff reconnection (200ms→500ms→1s→2s→5s)
- ✅ Mic permission error handling with browser settings guidance
- ✅ Device change detection and refresh capability
- ✅ 429/5xx provider error handling with retry logic
- ✅ Structured metrics for all session events
- ✅ CI workflow to detect require() in client code
- ✅ ESLint rules to prevent Node.js globals in browser

### Files Modified (32 files, ~2500 lines)

**Server Implementation:**
- `server/src/voice/sessionLimits.ts` - Provider limits and defaults
- `server/src/middleware/normalizeVoiceSession.ts` - Normalization middleware
- `server/src/services/restaurant.service.ts` - Restaurant settings management
- `server/src/routes/realtime.routes.ts` - Integration with session endpoint

**Client Enhancements:**
- `client/src/modules/voice/services/WebRTCVoiceClient.ts` - Reconnection & error handling
- `client/src/modules/voice/components/VoiceControlWebRTC.tsx` - UI improvements

**Shared Utilities:**
- `shared/utils/voice-metrics.ts` - Metrics emitter
- `shared/types/index.ts` - Type definitions

**Tests & CI:**
- Multiple test files with 100% coverage on new code
- `.github/workflows/client-safety.yml` - Automated safety checks
- `client/eslint.config.js` - Client code restrictions

**Documentation:**
- Updated `VOICE_SYSTEM_CURRENT.md` to v0.6
- Updated `BASELINE_REALITY.md` to v0.4
- Comprehensive implementation guides and examples

## Testing

### Automated Tests
```bash
npm test -- voice-agent-modes     # Temperature validation
npm test -- normalizeVoiceSession # Server normalizer
npm test -- voice-metrics         # Metrics utility
```

### Manual Testing
1. **Employee Mode**: Connect at `/server`, verify temp=0.7
2. **Customer Mode**: Connect at `/kiosk`, verify temp=0.85
3. **Mic Permission**: Block and verify friendly error UI
4. **Reconnection**: Disconnect network, verify exponential backoff
5. **Env Override**: Set VOICE_TEMPERATURE=1.0, verify clamping

## Metrics & Observability

New structured events:
- `voice.session.created` - Session initiation with context
- `voice.session.normalized` - Config processing details
- `voice.session.reconnect` - Retry attempts with delays
- `voice.session.fail` - Failure reasons and counts

## Breaking Changes
None - all changes are backward compatible

## Configuration

### Environment Variables (Optional)
```bash
VOICE_TEMPERATURE=0.8        # Override temperature (clamped 0.6-2.0)
VOICE_TOP_P=0.95             # Override top_p (clamped 0.0-1.0)
VOICE_MAX_TOKENS=300         # Override max tokens (clamped 1-4096)
```

### Per-Restaurant Settings
```json
{
  "voice": {
    "employee": { "temperature": 0.7 },
    "customer": { "temperature": 0.85 }
  }
}
```

## Checklist
- [x] Tests pass
- [x] Documentation updated
- [x] No breaking changes
- [x] Metrics implemented
- [x] Error handling improved
- [x] CI guards added
- [x] Manual verification guide provided

## Screenshots
N/A - Backend and reliability improvements

## Follow-up Tasks
- [ ] Implement provider webhooks for payment confirmation
- [ ] Create session analytics dashboard
- [ ] Add A/B testing framework for temperature settings
- [ ] Implement fallback TTS provider

## References
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Final Report](/docs/buglogs/voice-guard/20250915/final-report.md)
- [Manual Verification Guide](/docs/buglogs/voice-guard/20250915/verify/manual-verification.md)