---
status: resolved
priority: p1
issue_id: "001"
tags: [testing, configuration, e2e]
dependencies: []
---

# E2E Tests Configured for Production URL

## Problem Statement
E2E tests are hardcoded to use production URL `https://july25-client.vercel.app` instead of detecting the environment. This causes all workspace auth E2E tests to fail when run locally.

## Findings
- Location: `tests/e2e/workspace-auth-flow.spec.ts:13`
- Tests use `PROD_URL` constant pointing to production
- No environment detection for local vs CI vs production
- All workspace auth tests fail locally

## Proposed Solutions

### Option 1: Environment-based URL detection
- **Pros**: Works in all environments automatically
- **Cons**: None
- **Effort**: Small
- **Risk**: Low

```typescript
const BASE_URL = process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
```

## Recommended Action
Update `workspace-auth-flow.spec.ts` to use environment-based URL detection. Also check other E2E test files for same issue.

## Technical Details
- **Affected Files**: `tests/e2e/workspace-auth-flow.spec.ts`, potentially other E2E tests
- **Related Components**: Playwright test configuration
- **Database Changes**: No

## Acceptance Criteria
- [ ] Tests use environment-based URL detection
- [ ] Tests pass locally with `npm run test:e2e`
- [ ] Tests pass in CI environment
- [ ] Playwright config updated if needed

## Work Log

### 2025-12-28 - Approved for Work
**By:** Claude Triage System
**Actions:**
- Issue identified during comprehensive user flow testing
- Status set to ready
- Ready to be picked up and worked on

## Notes
Source: User Flow Test Findings (Dec 28, 2025)
