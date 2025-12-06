---
status: complete
priority: p1
issue_id: "183"
tags: [ci-cd, e2e-testing, github-actions, playwright, code-review]
dependencies: ["181"]
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-testing-audit
---

# CRITICAL: E2E Tests Not Integrated into CI/CD Pipeline

## Problem Statement

Playwright E2E tests exist (188 tests across 31 files) but are **not triggered** in any GitHub Actions workflow. Code can be merged and deployed to production without E2E validation.

## Findings

### DevOps Harmony Agent Discovery

**Current CI Pipeline:**
```
PR → Quality Gates (units only) → Merge → Deploy → [E2E NOT IN GATE]
```

**Missing Workflow:**
No `.github/workflows/e2e-tests.yml` exists.

**Evidence:**
- `playwright.config.ts` has CI-specific settings (`retries: process.env.CI ? 2 : 0`)
- But no workflow triggers Playwright tests
- Manual `npm run test:e2e` required locally

### Risk Assessment

Without E2E gates:
- Breaking changes to auth flow can ship
- Payment integrations can regress undetected
- Multi-tenant isolation bugs can reach production

## Proposed Solutions

### Solution A: Dedicated E2E Workflow (Recommended)

**Effort:** 2-3 days | **Risk:** Low

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    env:
      NODE_ENV: test
      BASE_URL: http://localhost:5173
      API_BASE_URL: http://localhost:3001
      VITE_DEMO_PANEL: 1

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Start servers and run tests
        run: |
          npm run dev:e2e &
          npx wait-on -t 120000 http://localhost:5173 http://localhost:3001/api/v1/health
          npx playwright test --project=chromium

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Solution B: Add to Existing gates.yml

**Effort:** 1 day | **Risk:** Medium (may slow down PR feedback)

Add E2E job to existing quality gates workflow.

## Recommended Action

Implement Solution A. Keep E2E separate from fast unit tests for better developer experience.

## Technical Details

**Affected Files:**
- `.github/workflows/e2e-tests.yml` (new file)
- `.github/workflows/deploy-with-validation.yml` - Add E2E as dependency

**CI/CD Integration:**
- E2E tests should block deployment if critical paths fail
- Use matrix strategy for parallel browser testing (optional)

## Acceptance Criteria

- [ ] E2E workflow triggers on PR to main
- [ ] E2E workflow triggers on push to main
- [ ] Both servers start and are verified healthy before tests
- [ ] Test results uploaded as artifacts
- [ ] Critical E2E failures block merge (via branch protection rules)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent testing audit |

## Resources

- DevOps Harmony agent findings
- [Setting up CI | Playwright](https://playwright.dev/docs/ci-intro)
- [GitHub Actions Playwright](https://www.browsercat.com/post/playwright-github-actions-cicd-guide)
