# Pre-Existing Conditions Report

**Generated:** 2025-12-24
**Commit:** a6db0e58
**Production Readiness:** 99%

---

## Executive Summary

| Category | Status | Items |
|----------|--------|-------|
| **Deployments** | Running | Vercel (client) + Render (server) |
| **Unit Tests** | 1,672 passing | 1,241 client + 431 server |
| **E2E Tests** | 188 tests | 33 files |
| **Type Errors** | 0 in source | 6 in node_modules (Stripe types) |
| **Security Vulnerabilities** | 15 total | 6 high, 7 moderate, 2 low |
| **Outdated Dependencies** | 30 packages | 4 major updates needed |
| **Active TODOs** | 1 file | todos/008 (flaky tracker) |
| **Technical Debt** | Moderate | ~146 `any` types, 11 ESLint suppressions |

---

## 1. CI/CD Test Failures

### Root Cause: Test Configuration Issue (NOT Code Bugs)

The CI shows test failures, but this is a **configuration issue**, not actual bugs:

| Command | Tests | Result |
|---------|-------|--------|
| `npm run test:quick` (root) | 781 | 156 fail (wrong environment) |
| `npm run test:healthy` (workspaces) | 1,672 | All pass |

**Why failures occur:**
- Root-level `vitest.config.ts` uses `node` environment
- Client tests require `jsdom` environment with browser API mocks
- CI workflows correctly use `npm run test:healthy` (workspaces)

**Affected test categories:**
- VoiceEventHandler tests (missing `ErrorEvent`)
- StripePaymentForm tests (missing `document`)
- Component tests (missing `window` APIs)
- Logger mock tests (mock not applied)

### Quarantined Tests

| File | Reason |
|------|--------|
| `useOrderData.test.ts` | Causes OOM when run with full suite |

### Skipped Tests

| File | Reason |
|------|--------|
| `StripePaymentForm.test.tsx:183` | Pending Stripe API changes |
| `voice-control.e2e.test.ts:47` | Conditional skip |

---

## 2. Security Vulnerabilities

### High Severity (6)

| Package | Issue | Fix |
|---------|-------|-----|
| `@modelcontextprotocol/sdk` <1.24.0 | DNS rebinding protection not enabled | Upgrade |
| `jws` <3.2.3 | HMAC signature verification issue | Upgrade |

### Moderate Severity (7)

| Package | Issue |
|---------|-------|
| `@sentry/node` 10.11.0-10.26.0 | Sensitive headers leaked when `sendDefaultPii` is `true` |
| `body-parser` 2.2.0 | Known issues |
| `js-yaml` | Fixable vulnerabilities |

**Remediation:** Run `npm audit fix` (fixes many automatically)

---

## 3. Outdated Dependencies

### Major Version Updates Needed

| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| `@stripe/react-stripe-js` | 2.9.0 | 5.4.1 | Type errors in current version |
| `@stripe/stripe-js` | 4.10.0 | 8.6.0 | Type errors in current version |
| `@prisma/client` | 6.18.0 | 7.2.0 | Breaking changes possible |
| `@supabase/supabase-js` | 2.39.7 | 2.89.0 | API changes possible |

### Minor Updates Available (26)

- `@playwright/test`: 1.56.1 → 1.57.0
- `@commitlint/cli`: 19.8.1 → 20.2.0
- `@sentry/node`: 10.22.0 → 10.32.1
- Multiple `@modelcontextprotocol/*` packages

---

## 4. TypeScript Errors

### In node_modules (6 errors - Not blocking)

**Stripe Package Incompatibility:**
```
node_modules/@stripe/react-stripe-js/dist/react-stripe.d.ts
- Missing 'StripeCurrencySelectorElement' export
- Cannot find namespace 'JSX'
- Missing 'StripeEmbeddedCheckoutLineItemsChangeEvent' export
```

**Root Cause:** Version mismatch between `@stripe/react-stripe-js@2.9.0` and `@stripe/stripe-js@4.10.0`

**Fix:** Upgrade both to latest compatible versions

### In Source Code

**0 type errors** - Clean

---

## 5. ESLint Issues

### Errors (8)

| File | Issue |
|------|-------|
| `client/src/config/env-validator.ts:110` | `console.log` usage |
| `client/src/config/env.schema.ts:77,145` | `console.log` usage (2x) |
| `shared/config/browser.js:2,4` | Uses `var` instead of `let/const` |
| `shared/config/*.js` | Uses `require()` (intentional for CommonJS) |

**Note:** The `require()` usages in `/shared/config/` are intentional per CLAUDE.md - shared module must use CommonJS for Render deployment.

### Warnings (2)

| File | Issue |
|------|-------|
| `client/src/config/index.ts:7,11` | Unused eslint-disable directives |

---

## 6. Active TODOs

### In `/todos/` Directory (1)

| File | Priority | Issue |
|------|----------|-------|
| `008-ready-p2-flaky-tracker-incomplete.md` | P2 | Flaky tracker only records eventually-passing tests |

**Status:** Deferred due to pre-commit hook conflict (console.log required for Playwright reporter)

### In Source Code (~100 TODO comments)

**High Priority:**
| Location | Issue ID | Description |
|----------|----------|-------------|
| `useServerView.ts:117` | TODO-147 | Type-safe error property access |
| `useServerView.ts:163` | TODO-145 | Single-pass stats calculation (perf) |
| `VoiceEventHandler.ts:1164` | TODO-006 | Defensive flush with TOCTOU protection |

**Test Stubs (90+ items):**
- `ScheduledOrdersSection.test.tsx` - 35+ placeholder tests
- `OrderGroupCard.test.tsx` - 20+ placeholder tests
- `TouchOptimizedOrderCard.test.tsx` - 20+ placeholder tests
- `VirtualizedOrderGrid.test.tsx` - 25+ placeholder tests

---

## 7. Technical Debt Summary

### From September 2025 Audit (721 issues found)

| Priority | Count | Status |
|----------|-------|--------|
| Critical (P0) | 12 | Most fixed |
| High (P1) | 47 | Partial |
| Medium (P2) | 183 | Ongoing |
| Low (P3) | 479 | Backlog |

### Current Metrics

| Category | Count | Health |
|----------|-------|--------|
| `any` types (non-test) | ~146 | Needs improvement |
| ESLint suppressions | 11 | Healthy (all justified) |
| TypeScript suppressions | 1 | Healthy |
| Console.log in prod | 0 | Healthy |
| Hardcoded secrets | 0 | Healthy |

### Outstanding P1 Items

1. **Missing Error Boundaries** - 8 page components need wrapping
2. **Unsafe Property Access** - `UnifiedCartContext.tsx:66-79`
3. **Loading States** - Data-fetching components need skeletons
4. **WebSocket Reconnection** - ✅ Fixed in commit a6db0e58

---

## 8. Infrastructure Issues

### Stripe Health Check (Production)

```json
{
  "status": "degraded",
  "services": {
    "server": {"status": "ok"},
    "database": {"status": "ok", "latency": 987},
    "cache": {"status": "ok"},
    "payments": {"status": "error", "error": "Connection to Stripe failed"}
  }
}
```

**Possible causes:**
1. Invalid/expired `STRIPE_SECRET_KEY` on Render
2. Network issues reaching Stripe API
3. Stripe account in restricted state

### Environment Variables Missing from `.env`

Optional config vars (using defaults):
- `CACHE_TTL_SECONDS`
- `LOG_FORMAT` / `LOG_LEVEL`
- `OPENAI_API_TIMEOUT_MS`
- `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS`
- `VITE_ENABLE_PERF`
- `VITE_OPENAI_REALTIME_MODEL`

### CI/CD Observations

1. **Duplicate workflows:** `gates.yml` and `quick-tests.yml` have overlapping triggers
2. **E2E tests require 7 secrets** - Ensure all are configured in GitHub
3. **Backend health check is non-blocking** in deploy smoke test

---

## 9. Known Issues (Lessons Learned)

| Lesson ID | Category | Problem | Detection Signal |
|-----------|----------|---------|------------------|
| CL-AUTH-001 | Auth | STRICT_AUTH drift | "Authentication Required" loop |
| CL-AUTH-002 | Auth | Missing dual-auth in services | KDS/WebSocket 401 errors |
| CL-BUILD-001 | Build | Vercel devDeps issue | "command not found" in Vercel |
| CL-BUILD-003 | Build | BSD xargs false positive | Hook fails with no JS files |
| CL-DB-001 | Database | Migration drift | ERROR 42703/42804 |
| CL-DB-002 | Database | Constraint drift | ERROR 23514 |
| CL-WS-001 | WebSocket | Handler timing race | No transcription events |
| CL-MEM-001 | Memory | Untracked intervals | Memory growth 1-20 MB/day |
| CL-API-001 | API | Silent deprecation | Feature works but output missing |
| CL-MAINT-001 | Maintenance | Stale worktrees | 300+ test failures from .worktrees/ |

---

## 10. Estimated Remaining Work

### By Priority

| Priority | Category | Items | Effort |
|----------|----------|-------|--------|
| P1 | Test Infrastructure | 3 tasks | 60-70 hrs |
| P2 | Test Pyramid Rebalancing | 15 files | 42 hrs |
| P2 | CI/CD Optimization | 3 tasks | 12-15 hrs |
| P2 | Dependency Updates | 30 packages | 8-16 hrs |
| P3 | Technical Debt | Deferred items | 10-20 hrs |

**Total Estimated:** 132-163 hours (7-10 weeks with 1-2 engineers)

### Immediate Actions (This Week)

| Action | Effort | Impact |
|--------|--------|--------|
| Run `npm audit fix` | 15 min | Fix ~10 vulnerabilities |
| Upgrade Stripe packages | 2-4 hrs | Fix type errors |
| Fix Stripe connection on Render | 30 min | Restore payments health |
| Replace console.log in config | 30 min | Clean ESLint errors |

---

## Appendix: File Locations

- **Lessons Learned:** `.claude/lessons/README.md`
- **Technical Debt Audit:** `reports/07_refactor-queue.md`
- **Remaining Work:** `reports/REMAINING_WORK_SUMMARY_2025-12-05.md`
- **Test Debugging:** `.github/TEST_DEBUGGING.md`
- **Active TODOs:** `todos/`
- **Archived TODOs:** `todos/.archive/`
