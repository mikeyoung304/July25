# GitHub Workflows & CI/CD

**Last Updated:** 2025-11-01

[Home](../../index.md) > [Docs](../../README.md) > [How-To](../README.md) > [Development](./README.md) > GitHub Workflows & CI/CD

**Purpose:** Comprehensive guide to Restaurant OS's automated testing, validation, and deployment infrastructure

**Audience:** Developers, DevOps engineers, CS students learning CI/CD concepts

---

## Table of Contents

1. [Introduction to CI/CD](#introduction-to-cicd)
2. [GitHub Actions Overview](#github-actions-overview)
3. [All Workflows Reference](#all-workflows-reference)
4. [Detailed Workflow Explanations](#detailed-workflow-explanations)
5. [Deployment Pipelines](#deployment-pipelines)
6. [Quality Gates & Required Checks](#quality-gates--required-checks)
7. [Local Testing Before Push](#local-testing-before-push)
8. [Troubleshooting Failed Workflows](#troubleshooting-failed-workflows)
9. [Adding New Workflows](#adding-new-workflows)

---

## Introduction to CI/CD

### What is CI/CD?

**CI/CD** stands for **Continuous Integration / Continuous Deployment**. It's a software development practice where:

- **Continuous Integration (CI)**: Automatically testing code changes as they're pushed to the repository
- **Continuous Deployment (CD)**: Automatically deploying tested code to production environments

### Why We Use CI/CD

Restaurant OS uses CI/CD to:

1. **Prevent bugs from reaching production** - Automated tests catch issues before merge
2. **Maintain code quality** - Enforce linting, type checking, and standards
3. **Ensure documentation accuracy** - Detect when docs drift from actual code
4. **Automate deployments** - Deploy migrations, frontend, and backend automatically
5. **Provide fast feedback** - Developers know immediately if their changes break something

### Our CI/CD Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                         Developer Workflow                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Write code locally                                           │
│  2. Run local tests (optional but recommended)                   │
│  3. Commit code → pre-commit hooks run                           │
│  4. Push to branch → CI workflows run                            │
│  5. Create PR → additional PR validation workflows run           │
│  6. Merge to main → deployment workflows trigger                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Quality Gate Strategy                       │
├─────────────────────────────────────────────────────────────────┤
│  Pre-commit:    Typecheck, lint, workflow validation            │
│  On PR:         Tests, builds, security scans, performance       │
│  On Merge:      Database migrations, deployments, smoke tests   │
│  Scheduled:     Security audits, schema drift detection         │
└─────────────────────────────────────────────────────────────────┘
```

---

## GitHub Actions Overview

### What are GitHub Actions?

GitHub Actions is GitHub's built-in CI/CD platform. Workflows are defined in YAML files under `.github/workflows/`.

### Key Concepts

**Workflow**: An automated process defined in a YAML file
**Job**: A set of steps that execute on the same runner
**Step**: An individual task (run a command, use an action)
**Runner**: A server that runs your workflows (GitHub-hosted or self-hosted)
**Trigger**: Events that start a workflow (push, pull_request, schedule, etc.)

### Workflow Anatomy

```yaml
name: Example Workflow                    # Display name in GitHub UI

on:                                       # Triggers
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:                                     # Jobs to run
  test:                                   # Job ID
    name: Run Tests                       # Job display name
    runs-on: ubuntu-latest                # Runner environment

    steps:                                # Steps to execute
      - name: Checkout code               # Step name
        uses: actions/checkout@v4         # Pre-built action

      - name: Run tests
        run: npm test                     # Shell command
```

### Common GitHub Actions

- **actions/checkout@v4**: Check out repository code
- **actions/setup-node@v4**: Install Node.js
- **actions/cache@v3**: Cache dependencies
- **actions/upload-artifact@v4**: Save build artifacts
- **github/codeql-action**: Security scanning

---

## All Workflows Reference

### Quick Reference Table

| Workflow | Purpose | Triggers | Duration | Required Check |
| -------- | ------- | -------- | -------- | -------------- |
| **docs-check.yml** | Documentation quality validation | Push/PR (docs), workflow_dispatch | ~2 min | No |
| **drift-check.yml** | Database schema drift detection | Daily 9am UTC, manual | ~1 min | No |
| **ci.yml** | Full CI pipeline (tests, builds, E2E) | Push to main/develop | ~10 min | Yes (on main) |
| **frontend-ci.yml** | Frontend-only CI (build, E2E) | PR (client changes) | ~5 min | Yes |
| **gates.yml** | Core quality gates (typecheck, lint, tests) | PR/Push to main | ~5 min | Yes |
| **quick-tests.yml** | Fast unit tests only | PR/Push to main | ~2 min | Yes |
| **server-build.yml** | Server build verification | PR/Push to main | ~3 min | Yes |
| **auth-guards.yml** | Authentication integration tests | Push/PR (auth files) | ~3 min | Yes |
| **security.yml** | Security tests (CSRF, RBAC, CORS) | Push/PR, weekly | ~5 min | Yes |
| **lighthouse-performance.yml** | Frontend performance tests | PR (client changes) | ~3 min | No |
| **eslint-freeze.yml** | Prevent new ESLint errors | PR to main | ~1 min | Yes |
| **ts-freeze.yml** | Prevent new TypeScript errors | PR to main | ~2 min | Yes |
| **version-check.yml** | Version consistency validation | Push/PR | ~1 min | Yes |
| **pr-validation.yml** | Migration & schema validation | PR (migrations) | ~2 min | Yes |
| **deploy-migrations.yml** | Auto-deploy database migrations | Push to main (migrations) | ~2 min | No (deploy) |
| **deploy-client-vercel.yml** | Deploy frontend to Vercel | Push to main (client) | ~3 min | No (deploy) |
| **deploy-server-render.yml** | Deploy backend to Render | Push to main (server) | ~5 min | No (deploy) |
| **deploy-smoke.yml** | Post-deployment smoke tests | Push to main | ~1 min | No |
| **vercel-guard.yml** | Verify Vercel project config | PR/Push to main | ~1 min | Yes |

### Workflow Categories

**Quality Gates** (must pass before merge):
- gates.yml
- quick-tests.yml
- frontend-ci.yml
- server-build.yml
- eslint-freeze.yml
- ts-freeze.yml
- version-check.yml

**Security** (protect production):
- security.yml
- auth-guards.yml

**Database** (prevent schema incidents):
- pr-validation.yml
- deploy-migrations.yml
- drift-check.yml

**Deployment** (auto-deploy to production):
- deploy-migrations.yml
- deploy-client-vercel.yml
- deploy-server-render.yml
- deploy-smoke.yml

**Documentation** (maintain docs quality):
- docs-check.yml

**Performance** (monitor frontend performance):
- lighthouse-performance.yml

---

## Detailed Workflow Explanations

### 1. docs-check.yml - Documentation Quality Check

**Purpose**: Ensure documentation stays accurate, well-structured, and maintains quality standards

**Triggers**:
```yaml
on:
  push:
    branches: [main, develop]
    paths: ['docs/**/*.md', '.env.example', 'supabase/migrations/*.sql']
  pull_request:
    paths: ['docs/**/*.md', ...]
  workflow_dispatch:  # Manual trigger
```

**What It Does**:

1. **Link Validation** - Checks all internal markdown links
   ```bash
   # Finds broken links like:
   [broken link](./nonexistent-file.md)
   ```

2. **Documentation Standards** - Verifies Diátaxis structure
   ```bash
   # Checks for required directories:
   - docs/tutorials/
   - docs/how-to/
   - docs/reference/
   - docs/explanation/
   ```

3. **Environment Variable Drift** - Compares `.env.example` to `ENVIRONMENT.md`
   ```bash
   # Detects:
   - New env vars not documented
   - Documented vars that no longer exist
   ```

4. **Bloat Detection** - Warns about files >1000 lines
   ```bash
   # Suggests breaking large files into smaller docs
   ```

5. **Drift Detection** (separate job) - Catches docs falling behind code
   ```bash
   # Runs three drift checks:
   - Schema drift (DATABASE.md vs actual schema)
   - API drift (openapi.yaml vs actual routes)
   - Config drift (ENVIRONMENT.md vs .env.example)
   ```

**Success Criteria**: All links valid, structure correct, no undocumented env vars

**On Failure**:
- Job fails with error details
- PR comment posted with specific issues to fix
- Suggests running `node scripts/check-*-drift.cjs` locally

**Example Output**:
```
✅ All internal links valid
✅ Documentation structure validated
⚠️  Undocumented environment variables:
    - NEW_FEATURE_FLAG
    - EXPERIMENTAL_MODE
```

---

### 2. drift-check.yml - Database Schema Drift Detection

**Purpose**: Detect manual schema changes that bypass migration system

**Triggers**:
```yaml
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:      # Manual trigger
```

**What It Does**:

1. **Introspect Production Database**
   ```bash
   npx prisma db pull  # Get current production schema
   ```

2. **Compare with Git**
   ```bash
   diff /tmp/schema-before.prisma prisma/schema.prisma
   ```

3. **Create GitHub Issue if Drift Detected**
   - Posts diff of changes
   - Provides remediation steps
   - Links to relevant documentation

4. **Close Issues if Drift Resolved**
   - Automatically closes drift issues when schema matches

**Success Criteria**: Production schema matches `prisma/schema.prisma` in git

**What It Catches**:
- Manual changes via Supabase Dashboard
- Migrations deployed but not committed to git
- Direct SQL changes via psql

**Example Issue Created**:
```markdown
## 🚨 Database Schema Drift Detected

**Status:** Production database schema does not match git repository
**Changes detected:** 12 lines different
**Last checked:** 2025-11-01T09:00:00Z

### Schema Differences

```diff
- tax_rate    Float?
+ tax_rate    Float @default(0.08)
```

### Remediation Steps

**Option 1: Accept drift and update git**
./scripts/post-migration-sync.sh
git add prisma/schema.prisma
git commit -m "chore(schema): sync with production drift"

**Option 2: Revert production to match git**
# Create rollback migration to undo changes
```

**Why This Matters**: Schema drift caused three production incidents. Daily checks prevent this.

---

### 3. ci.yml - Continuous Integration Pipeline

**Purpose**: Full CI pipeline running comprehensive tests and builds

**Triggers**:
```yaml
on:
  push:
    branches: [main, develop]
  # Disabled on PRs - using frontend-ci, gates, quick-tests instead
```

**What It Does**:

**Job 1: quality-gates**
```yaml
steps:
  - Run CI Guards (scripts/ci-guards.sh)
  - Verify no forbidden ports (no hardcoded 3002)
  - Run ESLint (--max-warnings=0)
  - Type check (npm run typecheck)
  - Run tests (--runInBand --maxWorkers=2)
  - Install Playwright browsers
  - Run Playwright E2E tests
  - Run Puppeteer E2E tests
  - Upload Playwright report
```

**Job 2: code-analysis**
```yaml
steps:
  - Generate code analysis (npm run analyze)
  - Upload analysis reports
  - Comment PR with analysis (if PR)
```

**Success Criteria**: All tests pass, no lint errors, all builds succeed

**On Failure**: Job fails, prevents merge if required check

**Duration**: ~10 minutes (comprehensive but slower)

**Why Disabled on PRs**: Replaced by faster, focused workflows (frontend-ci, gates, quick-tests)

---

### 4. frontend-ci.yml - Frontend CI

**Purpose**: Fast, focused frontend testing for pull requests

**Triggers**:
```yaml
on:
  pull_request:
    paths: ['client/**', 'shared/**', 'package.json']
    paths-ignore: ['docs/**', '**/*.md']
```

**What It Does**:

1. **Docs-only Short Circuit** - Skip if only docs changed
   ```yaml
   - uses: dorny/paths-filter@v3
   # If only docs changed: exit 0 immediately
   ```

2. **Guard: No Compiled JS in Shared**
   ```bash
   npm run check:no-shared-js
   # Ensures shared/ contains only TypeScript source, not compiled JS
   ```

3. **Build Production Bundle**
   ```bash
   cd client && npm run build
   # Verifies production build succeeds
   ```

4. **E2E Puppeteer Tests**
   ```bash
   node scripts/puppeteer-test.mjs
   # Runs critical path E2E tests
   ```

**Success Criteria**: Build succeeds, no .js files in shared/, E2E tests pass

**Duration**: ~5 minutes

**Why This Workflow**: Faster than full CI, focused on frontend changes

---

### 5. gates.yml - Quality Gates

**Purpose**: Core quality checks that must pass before merge

**Triggers**:
```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  # Ignores docs-only changes
```

**What It Does**:

```yaml
steps:
  - Typecheck all workspaces
  - ESLint all workspaces (--silent to reduce noise)
  - Run quick tests (test:quick)
  - Build shared package
  - Build client
  - Build server
  - Check bundle budget (scripts/check-bundle-budget.mjs)
```

**Success Criteria**: All checks pass

**Bundle Budget Check**:
```javascript
// Ensures main bundle stays < 100KB
if (mainChunkSize > 100 * 1024) {
  console.error('Main chunk exceeds 100KB budget!');
  process.exit(1);
}
```

**Why This Workflow**: Fast quality gates that catch common issues

**Duration**: ~5 minutes

---

### 6. auth-guards.yml - Authentication Guards

**Purpose**: Ensure authentication system maintains security and consistency

**Triggers**:
```yaml
on:
  push/pull_request:
    paths:
      - 'server/src/middleware/auth.ts'
      - 'server/src/routes/**'
      - 'client/src/**'
      - 'supabase/migrations/**'
```

**What It Does**:

**Job 1: auth-integration-tests**
```yaml
- Run auth integration tests
  cd server && npm test -- src/routes/__tests__/orders.auth.test.ts
  env:
    AUTH_ACCEPT_KIOSK_DEMO_ALIAS: 'true'
- Upload test results
```

**Job 2: kiosk-demo-deprecation-gate**
```yaml
- Check MIGRATION_STAGE variable (pre/post)
- If POST: Scan for 'kiosk_demo' in client code
- Fail if found (requires migration to 'customer' role)
- If PRE: Allow kiosk_demo (migration in progress)
```

**Job 3: role-consistency-check**
```yaml
- Verify 'customer' role in auth middleware
- Verify 'customer' role in orders routes
- Check customer role migration exists
- Verify AUTH_ACCEPT_KIOSK_DEMO_ALIAS flag usage
```

**Success Criteria**: Auth tests pass, role definitions consistent, migration stage respected

**Migration Stage Control**:
```bash
# Set GitHub Actions variable to control enforcement:
MIGRATION_STAGE=pre   # Allow kiosk_demo (default)
MIGRATION_STAGE=post  # Reject kiosk_demo, require 'customer'
```

**Why This Workflow**: Dual authentication pattern requires careful migration management

---

### 7. security.yml - Security Tests

**Purpose**: Comprehensive security validation and vulnerability scanning

**Triggers**:
```yaml
on:
  push/pull_request: [main, develop]
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
```

**What It Does**:

**Job 1: security-tests**
```yaml
- Run CSRF proof tests
- Run rate limit proof tests
- Run RBAC proof tests
- Run webhook HMAC proof tests
- Run CORS proof tests
- Check for exposed secrets (rg "sk-proj-*")
- Verify CORS configuration (no wildcards)
- Check webhook signature implementation
```

**Job 2: dependency-audit**
```yaml
- Run npm audit (--audit-level=high)
- Run npm audit in client
- Run npm audit in server
- Upload audit results
```

**Job 3: codeql**
```yaml
- Initialize CodeQL
- Autobuild
- Perform CodeQL analysis
- Upload security events
```

**Success Criteria**: All security tests pass, no high-severity vulnerabilities, no exposed secrets

**Example Security Check**:
```bash
# Check for exposed API keys
if rg "sk-proj-[A-Za-z0-9]+" --type-not env; then
  echo "❌ Found exposed API keys!"
  exit 1
fi

# Check for wildcard CORS
if rg "origin\\.match.*vercel\\.app" server/; then
  echo "❌ Found wildcard CORS pattern!"
  exit 1
fi
```

**Why This Workflow**: Security incidents are expensive. Automated tests prevent common vulnerabilities.

---

### 8. lighthouse-performance.yml - Performance Testing

**Purpose**: Monitor frontend performance metrics with Lighthouse

**Triggers**:
```yaml
on:
  pull_request:
    paths: ['client/**']
    paths-ignore: ['docs/**', '**/*.md']
```

**What It Does**:

```yaml
steps:
  - Install dependencies (client)
  - Build production bundle
  - Start preview server (port 4173)
  - Wait for server to be ready
  - Install Lighthouse CI
  - Run Lighthouse (1 run)
  - Assert lighthouse:no-pwa preset
  - Stop preview server
  - Upload Lighthouse reports
```

**Lighthouse Metrics Checked**:
- **Performance**: LCP, FID, CLS
- **Accessibility**: WCAG compliance
- **Best Practices**: HTTPS, console errors
- **SEO**: Meta tags, mobile-friendly

**Success Criteria**: Meets Lighthouse thresholds (doesn't fail build, just reports)

**Example Output**:
```
Performance: 95/100
Accessibility: 100/100
Best Practices: 92/100
SEO: 100/100
```

**Why This Workflow**: Catches performance regressions before they reach production

---

### 9. eslint-freeze.yml & ts-freeze.yml - Error Freeze

**Purpose**: Prevent new linting or type errors from being introduced

**Concept**: "Error Freeze" strategy
- Allow existing errors to remain (too many to fix at once)
- Prevent NEW errors from being added
- Gradually reduce error count over time

**eslint-freeze.yml**:
```yaml
steps:
  - npm ci
  - node scripts/eslint-freeze.cjs
```

**What eslint-freeze does**:
```javascript
// 1. Get current ESLint errors
const currentErrors = runESLint();

// 2. Load baseline allowlist
const allowlist = JSON.parse(fs.readFileSync('tools/eslint-allowlist.json'));

// 3. Compare
const newErrors = currentErrors.filter(err => !isInAllowlist(err, allowlist));

// 4. Fail if new errors
if (newErrors.length > 0) {
  console.error('❌ New ESLint errors detected!');
  console.error(newErrors);
  process.exit(1);
}
```

**ts-freeze.yml**:
```yaml
steps:
  - npm ci
  - npm run build --workspace shared
  - node scripts/ts-freeze.cjs
```

**What ts-freeze does**:
```javascript
// 1. Get current TypeScript errors
const currentErrors = runTypecheck();

// 2. Load baseline allowlist
const allowlist = JSON.parse(fs.readFileSync('tools/ts-error-allowlist.json'));

// 3. Compare (same logic as ESLint)
// 4. Fail if new errors
```

**Updating Allowlist** (when you fix errors):
```bash
# Update ESLint baseline
npm run lint:freeze

# Update TypeScript baseline
npm run typecheck:baseline
```

**Success Criteria**: No new errors beyond allowlist

**Why This Workflow**: Pragmatic approach to legacy technical debt

---

### 10. version-check.yml - Version Consistency

**Purpose**: Ensure version numbers stay synchronized across all documentation

**Triggers**:
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

**What It Does**:

```bash
# Extract versions from multiple files
VERSION_MD=$(grep '| \*\*Application\*\*' docs/VERSION.md | sed ...)
README_VERSION=$(grep '# Grow App' README.md | sed ...)
CHANGELOG_VERSION=$(grep '^## \[' docs/CHANGELOG.md | sed ...)

# Compare all versions
if [ "$VERSION_MD" != "$README_VERSION" ]; then
  echo "❌ Version mismatch!"
  exit 1
fi
```

**Files Checked**:
- `docs/VERSION.md` (canonical source)
- `README.md`
- `docs/CHANGELOG.md`
- `docs/meta/SOURCE_OF_TRUTH.md`

**Additional Checks**:
- Verify VERSION.md referenced as canonical source
- Check for hardcoded version numbers in docs
- Check Last Updated dates
- Enforce root directory policy (exactly 4 .md files)

**Success Criteria**: All versions match, VERSION.md is canonical source

**Why This Workflow**: Version inconsistencies confuse developers and users

---

### 11. pr-validation.yml - Migration Validation

**Purpose**: Validate database migrations and schema before merge

**Triggers**:
```yaml
on:
  pull_request:
    paths:
      - 'supabase/migrations/**'
      - 'prisma/schema.prisma'
```

**What It Does**:

```yaml
steps:
  1. Check Prisma schema validity
     npx prisma validate

  2. Check migration file naming convention
     Pattern: YYYYMMDDHHMMSS_description.sql

  3. Verify Prisma schema is in sync
     npx prisma db pull --force
     git diff prisma/schema.prisma

  4. Verify migration history
     ./scripts/verify-migration-history.sh

  5. Basic SQL syntax validation
     - Check for "DROP TABLE IF NOT EXISTS" (invalid)
     - Check files are not empty

  6. Comment PR with results
     Post table showing pass/fail for each check
```

**Success Criteria**:
- Prisma schema valid
- Migration files named correctly
- Schema in sync (or skipped if no DATABASE_URL)
- No obvious SQL syntax errors

**Example PR Comment**:
```markdown
## 🔍 Migration Validation Results

| Check | Status |
|-------|--------|
| Prisma Schema Validity | ✅ Pass |
| Migration Naming Convention | ✅ Pass |
| Schema Sync | ❌ Out of sync |
| Migration History | ✅ Valid |
| SQL Syntax | ✅ Pass |

### ❌ Some validation checks failed

**Action Required:** Run `./scripts/post-migration-sync.sh` locally
and commit the updated Prisma schema.
```

**Why This Workflow**: Catches migration issues before they reach production

---

### 12. deploy-migrations.yml - Auto-Deploy Migrations

**Purpose**: Automatically deploy database migrations when merged to main

**Triggers**:
```yaml
on:
  push:
    branches: [main]
    paths: ['supabase/migrations/*.sql']
  workflow_dispatch:  # Manual trigger for emergency deployments
```

**Critical Timing Guarantee**: Migrations deploy BEFORE code (1-2 min vs 3-5 min for Vercel/Render)

**What It Does**:

```yaml
steps:
  1. Detect new migrations
     git diff --name-only HEAD~1 HEAD | grep 'supabase/migrations/.*\.sql'

  2. Deploy each migration
     for migration in $MIGRATIONS; do
       ./scripts/deploy-migration.sh "$migration"
     done

  3. Sync Prisma schema (post-deployment)
     ./scripts/post-migration-sync.sh

  4. Create deployment summary
     Shows successful, skipped, failed migrations

  5. Create issue on failure
     Posts GitHub issue with rollback instructions
```

**Deploy Script** (`scripts/deploy-migration.sh`):
```bash
#!/bin/bash
# Idempotent migration deployment

MIGRATION_FILE=$1

# Check if already applied
if psql $DATABASE_URL -c "SELECT version FROM supabase_migrations.schema_migrations WHERE version='$VERSION'"; then
  echo "Migration already applied (skipped)"
  exit 2  # Exit code 2 = idempotent success
fi

# Apply migration
psql $DATABASE_URL -f "$MIGRATION_FILE"

# Verify tracking table updated
# Return exit code 0 (success) or 1 (failure)
```

**Success Criteria**: All migrations applied successfully (or already applied)

**On Failure**: Creates GitHub issue with:
- Failed migration details
- Rollback procedure
- Investigation checklist

**Example Deployment Summary**:
```markdown
## 🚀 Migration Deployment Summary

### ✅ Deployment Successful

**Successfully deployed:**
- `supabase/migrations/20251101_add_user_preferences.sql`

**Skipped (already applied):**
- `supabase/migrations/20251031_add_tax_rate.sql`

---
*Deployment completed at 2025-11-01 14:23:45 UTC*
```

**Why This Workflow**: Prevents "code deployed before database ready" incidents

---

### 13. deploy-client-vercel.yml - Frontend Deployment

**Purpose**: Automatically deploy frontend to Vercel when merged to main

**Triggers**:
```yaml
on:
  push:
    branches: [main]
    paths: ['client/**', '.github/workflows/deploy-client-vercel.yml']
```

**What It Does**:

```yaml
steps:
  - Checkout code
  - Setup Node.js 20
  - Install Vercel CLI
  - Deploy to Vercel:
      vercel pull --yes --environment=production
      vercel build --prod
      vercel deploy --prod --prebuilt
```

**Required Secrets**:
- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

**Success Criteria**: Vercel deployment succeeds

**Duration**: ~3 minutes (after migration deployment completes)

**Why This Workflow**: Automates frontend deployment, ensures consistency

---

### 14. deploy-server-render.yml - Backend Deployment

**Purpose**: Automatically deploy backend to Render when merged to main

**Triggers**:
```yaml
on:
  push:
    branches: [main]
    paths: ['server/**', 'shared/**', 'render.yaml']
```

**What It Does**:

```yaml
steps:
  - Checkout code
  - Trigger Render deploy:
      curl -X POST "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys" \
        -H "Authorization: Bearer ${RENDER_API_KEY}"
```

**Required Secrets**:
- `RENDER_API_KEY`: Render API key
- `RENDER_SERVICE_ID`: Render service ID

**Success Criteria**: Render deployment triggered successfully

**Duration**: ~5 minutes (Render builds and deploys)

**Why This Workflow**: Automates backend deployment via Render API

---

### 15. deploy-smoke.yml - Post-Deployment Smoke Tests

**Purpose**: Verify production deployment is operational

**Triggers**:
```yaml
on:
  push:
    branches: [main]
```

**What It Does**:

```bash
# Frontend health check
curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL"
# Expects: 200

# Backend health check
curl -s "$BACKEND_URL/api/v1/ai/health"
# Expects: {"ok": true}
```

**URLs Checked**:
- `FRONTEND_URL`: Vercel production (e.g., https://july25-client.vercel.app)
- `BACKEND_URL`: Render production (e.g., https://july25.onrender.com)

**Success Criteria**: Both endpoints return successful responses

**On Failure**: Non-blocking warning (doesn't fail deployment)

**Why This Workflow**: Quick sanity check that deployment succeeded

---

### 16. quick-tests.yml - Fast Unit Tests

**Purpose**: Run fast unit tests only (no E2E, no visual regression)

**Triggers**:
```yaml
on:
  pull_request: [main]
  push: [main]
concurrency:
  group: quick-${{ github.ref }}
  cancel-in-progress: true  # Cancel previous runs
```

**What It Does**:

```yaml
steps:
  - Checkout code
  - Setup Node.js 20
  - npm ci
  - npm run build --workspace shared
  - npm run test:quick --workspaces
```

**test:quick** script:
```json
{
  "test:quick": "vitest --run --reporter=dot --passWithNoTests --no-color"
}
```

**Success Criteria**: All unit tests pass

**Duration**: ~2 minutes (fastest test workflow)

**Why This Workflow**: Provides immediate feedback on basic functionality

---

### 17. server-build.yml - Server Build Verification

**Purpose**: Verify server builds successfully

**Triggers**:
```yaml
on:
  pull_request: [main]
  push: [main]
```

**What It Does**:

```yaml
steps:
  - Checkout code
  - Setup Node.js 20
  - npm ci (PUPPETEER_SKIP_DOWNLOAD: 'true')
  - npm run -w server build
```

**Success Criteria**: Server builds without errors

**Duration**: ~3 minutes

**Why This Workflow**: Catches TypeScript errors and build issues in server code

---

### 18. vercel-guard.yml - Vercel Project Guard

**Purpose**: Verify Vercel project configuration is valid

**Triggers**:
```yaml
on:
  pull_request: [main]
  push: [main]
```

**What It Does**:

```yaml
steps:
  - Checkout code
  - Setup Node.js 20
  - npm ci
  - npm run build --workspace shared
  - npm run check:vercel  # node tools/verify-vercel-project.mjs
```

**What check:vercel does**:
```javascript
// Verify Vercel project structure
- Check .vercel/project.json exists
- Verify projectId is set
- Check orgId is set
- Validate vercel.json configuration
```

**Success Criteria**: Vercel project configuration is valid

**Why This Workflow**: Prevents Vercel deployment failures due to misconfiguration

---

## Deployment Pipelines

### Complete Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Developer Merges to Main                      │
└───────────────────┬─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Database Migrations (1-2 minutes)                       │
│  - deploy-migrations.yml triggers                                │
│  - Detects new .sql files in supabase/migrations/               │
│  - Runs ./scripts/deploy-migration.sh for each                  │
│  - Updates Prisma schema via post-migration-sync.sh             │
│  ✅ Database ready with new schema                               │
└───────────────────┬─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Frontend Deployment (3 minutes)                         │
│  - deploy-client-vercel.yml triggers                             │
│  - Vercel builds client                                          │
│  - Deploys to production                                         │
│  ✅ Frontend live with latest code                               │
└───────────────────┬─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Backend Deployment (5 minutes)                          │
│  - deploy-server-render.yml triggers                             │
│  - Render builds server                                          │
│  - Deploys to production                                         │
│  ✅ Backend live with latest code                                │
└───────────────────┬─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Smoke Tests (1 minute)                                  │
│  - deploy-smoke.yml triggers                                     │
│  - Tests frontend health (curl FRONTEND_URL)                     │
│  - Tests backend health (curl BACKEND_URL/api/v1/ai/health)     │
│  ✅ Production verified operational                              │
└─────────────────────────────────────────────────────────────────┘

Total Time: ~10 minutes from merge to production
```

### Key Guarantees

1. **Database-First Deployment**: Migrations always deploy before code
2. **Idempotent Migrations**: Safe to retry, won't re-apply
3. **Automatic Rollback Issues**: GitHub issue created on failure with rollback instructions
4. **Zero-Downtime**: Vercel and Render handle blue-green deployments

### Environment-Specific Deployments

**Production** (main branch):
- Database: Supabase production
- Frontend: Vercel production
- Backend: Render production

**Staging** (develop branch):
- Same pipeline, different environments
- Uses staging Supabase/Vercel/Render projects

### Manual Deployment Override

If automated deployment fails:

```bash
# Frontend manual deploy
vercel --prod

# Backend manual deploy (push to Render git remote)
git push render main

# Or trigger via Render API
curl -X POST "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}"
```

---

## Quality Gates & Required Checks

### What are Required Checks?

GitHub allows marking certain workflows as "required checks" that must pass before merging a PR.

**Configure in GitHub**:
Settings → Branches → Branch protection rules → Require status checks

### Our Required Checks

**Core Quality Gates** (always required):
- ✅ **gates** - Typecheck, lint, tests, builds
- ✅ **frontend-ci** - Frontend build and E2E
- ✅ **quick-tests** - Fast unit tests
- ✅ **server-build** - Server build verification

**Security** (always required):
- ✅ **security-tests** - CSRF, RBAC, CORS tests
- ✅ **auth-guards** - Authentication integration tests

**Code Quality** (always required):
- ✅ **eslint-freeze** - No new ESLint errors
- ✅ **ts-freeze** - No new TypeScript errors
- ✅ **version-check** - Version consistency

**Database** (required if migrations changed):
- ✅ **pr-validation** - Migration and schema validation

**Configuration** (always required):
- ✅ **vercel-guard** - Vercel project configuration

### Optional Checks (Informational)

These run but don't block merges:
- ℹ️ **lighthouse-performance** - Performance metrics
- ℹ️ **docs-check** - Documentation quality
- ℹ️ **codeql** - Security scanning (informational)

### Bypassing Checks (Emergency Only)

**Never bypass on main branch.** However, for emergencies:

1. **Admin Override**: Repository admins can override required checks
2. **Temporary Disable**: Settings → Branch protection rules → Temporarily disable requirement

**After Emergency**:
1. Re-enable required checks immediately
2. Create follow-up PR to fix issues
3. Document in incident post-mortem

---

## Local Testing Before Push

### Pre-Commit Hooks

Located in `.husky/pre-commit`, automatically runs:

```bash
#!/usr/bin/env bash
# Runs on every commit

# Quick typecheck + lint
npm run typecheck:quick --workspaces
npm run lint --workspaces --silent

# Validate workflow files (if changed)
npm run validate:workflows

# Check schema sync (if migrations changed)
supabase db diff --linked

# Documentation validation (if .md files changed)
node scripts/docs-check.js --orphans-only
```

**Skip pre-commit** (emergency only):
```bash
SKIP_PRECOMMIT_TS=1 git commit -m "emergency fix"
# Or
git commit --no-verify -m "emergency fix"
```

### Commit Message Validation

Located in `.husky/commit-msg`:

```bash
npx commitlint --edit $1
```

Uses **Conventional Commits** format:
```
type(scope): subject

Examples:
feat(auth): add customer role support
fix(payments): correct Square API version
docs(contributing): update PR guidelines
chore(deps): upgrade React to 18.3.1
```

**Valid types**: feat, fix, docs, style, refactor, test, chore

### Local Testing Checklist

Before pushing, run these locally:

```bash
# 1. Install dependencies
npm ci

# 2. Typecheck
npm run typecheck

# 3. Lint
npm run lint

# 4. Run tests
npm test

# 5. Build everything
npm run build:full

# 6. If migrations changed
./scripts/deploy-migration.sh supabase/migrations/your-file.sql  # Local test
./scripts/post-migration-sync.sh  # Sync Prisma schema

# 7. If docs changed
npm run docs:check

# 8. If API changed
npm run docs:drift:api

# 9. Test locally
npm run dev
```

### Testing Specific Changes

**Frontend changes**:
```bash
cd client
npm run build
npm run preview  # Test production build
npm run test
```

**Backend changes**:
```bash
cd server
npm run build
npm run test
npm run dev  # Test locally
```

**Database changes**:
```bash
# Test migration locally
./scripts/deploy-migration.sh supabase/migrations/your-file.sql

# Verify schema sync
./scripts/post-migration-sync.sh

# Check migration history
./scripts/verify-migration-history.sh
```

**Documentation changes**:
```bash
npm run docs:check
node scripts/check-schema-drift.cjs
node scripts/check-api-drift.cjs
node scripts/check-config-drift.cjs
```

---

## Troubleshooting Failed Workflows

### General Debugging Steps

1. **Click on failed workflow** in GitHub Actions tab
2. **Expand failed step** to see error logs
3. **Search for error message** in logs
4. **Reproduce locally** using same commands
5. **Fix and push** (or re-run if transient)

### Common Failures & Solutions

#### TypeScript Errors

**Symptom**: `gates.yml` or `ts-freeze.yml` fails with type errors

**Example Error**:
```
❌ New TypeScript errors detected!
client/src/components/Menu.tsx:42:15 - error TS2339:
Property 'price' does not exist on type 'MenuItem'.
```

**Solution**:
```bash
# Fix type error locally
npm run typecheck

# If error is in allowlist, update baseline
npm run typecheck:baseline

# Commit fix
git add .
git commit -m "fix(types): add missing price property"
git push
```

---

#### ESLint Errors

**Symptom**: `gates.yml` or `eslint-freeze.yml` fails

**Example Error**:
```
❌ New ESLint errors detected!
server/src/routes/orders.ts:15:3 - error no-unused-vars:
'userId' is assigned a value but never used.
```

**Solution**:
```bash
# Fix ESLint error locally
npm run lint:fix

# If error is in allowlist, update baseline
npm run lint:freeze

# Commit fix
git add .
git commit -m "fix(lint): remove unused variable"
git push
```

---

#### Test Failures

**Symptom**: `quick-tests.yml` or `gates.yml` fails

**Example Error**:
```
FAIL src/components/Menu.test.tsx
  ● Menu › should render menu items
    expect(element).toHaveTextContent("Pizza")
    Expected: "Pizza"
    Received: ""
```

**Solution**:
```bash
# Run tests locally
npm test

# Debug specific test
npm test -- --watch Menu.test.tsx

# Fix issue
# Commit fix
git add .
git commit -m "fix(test): correct menu rendering test"
git push
```

---

#### Build Failures

**Symptom**: `gates.yml` or `frontend-ci.yml` fails on build

**Example Error**:
```
ERROR: Build failed
client/src/main.tsx:5:24 - error TS2307:
Cannot find module './App' or its corresponding type declarations.
```

**Solution**:
```bash
# Build locally
npm run build:full

# Check for missing files
ls -la client/src/App.tsx

# Fix import paths or missing files
# Commit fix
git add .
git commit -m "fix(build): correct import path"
git push
```

---

#### Migration Validation Failures

**Symptom**: `pr-validation.yml` fails

**Example Error**:
```
❌ Prisma schema is out of sync with database
Schema differences detected:
< tax_rate Float?
> tax_rate Float @default(0.08)

Action required: Run './scripts/post-migration-sync.sh' and commit
```

**Solution**:
```bash
# Sync Prisma schema with database
./scripts/post-migration-sync.sh

# Review changes
git diff prisma/schema.prisma

# Commit synced schema
git add prisma/schema.prisma
git commit -m "chore(schema): sync Prisma after migration"
git push
```

---

#### Documentation Drift Failures

**Symptom**: `docs-check.yml` drift detection fails

**Example Error**:
```
❌ Schema Drift: Issues found
Missing columns in DATABASE.md:
- orders.customer_notes (text)
- restaurants.tax_rate (float)
```

**Solution**:
```bash
# Update documentation manually
# Edit docs/reference/schema/DATABASE.md

# Or run drift check to see exact differences
node scripts/check-schema-drift.cjs

# Commit updated docs
git add docs/reference/schema/DATABASE.md
git commit -m "docs(schema): add missing columns"
git push
```

---

#### Security Test Failures

**Symptom**: `security.yml` fails

**Example Error**:
```
❌ Found exposed API keys!
server/src/config/openai.ts:3: const key = "sk-proj-abc123..."
```

**Solution**:
```bash
# Remove exposed secret
# Use environment variable instead:
const key = process.env.OPENAI_API_KEY;

# Rotate exposed key (CRITICAL!)
# 1. Go to OpenAI dashboard
# 2. Delete exposed key
# 3. Create new key
# 4. Update Render environment variables

# Commit fix
git add .
git commit -m "fix(security): remove exposed API key"
git push
```

---

#### Deployment Failures

**Symptom**: `deploy-migrations.yml` or `deploy-client-vercel.yml` fails

**Migration Deployment Failure**:
```
❌ Migration deployment failed
ERROR: column "tax_rate" already exists
```

**Solution**:
```bash
# Check migration SQL
cat supabase/migrations/20251101_add_tax_rate.sql

# Add IF NOT EXISTS clause
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tax_rate FLOAT DEFAULT 0.08;

# Or rollback if necessary
./scripts/rollback-migration.sh 20251101_add_tax_rate

# Commit fix
git add supabase/migrations/
git commit -m "fix(migration): add IF NOT EXISTS clause"
git push
```

**Vercel Deployment Failure**:
```
❌ Vercel deployment failed
Error: Missing environment variable VITE_API_BASE_URL
```

**Solution**:
```bash
# Add missing environment variable in Vercel dashboard
# Settings → Environment Variables
# Add: VITE_API_BASE_URL = https://july25.onrender.com

# Redeploy
# Or trigger manual deployment:
vercel --prod
```

---

### Re-Running Failed Workflows

**Re-run specific job**:
1. Click on failed workflow
2. Click "Re-run jobs" button
3. Select "Re-run failed jobs"

**Re-run entire workflow**:
1. Click on failed workflow
2. Click "Re-run jobs" button
3. Select "Re-run all jobs"

**Trigger workflow manually** (if workflow_dispatch enabled):
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Fill in any required inputs
5. Click "Run workflow"

---

## Adding New Workflows

### Workflow Template

```yaml
name: Your Workflow Name

# When to trigger
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:  # Allow manual trigger

# What permissions needed
permissions:
  contents: read
  pull-requests: write  # If posting comments

jobs:
  your-job:
    name: Your Job Name
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        env:
          PUPPETEER_SKIP_DOWNLOAD: 'true'  # Skip if not needed

      - name: Your custom step
        run: |
          echo "Running your command..."
          npm run your-script

      - name: Upload artifacts (optional)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: your-artifact
          path: path/to/artifact
          retention-days: 7
```

### Best Practices

1. **Use Specific Action Versions**
   ```yaml
   uses: actions/checkout@v4  # Good (pinned)
   uses: actions/checkout@main  # Bad (unpredictable)
   ```

2. **Cache Dependencies**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: '20'
       cache: 'npm'  # Caches node_modules
   ```

3. **Skip Puppeteer Download**
   ```yaml
   - run: npm ci
     env:
       PUPPETEER_SKIP_DOWNLOAD: 'true'  # Saves ~200MB
   ```

4. **Use Path Filters**
   ```yaml
   on:
     pull_request:
       paths:
         - 'client/**'      # Only run on client changes
         - '!docs/**'       # Ignore docs
   ```

5. **Short Circuit Docs-Only PRs**
   ```yaml
   - uses: dorny/paths-filter@v3
     id: changed
     with:
       filters: |
         docs:
           - 'docs/**'

   - name: Docs-only — short circuit
     if: ${{ steps.changed.outputs.docs == 'true' }}
     run: |
       echo "Docs-only PR; short-circuiting."
       exit 0
   ```

6. **Use Concurrency Control** (for expensive workflows)
   ```yaml
   concurrency:
     group: workflow-${{ github.ref }}
     cancel-in-progress: true  # Cancel previous runs
   ```

7. **Set Timeouts**
   ```yaml
   jobs:
     test:
       timeout-minutes: 10  # Fail if takes >10 min
   ```

8. **Use Job Summaries**
   ```yaml
   - name: Generate summary
     run: |
       {
         echo "## 📊 Results"
         echo "Tests passed: 42"
         echo "Tests failed: 0"
       } >> "$GITHUB_STEP_SUMMARY"
   ```

9. **Handle Secrets Securely**
   ```yaml
   env:
     API_KEY: ${{ secrets.API_KEY }}  # Good
   # Never: echo ${{ secrets.API_KEY }}  # Bad (logs secret)
   ```

10. **Fail Fast**
    ```yaml
    strategy:
      fail-fast: true  # Stop other jobs if one fails
    ```

### Testing New Workflows

1. **Create workflow file** in `.github/workflows/your-workflow.yml`

2. **Test in PR first**
   ```yaml
   on:
     pull_request:
       branches: [your-feature-branch]
   ```

3. **Check workflow syntax**
   ```bash
   npm run validate:workflows
   # Or manually:
   actionlint .github/workflows/your-workflow.yml
   ```

4. **Test locally with act** (optional)
   ```bash
   # Install act: https://github.com/nektos/act
   act -j your-job-name
   ```

5. **Push and verify**
   - Check Actions tab in GitHub
   - Verify workflow triggers correctly
   - Check logs for errors

6. **Add to required checks** (if needed)
   - Settings → Branches → Branch protection rules
   - Require status checks → Add your workflow

---

## Summary

### Key Takeaways

1. **CI/CD automates everything**: Testing, validation, deployment
2. **Quality gates prevent bugs**: Multiple layers of checks before merge
3. **Database-first deployment**: Migrations always deploy before code
4. **Security is paramount**: Automated security tests, secret scanning, CORS validation
5. **Documentation stays current**: Drift detection catches outdated docs
6. **Fast feedback loops**: Developers know immediately if changes break something

### Workflow Hierarchy

```
Pre-Commit (Local)
    ↓
PR Validation (Quality Gates)
    ↓
Security & Performance (Additional Checks)
    ↓
Merge to Main (Deployment)
    ↓
Post-Deployment (Smoke Tests)
    ↓
Scheduled (Drift Detection, Security Audits)
```

### Next Steps

- **Developers**: Run `npm test` and `npm run typecheck` locally before pushing
- **Reviewers**: Check that all required checks pass before approving PRs
- **Maintainers**: Monitor workflow runs, investigate failures promptly
- **DevOps**: Keep workflows updated, add new checks as needed

---

## Related Documentation

- [CI/CD Workflows](../how-to/development/CI_CD_WORKFLOWS.md) - Migration-focused CI/CD guide
- [Deployment Guide](../DEPLOYMENT.md) - Production deployment procedures
- [Development Process](../how-to/development/DEVELOPMENT_PROCESS.md) - Development workflow
- [Contributing Guide](../../CONTRIBUTING.md) - How to contribute
- [Supabase Connection Guide](../SUPABASE_CONNECTION_GUIDE.md) - Database workflows

---

**Last Updated**: November 1, 2025
**Version**: 6.0.14
**Maintained By**: DevOps Team
