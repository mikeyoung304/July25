# 🚀 July25 Deployment Guide

## Quick Deploy

```bash
vercel deploy --prod
```

## Prerequisites

1. **Vercel CLI installed**: `npm i -g vercel`
2. **Authenticated**: `vercel login`
3. **Project linked**: `vercel link --project rebuild-6.0`

## Architecture

- **Monorepo Structure**: Root deployment builds all workspaces
- **Client**: React + Vite (client/)
- **Server**: Deployed to Render separately
- **Shared**: Built as dependency first

## Configuration

- **Config File**: `/vercel.json` at repository root
- **Build Output**: `client/dist`
- **Node Version**: 22.x
- **Framework**: Vite

## Production URLs

- **Main**: https://rebuild-60.vercel.app
- **Preview**: https://rebuild-60-*.vercel.app

## Environment Variables

Required in Vercel Dashboard:
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

⚠️ **Never add server secrets to Vercel** (OPENAI_API_KEY, etc.)

## Deployment Commands

### One-Time Setup
```bash
# Navigate to project root
cd /Users/mikeyoung/CODING/rebuild-6.0

# Link to Vercel project
vercel link --yes --project rebuild-6.0

# Pull environment variables
vercel pull --yes --environment production
```

### Regular Deployments
```bash
# Production deployment
vercel deploy --prod

# Preview deployment
vercel deploy
```

### Rollback if Needed
```bash
# List recent deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

## Build Process

The build command in vercel.json:
```bash
ROLLUP_NO_NATIVE=1 npm run build --workspace shared &&
ROLLUP_NO_NATIVE=1 npm run build --workspace client
```

This ensures:
1. Shared types/utils build first
2. Client builds with shared dependencies
3. Rollup native modules disabled for Vercel

## Troubleshooting

### Build Failures
- **Issue**: Rollup native module error
- **Fix**: Ensure `ROLLUP_NO_NATIVE=1` is set

### 404 Errors
- **Issue**: SPA routes not working
- **Fix**: Check `rewrites` in vercel.json

### Missing Env Variables
- **Issue**: API calls failing
- **Fix**: Run `vercel env pull` to sync

### Wrong Project Deployed
- **Issue**: Multiple Vercel projects linked
- **Fix**: Re-link with `vercel link --project rebuild-6.0`

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '22'
      - run: npm ci
      - run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Monitoring

### Check Deployment Status
```bash
vercel inspect [deployment-url]
```

### View Logs
```bash
vercel logs [deployment-url]
```

### Performance Metrics
- Check Vercel Analytics dashboard
- Monitor Core Web Vitals
- Set up alerts for errors

## Security Notes

1. ✅ Client only receives public environment variables (VITE_*)
2. ✅ Server API keys stay on Render backend
3. ✅ Use Vercel's built-in DDoS protection
4. ✅ Enable Vercel Web Application Firewall (WAF)

## Team Access

### Add Team Member
```bash
vercel teams invite [email]
```

### Switch Between Projects
```bash
vercel switch
```

## Best Practices

1. **Always deploy from main branch** for production
2. **Test preview deployments first** before production
3. **Monitor error rates** after deployment
4. **Keep vercel.json in sync** with build requirements
5. **Document environment changes** in this file

## Support

- **Vercel Status**: https://vercel-status.com
- **Documentation**: https://vercel.com/docs
- **Support**: https://vercel.com/support

---

Last Updated: 2025-09-23
Maintained by: July25 Engineering Team