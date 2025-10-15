# Deployment Guide

## Environments & Secrets

**Required:**
- `KIOSK_JWT_SECRET` (no fallback; server fails fast if unset)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL` (prod), `ALLOWED_ORIGINS` (CSV)

**Optional (non-prod only):**
- `DEMO_LOGIN_ENABLED=true` to enable `/api/v1/auth/demo-session`

## CORS (Production)
- Origin must match `FRONTEND_URL` or be in `ALLOWED_ORIGINS`.
- Requests from unlisted origins are rejected (403).

## WebSocket (Production)
- JWT required for connection; anonymous or dev bypass is disabled in prod.

## Release Flow
1. **Staging:** apply DB migrations; run unit + e2e; artifact audit (no secrets).
2. **RC:** tag `v6.0.8-rc.1`.
3. **Canary:** 5–10% traffic for 60–120m; monitor 5xx, WS reconnect churn, login errors, KDS lag/dups.
4. **Rollout:** 100% if green; otherwise revert last PR or rollback to previous tag.

## Rollback (App)
- Revert merge of last change-set PR; deploy previous image `vX.Y.Z`.

## Rollback (DB)
- Keep hot-patch SQL scripts to relax/reapply RLS or constraints temporarily (see [DATABASE.md](./DATABASE.md)).

## Post-Deploy Checks
- WS reconnects/min < 0.2; KDS e2e happy path under 1s (P95); no CORS rejections from allowed domains.
