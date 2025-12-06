---
status: complete
priority: p2
issue_id: "195"
tags: [ci-cd, github-actions, performance, code-review]
dependencies: ["189"]
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-code-review
---

# CI Workflow Missing Memory Configuration

## Problem Statement

The E2E workflow doesn't configure Node.js memory limits, which can cause OOM failures on GitHub Actions runners, especially with 4 parallel Playwright workers.

## Findings

### DevOps Agent Discovery

**CLAUDE.md Memory Requirements:**
```javascript
// Hard limits enforced by CI/CD
Development: 3GB (NODE_OPTIONS='--max-old-space-size=3072')
Production: Target 1GB
```

**Current Workflow:**
- No `NODE_OPTIONS` environment variable
- Default Node.js memory (~512MB) may be insufficient
- 4 Playwright workers × Chromium instances = high memory pressure

### Impact Assessment

- Random OOM kills during test execution
- Flaky CI builds that pass on retry
- Increased CI costs from failed runs

## Proposed Solution

**Effort:** 15 minutes | **Risk:** Low

Add memory configuration to workflow:

```yaml
env:
  NODE_OPTIONS: '--max-old-space-size=3072'
  PLAYWRIGHT_BROWSERS_PATH: 0
  PUPPETEER_SKIP_DOWNLOAD: true
```

Also consider reducing workers on memory-constrained runners:

```typescript
// playwright.config.ts
workers: process.env.CI
  ? Math.min(2, os.cpus().length) // Safer for CI
  : undefined
```

## Technical Details

**Affected Files:**
- `.github/workflows/e2e-tests.yml`
- `playwright.config.ts` (optional worker adjustment)

## Acceptance Criteria

- [ ] NODE_OPTIONS set to 3072MB in CI workflow
- [ ] PUPPETEER_SKIP_DOWNLOAD added to skip redundant browser downloads
- [ ] CI runs complete without OOM failures

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review |

## Resources

- DevOps agent findings
- [Node.js Memory Limits](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes)
