# Grow App (Restaurant OS) — v6.0.17


**Last Updated:** 2025-11-25

[![CI](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml)
[![Docs CI](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/docs-ci.yml)

**Status:** 99% Production Ready - 99.8% Test Pass Rate - Stripe Payments Active ✅
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
- Payments: [Stripe API Setup](./docs/reference/api/api/STRIPE_API_SETUP.md) · Env Vars: [ENVIRONMENT](./docs/reference/config/ENVIRONMENT.md)
- Troubleshoot: [TROUBLESHOOTING](./docs/how-to/troubleshooting/TROUBLESHOOTING.md) · Version: [VERSION](./docs/VERSION.md)
- **Debugging:** [Claude Lessons v3](./claude-lessons3/) · [Debugging Protocols](./claude-lessons3/00-debugging-protocols/) (systematic methodologies for unknown issues)

## Database Architecture: Remote-First Approach

**Key Principle:** The remote Supabase database is the single source of truth for schema state.

**What This Means:**
- Migration files document change HISTORY, not current state
- Prisma schema is GENERATED from remote database via `npx prisma db pull`
- Schema changes flow: Remote DB → Prisma Schema → TypeScript Types → Git

**Workflow:**
1. Create migration: `supabase/migrations/YYYYMMDDHHmmss_description.sql`
2. Deploy to remote: `supabase db push --linked`
3. Sync Prisma schema: `./scripts/post-migration-sync.sh`
4. Commit both migration + updated schema

**Why Remote-First:**
- Production database is always authoritative
- Prevents drift from manual Dashboard changes
- TypeScript types always match production reality

See: [SUPABASE_CONNECTION_GUIDE.md](./docs/SUPABASE_CONNECTION_GUIDE.md) for detailed workflow

## Auth Roles at a Glance

**Public Orders:** `customer` role (self-service checkout, kiosk)
**Staff Orders:** `server` role (ServerView, voice ordering)
**Deprecated:** `kiosk_demo` is a temporary alias for `customer` (controlled by env flag)

→ See [AUTHENTICATION_ARCHITECTURE.md](./docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) for complete auth flows
→ See [POST_DUAL_AUTH_ROLL_OUT.md](./docs/how-to/operations/runbooks/POST_DUAL_AUTH_ROLL_OUT.md) for deployment runbook

## 🚨 DEPLOYMENT CHECKLIST (CRITICAL)

**NEVER deploy from subdirectories!** This creates duplicate Vercel projects.

Before EVERY deployment:
- [ ] You are in repository root (`pwd` shows `/rebuild-6.0`)
- [ ] No `.vercel` directories in subdirectories
- [ ] All changes committed (`git status` clean)
- [ ] Tests passing (`npm run test:quick`)
- [ ] Build succeeds (`npm run build:client`)

**Deploy command (from root only):**
```bash
npm run deploy  # NEVER use 'vercel --yes' directly!
```

See [DEPLOYMENT_BEST_PRACTICES.md](./docs/DEPLOYMENT_BEST_PRACTICES.md) for details.

## Quickstart (local)
```bash
npm install
npm run dev
```

## Environments
Prod: CORS allowlist enforced; WebSocket requires valid JWT; KIOSK_JWT_SECRET must be set (no fallback).

Non-prod demo (optional): /api/v1/auth/demo-session enabled only with DEMO_LOGIN_ENABLED=true.

## Development Status
**99% Production Ready** - Stripe payments active, fall menu deployed ✅
- Stripe payment integration complete (migrated from Square)
- Fall menu deployed and operational
- Voice ordering with gpt-4o-transcribe model
- 99.8% test pass rate (430/431 tests passing)
See [SOURCE_OF_TRUTH.md](./docs/meta/SOURCE_OF_TRUTH.md) for complete status and details.

## License
MIT
# Test: branch protection fix - Tue Nov 18 13:54:36 EST 2025

