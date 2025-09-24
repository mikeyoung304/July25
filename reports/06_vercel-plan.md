# PHASE 6: VERCEL FORENSICS & STABILIZATION PLAN
## July25 Night Audit - Deployment Forensics
*Generated: 2025-09-23*

## 🚨 CRITICAL FINDING: DEPLOYMENT CHAOS

### Current State: 3 CONFLICTING VERCEL PROJECTS
1. **rebuild-6.0** → https://rebuild-60.vercel.app
2. **july25-client** → https://july25-client.vercel.app
3. **client** → No production URL

### Root Cause Analysis
- **Multiple deployment attempts** created separate projects
- **No .vercel/project.json** = project not linked
- **Root vercel.json exists** but not connected to any project
- **Confusion between root and client deployments**

## 🔍 Forensic Evidence

### 1. Project Configuration
```json
// Root vercel.json (EXISTS)
{
  "framework": "vite",
  "installCommand": "npm ci --workspaces --include-workspace-root",
  "buildCommand": "ROLLUP_NO_NATIVE=1 npm run build --workspace shared && ROLLUP_NO_NATIVE=1 npm run build --workspace client",
  "outputDirectory": "client/dist"
}
```

### 2. Directory Structure
```
.vercel/            # Empty directory (NOT LINKED)
client/.vercel/     # Does not exist
vercel.json         # Root config (CORRECT)
client/vercel.json  # Does not exist (GOOD)
```

### 3. Deployment History
- **rebuild-6.0**: Updated 9 minutes ago
- **july25-client**: Updated 11 minutes ago
- **Multiple domains pointing to different builds**

## 🎯 RECOMMENDED SOLUTION: SINGLE ROOT PROJECT

### Why Root Project?
1. **Monorepo structure** requires workspace builds
2. **Shared dependency** needs building first
3. **Single vercel.json** at root (already exists)
4. **Simpler CI/CD** with one deployment target

### Implementation Plan

## 📋 STEP-BY-STEP STABILIZATION

### Step 1: Clean Up Vercel Projects
```bash
# DO NOT DELETE PROJECTS YET - Archive first
# Document current state
vercel projects ls > _forensics/vercel-projects-backup.txt
```

### Step 2: Link to Single Project
```bash
# From repository root
cd /Users/mikeyoung/CODING/rebuild-6.0

# Link to rebuild-6.0 project (most recent)
vercel link --yes --project rebuild-6.0

# Pull environment variables
vercel pull --yes --environment production

# Verify link
cat .vercel/project.json
```

### Step 3: Update vercel.json (Already Correct!)
Current configuration is perfect for monorepo:
- ✅ Workspace-aware install command
- ✅ Builds shared first, then client
- ✅ Outputs from client/dist
- ✅ SPA rewrites configured
- ✅ Asset caching headers

### Step 4: Set Environment Variables
```bash
# List current env vars
vercel env ls

# Add required vars if missing
vercel env add VITE_API_BASE_URL production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
# DO NOT ADD: OPENAI_API_KEY (server only)
```

### Step 5: Create Deployment Script
```bash
#!/bin/bash
# deploy.sh - Single source of truth deployment

echo "🚀 Deploying July25 to Vercel..."

# Ensure we're in root directory
cd "$(git rev-parse --show-toplevel)"

# Verify clean working tree
if [[ -n $(git status -s) ]]; then
  echo "⚠️  Working tree not clean. Commit or stash changes first."
  exit 1
fi

# Pull latest env vars
vercel pull --yes --environment production

# Deploy to production
vercel deploy --prod

echo "✅ Deployment complete!"
```

### Step 6: Create README_DEPLOY.md
```markdown
# July25 Deployment Guide

## 🚀 Quick Deploy
\`\`\`bash
vercel deploy --prod
\`\`\`

## 📋 Prerequisites
1. Vercel CLI installed: \`npm i -g vercel\`
2. Authenticated: \`vercel login\`
3. Project linked: \`vercel link --project rebuild-6.0\`

## 🏗️ Architecture
- **Monorepo**: Root deployment builds all workspaces
- **Client**: React + Vite (client/)
- **Server**: Deployed to Render (separate)
- **Shared**: Built as dependency

## 🔧 Configuration
- **Config File**: /vercel.json (root)
- **Build Output**: client/dist
- **Node Version**: 22.x

## 🌍 Domains
- Production: https://rebuild-60.vercel.app
- Preview: https://rebuild-60-*.vercel.app

## ⚙️ Environment Variables
Required in Vercel dashboard:
- VITE_API_BASE_URL
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## 🚨 Troubleshooting
1. **Build fails**: Check ROLLUP_NO_NATIVE=1 is set
2. **404 errors**: Verify SPA rewrites in vercel.json
3. **Env vars missing**: Run \`vercel env pull\`

## 📝 Notes
- Server (backend) deploys to Render separately
- Do NOT add server env vars to Vercel
- Always deploy from repository root
\`\`\`

## ⚠️ MIGRATION WARNINGS

### Projects to Archive (NOT DELETE)
1. **july25-client** - Keep for reference
2. **client** - Can be deleted (no production URL)

### DNS Considerations
- Current domains will auto-redirect
- Update any hardcoded URLs in code
- Check CORS origins in server config

## 🔒 Security Checklist

### Before Deployment
- [ ] Remove VITE_OPENAI_API_KEY from client
- [ ] Verify no secrets in vercel.json
- [ ] Check .env files not committed
- [ ] Review exposed env variables

### After Deployment
- [ ] Test all API endpoints
- [ ] Verify WebSocket connections
- [ ] Check browser console for errors
- [ ] Monitor error tracking

## 📊 Vercel Configuration Matrix

| Setting | Current | Recommended | Action |
|---------|---------|-------------|--------|
| Project Count | 3 | 1 | Consolidate |
| Root Directory | / or client/ | / | Use root |
| Framework | vite | vite | ✅ Keep |
| Build Command | Complex | Current | ✅ Keep |
| Output Dir | client/dist | client/dist | ✅ Keep |
| Node Version | 20.x/22.x | 22.x | Standardize |

## 🚀 Final Deployment Commands

```bash
# One-time setup
cd /Users/mikeyoung/CODING/rebuild-6.0
vercel link --yes --project rebuild-6.0
vercel pull --yes --environment production

# Regular deployments
vercel deploy --prod

# Preview deployments
vercel deploy
```

## 📈 Success Metrics

After stabilization:
- ✅ Single Vercel project
- ✅ Consistent deployments
- ✅ Clear documentation
- ✅ No conflicting domains
- ✅ Proper env var management

## 🔄 Rollback Plan

If issues occur:
```bash
# List recent deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]

# Or redeploy last known good
git checkout [last-good-commit]
vercel deploy --prod
```

## 📝 Post-Stabilization Tasks

1. **Update CI/CD**
   - GitHub Actions to use single project
   - Remove old deployment scripts

2. **Clean Up Code**
   - Remove hardcoded domains
   - Update API base URLs
   - Fix CORS origins

3. **Documentation**
   - Update README.md
   - Create deployment runbook
   - Document env variables

4. **Monitoring**
   - Set up deployment notifications
   - Configure error tracking
   - Monitor performance metrics

## ✅ Verification Checklist

After implementing stabilization:
- [ ] Single project in `vercel projects ls`
- [ ] .vercel/project.json exists and correct
- [ ] `vercel deploy` works from root
- [ ] Client loads at production URL
- [ ] API calls work correctly
- [ ] WebSocket connections established
- [ ] No console errors
- [ ] README_DEPLOY.md created
- [ ] Team notified of changes

## 🎯 End State

**One Project, One Truth, One Command**
```bash
vercel deploy --prod
```

Simple. Consistent. Reliable.