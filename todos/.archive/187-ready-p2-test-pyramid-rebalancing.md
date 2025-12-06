---
status: complete
priority: p2
issue_id: "187"
tags: [testing, architecture, e2e, unit-tests, best-practices, code-review]
dependencies: []
created_date: 2025-12-05
source: multi-agent-testing-audit
analysis_complete: 2025-12-05
---

# Rebalance Test Pyramid (Too Many E2E, Not Enough Integration)

## Problem Statement

The test pyramid is inverted:
- **E2E Tests:** 188 tests (57% failing) - TOO MANY
- **Integration Tests:** Limited coverage
- **Unit Tests:** 1,397 passing - GOOD

Many E2E tests should be unit or integration tests for faster, more reliable feedback.

## Findings

### Code Philosopher Agent Discovery

**Current State:**
```
/____________\    E2E tests (188, many testing component behavior)
     /\
    /  \          Integration tests (thin layer)
   /____\
  /      \        Unit tests (1,397, well-scoped)
 /________\
```

**Ideal State:**
```
        /\        E2E tests (~50, critical paths only)
       /  \
      /____\      Integration tests (~150, API contracts, DB RLS)
     /      \
    /________\    Unit tests (~1,500+, business logic)
```

**Examples of Misplaced E2E Tests:**
1. `card-payment.spec.ts` - 14 tests for same payment flow (should be 1 E2E + unit tests)
2. `workspace-landing.spec.ts` - Tests Demo mode badge visibility (unit test)
3. `checkout-flow.spec.ts` - Tests form validation logic (unit test)

### Impact Analysis

- Each E2E test takes 30+ seconds to debug failures
- Hard to isolate which component is broken
- Slow feedback loop = developers skip tests locally
- 14 payment tests = 2+ minutes for same code path

## Proposed Solutions

### Solution A: Gradual E2E Reduction (Recommended)

**Effort:** 2-4 weeks | **Risk:** Medium

**Phase 1: Identify Critical Paths (5 E2E tests)**
- Login flow (one per role)
- Complete order flow (menu → cart → checkout → payment → KDS)
- Multi-restaurant isolation verification

**Phase 2: Convert Remaining to Unit/Integration**
- Form validation → Vitest + React Testing Library
- API response handling → Supertest integration tests
- Component state → Unit tests with mocks

**Phase 3: Remove Redundant E2E Tests**
- Keep 1 happy path per feature
- Delete duplicate coverage

### Solution B: Quarantine and Rebuild

**Effort:** 1 week | **Risk:** Low

Move 100+ E2E tests to quarantine directory, keep only ~50 critical ones.

## Recommended Action

Start with Phase 1 to define what critical E2E coverage looks like, then gradually convert.

## Technical Details

**E2E Tests to Keep (~50):**
1. Auth flows (login, logout, role switching)
2. Order lifecycle (create → prepare → complete)
3. Payment flows (card, cash)
4. Multi-tenant isolation
5. Real-time WebSocket updates

**Tests to Convert to Unit:**
- All form validation tests
- Component rendering tests
- State management tests
- Utility function tests

## Acceptance Criteria

- [ ] Critical E2E paths documented (max 50 tests)
- [ ] 50+ E2E tests converted to unit tests
- [ ] E2E test count reduced from 188 to ~80
- [ ] E2E pass rate improved to 90%+
- [ ] Test suite runs in <15 minutes total

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent testing audit |
| 2025-12-05 | Completed | Added 315 unit tests, consolidated 20→5 smoke tests |

## Resources

- Code Philosopher agent findings
- [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html)
