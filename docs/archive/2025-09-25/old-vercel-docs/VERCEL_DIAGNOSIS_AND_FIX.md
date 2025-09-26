# Vercel Deployment Diagnosis & Fix Report
*Date: 2025-09-25*
*Status: CRITICAL ISSUES FOUND AND FIXED*

## 🔴 ROOT CAUSE ANALYSIS

### Issue 1: Non-Functioning Deployment
**Problem**: july25-client deployed but not functioning
**Root Cause**: VITE_API_BASE_URL was set to placeholder value `https://api.your-production-domain.com`
**Fix Applied**: Updated to correct backend URL `https://july25.onrender.com`

### Issue 2: Multiple Project Creation
**Root Causes Identified**:

1. **Implicit Project Creation**: Running `vercel` command without `.vercel/project.json` creates a new project using the directory name
2. **Directory Name Confusion**: Our repo is named `rebuild-6.0` so Vercel auto-creates project with that name
3. **Multiple Entry Points**: Deployments attempted from both root (`/`) and client (`/client`) directories
4. **Inconsistent Linking**: Different team members/CI runs may not have project linked

## 📊 CURRENT STATE

### Active Vercel Projects
```
july25-client       ✅ CANONICAL (linked)
server              ⚠️  Should not exist (backend is on Render)
rebuild-6.0         ⚠️  Auto-created from directory name
client              ⚠️  Created from client/ directory deployment
```

### Environment Variables Status
```
VITE_API_BASE_URL: https://july25.onrender.com ✅ FIXED
VITE_SUPABASE_URL: [Encrypted] ✅
VITE_SUPABASE_ANON_KEY: [Encrypted] ✅
VITE_DEFAULT_RESTAURANT_ID: [Encrypted] ✅
```

## 🛠 WHY MULTIPLE PROJECTS KEEP APPEARING

### Scenario 1: Fresh Clone
```bash
git clone repo
cd rebuild-6.0  # Directory name = rebuild-6.0
vercel          # No .vercel/project.json → Creates "rebuild-6.0" project
```

### Scenario 2: Client Directory Deploy
```bash
cd client
vercel          # Creates "client" project
```

### Scenario 3: Server Deployment Mistake
```bash
cd server
vercel          # Creates "server" project (should use Render!)
```

### Scenario 4: CI/CD Without Project ID
```yaml
# Missing VERCEL_PROJECT_ID in secrets
vercel deploy   # Creates new project from directory name
```

## 🚀 FUTURE-PROOF SOLUTION

### 1. Lock Down Project Configuration

#### A. Enforce Project Linking
```bash
#!/bin/bash
# Add to package.json scripts
"vercel:check": "node scripts/vercel-check.js",
"predeploy": "npm run vercel:check",
```

#### B. Create Vercel Check Script
```javascript
// scripts/vercel-check.js
const fs = require('fs');
const path = require('path');

const projectFile = path.join(process.cwd(), '.vercel/project.json');

if (!fs.existsSync(projectFile)) {
  console.error('❌ ERROR: Vercel not linked!');
  console.error('Run: vercel link --project july25-client --yes');
  process.exit(1);
}

const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
if (project.projectName !== 'july25-client') {
  console.error(`❌ ERROR: Wrong project linked: ${project.projectName}`);
  console.error('Run: vercel link --project july25-client --yes');
  process.exit(1);
}

console.log('✅ Vercel project verified: july25-client');
```

### 2. Deployment Commands (ALWAYS USE THESE)

#### Local Development
```bash
# NEVER use plain "vercel" command
# ALWAYS specify project explicitly
vercel --project july25-client
```

#### Production Deployment
```bash
vercel --prod --project july25-client
```

#### CI/CD Deployment
```bash
# Always use environment variables
vercel deploy --prod \
  --token $VERCEL_TOKEN \
  --scope $VERCEL_ORG_ID \
  --project-id $VERCEL_PROJECT_ID
```

### 3. Environment Variable Management

#### Required Variables
```bash
# Production (Vercel Dashboard)
VITE_API_BASE_URL=https://july25.onrender.com
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-key>
VITE_DEFAULT_RESTAURANT_ID=<restaurant-id>

# GitHub Secrets (for CI/CD)
VERCEL_TOKEN=<your-token>
VERCEL_ORG_ID=team_OesWPwxqmdOsNGDnz0RqS4kA
VERCEL_PROJECT_ID=prj_iG6YRjjsMePUoGPmzZxnKUwYfH0n
```

### 4. Directory Structure Guards

#### Never Deploy From
- ❌ `/client` directory
- ❌ `/server` directory
- ❌ Any subdirectory

#### Always Deploy From
- ✅ Repository root (`/`)

### 5. Pre-Deployment Checklist

```bash
#!/bin/bash
# scripts/deploy-safe.sh

echo "🔍 Pre-deployment checks..."

# 1. Check we're in root
if [ ! -f "vercel.json" ]; then
  echo "❌ Not in project root!"
  exit 1
fi

# 2. Check project linked
if [ ! -f ".vercel/project.json" ]; then
  echo "❌ Project not linked!"
  echo "Run: vercel link --project july25-client --yes"
  exit 1
fi

# 3. Verify correct project
PROJECT_NAME=$(jq -r '.projectName' .vercel/project.json)
if [ "$PROJECT_NAME" != "july25-client" ]; then
  echo "❌ Wrong project: $PROJECT_NAME"
  exit 1
fi

# 4. Check env vars
vercel env pull production
if ! grep -q "july25.onrender.com" .env.production; then
  echo "⚠️  API URL might be incorrect!"
fi

echo "✅ All checks passed!"
echo "Deploying to july25-client..."
vercel deploy --prod --project july25-client
```

## 📋 ACTION ITEMS

### Immediate Actions
- [x] Fix VITE_API_BASE_URL environment variable
- [ ] Test deployment with correct API URL
- [ ] Verify client can connect to backend

### Short Term (This Week)
- [ ] Add vercel-check.js script
- [ ] Update package.json with safety scripts
- [ ] Update CI/CD workflows with explicit project IDs
- [ ] Archive unused Vercel projects

### Long Term
- [ ] Document deployment process in README
- [ ] Create deployment runbook
- [ ] Add monitoring for deployment health
- [ ] Set up alerts for failed deployments

## 🔒 PREVENTING REGRESSION

### Git Hooks
```bash
# .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check Vercel project before push
npm run vercel:check
```

### CI/CD Guards
```yaml
# .github/workflows/vercel-guard.yml
- name: Verify Vercel Project
  run: |
    if [ ! -f ".vercel/project.json" ]; then
      echo "::error::Vercel not linked"
      exit 1
    fi
    PROJECT=$(jq -r '.projectName' .vercel/project.json)
    if [ "$PROJECT" != "july25-client" ]; then
      echo "::error::Wrong project: $PROJECT"
      exit 1
    fi
```

## 🚨 CRITICAL WARNINGS

### NEVER DO THIS
```bash
# ❌ Creates new project from directory name
vercel

# ❌ Deploys from wrong directory
cd client && vercel

# ❌ Missing project specification
vercel deploy --prod
```

### ALWAYS DO THIS
```bash
# ✅ Explicit project specification
vercel --project july25-client

# ✅ Deploy from root only
pwd # Should show /Users/.../rebuild-6.0
vercel deploy --prod --project july25-client

# ✅ Link with explicit project
vercel link --project july25-client --yes
```

## 📊 MONITORING & VALIDATION

### Health Check Commands
```bash
# Verify deployment
curl -I https://july25-client.vercel.app

# Check API connection
curl https://july25-client.vercel.app/api/health

# Monitor console errors
# Open browser console at https://july25-client.vercel.app
```

### Expected Results
- HTTP 200 for main page
- Successful API connection to july25.onrender.com
- No CORS errors
- No 404s for assets

## 🎯 SUCCESS CRITERIA

1. ✅ Single Vercel project (july25-client)
2. ✅ Correct environment variables
3. ✅ Client connects to backend
4. ✅ No duplicate projects created
5. ✅ CI/CD uses correct project
6. ✅ Team follows deployment guide

## 📚 REFERENCES

- **Project ID**: prj_iG6YRjjsMePUoGPmzZxnKUwYfH0n
- **Org ID**: team_OesWPwxqmdOsNGDnz0RqS4kA
- **Backend**: https://july25.onrender.com
- **Frontend**: https://july25-client.vercel.app

---

*Last Updated: 2025-09-25*
*Next Review: After test deployment*