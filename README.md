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
- Deploy: [DEPLOYMENT](./DEPLOYMENT.md) · Security: [SECURITY](./SECURITY.md) · DB: [DATABASE](./DATABASE.md)
- Troubleshoot: [TROUBLESHOOTING](./TROUBLESHOOTING.md) · Version: [VERSION](./VERSION.md)

## Quickstart (local)
```bash
pnpm i
pnpm -w dev
```

## Environments
Prod: CORS allowlist enforced; WebSocket requires valid JWT; KIOSK_JWT_SECRET must be set (no fallback).

Non-prod demo (optional): /api/v1/auth/demo-session enabled only with DEMO_LOGIN_ENABLED=true.

## Canary Release
Tag v6.0.8-rc.1 → canary 5–10% for 60–120m → monitor → roll 100% or revert.

## License
MIT
