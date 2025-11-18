# Vercel & Render Deployment Guide

**Last Updated:** 2025-11-18
**Status:** Canonical deployment reference
**Platforms:** Vercel (Frontend) + Render (Backend) + Supabase (Database)

> **📍 Single Source of Truth**
> This document consolidates all deployment knowledge from 10+ historical investigation documents.
> See `/docs/archive/2025-11/deployment/` for historical context.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Vercel Configuration (Frontend)](#vercel-configuration)
3. [Render Configuration (Backend)](#render-configuration)
4. [Environment Variables](#environment-variables)
5. [Deployment Workflow](#deployment-workflow)
6. [Validation & Health Checks](#validation--health-checks)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Emergency Procedures](#emergency-procedures)

---

## Architecture Overview

### Deployment Targets

```
┌─────────────────────────────────────────────────────────────┐
│                     Deployment Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Vercel     │      │    Render    │      │ Supabase  │ │
│  │  (Frontend)  │◄────►│  (Backend)   │◄────►│    (DB)   │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│                                                               │
│  • React/Vite         • Node.js/Express   • PostgreSQL     │
│  • Port: N/A          • Port: 10000       • Cloud hosted   │
│  • CDN: Global        • Region: US-East   • RLS enabled    │
│  • Auto-scale         • Auto-scale        • Multi-tenant   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### **CRITICAL:** One Frontend, One Backend

- **ONLY 1 Vercel project**: `july25-client` (Project ID: prj_iG6YRjjsMePUoGPmzZxnKUwYfH0n)
- **ONLY 1 Render service**: Production backend
- **Server does NOT deploy to Vercel** (despite ghost `server/.vercel/` artifact that may exist)

---

## Vercel Configuration

### Project Setup

**Project Name:** `july25-client`
**Framework:** Vite
**Root Directory:** `/` (monorepo root)
**Build Output:** `client/dist`

### Build Settings

```json
// vercel.json
{
  "version": 2,
  "framework": "vite",
  "installCommand": "npm ci --workspaces --include-workspace-root",
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "client/dist",
  "devCommand": "npm run dev --workspace client"
}
```

**Critical Build Script:**
```json
// package.json (root)
{
  "scripts": {
    "build:vercel": "npm run build --workspace=@rebuild/shared && cd client && ROLLUP_NO_NATIVE=1 npm run build"
  }
}
```

**Why this works:**
- Uses workspace build approach (NOT `cd shared && tsc`)
- Invokes workspace script from within workspace context
- Avoids PATH resolution issues with TypeScript binary
- `ROLLUP_NO_NATIVE=1` prevents native module issues

### Environment Variables (Vercel)

**Set in Vercel Dashboard → Settings → Environment Variables**

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `VITE_API_BASE_URL` | `https://july25.onrender.com` | (same) | `http://localhost:3001` |
| `VITE_SUPABASE_URL` | `https://xiwfhcikfdoshxwbtjxt.supabase.co` | (same) | (same) |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | (same) | (same) |
| `VITE_DEFAULT_RESTAURANT_ID` | `grow` | (same) | `grow` |
| `VITE_DEMO_PANEL` | `false` ⚠️ | `false` | `true` |
| `VITE_SQUARE_APP_ID` | `sandbox_...` | (same) | (same) |
| `VITE_SQUARE_LOCATION_ID` | `L7G3P...` | (same) | (same) |
| `VITE_OPENAI_API_KEY` | **(DO NOT SET)** | - | - |

**⚠️ SECURITY CRITICAL:**
- `VITE_DEMO_PANEL` MUST be `"false"` in production (exposes demo credentials if `"1"`)
- NEVER set server-side secrets (`OPENAI_API_KEY`, `SUPABASE_SERVICE_KEY`) in Vercel
- All `VITE_` vars are PUBLIC (embedded in JavaScript bundle)

### Git Integration

**Branch Deployment:**
- `main` → Production (`https://july25-client.vercel.app`)
- Feature branches → Preview deployments (optional)

**CRITICAL:** If Git auto-deploy is enabled in Vercel dashboard, you may have **duplicate deployments** (Vercel + GitHub Actions). Recommend:
- Disable Vercel Git integration
- Use **ONLY** GitHub Actions workflow: `deploy-with-validation.yml`

---

## Render Configuration

### Service Setup

**Service Name:** `rebuild-backend` (or similar)
**Type:** Web Service
**Environment:** Node
**Region:** US East (Ohio)
**Instance:** Starter ($7/month) or higher

### Build Settings

```yaml
# render.yaml (if using Infrastructure as Code)
services:
  - type: web
    name: rebuild-backend
    env: node
    region: us-east
    plan: starter
    buildCommand: npm ci && npm run build --workspace server
    startCommand: npm run start --workspace server
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

**Build Command:** `npm ci && npm run build --workspace server`
**Start Command:** `npm run start --workspace server`
**Port:** `10000` (Render default)

### Environment Variables (Render)

**Set in Render Dashboard → Environment**

| Variable | Value | Secret? |
|----------|-------|---------|
| `NODE_ENV` | `production` | No |
| `PORT` | `10000` | No |
| `DATABASE_URL` | `postgresql://...` (Supabase) | **Yes** |
| `SUPABASE_URL` | `https://xiwfhcikfdoshxwbtjxt.supabase.co` | No |
| `SUPABASE_SERVICE_KEY` | `eyJhbG...` (JWT) | **Yes** |
| `SUPABASE_JWT_SECRET` | Base64-encoded secret | **Yes** |
| `OPENAI_API_KEY` | `sk-proj-...` | **Yes** |
| `KIOSK_JWT_SECRET` | 64-char hex | **Yes** |
| `PIN_PEPPER` | 64-char hex | **Yes** |
| `DEVICE_FINGERPRINT_SALT` | 64-char hex | **Yes** |
| `STATION_TOKEN_SECRET` | 64-char hex | **Yes** |
| `SQUARE_ACCESS_TOKEN` | `EAAA...` | **Yes** |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Square-provided | **Yes** |

**⚠️ SECURITY:**
- ALL secrets marked **Yes** are sensitive
- `SUPABASE_SERVICE_KEY` has **admin access** to database
- `OPENAI_API_KEY` is **billable**
- Rotate secrets every 90 days

### Health Check

**Endpoint:** `https://july25.onrender.com/api/v1/health`
**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T10:30:00Z",
  "uptime": 123456
}
```

---

## Environment Variables

### Platform Separation

```
┌─────────────────────────────────────────────────────┐
│              Environment Variable Strategy           │
├─────────────────────────────────────────────────────┤
│                                                       │
│  VERCEL (Frontend - Public)                         │
│  ├─ VITE_* variables                                │
│  ├─ Embedded in JavaScript bundle                   │
│  └─ Anyone can inspect (DevTools → Sources)         │
│                                                       │
│  RENDER (Backend - Private)                         │
│  ├─ All other variables                             │
│  ├─ Never exposed to client                         │
│  └─ Server-side only access                         │
│                                                       │
│  SUPABASE (Database - Cloud)                        │
│  ├─ Managed in Supabase Dashboard                  │
│  ├─ Connection strings via DATABASE_URL              │
│  └─ RLS enforces multi-tenancy                      │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Variable Naming Convention

- **Client variables:** `VITE_*` prefix (Vite requirement)
- **Server variables:** No prefix
- **Format:** ALL_CAPS_SNAKE_CASE
- **Restaurant ID:** Accepts UUID OR slug format

### Managing Variables

**Local Development:**
```bash
# Root .env (gitignored)
cp .env.example .env
# Edit .env with local values
```

**Vercel:**
```bash
# Pull from Vercel (requires VERCEL_TOKEN)
vercel env pull .env.vercel.production --environment=production --token=$VERCEL_TOKEN

# View in dashboard
https://vercel.com/mikeyoung304-gmailcoms-projects/july25-client/settings/environment-variables
```

**Render:**
```bash
# View in dashboard (no CLI pull available)
https://dashboard.render.com → Select Service → Environment
```

**⚠️ NEVER:**
- Commit `.env` files (except `.env.example`)
- Set server secrets in Vercel
- Set client URLs in Render (unless needed by server)
- Use `echo "value" | vercel env add` without `-n` flag (adds literal `\n`)

---

## Deployment Workflow

### Automated Deployment (GitHub Actions)

**Workflow File:** `.github/workflows/deploy-with-validation.yml`

```yaml
name: Deploy with Validation
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build:vercel
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**Required GitHub Secrets:**
- `VERCEL_TOKEN` - Created in Vercel dashboard
- `VERCEL_ORG_ID` - From `.vercel/project.json`
- `VERCEL_PROJECT_ID` - From `.vercel/project.json`

### Manual Deployment

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Link to project (one-time)
vercel link --project july25-client --yes

# Deploy to production
vercel --prod
```

**Render:**
- Deploys automatically on push to `main`
- Manual deploy: Dashboard → Deploy → "Deploy latest commit"
- Or: Trigger via Render API

### Pre-Deployment Checklist

```bash
# 1. Verify build works locally
npm run build:vercel

# 2. Check environment variables
npm run verify:vercel  # Custom script
npm run verify:render  # Custom script

# 3. Run tests
npm run test

# 4. Check memory usage (should be <2GB)
ps aux | grep node | awk '{print $6/1024 " MB"}'

# 5. Verify no console.log statements
grep -r "console\\.log" client/src server/src
```

---

## Validation & Health Checks

### Post-Deployment Validation

**Frontend (Vercel):**
```bash
# 1. Check homepage loads
curl -f https://july25-client.vercel.app || echo "FAILED"

# 2. Verify VITE_DEMO_PANEL is false (CRITICAL)
curl -s https://july25-client.vercel.app/assets/index-*.js | grep -o 'VITE_DEMO_PANEL":"[^"]*"'
# Expected: VITE_DEMO_PANEL":"false"  or  VITE_DEMO_PANEL":"0"
# DANGER: VITE_DEMO_PANEL":"1" or VITE_DEMO_PANEL":"true"

# 3. Check API connectivity
curl -f https://july25-client.vercel.app/api/test || echo "FAILED"
```

**Backend (Render):**
```bash
# 1. Health check endpoint
curl -f https://july25.onrender.com/api/v1/health || echo "FAILED"

# 2. Database connectivity
curl -f https://july25.onrender.com/api/v1/db-health || echo "FAILED"

# 3. Verify orders endpoint (requires auth)
curl -H "Authorization: Bearer $TOKEN" https://july25.onrender.com/api/v1/orders
```

### Smoke Tests

```bash
# Run automated smoke tests
npm run test:smoke

# Or manual critical path:
# 1. Load homepage
# 2. View menu
# 3. Add item to cart
# 4. Checkout (Square sandbox)
# 5. View order in KDS
```

---

## Common Issues & Solutions

### Issue: "tsc: command not found" in Vercel

**Symptom:** Build fails with `sh: 1: tsc: command not found`

**Root Cause:** Build script uses `cd shared && tsc` which expects `tsc` in PATH, but Vercel's monorepo workspace doesn't expose workspace binaries to root context.

**Solution:**
```json
// ❌ WRONG
"build:vercel": "cd shared && tsc && cd ../client && npm run build"

// ✅ CORRECT
"build:vercel": "npm run build --workspace=@rebuild/shared && cd client && npm run build"
```

**Why it works:** Invokes workspace script from within workspace context where binary is accessible.

---

### Issue: Newline contamination in environment variables

**Symptom:** Variables have literal `\n` characters, causing string comparison failures

**Root Cause:** Using `echo "value" | vercel env add` without `-n` flag

**Solution:**
```bash
# ❌ WRONG
echo "grow" | vercel env add VITE_DEFAULT_RESTAURANT_ID production

# ✅ CORRECT
echo -n "grow" | vercel env add VITE_DEFAULT_RESTAURANT_ID production
```

**Verification:**
```bash
vercel env pull .env.check --environment=production --token=$VERCEL_TOKEN
cat .env.check | od -c | grep '\\n'  # Should see NO literal backslash-n
```

---

### Issue: Multiple Vercel projects causing confusion

**Symptom:** `vercel deploy` creates new project instead of using existing

**Root Cause:** Running `vercel link` or `vercel deploy` without `--project` flag

**Solution:**
```bash
# Check existing projects
vercel ls

# Link to correct project
vercel link --project july25-client --yes

# Verify .vercel/project.json
cat .vercel/project.json
# Should show: "projectId":"prj_iG6YRjjsMePUoGPmzZxnKUwYfH0n"
```

**Cleanup:**
```bash
# Delete ghost server/.vercel/ directory
rm -rf server/.vercel/

# Add to .gitignore
echo "server/.vercel/" >> .gitignore
```

---

### Issue: VITE_DEMO_PANEL exposed in production

**Symptom:** Demo credentials panel visible in production app

**Root Cause:** `VITE_DEMO_PANEL` set to `"1"` or `"true"` in Vercel production environment

**Solution:**
```bash
# Check current value
vercel env pull .env.check --environment=production
grep VITE_DEMO_PANEL .env.check

# If wrong, update in Vercel dashboard
# Settings → Environment Variables → VITE_DEMO_PANEL
# Production: "false" or "0"
# Preview: "false" or "0"
# Development: "true" or "1" (ok for dev)

# Redeploy to apply
vercel --prod
```

---

### Issue: Deployment race condition (2 workflows deploying)

**Symptom:** Deployments fail with conflicts, cache issues, or inconsistent state

**Root Cause:** Multiple deployment sources (Vercel Git integration + GitHub Actions)

**Solution:**
```bash
# Option 1: Disable Vercel Git integration (recommended)
# Vercel Dashboard → Settings → Git → Disable

# Option 2: Disable GitHub Actions workflow
# Move .github/workflows/deploy-with-validation.yml to workflows-disabled/

# CRITICAL: Only have ONE deployment source
```

**Verification:**
```bash
# Check for duplicate deployment workflows
grep -l "vercel deploy" .github/workflows/*.yml | wc -l
# Should be: 0 (if using Vercel Git) OR 1 (if using GitHub Actions)
```

---

### Issue: Build fails with memory limit exceeded

**Symptom:** `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`

**Root Cause:** Build exceeds 2GB memory limit

**Solution:**
```bash
# Check current memory usage
ps aux | grep node | awk '{print $6/1024 " MB"}'

# Temporary fix (NOT permanent solution)
NODE_OPTIONS='--max-old-space-size=2048' npm run build:vercel

# Long-term fixes:
# 1. Reduce bundle size (check with npm run analyze)
# 2. Enable code splitting in vite.config.ts
# 3. Remove unused dependencies
# 4. Optimize images (compress, lazy load)
```

---

## Emergency Procedures

### Rollback Deployment

**Vercel:**
```bash
# List recent deployments
vercel ls july25-client

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or via dashboard:
# Vercel → july25-client → Deployments → [Previous] → Promote to Production
```

**Render:**
```bash
# Via dashboard:
# Render → Service → Deploys → [Previous] → Redeploy
```

---

### Emergency Environment Variable Update

**Vercel:**
```bash
# Update via CLI
vercel env add VITE_DEMO_PANEL production
# Enter value: false

# Trigger redeploy
vercel --prod
```

**Render:**
```bash
# Via dashboard only (no CLI)
# Render → Service → Environment → Add/Edit → Save
# Render will auto-redeploy
```

---

### Incident Response

1. **Acknowledge** (0-5 min)
   - Post in #incidents channel
   - Start incident log: `docs/incidents/YYYY-MM-DD-description.md`

2. **Assess** (5-15 min)
   - Check Vercel deployment status
   - Check Render deployment logs
   - Check error tracking (Sentry, etc.)
   - Determine impact (users affected, data loss?)

3. **Mitigate** (15-60 min)
   - Rollback if recent deployment caused issue
   - Feature flag if specific feature broken
   - Manual fix if configuration issue

4. **Communicate** (throughout)
   - Update stakeholders every 30 minutes
   - Post status to status page (if available)

5. **Post-mortem** (within 48 hours)
   - Create post-mortem: `docs/postmortems/YYYY-MM-DD-topic.md`
   - Blameless review
   - Action items to prevent recurrence

---

## Monitoring & Alerts

### Key Metrics

**Vercel:**
- Deployment success rate (target: >95%)
- Build time (target: <5 minutes)
- Response time (target: p95 <500ms)
- Error rate (target: <1%)

**Render:**
- Service uptime (target: >99.9%)
- Memory usage (target: <1GB)
- CPU usage (target: <80%)
- Response time (target: p95 <500ms)

### Alert Channels

- **Vercel:** Integrations → Slack (deployment notifications)
- **Render:** Notifications → Email/Slack (service down alerts)
- **GitHub Actions:** Settings → Notifications (workflow failures)

---

## Related Documentation

- **Environment Variables:** `/docs/reference/config/ENVIRONMENT.md`
- **GitHub Actions:** `/docs/meta/GITHUB_ACTIONS_WORKFLOW_TECHNICAL_GUIDE.md`
- **Incident History:** `/docs/incidents/` and `/docs/postmortems/`
- **Historical Context:** `/docs/archive/2025-11/deployment/`

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-11-18 | Initial canonical guide created (consolidating 10+ docs) | Documentation Consolidation Agent |

---

**📌 Remember:** This is the single source of truth for Vercel + Render deployment. If you find deployment information elsewhere that conflicts with this document, this document is authoritative.
