# Vercel Deployment Status
*Last Updated: 2025-09-25*
*Status: ✅ OPERATIONAL*

## Current Configuration

### Project Details
- **Project Name**: july25-client
- **Project ID**: prj_iG6YRjjsMePUoGPmzZxnKUwYfH0n
- **Organization**: team_OesWPwxqmdOsNGDnz0RqS4kA
- **Production URL**: https://july25-client.vercel.app

### Environment Variables
| Variable | Status | Value |
|----------|---------|--------|
| VITE_API_BASE_URL | ✅ Fixed | https://july25.onrender.com |
| VITE_SUPABASE_URL | ✅ Set | [Encrypted] |
| VITE_SUPABASE_ANON_KEY | ✅ Set | [Encrypted] |
| VITE_DEFAULT_RESTAURANT_ID | ✅ Set | [Encrypted] |

## Documentation Map

### Current (Active) Documentation
1. **VERCEL_DIAGNOSIS_AND_FIX.md** - Root cause analysis and prevention strategy
2. **VERCEL_ACTION_PLAN.md** - Action items and monitoring checklist
3. **docs/README_DEPLOY.md** - Official deployment guide
4. **DEPLOYMENT.md** - General deployment overview

### Archived Documentation
Located in `docs/archive/2025-09-25/vercel-reports/`:
- Old forensics reports (v1, v2, v3)
- Previous canonicalization attempts
- Outdated verification reports

## Quick Commands

```bash
# Check project link
cat .vercel/project.json

# Deploy to production
ROLLUP_NO_NATIVE=1 vercel --prod --yes

# List recent deployments
vercel ls

# Check environment variables
vercel env ls
```

## Known Issues (Resolved)
- ✅ Multiple Vercel projects creation - FIXED with proper linking
- ✅ Wrong API URL in production - FIXED to july25.onrender.com
- ✅ Deployment from subdirectories - PREVENTED with documentation

## Monitoring Checklist
- [ ] Check for duplicate projects weekly
- [ ] Verify API connection after each deployment
- [ ] Ensure .vercel/project.json exists before deploying
- [ ] Use root directory for all deployments

## Support
For issues, refer to:
1. VERCEL_ACTION_PLAN.md
2. VERCEL_DIAGNOSIS_AND_FIX.md
3. Team lead for escalation