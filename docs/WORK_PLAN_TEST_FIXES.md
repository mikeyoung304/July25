# Work Plan: Test Infrastructure & Quality Fixes

**Created:** 2025-12-28
**Goal:** Address all test failures and infrastructure issues to achieve 100% pass rate

## Executive Summary

| Phase | Task | Impact | Estimated Effort |
|-------|------|--------|------------------|
| 1 | Fix @rebuild/shared/config/browser resolution | Unblocks 12 E2E tests | Low |
| 2 | Fix 17 failing server tests | Achieves 100% server test pass rate | Medium |
| 3 | Run & validate E2E tests | Validates TODO fixes in production flow | Medium |
| 4 | Review P2/P3 technical debt | Code quality improvements | Low |
| 5 | Address orphaned documentation | Documentation hygiene | Low |

---

## Phase 1: Fix Test Infrastructure (HIGH PRIORITY)

### Problem
The `@rebuild/shared/config/browser` module export is misconfigured, causing resolution failures in 12 E2E test files.

### Root Cause
In `shared/package.json`, the browser config export points to **source files** instead of built files:
```json
"./config/browser": {
  "types": "./config/browser.ts",      // ❌ Points to source
  "default": "./config/browser.ts"     // ❌ Points to source
}
```

Additionally, `shared/tsconfig.json` **excludes** `config/browser.ts` from the build, creating a paradox.

### Fix Required
1. **Update `shared/package.json`** - Change browser export to point to dist:
   ```json
   "./config/browser": {
     "types": "./dist/config/browser.d.ts",
     "default": "./dist/config/browser.js"
   }
   ```

2. **Update `shared/tsconfig.json`** - Remove `config/browser.ts` from exclude list

3. **Rebuild shared package** - Run `npm run build` in shared/

### Files to Modify
- `shared/package.json` (line 16-19)
- `shared/tsconfig.json` (line 18)

### Validation
```bash
cd shared && npm run build
npm run test:e2e -- --project=chromium tests/e2e/basic-routes.spec.ts
```

---

## Phase 2: Fix 17 Failing Server Tests (HIGH PRIORITY)

### Summary
- **457 passing** (96.4%)
- **17 failing** (3.6%)
- All failures in payment service tests

### Issue #1: Idempotency Key Format Mismatch (14 failures)

**Location:** `server/src/services/payment.service.ts:63`

**Problem:** `generateIdempotencyKey()` appends a random nonce:
```typescript
return `${type}_${restaurantSuffix}_${orderSuffix}_${ts}_${nonce}`;
// Output: "pay_11111111_222222222222_1766965476826_096cd0e845015c33"
```

**Tests expect:** Pattern `/^pay_.+_.+_\d+$/` (ending in digits only)

**Fix Options:**
1. **Update tests** to expect new format with nonce
2. **Revert code** to not include nonce (if nonce not required by Stripe)

**Recommendation:** Update tests - the nonce improves idempotency uniqueness.

### Issue #2: NaN in Tax Calculations (cascading)

**Problem:** Tax rate mock returning NaN, causing all calculations to fail.

**Root Cause:** Mock conflict between file-level and per-test mocks.

**Files:**
- `server/tests/services/payment-calculation.test.ts`

### Issue #3: Logger Spy Not Called (1 failure)

**Location:** `server/tests/services/orderStateMachine.test.ts:616-642`

**Problem:** Refund hook not triggering logger.warn for cancelled orders without Stripe config.

### Fix Order
1. Fix idempotency key test pattern → 14 tests pass
2. Fix tax rate mock setup → remaining calculation tests pass
3. Fix logger assertion → final test passes

### Validation
```bash
npm run test:server
```

---

## Phase 3: E2E Test Validation (HIGH PRIORITY)

### Purpose
Validate that recent TODO fixes (227-236) work correctly in production-like flows.

### Test Categories to Run
1. **Smoke tests** - Critical path validation
2. **Auth tests** - Login flow, workspace navigation
3. **Payment tests** - Card/cash checkout flows
4. **Order tests** - Full order lifecycle
5. **KDS tests** - Real-time updates

### Prerequisites
- Phase 1 complete (browser config fixed)
- Dev servers running (`npm run dev:e2e`)

### Execution
```bash
# Run smoke tests first
npx playwright test --project=smoke

# Run full test suite
npm run test:e2e

# Run specific critical flows
npx playwright test tests/e2e/auth/
npx playwright test tests/e2e/checkout-flow.spec.ts
```

### Success Criteria
- All smoke tests pass
- Auth flow works across all roles
- Payment flows complete without errors
- KDS real-time updates work

---

## Phase 4: Review P2/P3 Technical Debt (MEDIUM PRIORITY)

### Scope
Review remaining technical debt items from recent code review.

### Process
1. Check `todos/resolved/` for context on what was fixed
2. Review any remaining P2/P3 items in `todos/`
3. Triage and prioritize remaining items
4. Create action items for next sprint

### Files to Review
- `todos/` directory for pending items
- `docs/solutions/` for related fixes

---

## Phase 5: Address Orphaned Documentation (LOW PRIORITY)

### Scope
151 orphaned documentation files identified.

### Process
1. List all docs files
2. Check if each is referenced/linked
3. Either delete or properly link orphaned docs
4. Update documentation index

### Note
This is a cleanup task and can be deferred if time-constrained.

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Server test pass rate | 96.4% | 100% |
| Client test pass rate | 100% | 100% |
| E2E test pass rate | Unknown | >95% |
| Build status | ✅ | ✅ |

---

## Risk Mitigation

1. **Create branch** before making changes
2. **Commit after each phase** with clear messages
3. **Run full test suite** between phases
4. **Document any new issues** discovered during validation
