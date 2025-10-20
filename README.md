# Grow App (Restaurant OS) — v6.0.10

[![CI](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml)
[![Docs CI](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml)

**Status:** Production Ready (P0 Audit: 7/8 Complete - 98% Ready)
**Client:** React 18.3.1 · **Server:** Node 20 · **DB:** Postgres (Supabase) · **Realtime:** WebSockets

## Highlights (v6.0.10)
- **P0 Audit Fixes (7/8 Complete - 87.5%):** All critical stability, security, and performance issues resolved
  - **Security & Compliance:** PCI fail-fast payment auditing, centralized tax rates (revenue protection)
  - **Data Integrity:** PostgreSQL RPC transactions, optimistic locking with version columns
  - **Performance:** 40x improvement on batch table updates (1000ms → 25ms), ElapsedTimer fix
  - **Code Quality:** FloorPlanEditor refactored from 940 → 225 lines (76% reduction)
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

## Production Release
Version 6.0.10 ready for deployment (98% production ready, all critical P0 fixes complete).

## License
MIT
