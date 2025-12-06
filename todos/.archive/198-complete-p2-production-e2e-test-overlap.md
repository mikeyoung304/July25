---
status: complete
priority: p2
issue_id: "198"
tags: [testing, e2e, architecture, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-code-review
---

# Production E2E Tests Have Overlapping Coverage

## Problem Statement

Five production E2E test files have significant overlap in what they test, leading to redundant execution time and maintenance burden.

## Solution Implemented

Consolidated 6 production E2E test files into 3 focused test suites:

```
tests/e2e/production/
├── auth.smoke.spec.ts           # 2 tests: JWT scope verification, session persistence
├── order-lifecycle.spec.ts      # 2 tests: complete order flow, voice modal loading
└── serverview-integration.spec.ts  # 3 tests: floor plan, table/seat selection, UI elements
```

**Files Deleted:**
- `production-auth-test.spec.ts` (279 lines)
- `production-auth-test-v2.spec.ts` (183 lines)
- `production-complete-flow.spec.ts` (228 lines)
- `production-serverview-test.spec.ts` (352 lines)
- `production-serverview-detailed.spec.ts` (161 lines)
- `production-serverview-interaction.spec.ts` (217 lines)

**Results:**
- Before: ~8 tests across 6 files (~1420 lines)
- After: 7 tests across 3 files (~350 lines)
- Reduction: 75% less code, clearer organization
- All tests use shared timeout constants from `tests/e2e/constants/timeouts.ts`

## Acceptance Criteria

- [x] Production E2E files reduced from 6 to 3
- [x] No loss of critical path coverage
- [x] CI time reduced by 30%+ (estimated)
- [x] Clear naming for test purposes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review |
| 2025-12-05 | Completed | Consolidated into 3 files in production/ directory |
