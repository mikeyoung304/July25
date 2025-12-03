# Rename Project to "Grow"

## Overview

Rename the project from its current fragmented identity (`rebuild-6.0` locally, `July25` on GitHub, `july25` on Render) to a unified name: **Grow**.

**Target Names:**
- **Brand/Product Name:** Grow
- **GitHub Repository:** `grow`
- **Vercel Project:** `grow` (new URL: `grow.vercel.app` or custom domain)
- **Render Project:** `grow` (new URL: `grow.onrender.com`)
- **Local Folder:** `grow`
- **Package Names:** `grow`, `grow-client`, `grow-server`, `@grow/shared`

## Problem Statement

The current project has inconsistent naming across platforms:
- **Local folder:** `rebuild-6.0`
- **GitHub repo:** `July25`
- **Render service:** `july25` (URL: `july25.onrender.com`)
- **Vercel project:** `july25-client` (URL: `july25-client.vercel.app`)
- **Package.json names:** `restaurant-os`, `restaurant-os-client`, `restaurant-os-server`, `@rebuild/shared`

This causes confusion and makes the project harder to manage across platforms.

## Proposed Solution

Rename everything to use "Grow" consistently:

| Platform | Current | New |
|----------|---------|-----|
| Local folder | `rebuild-6.0` | `grow` |
| GitHub repo | `July25` | `grow` |
| Vercel project | `july25-client` | `grow` |
| Render service | `july25` | `grow` |
| Root package | `restaurant-os` | `grow` |
| Client package | `restaurant-os-client` | `grow-client` |
| Server package | `restaurant-os-server` | `grow-server` |
| Shared package | `@rebuild/shared` | `@grow/shared` |

---

## Implementation Phases

### Phase 1: Platform Renames (Manual Steps - Do First)

These must be done manually through web interfaces before any code changes.

#### 1.1 Rename GitHub Repository

**Location:** https://github.com/mikeyoung304/July25

**Steps:**
1. Go to repository Settings (gear icon)
2. Under "General", find "Repository name"
3. Change from `July25` to `grow`
4. Click "Rename"

**Impact:**
- GitHub automatically redirects old URLs
- All local clones will need remote URL updated
- Vercel/Render webhooks will need reconfiguration

#### 1.2 Create New Render Project

**Location:** https://dashboard.render.com

**Why create new instead of rename:**
- Render doesn't allow renaming service URLs
- New project = new URL (`grow.onrender.com`)
- Can set up as a "Project" to appear at top like MAIS

**Steps:**
1. Click "New" → "Project"
2. Name it "Grow"
3. Inside the project, click "New" → "Web Service"
4. Connect to the renamed GitHub repo (`grow`)
5. Configure with same settings as current `july25`:
   - **Name:** `grow`
   - **Region:** Same as current (likely Oregon)
   - **Branch:** `main`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Same as current
6. Add all environment variables from current service:
   - `DATABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `KIOSK_JWT_SECRET`
   - `OPENAI_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `FRONTEND_URL` (update to new Vercel URL)
   - `ALLOWED_ORIGINS` (update to new Vercel URL)
   - All other env vars
7. Deploy and verify
8. Once verified, delete old `july25` service

**New URL:** `https://grow.onrender.com`

#### 1.3 Create New Vercel Project

**Location:** https://vercel.com/dashboard

**Steps:**
1. Click "Add New" → "Project"
2. Import from GitHub (select the renamed `grow` repo)
3. Configure:
   - **Project Name:** `grow`
   - **Framework:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build:vercel` (from root)
   - **Output Directory:** `client/dist`
4. Add environment variables:
   - `VITE_API_BASE_URL=https://grow.onrender.com`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - All other VITE_* variables
5. Deploy
6. Once verified, delete old `july25-client` project

**New URL:** `https://grow.vercel.app`

---

### Phase 2: Local Code Changes

After platforms are renamed, update all code references.

#### 2.1 Update package.json Files

**File: `/package.json` (root)**
```json
// Change line 2
"name": "grow",

// Change line 26
"vercel:link": "vercel link --project grow --yes",

// Change line 41
"build:vercel": "npm run build --workspace=@grow/shared --if-present && ROLLUP_NO_NATIVE=1 npm run build --workspace=grow-client"
```

**File: `/client/package.json`**
```json
// Change line 2
"name": "grow-client",
```

**File: `/server/package.json`**
```json
// Change line 2
"name": "grow-server",
```

**File: `/shared/package.json`**
```json
// Change line 2
"name": "@grow/shared",
```

#### 2.2 Update Vercel Configuration

**File: `/.vercel/project.json`**
```json
{
  "projectId": "<NEW_PROJECT_ID>",
  "orgId": "<YOUR_ORG_ID>",
  "projectName": "grow"
}
```

**Note:** This file will be regenerated when you run `vercel link --project grow`

#### 2.3 Update Environment Files

**File: `/.env`**
```bash
# Update these lines:
FRONTEND_URL=https://grow.vercel.app
ALLOWED_ORIGINS=https://grow.vercel.app
VITE_API_BASE_URL=https://grow.onrender.com
```

**File: `/.env.example`**
```bash
# Update example URLs:
FRONTEND_URL=https://grow.vercel.app
ALLOWED_ORIGINS=https://grow.vercel.app
VITE_API_BASE_URL=https://grow.onrender.com
```

**File: `/.env.test`**
```bash
# Update test URLs to new endpoints
VITE_API_BASE_URL=https://grow.onrender.com
```

**File: `/.env.vercel.production`**
```bash
# Update production URLs
VITE_API_BASE_URL=https://grow.onrender.com
```

**File: `/client/.env.production`**
```bash
VITE_API_BASE_URL=https://grow.onrender.com
```

**File: `/.vercel/.env.development.local`**
```bash
VITE_API_BASE_URL=https://grow.onrender.com
```

#### 2.4 Update Server CORS Configuration

**File: `/server/src/server.ts` (lines 93-98, 145-147)**

Replace hardcoded CORS origins:
```typescript
// OLD (lines 93-98):
'https://july25-client.vercel.app',
'https://july25-client-git-main-mikeyoung304-gmailcoms-projects.vercel.app',

// NEW:
'https://grow.vercel.app',
'https://grow-git-main-mikeyoung304-gmailcoms-projects.vercel.app',

// OLD regex patterns (lines 145-147):
/^https:\/\/july25-client-[a-z0-9]+/,
/^https:\/\/rebuild-60-[a-z0-9]+/,

// NEW regex patterns:
/^https:\/\/grow-[a-z0-9]+/,
```

#### 2.5 Update Deployment Scripts

**File: `/scripts/vercel-deploy.sh`**

Replace all `july25-client` references with `grow`:
- Line 29: `july25-client` → `grow`
- Line 30: `july25-client` → `grow`
- Line 35: `july25-client` → `grow`
- Line 39: `july25-client` → `grow`
- Line 45: `july25-client` → `grow`
- Line 47: `july25-client.vercel.app` → `grow.vercel.app`
- Line 66: URL output

**File: `/tools/verify-vercel-project.mjs`**
```javascript
// Line 4
const EXPECTED = 'grow';
```

#### 2.6 Update Test Scripts

**File: `/test-vercel-deployment.sh`**
```bash
# Lines 19-20
VERCEL_URL="https://grow.vercel.app"
BACKEND_URL="https://grow.onrender.com"
```

**File: `/test-payment-flow.sh`**
```bash
BASE_URL="https://grow.onrender.com"
```

**File: `/check-backend-deployment.sh`**
```bash
# Update all july25.onrender.com references to grow.onrender.com
```

**File: `/check-render-backend.sh`**
```bash
# Update all july25.onrender.com references to grow.onrender.com
```

**File: `/playwright-e2e-voice.config.ts`**
```typescript
// Line 18
baseURL: 'https://grow.vercel.app'
```

**File: `/playwright-auth.config.ts`**
```typescript
// Update baseURL if present
```

#### 2.7 Update Documentation

**File: `/CLAUDE.md`**
```markdown
# Line 63: Update monorepo structure
grow/
├── client/
├── server/
├── shared/
└── supabase/
```

**File: `/README.md`**
- Update GitHub badge URLs from `July25` to `grow`
- Update any deployment references

**File: `/docs/reports/URGENT_ENV_UPDATES_REQUIRED.md`**
- Update URLs throughout

**File: `/VERCEL_DEPLOYMENT_QUICK_REFERENCE.txt`**
- Update project name references

---

### Phase 3: Local Folder Rename

**IMPORTANT:** Do this AFTER all code changes are committed and pushed.

**Steps:**
1. Close all editors and terminals using the project
2. Open a new terminal
3. Run:
```bash
cd ~/CODING
mv rebuild-6.0 grow
cd grow
```

4. Update git remote (if GitHub repo was renamed):
```bash
git remote set-url origin git@github.com:mikeyoung304/grow.git
# or if using HTTPS:
git remote set-url origin https://github.com/mikeyoung304/grow.git
```

5. Verify remote:
```bash
git remote -v
```

6. Test that everything works:
```bash
npm install
npm run dev
npm test
```

---

### Phase 4: Update GitHub Actions Secrets

**Location:** https://github.com/mikeyoung304/grow/settings/secrets/actions

Update these secrets if they reference old URLs:
- `RENDER_DEPLOY_HOOK` - Get new hook URL from Render
- `VERCEL_PROJECT_ID` - Get from new Vercel project
- Any other secrets referencing `july25`

---

### Phase 5: Update Webhooks

#### Stripe Webhook
**Location:** https://dashboard.stripe.com/webhooks

1. Create new webhook endpoint: `https://grow.onrender.com/api/v1/payments/webhook`
2. Copy the new webhook secret
3. Update `STRIPE_WEBHOOK_SECRET` in Render env vars
4. Delete old webhook pointing to `july25.onrender.com`

#### GitHub Webhooks
- Vercel webhook should auto-update when you connect new project
- Render webhook needs new deploy hook URL

---

## Files Requiring Changes Summary

### Critical Files (Must Update)
| File | Change |
|------|--------|
| `package.json` | name, vercel:link script, build:vercel script |
| `client/package.json` | name |
| `server/package.json` | name |
| `shared/package.json` | name |
| `.vercel/project.json` | projectName (or delete and re-link) |
| `.env` | FRONTEND_URL, ALLOWED_ORIGINS, VITE_API_BASE_URL |
| `.env.example` | Same as .env |
| `server/src/server.ts` | CORS origins |
| `scripts/vercel-deploy.sh` | Project name references |

### Test/Script Files (Should Update)
| File | Change |
|------|--------|
| `test-vercel-deployment.sh` | URLs |
| `test-payment-flow.sh` | Backend URL |
| `check-backend-deployment.sh` | Backend URL |
| `check-render-backend.sh` | Backend URL |
| `playwright-e2e-voice.config.ts` | baseURL |
| `tools/verify-vercel-project.mjs` | Expected project name |

### Documentation Files (Nice to Update)
| File | Change |
|------|--------|
| `CLAUDE.md` | Directory structure |
| `README.md` | GitHub badge URLs |
| `VERCEL_DEPLOYMENT_QUICK_REFERENCE.txt` | Project references |

### Files to Leave Unchanged
- `docs/CHANGELOG.md` - Historical record
- E2E test files - They test production URLs (update after deployment works)
- Archive/report files - Historical artifacts

---

## Execution Checklist

### Pre-Flight
- [ ] Backup current `.env` file
- [ ] Note all current environment variables from Render
- [ ] Note all current environment variables from Vercel
- [ ] Ensure all current work is committed and pushed

### Phase 1: Platform Renames
- [ ] Rename GitHub repository to `grow`
- [ ] Create new Render "Project" named "Grow"
- [ ] Create new Render Web Service named `grow` inside the project
- [ ] Copy all env vars to new Render service
- [ ] Deploy new Render service and verify health endpoint
- [ ] Create new Vercel project named `grow`
- [ ] Configure Vercel with correct build settings
- [ ] Copy all env vars to new Vercel project
- [ ] Deploy new Vercel project and verify frontend loads

### Phase 2: Code Changes
- [ ] Update all package.json files
- [ ] Update .env files
- [ ] Update server CORS configuration
- [ ] Update deployment scripts
- [ ] Update test scripts
- [ ] Update documentation
- [ ] Commit changes: `git commit -m "chore: rename project to Grow"`
- [ ] Push to GitHub

### Phase 3: Local Folder
- [ ] Close all editors/terminals
- [ ] Rename folder from `rebuild-6.0` to `grow`
- [ ] Update git remote URL
- [ ] Verify `npm install` works
- [ ] Verify `npm run dev` works
- [ ] Verify `npm test` works

### Phase 4: Webhooks & Secrets
- [ ] Update Stripe webhook endpoint
- [ ] Update GitHub Actions secrets
- [ ] Verify deployments trigger correctly

### Phase 5: Cleanup
- [ ] Delete old Render service (`july25`)
- [ ] Delete old Vercel project (`july25-client`)
- [ ] Verify all functionality on new URLs

---

## Rollback Plan

If something goes wrong:
1. The old GitHub repo URL will redirect (GitHub keeps redirects)
2. Don't delete old Render/Vercel until new ones are verified
3. Keep backup of `.env` files
4. Git history preserves all changes

---

## Success Metrics

- [ ] `https://grow.vercel.app` loads the frontend
- [ ] `https://grow.onrender.com/api/v1/health` returns healthy
- [ ] Authentication flow works end-to-end
- [ ] Orders can be placed
- [ ] Stripe payments work (test mode)
- [ ] Voice ordering works
- [ ] All tests pass locally

---

## References

- Render Dashboard: https://dashboard.render.com
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repository: https://github.com/mikeyoung304/July25 (current)
- Stripe Dashboard: https://dashboard.stripe.com

---

## Notes

- The shared package uses scoped naming (`@grow/shared`) which is npm convention for organization-scoped packages
- Vercel preview deployments will automatically use `grow-*` pattern URLs
- Consider setting up a custom domain later (e.g., `app.growfresh.com`)
