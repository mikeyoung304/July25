---
status: complete
priority: p1
issue_id: "181"
tags: [e2e-testing, playwright, ci-cd, infrastructure, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-testing-audit
---

# CRITICAL: Playwright Config Only Waits for Frontend Port (Missing Backend)

## Problem Statement

The Playwright configuration only waits for port 5173 (Vite client) to become available before starting tests. The Express backend on port 3001 may still be initializing when tests begin, causing widespread timeout failures.

This is the **primary root cause** of 40% of the 107 E2E test failures.

## Findings

### Playwright Best Practices Agent Discovery

**Location:** `playwright.config.ts` lines 119-127

```typescript
// Current (BROKEN)
webServer: {
  command: 'npm run dev:e2e',
  port: 5173,  // ← Only waits for this port!
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
  env: { NODE_ENV: 'test' },
}
```

**Problem:** Express backend takes 10-15 seconds to initialize (Prisma client, database connections). Tests start before API is ready, causing:
- API call timeouts
- WebSocket connection failures
- Auth flow failures

### DevOps Agent Confirmation

The `npm run dev:e2e` command starts BOTH servers via concurrently:
```bash
concurrently "npm run dev:server" "npm run dev:client" --kill-others-on-fail
```

But Playwright only verifies the client is ready.

## Proposed Solutions

### Solution A: Multiple webServer Configuration (Recommended)

**Effort:** 30 minutes | **Risk:** Low

```typescript
// playwright.config.ts
webServer: [
  {
    command: 'npm run dev:server',
    url: 'http://localhost:3001/api/v1/health',
    name: 'Backend API',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  {
    command: 'npm run dev:client',
    url: 'http://localhost:5173',
    name: 'Frontend',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
],

use: {
  baseURL: 'http://localhost:5173',
},
```

### Solution B: wait-on in npm Script

**Effort:** 15 minutes | **Risk:** Low

Update `package.json`:
```json
{
  "scripts": {
    "test:e2e": "wait-on -t 120000 http://localhost:5173 http://localhost:3001/api/v1/health && npx playwright test"
  }
}
```

### Solution C: Pre-flight Health Check in globalSetup

**Effort:** 1 hour | **Risk:** Low

Create `tests/e2e/global-setup.ts` with explicit health checks before any test runs.

## Recommended Action

Implement Solution A. It's the most robust and follows Playwright's built-in patterns.

## Technical Details

**Affected Files:**
- `playwright.config.ts` - webServer configuration

**Related Documentation:**
- [Playwright webServer docs](https://playwright.dev/docs/test-webserver)
- [Multiple webServer support](https://github.com/microsoft/playwright/issues/8206)

## Acceptance Criteria

- [ ] Playwright config uses array syntax for webServer
- [ ] Backend health endpoint (`/api/v1/health`) is verified before tests
- [ ] Frontend availability is verified before tests
- [ ] Tests wait up to 120 seconds for both servers
- [ ] E2E pass rate improves from 43% to 70%+ with this fix alone

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent testing audit |

## Resources

- Multi-agent testing audit synthesis
- Playwright Best Practices agent findings
- DevOps Harmony agent findings
