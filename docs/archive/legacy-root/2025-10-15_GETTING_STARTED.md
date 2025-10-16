# Getting Started (Local Dev)

## Prereqs
- Node 20, pnpm, Postgres or Supabase project

## Setup
```bash
pnpm i
cp .env.example .env.local   # fill in SUPABASE_URL and keys (non-prod)
pnpm -w dev
```

## Login flows
Owner/Staff: email/password via Supabase → JWT → app.

PIN login: per-restaurant PIN issues a tenant-scoped JWT (shared devices).

Demo session: non-prod only, via /api/v1/auth/demo-session when DEMO_LOGIN_ENABLED=true.

## Realtime (WS) in dev
WebSocket auth may allow relaxed rules locally; prod always requires JWT.

## Where to next
- Documentation Index
- Deployment
- Security
- Database & RLS
