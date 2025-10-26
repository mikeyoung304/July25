# Grow App (Restaurant OS) — v6.0.8

[![CI](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml)
[![Docs CI](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml)

**Status:** 65-70% Complete - 73% Test Pass Rate - 2 Critical Blockers
**Client:** React 18.3.1 · **Server:** Node 20 · **DB:** Postgres (Supabase) · **Realtime:** WebSockets

**For accurate project status, see [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md)**

## Test Health (Current Reality)
- **Pass Rate:** 73% (22/30 passing)
- **Critical Blockers:** 2 (JSDOM environment, Vitest config issues)
- **Known Issues:** 8 failing tests (4 in quarantine, 4 active failures)
- **Status Details:** See [TEST_HEALTH_DASHBOARD.md](./TEST_HEALTH_DASHBOARD.md)

## Recent Progress (v6.0.8)
- **Security hardening:** single JWT secret (fail-fast), strict CORS allowlist, PII-redacted logs, no client-bundled secrets
- **Realtime stability:** KDS single-connection guard, proper effect cleanup, reconnect `finally` guard
- **Multi-tenancy:** app-layer `.eq('restaurant_id', ...)` on mutations **and** DB RLS + indexes; per-restaurant PIN model
- **Performance:** 40x improvement on batch table updates (1000ms → 25ms), ElapsedTimer fix
- **Code Quality:** FloorPlanEditor refactored from 940 → 225 lines (76% reduction)

## Docs
- Start here: [Documentation Index](./index.md)
- Deploy: [DEPLOYMENT](./docs/DEPLOYMENT.md) · Security: [SECURITY](./docs/SECURITY.md) · DB: [DATABASE](./docs/DATABASE.md)
- Payments: [Square API Setup](./SQUARE_API_SETUP.md) · Env Vars: [ENVIRONMENT](./docs/ENVIRONMENT.md)
- Troubleshoot: [TROUBLESHOOTING](./docs/TROUBLESHOOTING.md) · Version: [VERSION](./docs/VERSION.md)

## Auth Roles at a Glance

**Public Orders:** `customer` role (self-service checkout, kiosk)
**Staff Orders:** `server` role (ServerView, voice ordering)
**Deprecated:** `kiosk_demo` is a temporary alias for `customer` (controlled by env flag)

→ See [AUTHENTICATION_ARCHITECTURE.md](./docs/AUTHENTICATION_ARCHITECTURE.md) for complete auth flows
→ See [POST_DUAL_AUTH_ROLL_OUT.md](./docs/runbooks/POST_DUAL_AUTH_ROLL_OUT.md) for deployment runbook

## Quickstart (local)
```bash
npm install
npm run dev
```

## Environments
Prod: CORS allowlist enforced; WebSocket requires valid JWT; KIOSK_JWT_SECRET must be set (no fallback).

Non-prod demo (optional): /api/v1/auth/demo-session enabled only with DEMO_LOGIN_ENABLED=true.

## Development Status
**Not production ready** - 2 critical blockers must be resolved before deployment.
See [SOURCE_OF_TRUTH.md](./SOURCE_OF_TRUTH.md) for complete status and blocker details.

## License
MIT
