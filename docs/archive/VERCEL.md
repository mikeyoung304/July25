# Vercel Deployment Guide

**Project**: july25-client
**URL**: https://july25-client.vercel.app
**Last Updated**: 2025-09-25

## ⚠️ CRITICAL: Read This First

**The #1 cause of Vercel problems**: Running `vercel` from the wrong directory creates duplicate projects.

**ALWAYS deploy from the repository root directory.**
**NEVER deploy from `/client`, `/server`, or `/shared` directories.**

## Quick Deploy

```bash
# From repository root ONLY
npm run deploy
```

That's it. This command handles everything safely.

## Initial Setup (One Time Only)

```bash
# 1. Install Vercel CLI globally
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Navigate to repository root
cd /Users/mikeyoung/CODING/rebuild-6.0

# 4. Link to the correct project
vercel link --project july25-client --yes

# 5. Verify link is correct
npm run vercel:check
```

## Environment Variables

Set these in Vercel Dashboard (Settings → Environment Variables):

| Variable | Production Value |
| --- | --- |
| VITE_API_BASE_URL | https://july25.onrender.com |
| VITE_SUPABASE_URL | [Your Supabase URL] |
| VITE_SUPABASE_ANON_KEY | [Your Supabase Key] |
| VITE_DEFAULT_RESTAURANT_ID | 11111111-1111-1111-1111-111111111111 |
| VITE_DEMO_PANEL | 1 (if demo panel needed) |

## Available Commands

```bash
npm run deploy          # Production deployment (safe, with checks)
npm run vercel:check    # Verify correct project is linked
npm run vercel:link     # Re-link to july25-client if needed
```

## Project Structure

```
rebuild-6.0/
├── .vercel/           # ✅ ONLY .vercel directory should be here
│   └── project.json   # Must point to july25-client
├── vercel.json        # Vercel configuration
├── client/            # ❌ NO .vercel directory here
├── server/            # ❌ NO .vercel directory here
└── shared/            # ❌ NO .vercel directory here
```

## Common Issues & Solutions

### Issue: "Error: No project linked"
```bash
vercel link --project july25-client --yes
```

### Issue: "Wrong project linked"
```bash
rm -rf .vercel
vercel link --project july25-client --yes
```

### Issue: Build fails with Rollup error
The build command already includes `ROLLUP_NO_NATIVE=1` to prevent this.

### Issue: Blank page after deployment
1. Check browser console for errors
2. Verify environment variables are set in Vercel Dashboard
3. Ensure backend is running at july25.onrender.com

### Issue: Multiple projects appearing in Vercel Dashboard
This happens when deploying from subdirectories. To fix:
1. Delete duplicate projects from Vercel Dashboard
2. Remove any `.vercel` folders from subdirectories
3. Only deploy from repository root

## What NOT to Do

❌ **NEVER** run plain `vercel` command - use `npm run deploy`
❌ **NEVER** deploy from `/client` directory
❌ **NEVER** deploy from `/server` directory
❌ **NEVER** create new Vercel projects
❌ **NEVER** manually edit `.vercel/project.json`

## Technical Details

- **Framework**: Vite + React
- **Build Output**: client/dist
- **Node Version**: 20.x
- **Monorepo**: Uses npm workspaces
- **Project ID**: prj_iG6YRjjsMePUoGPmzZxnKUwYfH0n
- **Org ID**: team_OesWPwxqmdOsNGDnz0RqS4kA

## Emergency Rollback

```bash
# List recent deployments
vercel ls

# Rollback to previous version
vercel rollback [deployment-url]
```

## Support

For issues not covered here, check:
1. Vercel build logs: `vercel logs [deployment-url]`
2. Browser console at https://july25-client.vercel.app
3. Backend status at https://july25.onrender.com/health

---

**Remember**: When in doubt, run `npm run deploy` from the repository root. It handles everything safely.