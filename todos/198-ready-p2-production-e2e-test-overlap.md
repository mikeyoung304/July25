---
status: ready
priority: p2
issue_id: "198"
tags: [testing, e2e, architecture, code-review]
dependencies: []
created_date: 2025-12-05
source: multi-agent-code-review
---

# Production E2E Tests Have Overlapping Coverage

## Problem Statement

Five production E2E test files have significant overlap in what they test, leading to redundant execution time and maintenance burden.

## Findings

### Architecture Agent Discovery

**Overlapping Test Files:**
1. `production-auth-test.spec.ts` - Auth flows
2. `production-complete-flow.spec.ts` - Full order lifecycle
3. `production-kds-test.spec.ts` - KDS display
4. `production-serverview-detailed.spec.ts` - Server view
5. `production-serverview-interaction.spec.ts` - Server interactions

**Overlap Analysis:**
- All 5 files test login/auth (redundant)
- 3 files test order creation
- 2 files test KDS display independently
- Server view tested in isolation AND with interactions

**Impact:**
- ~15 minutes of redundant E2E execution
- Same bugs caught by multiple tests
- Harder to identify which test to update

## Proposed Solution

**Effort:** 3-4 hours | **Risk:** Medium

Consolidate into focused test suites:

```
production/
├── auth.smoke.spec.ts        # Just auth flows (2 tests)
├── order-lifecycle.spec.ts   # Create → Prepare → Complete (1 comprehensive test)
└── kds-integration.spec.ts   # KDS with real-time updates (1 test)
```

**Test Reduction:**
- Before: ~25 tests across 5 files
- After: ~8 tests across 3 files
- Savings: ~10 minutes CI time

## Technical Details

**Files to Consolidate:**
- Merge `production-serverview-detailed.spec.ts` + `production-serverview-interaction.spec.ts`
- Extract auth from all files into single smoke test
- Keep `production-complete-flow.spec.ts` as golden path test

## Acceptance Criteria

- [ ] Production E2E files reduced from 5 to 3
- [ ] No loss of critical path coverage
- [ ] CI time reduced by 30%+
- [ ] Clear naming for test purposes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review |

## Resources

- Architecture agent findings
