# Full Test Suite Results - Restaurant OS v6.0.14

**Date**: 2025-11-20
**Repository**: /Users/mikeyoung/CODING/rebuild-6.0
**Branch**: main
**Last Commit**: 0a1457e3 - docs: add integration completion summary

---

## Executive Summary

| Test Category | Pass Rate | Tests Passed | Tests Failed | Tests Skipped | Status |
|--------------|-----------|--------------|--------------|---------------|--------|
| **Client Tests** | 92.8% | 453/488 | 34 | 1 | ✅ GOOD |
| **Server Tests** | 87.7% | 107/122 | 13 | 2 | ✅ GOOD |
| **E2E Tests** | 15.4% | 28/182 | 62 | 51 | 🔴 CRITICAL |
| **Type Checking** | ❌ FAILED | - | 33 errors | - | 🔴 CRITICAL |
| **Linting** | ❌ FAILED | - | 8 errors, 3 warnings | - | 🟡 MEDIUM |

**Overall System Health**: 68.3% (580 passing / 849 total tests)

---

## 🔴 CRITICAL ISSUES - Must Fix First

### 1. TypeScript Module Resolution Failure (33 errors)

**Primary Issue**: `@shared` module alias not resolving in 15+ client files

**Affected Files**:
```
client/src/components/shared/badges/index.tsx:3
client/src/components/shared/filters/SortControl.tsx:10
client/src/components/shared/lists/OrderItemRow.tsx:4
client/src/hooks/useOrderFilters.ts:4,5
client/src/modules/filters/components/FilterBar.tsx:7
client/src/modules/filters/components/StatusFilter.tsx:3
client/src/modules/filters/hooks/useOrderFilters.ts:3
client/src/modules/filters/types/filter.types.ts:1
client/src/modules/kitchen/components/StationFilter.tsx:4
client/src/modules/orders/hooks/useOrderData.ts:3
client/src/pages/components/PostOrderPrompt.tsx:6
client/src/pages/components/SeatSelectionModal.tsx:7
client/src/pages/components/ServerHeader.tsx:6
client/src/pages/components/VoiceOrderModal.tsx:15
client/src/services/stationRouting.ts:2
```

**Error**: `Cannot find module '@shared' or its corresponding type declarations`

**Fix Required**: Check `tsconfig.all.json` and workspace TypeScript configuration for proper `@shared` path mapping.

---

### 2. E2E Test Infrastructure Failure (15.4% pass rate)

**Environment**: Chromium (Headless), Playwright, 6.64 min execution time

#### Critical Failure Patterns:

**A. Authentication Tests (11 failures)**
- Login timeouts (11-20s waiting for elements)
- Element visibility failures: `expect(locator).toBeVisible()` failing
- Session persistence not working across page reloads

**Files**:
- `tests/e2e/auth/login.smoke.spec.ts` (3 failures)
- `tests/e2e/auth/login.spec.ts` (8 failures)

**B. Payment Workflow Tests (24 failures)**
All hitting 30.1s timeouts:
- Card payment tests: TC-CARD-001 through TC-CARD-014 (14 failures)
- Cash payment tests: TC-CASH-001 through TC-CASH-010 (10 failures)

**C. Checkout Tests (5 failures)**
- Error: "No menu items found on page" (6-7s)
- Online/kiosk order completion timeouts (30s)

**D. KDS Tests (9 failures)**
- WebSocket tests: `ReferenceError: require is not defined`
- Realtime tests: 30.1s timeouts

**E. Production Tests (7 failures)**
- Auth & order flow timeouts (12-30s)
- Voice modal loading failures

**Root Causes**:
1. Dev server likely not running during E2E tests
2. Test selectors not matching actual DOM elements
3. WebSocket tests using Node.js `require()` in browser context (invalid)
4. 30-second timeouts indicate pages not loading at all

**Fix Required**:
- Configure Playwright `webServer` to start dev server before tests
- Fix WebSocket test module loading (use ES6 imports)
- Update test selectors to match current application
- Investigate why menu items aren't loading

---

### 3. Environment Validation Architecture Issue (13 server test failures)

**File**: `server/tests/config/env-validation.test.ts`

**Problem**: All 13 tests fail because validation code calls `process.exit(1)` instead of throwing catchable errors.

**Error Pattern**:
```
AssertionError: expected [Function] to throw error including '[expected message]'
but got 'process.exit unexpectedly called with "1"'
```

**Failed Tests**:
1. should fail when SUPABASE_URL is missing
2. should fail when SUPABASE_ANON_KEY is missing
3. should fail when SUPABASE_SERVICE_KEY is missing
4. should fail when DEFAULT_RESTAURANT_ID is not a valid UUID
5. should pass when all TIER 1 variables are valid
6. should fail in production when SQUARE_ACCESS_TOKEN is missing
7. should fail in production when SQUARE_LOCATION_ID is missing
8. should fail in production when SQUARE_APP_ID is missing
9. should only warn (not fail) when payment vars missing in development
10. should fail in production when KIOSK_JWT_SECRET is missing
11. should fail in production when PIN_PEPPER is missing
12. should fail when FRONTEND_URL is missing scheme
13. should warn when secret is too short

**Location**: `server/src/config/env.ts:39` - calls `process.exit(1)`

**Fix Required**: Refactor env validation to throw errors instead of calling `process.exit()`, allowing tests to catch and assert on errors.

---

## 🟡 MEDIUM PRIORITY ISSUES

### 4. Client Test Mock Data Issues (34 failures across 9 files)

**Problem**: Components expect nested properties that test mocks don't provide.

**Failures by File**:

**A. MenuView.test.tsx (8 failures)** - `client/src/modules/menu/components/MenuItem.tsx:32:46`
```typescript
// Error: Cannot read properties of undefined (reading 'length')
// Code: item.item_modifiers.length
```
Tests failing:
- Should render menu items in grid layout
- Should filter by category
- Should search menu items
- Should render featured items section
- Should handle add to cart
- Should show item details modal
- Should filter out items not from current restaurant
- Should handle custom menu item with modifiers

**B. StripeCheckout.test.tsx (7 failures)**
```
Error: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal.
```
Tests failing:
- Should render checkout form with order summary
- Should handle successful payment
- Should handle payment errors
- Should validate required fields
- Should show demo mode notice
- Should disable submit during processing
- Should handle card element errors

**C. StationSelector.test.tsx (5 failures)** - `client/src/modules/kds/components/StationSelector.tsx:21:16`
```typescript
// Error: Cannot read properties of undefined (reading 'map')
// Code: stations.map(...)
```
Tests failing:
- Should render station list
- Should allow station selection
- Should show selected station with checkmark
- Should handle station creation
- Should filter stations by type

**D. OrderItem.test.tsx (4 failures)** - `client/src/modules/orders/components/OrderItem.tsx:15:33`
```typescript
// Error: Cannot read properties of undefined (reading 'length')
```

**E. CartView.test.tsx (3 failures)** - `client/src/modules/cart/components/CartView.tsx:24:16`
```typescript
// Error: Cannot read properties of undefined (reading 'map')
```

**F. ReceiptView.test.tsx (3 failures)**
- Component mounting/rendering issues

**G. TableMap.test.tsx (2 failures)**
```typescript
// Error: Cannot read properties of undefined (reading 'map')
```

**H. OrderSummary.test.tsx (1 failure)**
- Component rendering issues

**I. CheckoutView.test.tsx (1 failure)**
```
Error: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal.
```

**Fix Required**: Update test mocks to include required nested properties:
- Add `item_modifiers: []` to menu item mocks
- Properly initialize `stations` array in KDS tests
- Fix AbortSignal polyfill/mock setup for Stripe tests

---

### 5. Server Test Suite Loading Failures (7 test files)

**A. Missing WebSocket Server File (2 files affected)**
```
Error: Failed to load '../src/voice/websocket-server' - file does not exist
```
Affected tests:
- `server/tests/memory-leak-prevention.test.ts`
- `server/tests/security/voice-multi-tenancy.test.ts`

**Fix**: Create the missing file or update test imports.

**B. Process.exit() During Module Loading (5 files affected)**
```
Error: process.exit(1) called during module loading
```
Affected tests:
- `server/tests/security/auth-security.test.ts`
- `server/tests/security/auth.proof.test.ts`
- `server/tests/security/csrf.proof.test.ts`
- `server/tests/security/ratelimit.proof.test.ts`
- `server/tests/services/payment-calculation.test.ts`
- `server/tests/services/payment-audit.test.ts`

**Fix**: Same as issue #3 - refactor env validation to not call `process.exit()`.

---

### 6. Type Assignment Errors (10 errors)

**A. Restaurant Type Missing Properties**
```
client/src/pages/ServerView.tsx:99 - Property 'created_at' does not exist on type 'Restaurant'
client/src/pages/ServerView.tsx:100 - Property 'updated_at' does not exist on type 'Restaurant'
```

**B. Logger Argument Type Mismatches**
```
client/src/modules/voice/services/VoiceCheckoutOrchestrator.ts:140
client/src/pages/hooks/useVoiceOrderWebRTC.ts:350
// Error: Argument of type 'string' is not assignable to parameter of type 'Record<string, unknown>'
```

**C. UserRole Enum Missing 'manager'**
```
client/src/pages/AdminDashboard.tsx:90
// Error: Type '"manager"' is not assignable to type 'UserRole'
```

**D. Vite Config Type Issues**
```
client/vite.config.ts:7 - Type mismatch (2 instances)
```

**E. Station Routing Type Error**
```
client/src/services/stationRouting.ts:29
// Error: Property 'itemPatterns' does not exist on type 'unknown'
```

**F. Zod Schema Refinement**
```
client/src/config/env.schema.ts:74 - Schema refinement function signature mismatch
```

**Fix Required**:
- Add `created_at` and `updated_at` to Restaurant type definition
- Update logger calls to pass objects instead of strings: `logger.info('message', { data })`
- Add "manager" to UserRole enum
- Add explicit types to vite.config.ts parameters

---

### 7. Implicit Any Type Errors (4 errors)

**File**: `client/vite.config.ts`

```typescript
// Line 70: Parameter 'id' implicitly has an 'any' type
// Line 126: Parameter 'chunkInfo' implicitly has an 'any' type
// Line 132: Parameter 'chunkInfo' implicitly has an 'any' type
// Line 139: Parameter 'assetInfo' implicitly has an 'any' type
```

**Fix Required**: Add explicit type annotations:
```typescript
(id: string) => ...
(chunkInfo: { name: string }) => ...
(assetInfo: { name: string }) => ...
```

---

### 8. Linting Errors (8 errors)

**A. Console Usage Violations (3 errors)** - Should use `logger` instead
```
client/src/config/env-validator.ts:110 - Unexpected console statement
client/src/config/env.schema.ts:77 - Unexpected console statement
client/src/config/env.schema.ts:149 - Unexpected console statement
```

**Fix**:
```typescript
// Replace console.log/warn/error with:
import { logger } from 'utils/logger';
logger.info('message', { data });
logger.warn('message', { data });
logger.error('message', { data });
```

**B. Legacy JavaScript in Shared Config (5 errors)**
```
shared/config/browser.js:2 - Unexpected var, use let or const instead
shared/config/browser.js:4 - Unexpected var, use let or const instead
shared/config/browser.js:63 - A require() style import is forbidden
shared/config/index.js:167 - A require() style import is forbidden
shared/config/simple.js:13 - A require() style import is forbidden
```

**Fix**: Modernize to ES6:
```javascript
// Replace: var foo = ...
const foo = ...

// Replace: const x = require('module')
import x from 'module';
```

---

## 🟢 LOW PRIORITY ISSUES

### 9. Linting Warnings (3 warnings)

**A. Unused Variable**
```
client/src/config/env.schema.ts:74
// Warning: 'ctx' is defined but never used. Allowed unused args must match /^_/u
```
**Fix**: Rename to `_ctx`

**B. Unused ESLint Directives**
```
client/src/config/index.ts:7 - Unused eslint-disable directive
client/src/config/index.ts:11 - Unused eslint-disable directive
```
**Fix**: Remove the unnecessary `/* eslint-disable */` comments

---

### 10. Security Warnings - Secret Length Requirements

**Environment secrets flagged as too short** (must be 32+ characters):
```
KIOSK_JWT_SECRET - Currently too short
PIN_PEPPER - Currently too short
DEVICE_FINGERPRINT_SALT - Currently too short
STATION_TOKEN_SECRET - Currently too short
```

**Fix**: Generate new secrets with 32+ characters for production deployment.

---

### 11. Zod Schema Type Indexing Issues (2 errors)

**File**: `shared/dist/types/validation.d.ts`
```
Line 79 - Type 'k' cannot be used to index type
Line 111 - Type 'k_1' cannot be used to index type
```

**Note**: These are in generated `.d.ts` files. Fix likely requires updating source Zod schemas.

---

### 12. Goober Export Syntax Issue (1 error)

**File**: `node_modules/goober/goober.d.ts:3`
```
Error: Export assignment cannot be used when targeting ECMAScript modules
```

**Note**: This is a third-party library issue. May need to update goober version or use different import syntax.

---

## Detailed Test Execution Information

### Client Tests
- **Execution Time**: 4.16s
- **Test Files**: 39 files (30 passed, 9 failed)
- **Pass Rate**: 92.8%

### Server Tests
- **Execution Time**: 648ms
- **Test Files**: 18 files (8 passed, 10 failed)
- **Pass Rate**: 87.7%

### E2E Tests
- **Execution Time**: 6.64 minutes (398.4 seconds)
- **Workers**: 7 parallel workers
- **Test Timeout**: 30 seconds per test
- **Browser**: Chromium (Headless Shell v1194)
- **Platform**: macOS (Darwin 24.6.0)
- **Viewport**: 1920x1080
- **HTML Reporter Warning**: Output folder conflict may cause artifact loss

### Skipped E2E Test Files (4 files)
Incompatible with Playwright (use @testing-library/react):
- `tests/e2e/floor-plan-management.e2e.test.tsx`
- `tests/e2e/multi-tenant.e2e.test.tsx`
- `tests/e2e/voice-to-kitchen.e2e.test.tsx`
- `tests/e2e/floor-plan-chip-monkey.e2e.test.tsx`

**Reason**: These use `@/core` imports which Playwright cannot resolve.

---

## Priority Action Plan

### Phase 1: Critical Blockers (MUST FIX)
1. ✅ Fix `@shared` module resolution in TypeScript config
2. ✅ Fix E2E test infrastructure (Playwright webServer config)
3. ✅ Refactor environment validation to throw errors instead of `process.exit()`
4. ✅ Fix WebSocket test module loading (`require` → ES6 imports)

### Phase 2: High-Impact Failures (SHOULD FIX)
5. ✅ Update client test mocks with missing nested properties
6. ✅ Fix Stripe/AbortSignal test setup
7. ✅ Add missing Restaurant type properties
8. ✅ Fix logger call signatures (string → object)
9. ✅ Add "manager" to UserRole enum

### Phase 3: Code Quality (NICE TO FIX)
10. ✅ Replace console with logger in 3 files
11. ✅ Modernize shared/config JS files (var/require → ES6)
12. ✅ Fix implicit any types in vite.config.ts
13. ✅ Clean up unused variables and eslint directives
14. ✅ Generate new 32+ char secrets for production

### Phase 4: Investigation Needed
15. ✅ Investigate Zod schema type indexing errors
16. ✅ Review goober library compatibility
17. ✅ Review E2E test selectors against current application

---

## Files Requiring Immediate Attention

### TypeScript Configuration
- `/Users/mikeyoung/CODING/rebuild-6.0/tsconfig.all.json`
- Check workspace path mappings for `@shared` alias

### Server Code
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/config/env.ts:39`
  - Change `process.exit(1)` to `throw new Error(...)`

### E2E Test Configuration
- `/Users/mikeyoung/CODING/rebuild-6.0/playwright.config.ts`
  - Add `webServer` configuration to start dev server

### WebSocket Tests
- `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/memory-leak-prevention.test.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/security/voice-multi-tenancy.test.ts`
  - Fix module imports or create missing file

### Client Test Files (Mocks)
- All test files in the "Client Test Mock Data Issues" section
  - Update mock data to include nested properties

### Type Definitions
- `shared/types/restaurant.ts` (or equivalent)
  - Add `created_at: string` and `updated_at: string`
- `shared/types/user.ts` (or equivalent)
  - Add "manager" to UserRole enum

### Client Source Files (Console → Logger)
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/config/env-validator.ts:110`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/config/env.schema.ts:77,149`

### Shared Config Files (Modernization)
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/config/browser.js`
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/config/index.js`
- `/Users/mikeyoung/CODING/rebuild-6.0/shared/config/simple.js`

### Vite Config
- `/Users/mikeyoung/CODING/rebuild-6.0/client/vite.config.ts`
  - Lines: 7, 70, 126, 132, 139

---

## Success Metrics

After fixes are applied, expect:
- **Type Checking**: 0 errors
- **Linting**: 0 errors, 0 warnings
- **Client Tests**: 95%+ pass rate (488 tests)
- **Server Tests**: 95%+ pass rate (122 tests)
- **E2E Tests**: 80%+ pass rate (182 tests)
- **Overall System Health**: 90%+ (target from CLAUDE.md: "Production Readiness: 90%")

---

## Context for New Chat

**Repository State**:
- Monorepo with client (React/Vite), server (Express/TypeScript), shared workspace
- Using Supabase (remote-first), Playwright for E2E, Vitest for unit tests
- All layers use snake_case convention (ADR-001)
- Memory constrained: 3GB dev, 1GB production target

**What Was Run**:
```bash
npm run test:client   # 488 tests, 92.8% pass
npm run test:server   # 122 tests, 87.7% pass
npm run test:e2e      # 182 tests, 15.4% pass
npm run typecheck     # 33 errors
npm run lint          # 8 errors, 3 warnings
```

**Goal**: Achieve 90%+ test coverage and 0 type/lint errors across all test suites.
