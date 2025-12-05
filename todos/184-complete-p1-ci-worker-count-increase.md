---
status: complete
priority: p1
issue_id: "184"
tags: [ci-cd, performance, playwright, infrastructure, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-testing-audit
---

# CI Playwright Workers Undersized (2 vs 4+ Available)

## Problem Statement

Playwright CI configuration uses only 2 workers despite GitHub Actions providing 4 CPU cores. This makes CI test runs 3-4x slower than necessary.

## Findings

### Performance Oracle Agent Discovery

**Location:** `playwright.config.ts` line 14

```typescript
workers: process.env.CI ? 2 : undefined  // 2 workers in CI only
```

**Performance Math:**
- Local: 7 workers = 6.6 minutes
- CI (current): 2 workers = estimated 18-22 minutes
- CI (optimized): 4 workers = estimated 8-10 minutes

**Resource Availability:**
- GitHub Actions standard runners provide 4 CPU cores
- Each Chromium worker needs ~1 CPU + 0.5-1GB RAM
- 4 workers = sustainable without memory pressure

## Proposed Solutions

### Solution A: Increase to 4 Workers (Recommended)

**Effort:** 5 minutes | **Risk:** Very Low

```typescript
// playwright.config.ts
workers: process.env.CI ? 4 : undefined
```

### Solution B: Auto-detect CPU Cores

**Effort:** 15 minutes | **Risk:** Low

```typescript
import os from 'os';
workers: process.env.CI ? Math.min(os.cpus().length, 6) : undefined
```

## Recommended Action

Implement Solution A immediately. This is the highest ROI fix (5 minutes for 50% speedup).

## Technical Details

**Affected Files:**
- `playwright.config.ts` line 14

## Acceptance Criteria

- [ ] CI workers increased to 4
- [ ] E2E test duration in CI reduced by 40-50%
- [ ] No memory pressure errors in CI logs

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent testing audit |

## Resources

- Performance Oracle agent findings
- [Parallelism | Playwright](https://playwright.dev/docs/test-parallel)
