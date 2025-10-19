# Grow App (Restaurant OS) — v6.0.8-rc.1

[![CI](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml)
[![Docs CI](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml)

**Status:** Launch-ready (canary, then full roll)
**Client:** React 19 · **Server:** Node 20 · **DB:** Postgres (Supabase) · **Realtime:** WebSockets

## Highlights (v6.0.8)
- **Security hardening:** single JWT secret (fail-fast), strict CORS allowlist, PII-redacted logs, no client-bundled secrets.
- **Realtime stability:** KDS single-connection guard, proper effect cleanup, reconnect `finally` guard.
- **Multi-tenancy:** app-layer `.eq('restaurant_id', ...)` on mutations **and** DB RLS + indexes; per-restaurant PIN model.
- **Tests:** unit + KDS e2e (thrash + nav-churn scenarios); artifact audit script (no secrets in dist).

## Docs
- Start here: [Documentation Index](./index.md)
- Deploy: [DEPLOYMENT](./docs/DEPLOYMENT.md) · Security: [SECURITY](./docs/SECURITY.md) · DB: [DATABASE](./docs/DATABASE.md)
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

## Canary Release
Tag v6.0.8-rc.1 → canary 5–10% for 60–120m → monitor → roll 100% or revert.

## License
MIT
