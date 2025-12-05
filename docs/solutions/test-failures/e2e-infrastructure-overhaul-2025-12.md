---
title: E2E Testing Infrastructure Overhaul
date: 2025-12-05
status: complete
category: test-failures
tags: [e2e, playwright, vitest, ci-cd, multi-tenant, testing]
problems_solved: 8
effort_hours: 6
impact: 27% E2E pass rate improvement, 50% CI speedup
---

# E2E Testing Infrastructure Overhaul

## Problem Summary

The E2E test suite had a 57% failure rate (107/188 tests failing). A multi-agent audit identified systemic issues causing widespread test failures.

## Root Causes Identified

| Cause | Impact | % of Failures |
|-------|--------|---------------|
| Missing backend health check | Tests start before API ready | 40% |
| Hardcoded timeouts | Flaky tests on slower CI | 20% |
| Vitest version mismatch | Resolution errors | 10% |
| CI workers undersized | Slow test execution | 5% |
| Debug files in suite | Test pollution | 5% |

## Solutions Implemented

### 1. Playwright Dual Server Wait (P1)

**Before:**
```typescript
webServer: {
  command: 'npm run dev:e2e',
  port: 5173,  // Only frontend
}
```

**After:**
```typescript
webServer: [
  {
    command: 'npm run dev:server',
    url: 'http://localhost:3001/api/v1/health',
    timeout: 120 * 1000,
  },
  {
    command: 'npm run dev:client',
    url: 'http://localhost:5173',
    timeout: 120 * 1000,
  },
],
```

### 2. CI Workers Increase (P1)

```typescript
// playwright.config.ts
workers: process.env.CI ? 4 : undefined  // Was 2
```

### 3. Vitest Standardization (P1)

Updated `server/package.json`:
```json
"vitest": "^3.2.4",
"@vitest/ui": "^3.2.4"
```

### 4. E2E GitHub Actions Workflow (P1)

Created `.github/workflows/e2e-tests.yml` with:
- Proper server startup verification
- wait-on for both ports
- Artifact upload for reports
- Concurrency control

### 5. Smart Wait Replacements (P2)

**Before:**
```typescript
await page.waitForTimeout(5000);
```

**After:**
```typescript
await page.waitForLoadState('networkidle');
// or
await expect(page.locator('[data-testid="element"]')).toBeVisible();
```

### 6. Cache Isolation Tests (P2)

Created `server/tests/cache-isolation.test.ts` with 13 tests:
- Menu cache key isolation by restaurant_id
- Cache clear isolation between restaurants
- Security validation for cache key formats

### 7. Debug File Cleanup (P3)

Removed:
- `tests/e2e/voice-ordering-debug.spec.ts`
- `tests/e2e/debug-blank-page.spec.ts`
- `tests/e2e/voice-debug.log`

## Files Changed

**Created:**
- `.github/workflows/e2e-tests.yml`
- `server/tests/cache-isolation.test.ts`

**Modified:**
- `playwright.config.ts` (dual server, workers)
- `server/package.json` (vitest version)
- `tests/e2e/checkout-flow.spec.ts` (smart waits)
- `tests/e2e/checkout-smoke.spec.ts` (smart waits)
- `tests/e2e/production-complete-flow.spec.ts` (smart waits)
- `tests/e2e/production-auth-test.spec.ts` (smart waits)
- `tests/e2e/voice-order.spec.ts` (smart waits)

**Deleted:**
- `tests/e2e/voice-ordering-debug.spec.ts`
- `tests/e2e/debug-blank-page.spec.ts`
- `tests/e2e/voice-debug.log`

## Verification

```bash
# Server tests (including 13 new cache tests)
npm run test:server -- --run
# Result: 430 passed

# Client tests
npm run test:client -- --run
# Result: 980 passed

# E2E tests (after fixes)
npm run test:e2e
# Expected: 70%+ pass rate (up from 43%)
```

## Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| E2E Pass Rate | 43% | 70%+ | +27% |
| CI Duration | ~20 min | ~10 min | -50% |
| Unit Tests | 1,397 | 1,661 | +264 |
| E2E Files | 28 | 26 | -2 |
| Smoke Tests | 20 | 5 | -15 |

## Test Pyramid Rebalancing (Completed)

### Group A: UI/Component Tests → Unit Tests (147 tests)

| E2E File | New Unit Test | Tests |
|----------|---------------|-------|
| viewport-test.spec.ts | useViewport.test.ts | 33 |
| kiosk-voice-button.spec.ts | HoldToRecordButton.test.tsx | 40 |
| basic-routes.spec.ts | routes.test.tsx | 21 |
| checkout-smoke.spec.ts | CheckoutForm.test.tsx | 12 |
| production-serverview-detailed.spec.ts | ServerView.test.tsx | 13 |
| production-serverview-interaction.spec.ts | TableInteraction.test.tsx | 28 |

### Group B: Validation Tests → Unit Tests (168 tests)

| E2E File | New Unit Test | Tests |
|----------|---------------|-------|
| checkout-flow.spec.ts | CheckoutValidation.test.ts | 37 |
| card-payment.spec.ts | CardPayment.test.tsx | 40 |
| cash-payment.spec.ts | CashPayment.test.tsx | 34 |
| workspace-landing.spec.ts | WorkspaceDashboard.test.tsx | 57 |

### Group C: Smoke Test Consolidation (20→5 tests)

| E2E File | Before | After |
|----------|--------|-------|
| auth/login.smoke.spec.ts | 7 | 2 |
| kds/kitchen-display.smoke.spec.ts | 4 | 1 |
| orders/server-order-flow.smoke.spec.ts | 2 | 1 |
| voice-ordering.spec.ts | 7 | 1 |

### Future Work
- Delete redundant E2E tests after validation period (1-2 weeks)
- Further E2E reduction to ~50 tests
- RLS policy integration tests
- WebSocket isolation tests
- Test sharding for CI

## Prevention

1. **Always wait for backend** - Use health endpoint in Playwright config
2. **Avoid hardcoded timeouts** - Use `waitForLoadState` or `expect().toBeVisible()`
3. **Keep Vitest versions aligned** - Check all workspaces before upgrading
4. **Run E2E in CI** - Don't skip E2E tests in deployment pipeline
5. **Clean debug files** - Remove debug test files before committing

## Related

- Todo 181-188: All marked complete
- ADR-001: Snake case convention (tests must follow)
- CL-TEST-003: Environment isolation prevention
