# Voice Ordering — Moved to Canonical Documentation

**Last Updated:** 2025-01-23

**This file has been merged into canonical documentation.**

## Voice Authentication & WebRTC

For WebRTC voice streaming, authentication, and technical implementation, see:
→ **[AUTHENTICATION_ARCHITECTURE.md#voice--webrtc-auth-and-websocket-jwt](../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md#voice--webrtc-auth-and-websocket-jwt)**

**Updated October 2024** with new modular architecture, and **January 2025** with Phase 1-3 remediation (unification, stabilization, standardization):
- WebRTCVoiceClient (Orchestrator) - 396 lines (down from 1,312)
- VoiceSessionConfig - Session configuration and token management (31 tests)
- WebRTCConnection - WebRTC connection lifecycle (43 tests, 6 memory leak tests)
- VoiceEventHandler - Process realtime API events (44 tests)
- **155 total tests** (37 regression + 118 unit)

## Voice Ordering Vision & Roadmap

For future enhancements and voice ordering vision, see:
→ **[ROADMAP.md - Voice Ordering Vision](../ROADMAP.md#voice-ordering-vision)**

## Original Content

Archived at: `docs/archive/2025-10/2025-10-15_voice_VOICE_ORDERING_EXPLAINED.md`

---

**Last Updated**: 2025-01-23
**Status**: Merged (see canonical locations above)
