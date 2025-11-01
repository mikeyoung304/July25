# Grow App (Restaurant OS) — v6.0.14


**Last Updated:** 2025-11-01

[![CI](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml)
[![Docs CI](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml)

**Status:** 90% Production Ready - 85%+ Test Pass Rate - All Critical Blockers Resolved ✅
**Client:** React 18.3.1 · **Server:** Node 20 · **DB:** Postgres (Supabase) · **Realtime:** WebSockets

**For accurate project status, see [SOURCE_OF_TRUTH.md](./docs/meta/SOURCE_OF_TRUTH.md)**
**For complete version history, see [VERSION.md](./docs/VERSION.md)**

## Test Health (Phase 2 Complete - Oct 27, 2025) ✅
- **Pass Rate:** ~85%+ (365+ tests passing, up from 73%)
- **Quarantined:** 2 tests remaining (down from 137!)
- **Phase 2 Success:** 98.5% (restored 135 of 137 quarantined tests)
- **Production Readiness:** Improved from 65-70% to 90%
- **Status Details:** See [SOURCE_OF_TRUTH.md](./docs/meta/SOURCE_OF_TRUTH.md)

## Recent Progress (v6.0.14)
- **Test Coverage:** Added 155 new tests (37 regression + 118 unit tests) for voice orders, auth, and workspace
- **Code Quality:** 70% reduction in WebRTCVoiceClient complexity (1,312 → 396 lines)
- **Service Extraction:** 3 new focused services (AudioStreaming, MenuIntegration, VoiceOrderProcessor)
- **Voice Ordering:** Hybrid AI parsing with OpenAI fallback, menu API fixes
- **Security hardening:** single JWT secret (fail-fast), strict CORS allowlist, PII-redacted logs
- **Performance:** 40x improvement on batch table updates (1000ms → 25ms)

## Docs
- Start here: [Documentation Index](./index.md)
- Deploy: [DEPLOYMENT](./docs/how-to/operations/DEPLOYMENT.md) · Security: [SECURITY](./docs/SECURITY.md) · DB: [DATABASE](./docs/reference/schema/DATABASE.md)
- Payments: [Square API Setup](./docs/reference/api/api/SQUARE_API_SETUP.md) · Env Vars: [ENVIRONMENT](./docs/reference/config/ENVIRONMENT.md)
- Troubleshoot: [TROUBLESHOOTING](./docs/how-to/troubleshooting/TROUBLESHOOTING.md) · Version: [VERSION](./docs/VERSION.md)

## Auth Roles at a Glance

**Public Orders:** `customer` role (self-service checkout, kiosk)
**Staff Orders:** `server` role (ServerView, voice ordering)
**Deprecated:** `kiosk_demo` is a temporary alias for `customer` (controlled by env flag)

→ See [AUTHENTICATION_ARCHITECTURE.md](./docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) for complete auth flows
→ See [POST_DUAL_AUTH_ROLL_OUT.md](./docs/how-to/operations/runbooks/POST_DUAL_AUTH_ROLL_OUT.md) for deployment runbook

## Quickstart (local)
```bash
npm install
npm run dev
```

## Environments
Prod: CORS allowlist enforced; WebSocket requires valid JWT; KIOSK_JWT_SECRET must be set (no fallback).

Non-prod demo (optional): /api/v1/auth/demo-session enabled only with DEMO_LOGIN_ENABLED=true.

## Development Status
**90% Production Ready** - All critical blockers resolved ✅
- Menu loading fixed (HTTP 500 → HTTP 200)
- Phase 2 test restoration complete (98.5% success rate)
- Payment system configured with demo mode
- Only 2 minor test edge cases remaining
See [SOURCE_OF_TRUTH.md](./docs/meta/SOURCE_OF_TRUTH.md) for complete status and details.

## License
MIT
