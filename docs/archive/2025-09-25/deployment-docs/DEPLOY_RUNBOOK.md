# Deploy Runbook - July25 Monorepo

## Overview
This runbook documents the deployment process for the July25 monorepo, which uses:
- **Frontend**: Vercel (client-only, SPA)
- **Backend**: Render (server, API)
- **Database**: Supabase

## Prerequisites
- Vercel CLI installed (`npm i -g vercel`)
- Authenticated with Vercel (`vercel whoami`)
- Project linked (`.vercel/project.json` exists)
- Clean git working directory

## Environment Variables Policy

### Client Variables (Vercel)
Only `VITE_*` prefixed variables should be on Vercel:
- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SQUARE_*` (payment variables)
- Other feature flags (`VITE_USE_MOCK_DATA`, etc.)

### Server Variables (Render)
All sensitive server secrets must stay on Render:
- `OPENAI_API_KEY`
- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `SESSION_SECRET`
- Any other non-VITE secrets

## Deployment Workflows

### 1. Preview Deployment (Feature Branches)
For testing changes before merging to main:

```bash
# Ensure you're in the project root
cd /path/to/july25-client

# Run the preview deployment script
./scripts/deploy-preview.sh
```

The script will:
1. Verify project linkage
2. Set `ROLLUP_NO_NATIVE=1` to avoid build issues
3. Deploy to a preview URL
4. Output the preview URL for testing

### 2. Production Deployment (Main Branch)
⚠️ **Only deploy to production after:**
- All CI checks pass
- Code review approved
- Preview deployment tested

```bash
# Ensure you're on main branch with latest changes
git checkout main
git pull origin main

# Deploy to production
ROLLUP_NO_NATIVE=1 vercel --prod
```

### 3. Manual Setup (First Time)
If the project isn't linked yet:

```bash
# Link the Vercel project
vercel link --project july25-client --yes

# Verify linkage
ls -la .vercel/project.json

# Check environment variables
vercel env ls
```

## Troubleshooting

### Build Fails with Rollup Error
Always use `ROLLUP_NO_NATIVE=1`:
```bash
ROLLUP_NO_NATIVE=1 vercel
```

### Environment Variables Not Loading
1. Check they exist on Vercel: `vercel env ls`
2. Pull them locally: `vercel env pull`
3. Ensure they're VITE_* prefixed for client

### Wrong Project Linked
1. Remove link: `rm -rf .vercel/`
2. Re-link: `vercel link --project july25-client --yes`

### Deployment Stuck
1. Check build logs: `vercel logs [deployment-url]`
2. Check Vercel dashboard for errors
3. Ensure no server code is being built

## Rollback Procedure

### Quick Rollback
```bash
# List recent deployments
vercel ls

# Promote a previous deployment to production
vercel promote [deployment-url]
```

### Full Rollback
1. Delete `.vercel/project.json`
2. Remove `scripts/deploy-preview.sh`
3. Revert to manual deployment process
4. Document issues for resolution

## Security Checklist
- [ ] No server secrets in client code
- [ ] All VITE_* vars are safe for public exposure
- [ ] No .env files committed to git
- [ ] Server API keys remain on Render only
- [ ] Build logs don't expose secrets

## Monitoring
After deployment:
1. Check preview/production URL loads
2. Verify API connection (`VITE_API_BASE_URL`)
3. Test critical user flows
4. Monitor browser console for errors
5. Check Vercel Functions logs (if any)

## Support
- Vercel Dashboard: https://vercel.com/mikeyoung304-gmailcoms-projects/july25-client
- Render Dashboard: [Add your Render URL]
- Team Contact: [Add team contact]

---
Last Updated: 2025-09-24
Version: 1.0.0