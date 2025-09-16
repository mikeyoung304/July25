# Voice System Documentation Snapshot
**Date**: 2025-09-15
**Branch**: hardening/voice-session-guard-20250915

## 1. VOICE_SYSTEM_CURRENT.md (v0.5, last verified: 2025-09-15)

### Key Points
- Single implementation: WebRTC + OpenAI Realtime API
- Employee mode: `visualFeedbackOnly: true`, no TTS
- Customer mode: Full TTS enabled
- SessionConfigNormalizer clamps temperature to 0.6-2.0 range
- Payment integration complete with one-time token validation
- Browser constraints: ESM-only, no require() or eval()

### Current Defaults
- Employee temperature: 0.7
- Customer temperature: 0.85
- Temperature range: 0.6-2.0 (OpenAI limits)

## 2. BASELINE_REALITY.md (v0.3, last verified: 2025-09-15)

### Architecture
- Frontend: React 19.1.0, Vite 5.4.19, port 5173
- Backend: Express 4.18.2, unified port 3001
- Auth: Supabase JWT (RS256) + local PIN/kiosk (HS256)
- Real-time: WebRTC via OpenAI + WebSocket for orders

### Voice Modes
- Employee: No TTS, direct to kitchen with staff role
- Customer: Full TTS, payment token required
- Browser limitations: ESM-only, no dynamic imports
- Session normalization ensures API compliance

## 3. TROUBLESHOOTING.md

### Critical Fix (2025-09-09)
- React hooks dependency issue causing client recreation
- Solution: Stable callbacks via refs
- Prevention: Minimal useEffect dependencies
- Monitor for excessive cleanup messages

## 4. VOICE_ORDER_FLOW_FIX.md

### Event Chain (Fixed 2025-09-10)
1. OpenAI calls `confirm_order`
2. WebRTCVoiceClient emits `order.confirmation`
3. useWebRTCVoice hook listens and forwards
4. VoiceControlWebRTC passes to parent
5. VoiceOrderingMode submits order

### Critical Pattern
- Use stable callbacks with useCallback
- Refs for event handlers
- Complete event chains

## 5. VOICE_ORDERING_EXPLAINED.md

### Technical Stack
- WebRTC for real-time audio (200ms latency)
- PCM16 audio format
- Whisper for transcription
- GPT-4 for understanding
- Ephemeral 60-second tokens

### Components
- VoiceControlWebRTC: UI component
- WebRTCVoiceClient: Core service (1,264 lines)
- Realtime routes: Token generation

## 6. VOICE_SERVER_MODE_VERIFICATION.md

### Payment Flow (Phase 1 Complete)
1. Create order via POST /api/v1/orders
2. Initiate Square Terminal checkout
3. Update order status to 'confirmed'

### Known Limitations
- Cart context bypass
- Manual device configuration
- No real-time payment status

## 7. Live Files Summary

### Core Implementation Files
- Client service: `client/src/modules/voice/services/WebRTCVoiceClient.ts`
- Client hook: `client/src/modules/voice/hooks/useWebRTCVoice.ts`
- UI component: `client/src/modules/voice/components/VoiceControlWebRTC.tsx`
- Server routes: `server/src/routes/realtime.routes.ts`

### Key Security Features
- RealtimeGuards module for safe event parsing
- SessionConfigNormalizer for parameter validation
- Event whitelist approach
- No dynamic code execution

### Current Issues to Address
- No server-side session normalizer (client-only)
- No env/venue overrides for defaults
- Limited reconnection handling
- Missing mic error recovery
- No observability/metrics
- No CI guards against require() in client

This snapshot represents the baseline state before implementing Phase 2 hardening improvements.