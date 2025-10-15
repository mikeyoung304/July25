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

## Provider Specifics (Vercel)

### URLs
- **Production:** https://july25-client.vercel.app
- **Backend API:** https://july25.onrender.com
- **Preview:** Auto-generated per PR/branch

### Client Environment Variables (Vercel Dashboard)
- `VITE_API_BASE_URL` = https://july25.onrender.com
- `VITE_SUPABASE_URL` = [Your Supabase URL]
- `VITE_SUPABASE_ANON_KEY` = [Your Supabase anon key]
- `VITE_DEFAULT_RESTAURANT_ID` = 11111111-1111-1111-1111-111111111111
- `VITE_DEMO_PANEL` = 1 (optional, non-prod only)

### Build Configuration
- **Framework preset:** Vite + React
- **Build output:** client/dist
- **Node version:** 20.x
- **Build flag:** `ROLLUP_NO_NATIVE=1` (required to prevent native module errors)
- **Monorepo:** Deploy from repository root only; never from `/client`, `/server`, or `/shared`

### Deployment Commands
```bash
npm run deploy              # Safe production deployment with checks
vercel link --project july25-client --yes  # Link to correct project
vercel ls                   # List deployments
vercel rollback [url]       # Emergency rollback
```

### Project IDs (reference)
- Project: `prj_iG6YRjjsMePUoGPmzZxnKUwYfH0n`
- Org: `team_OesWPwxqmdOsNGDnz0RqS4kA`

### Common Issues
- **Blank page post-deploy:** Check env vars set in Vercel Dashboard; verify backend at july25.onrender.com/health
- **Multiple projects in dashboard:** Delete duplicates; remove `.vercel` from subdirectories; always deploy from root
- **Build fails (Rollup):** Ensure `ROLLUP_NO_NATIVE=1` is set in build command
