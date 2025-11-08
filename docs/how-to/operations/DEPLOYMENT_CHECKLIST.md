# Production Deployment Checklist

**Last Updated:** 2025-10-31

Use this checklist for every production deployment to ensure nothing is missed.

## Pre-Deployment

- [ ] All tests passing: `npm run test:quick --workspaces`
- [ ] Type check passing: `npm run typecheck --workspaces`
- [ ] Local build succeeds: `npm run build`
- [ ] No ESLint errors: `npm run lint --workspaces`

## Database Changes (if applicable)

### Local Testing (REQUIRED)
- [ ] Migrations created with timestamp naming: `YYYYMMDDHHMMSS_verb_object.sql`
- [ ] SQL uses idempotent patterns (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- [ ] **Local testing completed:** `./scripts/deploy-migration.sh supabase/migrations/XXXXX_*.sql`
- [ ] Verify no errors in console output
- [ ] Schema changes verified locally: Query database to confirm expected changes
- [ ] (If applicable) Rollback plan tested locally

### Cloud Deployment
- [ ] **Migrations deployed to Supabase cloud:** Push to main → CI/CD auto-deploys
- [ ] **Deployment verified:** `supabase db diff --linked` shows no changes
- [ ] Prisma schema synced: `./scripts/post-migration-sync.sh` (or verify CI/CD ran it)
- [ ] Migration file committed to git
- [ ] CHANGELOG.md updated with migration details
- [ ] Rollback plan documented (if needed)

## Code Changes

- [ ] Code committed to git with conventional commits format
- [ ] Branch pushed to GitHub: `git push origin main`
- [ ] GitHub Actions passing (check Actions tab)
- [ ] Vercel deployment triggered (check Vercel dashboard)
- [ ] Render deployment triggered (check Render dashboard)

## Post-Deployment Verification

- [ ] Vercel build succeeded
- [ ] Render build succeeded
- [ ] Production site loads: https://your-vercel-url.vercel.app
- [ ] API health check passes: https://your-render-url.com/health
- [ ] Critical user flows tested:
  - [ ] Order submission (ServerView)
  - [ ] Order creation (Checkout)
  - [ ] KDS real-time updates
  - [ ] Payment processing (if changed)
- [ ] No console errors in production
- [ ] WebSocket connection stable
- [ ] Database queries performant

## Rollback Plan (if issues found)

- [ ] Documented in CHANGELOG.md or post-mortem
- [ ] Can revert code: `git revert [commit-hash]`
- [ ] Can rollback migrations: Create rollback migration file
- [ ] Team notified of rollback procedure

## Documentation

- [ ] CHANGELOG.md updated with version and changes
- [ ] README.md updated (if workflow changed)
- [ ] Post-mortem created (if incident occurred)
- [ ] Deployment timestamp recorded

---

**Last Updated:** 2025-10-21
**See also:** [DEPLOYMENT.md](./DEPLOYMENT.md), [SUPABASE_CONNECTION_GUIDE.md](../../SUPABASE_CONNECTION_GUIDE.md)
