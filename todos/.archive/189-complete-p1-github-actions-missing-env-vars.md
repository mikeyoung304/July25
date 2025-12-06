---
status: complete
priority: p1
issue_id: "189"
tags: [ci-cd, github-actions, security, e2e-testing, code-review]
dependencies: ["183"]
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-code-review
---

# CRITICAL: GitHub Actions E2E Workflow Missing Environment Variables

## Problem Statement

The newly created `.github/workflows/e2e-tests.yml` is missing critical environment variables required for E2E tests to run successfully. The workflow will fail in CI due to missing database connections and authentication secrets.

## Findings

### DevOps Agent Discovery

**Current State:**
```yaml
env:
  NODE_ENV: test
  BASE_URL: http://localhost:5173
  API_BASE_URL: http://localhost:3001
  VITE_DEMO_PANEL: 1
```

**Missing Critical Variables:**
- `DATABASE_URL` - Required for Prisma client
- `SUPABASE_URL` - Required for database connections
- `SUPABASE_ANON_KEY` - Required for client auth
- `SUPABASE_SERVICE_KEY` - Required for server operations
- `KIOSK_JWT_SECRET` - Required for JWT validation (no fallback per CLAUDE.md)
- `STRIPE_SECRET_KEY` - Required for payment tests
- `VITE_STRIPE_PUBLISHABLE_KEY` - Required for Stripe Elements

### Impact Assessment

Without these variables:
- Server will crash on startup (missing DATABASE_URL)
- Authentication will fail completely
- All E2E tests will fail before any assertions run
- Payment flow tests cannot execute

## Proposed Solutions

### Solution A: Add GitHub Secrets (Recommended)

**Effort:** 1 hour | **Risk:** Low

Update `.github/workflows/e2e-tests.yml`:

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    env:
      NODE_ENV: test
      BASE_URL: http://localhost:5173
      API_BASE_URL: http://localhost:3001
      VITE_DEMO_PANEL: 1
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
      KIOSK_JWT_SECRET: ${{ secrets.KIOSK_JWT_SECRET }}
      STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
      VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
```

Also add permissions block:
```yaml
permissions:
  contents: read
  pull-requests: write
```

### Solution B: Use Test Database

**Effort:** 1 day | **Risk:** Medium

Create dedicated test database with seeded data for CI.

## Recommended Action

Implement Solution A. Requires repository admin to add secrets.

## Technical Details

**Affected Files:**
- `.github/workflows/e2e-tests.yml`

**Required GitHub Secrets:**
1. `DATABASE_URL` - Supabase Postgres connection string
2. `SUPABASE_URL` - Supabase project URL
3. `SUPABASE_ANON_KEY` - Public anon key
4. `SUPABASE_SERVICE_KEY` - Service role key (server-side only)
5. `KIOSK_JWT_SECRET` - JWT signing secret
6. `STRIPE_SECRET_KEY` - Stripe test mode secret key
7. `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe test mode publishable key

## Acceptance Criteria

- [ ] All required environment variables added to workflow
- [ ] GitHub secrets configured in repository settings
- [ ] E2E workflow runs without environment-related failures
- [ ] Permissions block added for artifact upload

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review of commit 3b463dcb |

## Resources

- DevOps agent findings
- [GitHub Actions Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
