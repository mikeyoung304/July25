# Deployment Best Practices

## 🚨 CRITICAL: Never Deploy from Subdirectories

**THE #1 RULE**: Always deploy from the repository root directory.

## Why This Matters

Running `vercel` commands from subdirectories (`/client`, `/server`, `/shared`) creates **duplicate Vercel projects** that:
- Fragment your deployment configuration
- Create billing confusion
- Break the monorepo structure
- Cause deployment failures

## Historical Issues (Learn from Past Mistakes)

| Date | What Happened | Cost |
|------|--------------|------|
| Oct 26, 2025 | Created `server/.vercel/` - wrong platform entirely | Hours of debugging |
| Nov 17, 2025 | 13 commits trying to fix PATH issues, created 15-20 tokens | 8 hours, $4,750+ |
| Nov 24, 2025 | Created `shared/.vercel/` by deploying from subdirectory | Immediate catch |

## ✅ Correct Deployment Process

### Always Use the Deployment Script

```bash
# From repository root ONLY
cd /Users/mikeyoung/CODING/rebuild-6.0

# Use the safe deployment script
npm run deploy
```

This script:
1. Verifies you're in the root directory
2. Checks for rogue `.vercel` directories
3. Confirms correct project linkage
4. Asks for manual confirmation
5. Only then deploys

### Never Use Direct Vercel Commands

```bash
# ❌ NEVER DO THIS
vercel --yes --prod

# ❌ ESPECIALLY NOT FROM SUBDIRECTORIES
cd shared && vercel --yes --prod  # Creates duplicate project!
cd client && vercel --yes          # Creates duplicate project!
```

## Pre-Deployment Checklist

Before EVERY deployment:

- [ ] You are in the repository root (`pwd` shows `/rebuild-6.0`)
- [ ] No `.vercel` directories exist in subdirectories
- [ ] `git status` is clean (all changes committed)
- [ ] Tests are passing (`npm run test:quick`)
- [ ] Build succeeds locally (`npm run build:client`)
- [ ] Using `npm run deploy` (NOT direct vercel commands)

## If You Accidentally Create a Duplicate Project

1. **Stop immediately** - Don't try to fix it with more deployments
2. **Check Vercel dashboard** - https://vercel.com/dashboard
3. **Delete the duplicate project** - Settings → Delete Project
4. **Clean local directories**:
   ```bash
   rm -rf client/.vercel server/.vercel shared/.vercel
   ```
5. **Use proper deployment**: `npm run deploy` from root

## Environment Variables

- Production vars are set in Vercel dashboard
- Never commit `.env` files
- Use `vercel env pull` to sync locally

## Monitoring Deployments

```bash
# Check deployment status
vercel ls --yes | head -5

# View logs (from root directory)
vercel logs

# Check which project is linked
cat .vercel/project.json
```

## Safety Mechanisms

1. **Deployment Script** (`scripts/vercel-deploy.sh`) - Has all safety checks
2. **CI/CD Workflow** (`.github/workflows/deploy-with-validation.yml`) - Automated safe deployment
3. **Vercel Guard** (`.github/workflows-disabled/vercel-guard.yml`) - Should be re-enabled!

## Key Lessons

1. **Local ≠ Vercel** - Always test in Vercel-like environment
2. **Shortcuts create problems** - Use the safety script, not direct commands
3. **Monorepo = Single deployment point** - Everything deploys from root
4. **When in doubt, stop** - Ask before creating new projects

## Quick Reference

| What You Want | Correct Command | From Where |
|--------------|-----------------|------------|
| Deploy to production | `npm run deploy` | Repository root |
| Check deployment | `vercel ls --yes \| head -5` | Repository root |
| Pull env vars | `vercel env pull` | Repository root |
| Build locally | `npm run build:client` | Repository root |
| Fix duplicate project | See section above | Vercel dashboard |

## Remember

**Every deployment mistake costs time and money.** Following these practices prevents:
- Duplicate projects in Vercel
- Failed deployments
- Configuration drift
- Hours of debugging

When deploying: **Slow down. Check twice. Deploy once.**