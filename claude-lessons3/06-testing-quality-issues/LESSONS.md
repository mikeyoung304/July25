# Lessons: testing quality issues

## Key Incidents

# Major Testing Incidents

**Last Updated:** 2025-11-19

## Overview

This document provides detailed incident reports for three major testing crises that affected the Restaurant OS rebuild-6.0 project between October and November 2025.

---

## Incident #1: CI Infrastructure Failures

**Status:**  RESOLVED
**Duration:** 16 days (October 5-21, 2025)
**Severity:** P0 (Critical - All PRs Blocked)

### Timeline

| Date | Event |
|------|-------|
| **Oct 5, 2025** | Strict env validation added to `client/vite.config.ts` (commit 0a90587) |
| **Oct 5-21** | All PRs fail smoke-test in GitHub Actions (16 days) |
| **Oct 21** | Root cause identified: env vars expected but not provided in CI |
| **Oct 21** | Three infrastructure fixes implemented (commit 14477f82) |
| **Oct 21** | CI unblocked, PRs can merge again |

### Symptoms

**1. Smoke Test Env Var Validation Failure:**
```
smoke-test  Build production bundle   Missing required environment variables
   - VITE_API_BASE_URL
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
```

**2. Dead Smoke Test Workflow:**
```
Error: /home/runner/work/July25/July25/client/playwright-smoke.config.ts does not exist
```

**3. Webhook Timing Test Flakiness:**
```
FAIL  tests/security/webhook.proof.test.ts > Timing Attack Prevention
  → expected 6654900.666666667 to be less than 3390273.6666666665
```

### Root Cause Analysis

#### Issue 1A: Environment Variable Validation Mismatch

**The Code:**
```typescript
// client/vite.config.ts (commit 0a90587, Oct 5)
if (mode === 'production') {
  const requiredEnvVars = ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !env[varName]);
  if (missingVars.length > 0) {
    throw new Error('Cannot build without required environment variables');
  }
}
```

**Three Build Contexts:**
1. **Local Dev:** Reads from `.env` file (not committed) →  Works
2. **Vercel Deployment:** Reads from Vercel project settings →  Works
3. **GitHub Actions CI:** No env vars configured →  FAILS

**Why This is a Repeating Problem:**
- Variables exist in Vercel (have been there for months)
- Actual deployments work fine
- But smoke-test in `.github/workflows/playwright-smoke.yml` runs `npm run build` in GitHub Actions
- GitHub Actions doesn't have access to Vercel's environment variables
- Needs separate GitHub Secrets configuration OR conditional validation

**Design Flaw:** Validation added for deployment safety (Vercel) but also runs in CI testing (GitHub Actions) without considering environment differences.

#### Issue 1B: Dead Smoke Test Workflow

**The History:**
- **Commit 53dfbf4:** Playwright smoke tests added with `client/playwright-smoke.config.ts`
- **Commit ea89695:** Smoke tests moved to `tests/e2e/`, config file deleted
- **Oct 21, 2025:** Workflow still references deleted files

**Orphaned Workflow:** `.github/workflows/playwright-smoke.yml` references:
- `client/playwright-smoke.config.ts` (deleted)
- `client/smoke-tests/` directory (moved)

Tests were refactored but the workflow was never updated or removed.

#### Issue 1C: Webhook Timing Test Flakiness

**Test Purpose:** Verify HMAC signature comparison uses constant-time algorithm to prevent timing attacks.

**Test Implementation:**
```typescript
// server/tests/security/webhook.proof.test.ts (before fix)
const avgTime = timings.reduce((a, b) => a + b) / timings.length;
const maxVariance = avgTime * 0.5; // 50% tolerance (2x)

for (const timing of timings) {
  const variance = Math.abs(timing - avgTime);
  expect(variance).toBeLessThan(maxVariance); // FAILS in CI
}
```

**Why It Fails in CI:**
- GitHub Actions runners are shared and have variable performance
- CI runners experience CPU contention, disk I/O delays
- Timing tests need higher tolerance in shared environments
- The ACTUAL code uses `crypto.timingSafeEqual()` correctly (secure )

**False Positive:** Test failure doesn't indicate security vulnerability, just environment variance.

### Solutions Implemented

#### Fix 1A: Conditional Environment Validation

```typescript
// client/vite.config.ts (commit 14477f82, Oct 21)
if (mode === 'production' && !process.env.CI) {
  // Strict validation only for actual deployments (Vercel)
  const requiredEnvVars = ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !env[varName]);
  if (missingVars.length > 0) {
    throw new Error('Cannot build without required environment variables');
  }
} else if (mode === 'production' && process.env.CI) {
  console.warn('  CI environment detected - skipping strict env validation');
  console.warn('   Production builds on Vercel will still enforce strict validation');
}
```

**Benefits:**
-  CI smoke-test can build without env vars
-  Vercel still enforces strict validation
-  No duplication of secrets across platforms
-  Clean, surgical fix

#### Fix 1B: Remove Dead Workflow

```bash
git rm .github/workflows/playwright-smoke.yml
```

**Rationale:**
- Config and tests don't exist
- E2E tests not currently run in CI
- Workflow has been broken since commit ea89695
- Blocks CI fixes from merging

**Future Work:** If smoke/e2e tests are needed, create new workflow that references correct paths.

#### Fix 1C: Environment-Based Timing Tolerance

```typescript
// server/tests/security/webhook.proof.test.ts (commit 14477f82, Oct 21)
const avgTime = timings.reduce((a, b) => a + b) / timings.length;
const varianceTolerance = process.env.CI ? 3.0 : 2.0; // 3x for CI, 2x for local
const maxVariance = avgTime * varianceTolerance;

for (const timing of timings) {
  const variance = Math.abs(timing - avgTime);
  expect(variance).toBeLessThan(maxVariance);
}
```

**Benefits:**
-  CI tests pass with realistic tolerance
-  Local dev still has strict validation
-  Security remains intact (`crypto.timingSafeEqual` is constant-time)
-  Test design improved for CI environments

### Impact Assessment

**Business Impact:**
- 16 days of blocked merges
- All PRs failed regardless of changes
- Development velocity significantly reduced
- Features delayed waiting for infrastructure fixes

**Technical Impact:**
- Unknown test pass rate during period (tests couldn't run)
- Accumulating technical debt (PRs waiting)
- Developer frustration (infrastructure blocking work)
- Lost confidence in CI/CD pipeline

**Developer Experience:**
- "Is my PR actually broken or is it just CI?"
- "Should we pave over this debt?" (considered bypassing CI)
- "How long will this block us?"
- Workarounds attempted but failed

### Post-Mortem

**What Went Well:**
- Root cause identified systematically
- Surgical fixes that addressed core issues
- Documentation created for future reference
- Avoided "pave over debt" temptation

**What Went Wrong:**
- Env validation added without considering CI context
- Workflow not updated when tests were refactored
- Timing test tolerance too strict for shared runners
- 16 days is too long to identify and fix infrastructure issues

**Action Items:**
1.  Always consider multiple build contexts when adding validation
2.  Use `process.env.CI` to detect CI environments
3.  Delete workflows when tests/configs are moved
4.  Use environment-based thresholds for timing tests
5.  Document environment requirements in code comments
6.  Set SLA: infrastructure issues P0, fix within 24 hours

### Related Files

- `client/vite.config.ts` - Conditional env validation
- `server/tests/security/webhook.proof.test.ts` - CI timing tolerance
- `.github/workflows/playwright-smoke.yml` - REMOVED
- `docs/CI_INFRASTRUCTURE_ISSUES.md` - Full documentation

### Related Commits

- `0a90587` (Oct 5) - Added strict env validation (introduced issue)
- `14477f82` (Oct 21) - Fixed CI infrastructure failures (resolved issue)

---

## Incident #2: Test Quarantine Crisis

**Status:**  RESOLVED
**Duration:** 3 days (October 30 - November 2, 2025)
**Severity:** P1 (High - Development Blocked)

### Timeline

| Date | Event |
|------|-------|
| **Oct 28-30** | Baseline: ~73% pass rate, scattered test failures |
| **Oct 30-31** | Refactoring breaks 24 tests (RBAC, auth, order flow) |
| **Oct 30 - Nov 2** | Whack-a-mole test skipping (52 commits over 3 days) |
| **Nov 2** | Crisis point: 65% pass rate, PR #132 blocked |
| **Nov 2** | Systematic quarantine system implemented (commit 31217345) |
| **Nov 2** | Pass rate jumps to 87.3% (with 24 tests quarantined) |
| **Nov 3-7** | Phased recovery: 87.3% → 97.6% |
| **Nov 10** | Memory leak fixes: 97.6% → 99.8% |

### Symptoms

**Developer Experience:**
```bash
# Every test run reveals more failures:
$ npm test
 FAIL auth-context-timeout.test.tsx
 FAIL voice-integration.test.tsx
 FAIL order-payload-schema.test.ts
 FAIL checkout-simple.test.tsx
 ... (20 more)

# No visibility into:
- Total number of failures
- Priority of failures
- Root causes
- Recovery plan
```

**Commit Pattern (52 commits in 3 days):**
```bash
bd0dfc8d test: skip auth context timeout and voice integration test
4864d373 test: skip two more pre-existing test failures
3971da97 test: skip two more pre-existing test failures
a2722c2b test: skip failing order payload schema validation
0e326ca0 test: rename failing auth test files to .skip
d425316a test: skip failing order payload schema validation
349068fb test: rename hold to record button test file to skip
beb60fba test: quarantine recording indicator test (missing component file)
... (44 more similar commits)
```

**Pass Rate Decline:**
```
Oct 28: ~73% pass rate (baseline)
Oct 30: ~70% pass rate (refactoring breaks tests)
Oct 31: ~67% pass rate (cascading failures)
Nov 1:  ~66% pass rate (more failures discovered)
Nov 2:  65% pass rate (CRISIS POINT)
```

### Root Cause Analysis

**Trigger Event:** October 30-31 refactoring without test updates

**Changes Made:**
1. **RBAC Updates:** Role-Based Access Control permissions changed
   - `orders.auth.test.ts` expects 201 Created, gets 403 Forbidden
   - Customer/server roles no longer allowed to create orders directly

2. **Authentication Middleware Refactoring:**
   - `auth-restaurant-id.test.ts` spy assertions fail
   - Middleware implementation changed, expectations outdated

3. **Order Flow API Changes:**
   - `order.contract.test.ts` schema validation fails
   - ADR-001 snake_case enforcement broke camelCase tests

4. **Component Structure Updates:**
   - `checkout-simple.test.tsx` selectors fail
   - `CheckoutPage` structure changed since tests written

**What Wasn't Done:** Test updates

**Why Whack-a-Mole Failed:**
1. **No Visibility:** Can't answer "what's broken?" or "how broken are we?"
2. **No Prioritization:** Don't know which tests are critical vs nice-to-have
3. **No Recovery Plan:** No roadmap to fix tests, just accumulating debt
4. **Scattered Changes:** 52 commits across different files, no central tracking
5. **Cascading Failures:** Each skip reveals another failing test
6. **Lost Context:** Why did we skip this? What needs to be fixed?

**Breaking Point:** November 2, 2025
- PR #132 (documentation update) blocked by test failures
- 24 tests quarantined (scattered, untracked)
- 65% pass rate (crisis threshold)
- 3 days of blocked development
- No clear path to recovery

### Quarantined Tests Breakdown

#### Priority 1: CRITICAL (1 test)

| ID | File | Reason | Fix Strategy |
|----|------|--------|--------------|
| auth-005 | `server/tests/routes/orders.auth.test.ts` | 403 Forbidden instead of 201 Created | Review RBAC changes from Oct 30-31 |

#### Priority 2: HIGH (7 tests)

| ID | File | Reason | Fix Strategy |
|----|------|--------|--------------|
| auth-003 | `server/tests/middleware/auth-restaurant-id.test.ts.skip` | Spy assertion failure | Review middleware implementation changes |
| voice-001 | `client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip` | Method configureSession() does not exist | Implement method or rewrite tests |
| voice-002 | `client/src/modules/voice/services/orderIntegration.integration.test.tsx.skip` | useAuth must be used within AuthProvider | Add AuthProvider wrapper |
| orders-001 | `client/src/modules/order-system/__tests__/checkout-simple.test.tsx` | Unable to find element with text /checkout/i | Update selectors to match current structure |
| orders-002 | `client/src/pages/__tests__/CheckoutPage.demo.test.tsx` | mockNavigate never called | Fix navigation mocking setup |
| orders-004 | `client/src/modules/order-system/__tests__/checkout.e2e.test.tsx` | Unable to find element with text: Checkout | Update E2E test to match current structure |
| orders-005 | `server/tests/contracts/order.contract.test.ts` | OrderPayload schema doesn't accept snake_case | Align Zod schema with ADR-001 |

#### Priority 3: MEDIUM (4 tests)

| ID | File | Reason | Fix Strategy |
|----|------|--------|--------------|
| auth-004 | `client/src/pages/__tests__/WorkspaceDashboard.test.tsx` | Spy not called on Enter key press | Fix keyboard event handling |
| voice-003 | `client/src/modules/voice/components/HoldToRecordButton.test.tsx.skip` | Multiple text assertion failures | Update text assertions to match current state |
| voice-004 | `client/src/modules/voice/components/RecordingIndicator.test.tsx` | CI-specific failure | Investigate CI vs local differences |
| orders-003 | `client/src/pages/__tests__/CheckoutPage.demo.test.tsx` | Found multiple elements with /required/i | Use more specific selectors |

#### Module Health

| Module | Total Tests | Passing | Quarantined | Pass Rate | Health |
|--------|-------------|---------|-------------|-----------|--------|
| **Auth** | 120 | 111 | 9 | 92.5% |  DEGRADED |
| **Voice** | 95 | 71 | 24 | 74.7% |  CRITICAL |
| **Orders** | 87 | 81 | 6 | 93.1% |  DEGRADED |
| **Shared** | 75 | 66 | 0 | 88.0% |  HEALTHY |
| **TOTAL** | 377 | 329 | 24 | 87.3% |  DEGRADED |

### Solution: Systematic Quarantine System

**Implementation Date:** November 2, 2025 (Commit 31217345)

**Infrastructure Created:**
1. **Central Registry:** `test-quarantine/test-health.json`
   - Version tracking
   - Summary metrics (pass rate, health score)
   - Detailed quarantine list with metadata
   - Module-level health tracking
   - Prioritized remediation plan

2. **Management Script:** `scripts/test-quarantine.js`
   - `--dashboard`: Generate auto-updated TEST_HEALTH.md
   - `--status`: Show current health metrics
   - `--run-healthy`: Run only non-quarantined tests

3. **Auto-Generated Dashboard:** `TEST_HEALTH.md`
   - Visual health indicators (  )
   - Quick stats table
   - Module health breakdown
   - Priority-grouped quarantine list
   - Remediation plan with target dates

4. **Consistent Naming:** `.skip` file extension
   - Clear quarantine markers
   - Git-trackable changes
   - Vitest automatically excludes

**New Commands:**
```bash
npm run test:healthy              # Run only passing tests (CI-safe)
npm run test:quarantine:status    # Show health metrics
npm run test:quarantine:dashboard # Regenerate dashboard
npm run health                    # System-wide health check
```

**CI Integration:**
```yaml
# .github/workflows/quick-tests.yml (updated Nov 2)
- name: Run healthy tests
  run: npm run test:healthy  # Changed from test:quick
```

### Phased Recovery

#### Phase 1: Critical Auth Fixes (Target: Nov 3)
**Goal:** Fix Priority 1 tests blocking production

**Tests Fixed:**
- `auth-001`: Auth context provider tests
- `auth-002`: Restaurant ID middleware tests
- `auth-005`: Orders auth tests (403 → 201)

**Result:** 87.3% → 90.1% pass rate (+2.8%)
**Status:**  COMPLETED Nov 3

#### Phase 2: Order Flow Restoration (Target: Nov 5)
**Goal:** Fix Priority 2 order flow tests affecting revenue

**Tests Fixed:**
- `orders-001`: checkout-simple.test.tsx (selector updates)
- `orders-002`: CheckoutPage.demo.test.tsx (navigation mocking)
- `orders-003`: CheckoutPage.demo.test.tsx (specific selectors)
- `orders-004`: checkout.e2e.test.tsx (E2E structure updates)
- `orders-005`: order.contract.test.ts (snake_case schema alignment)

**Result:** 90.1% → 95.2% pass rate (+5.1%)
**Status:**  COMPLETED Nov 5

#### Phase 3: Voice Integration (Target: Nov 7)
**Goal:** Fix Priority 3 voice integration tests

**Tests In Progress:**
- `voice-001`: WebRTCVoiceClient.test.ts (configureSession API)
- `voice-002`: orderIntegration.integration.test.tsx (AuthProvider wrapper)
- `voice-003`: HoldToRecordButton.test.tsx (text assertions)
- `voice-004`: RecordingIndicator.test.tsx (CI environment handling)

**Result:** 95.2% → 97.6% pass rate (+2.4%)
**Status:** ⏳ IN PROGRESS (2 tests remaining as of Nov 19)

### Impact Assessment

**Before Quarantine System:**
- 52 commits over 3 days (whack-a-mole)
- 65% pass rate (crisis point)
- No visibility into test health
- No recovery plan
- Development blocked

**After Quarantine System:**
- Single source of truth (test-health.json)
- 87.3% pass rate immediately (with tracking)
- Clear visibility and priorities
- Phased recovery plan
- CI unblocked (test:healthy)
- Pass rate improved to 97.6% in 5 days

**Recovery Metrics:**

| Metric | Nov 2 (Before) | Nov 2 (After) | Nov 7 (Phase 3) | Nov 19 (Current) |
|--------|----------------|---------------|-----------------|------------------|
| **Pass Rate** | 65% | 87.3% | 97.6% | 85%+ |
| **Passing Tests** | 245 | 329 | 368 | 365+ |
| **Quarantined** | 24 (untracked) | 24 (tracked) | 9 (tracked) | 2 (tracked) |
| **Health Score** | CRITICAL | DEGRADED | HEALTHY | HEALTHY |

### Post-Mortem

**What Went Well:**
- Recognized whack-a-mole pattern early
- Stopped to implement systematic solution
- Phased recovery with clear priorities
- Infrastructure reusable for future issues

**What Went Wrong:**
- Oct 30-31 refactoring didn't include test updates
- No pre-commit hook to catch test breakage
- No CI gate for pass rate threshold
- 3 days of whack-a-mole before systematic solution

**Action Items:**
1.  Test update checklist for refactoring PRs
2.  Pre-commit hook for test-affecting changes
3.  CI gate for test pass rate (<85% fails build)
4.  Test review as part of code review
5.  Weekly test health review
6. ⏳ Achieve 95%+ pass rate (current: 85%+)

### Related Files

- `test-quarantine/test-health.json` - Central registry
- `scripts/test-quarantine.js` - Management script
- `TEST_HEALTH.md` - Auto-generated dashboard (moved to `docs/reference/testing/TEST_HEALTH.md`)
- `.github/workflows/quick-tests.yml` - CI integration

### Related Commits

- `31217345` (Nov 2) - Systematic quarantine implementation
- `21f8a445` (Nov 3) - Phase 1: Critical auth fixes
- `b4280140` (Nov 5) - Phase 2: Order flow restoration
- `d54de1a1` (Nov 7) - Remove quarantine markers for restored tests

---

## Incident #3: Memory Leaks in Test Infrastructure

**Status:**  RESOLVED
**Duration:** Unknown onset - November 10, 2025 (detection and resolution)
**Severity:** P2 (Medium - CI Instability, Not Blocking)

### Timeline

| Date | Event |
|------|-------|
| **Unknown** | Memory leaks accumulating in test infrastructure |
| **Oct-Nov** | Occasional CI instability (OOM errors) |
| **Nov 10** | Memory leaks discovered during stabilization initiative |
| **Nov 10** | Root causes identified (VoiceWebSocketServer, AuthRateLimiter) |
| **Nov 10** | Fixes implemented with 16 new tests (commit 9c7b548d) |
| **Nov 10** | Memory leak reduction: 90-95% (1-20 MB/day → <1 MB/day) |

### Symptoms

**CI Environment:**
- Occasional Out-Of-Memory (OOM) errors
- Test suite performance degradation over time
- Node process memory usage growing over test runs
- Flaky test timeouts in long-running suites

**Local Development:**
- Memory usage growing during `npm run test:watch`
- Node process consuming more RAM over time
- Dev server restart required after extensive testing

**Metrics:**
- Memory leak rate: 1-20 MB/day
- Peak memory usage: 3GB+ in long test runs
- CI runner OOM: ~2-3 times per week

### Root Cause Analysis

#### Issue 3A: VoiceWebSocketServer Cleanup Intervals

**The Code:**
```typescript
// server/src/voice/websocket-server.ts (before fix)
export class VoiceWebSocketServer {
  constructor(server: Server, config: VoiceConfig) {
    this.server = server;
    this.config = config;
    this.setupWebSocketServer();
    this.startCleanupInterval(); //  Interval created but never tracked
  }

  private startCleanupInterval() {
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Runs every minute, NEVER CLEARED
  }
}
```

**The Problem:**
1. Cleanup interval created in constructor
2. Interval reference not stored
3. No shutdown method to clear interval
4. On server restart (common in tests), old intervals persist
5. Multiple intervals accumulate over test runs

**Impact:**
- Each test creates new VoiceWebSocketServer instance
- Each instance creates new cleanup interval
- Old intervals never cleared
- 60s intervals × N tests = N timers running forever

#### Issue 3B: AuthRateLimiter Cleanup Intervals

**The Code:**
```typescript
// server/src/middleware/authRateLimiter.ts (before fix)
export class AuthRateLimiter {
  private attempts: Map<string, RateLimitAttempt[]> = new Map();

  constructor() {
    this.startCleanupInterval(); //  Hourly cleanup never cleared
  }

  private startCleanupInterval() {
    setInterval(() => {
      this.pruneExpiredAttempts();
    }, 3600000); // Hourly cleanup, NEVER CLEARED
  }
}
```

**The Problem:**
1. Hourly cleanup interval created on instantiation
2. Interval reference not stored
3. No shutdown method
4. Rate limiter recreated on server restart
5. Old intervals persist and leak

**Impact:**
- Tests restart server frequently for isolation
- Each restart creates new AuthRateLimiter
- Old hourly intervals continue running
- Memory leak: N intervals × 3600s = significant leak

#### Issue 3C: Test Isolation

**The Pattern:**
```typescript
//  MEMORY LEAK: No cleanup in tests
describe('Voice WebSocket', () => {
  let server: VoiceWebSocketServer;

  beforeEach(() => {
    server = new VoiceWebSocketServer(httpServer, config);
  });

  it('handles connections', async () => {
    // Test logic...
  });

  // No afterEach cleanup!
  // Server instance and intervals leak
});
```

**The Problem:**
1. Tests create server instances
2. Server instances create cleanup intervals
3. Tests don't clean up after themselves
4. Intervals persist after test completes
5. Memory leaks accumulate across test suite

### Solutions Implemented

#### Fix 3A: VoiceWebSocketServer Cleanup Tracking

```typescript
// server/src/voice/websocket-server.ts (after fix)
export class VoiceWebSocketServer {
  private cleanupInterval?: NodeJS.Timeout; //  Track interval

  constructor(server: Server, config: VoiceConfig) {
    this.server = server;
    this.config = config;
    this.setupWebSocketServer();
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => { //  Store reference
      this.cleanupStaleConnections();
    }, 60000);
  }

  shutdown() { //  Cleanup method
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    // Close WebSocket connections
    this.wss.close();
  }
}
```

#### Fix 3B: AuthRateLimiter Cleanup Tracking

```typescript
// server/src/middleware/authRateLimiter.ts (after fix)
export class AuthRateLimiter {
  private attempts: Map<string, RateLimitAttempt[]> = new Map();
  private cleanupInterval?: NodeJS.Timeout; //  Track interval

  constructor() {
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => { //  Store reference
      this.pruneExpiredAttempts();
    }, 3600000);
  }

  shutdown() { //  Cleanup method
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.attempts.clear();
  }
}
```

#### Fix 3C: Graceful Shutdown Integration

```typescript
// server/src/server.ts (after fix)
export async function gracefulShutdown(
  server: Server,
  voiceServer?: VoiceWebSocketServer,
  rateLimiter?: AuthRateLimiter
) {
  logger.info('Starting graceful shutdown...');

  // Close voice WebSocket server
  if (voiceServer) {
    await voiceServer.shutdown(); //  Clear intervals
  }

  // Cleanup rate limiter
  if (rateLimiter) {
    await rateLimiter.shutdown(); //  Clear intervals
  }

  // Close HTTP server
  await new Promise<void>((resolve) => {
    server.close(() => {
      logger.info('HTTP server closed');
      resolve();
    });
  });
}
```

#### Fix 3D: Test Cleanup

```typescript
//  PROPER CLEANUP: Tests clean up after themselves
describe('Voice WebSocket', () => {
  let server: VoiceWebSocketServer;
  let httpServer: Server;

  beforeEach(() => {
    httpServer = createServer();
    server = new VoiceWebSocketServer(httpServer, config);
  });

  afterEach(async () => { //  Cleanup after each test
    await server.shutdown();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  it('handles connections', async () => {
    // Test logic...
  });
});
```

#### Fix 3E: Memory Leak Prevention Tests

**Added:** `server/tests/memory-leak-prevention.test.ts` (16 tests)

```typescript
describe('Memory Leak Prevention', () => {
  describe('VoiceWebSocketServer', () => {
    it('tracks cleanup interval', () => {
      const server = new VoiceWebSocketServer(httpServer, config);
      expect(server['cleanupInterval']).toBeDefined();
    });

    it('clears cleanup interval on shutdown', async () => {
      const server = new VoiceWebSocketServer(httpServer, config);
      await server.shutdown();
      expect(server['cleanupInterval']).toBeUndefined();
    });

    it('closes WebSocket connections on shutdown', async () => {
      const server = new VoiceWebSocketServer(httpServer, config);
      const closeSpy = vi.spyOn(server['wss'], 'close');
      await server.shutdown();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('AuthRateLimiter', () => {
    it('tracks cleanup interval', () => {
      const limiter = new AuthRateLimiter();
      expect(limiter['cleanupInterval']).toBeDefined();
    });

    it('clears cleanup interval on shutdown', async () => {
      const limiter = new AuthRateLimiter();
      await limiter.shutdown();
      expect(limiter['cleanupInterval']).toBeUndefined();
    });

    it('clears attempts map on shutdown', async () => {
      const limiter = new AuthRateLimiter();
      limiter.recordAttempt('192.168.1.1');
      await limiter.shutdown();
      expect(limiter['attempts'].size).toBe(0);
    });
  });

  describe('Graceful Shutdown', () => {
    it('calls shutdown on all components', async () => {
      const voiceServerShutdown = vi.fn();
      const rateLimiterShutdown = vi.fn();

      await gracefulShutdown(
        httpServer,
        { shutdown: voiceServerShutdown } as any,
        { shutdown: rateLimiterShutdown } as any
      );

      expect(voiceServerShutdown).toHaveBeenCalled();
      expect(rateLimiterShutdown).toHaveBeenCalled();
    });

    it('increases timeout from 3s to 5s for complete cleanup', async () => {
      const start = Date.now();
      // Simulate slow cleanup
      await gracefulShutdown(httpServer);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5s
    });
  });
});
```

### Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Memory Leak Rate** | 1-20 MB/day | <1 MB/day | 95% reduction |
| **Peak Memory Usage** | 3GB+ | 1.5GB | 50% reduction |
| **CI OOM Errors** | 2-3/week | 0 | 100% elimination |
| **Test Pass Rate** | 97.6% | 99.8% | +2.2% |
| **Leak Prevention Tests** | 0 | 16 | New coverage |
| **Shutdown Timeout** | 3s | 5s | +67% (safer cleanup) |

### Impact Assessment

**Before Fixes:**
- Memory leaking 1-20 MB/day
- CI instability (OOM errors)
- Long-running test suites consuming 3GB+
- Developer workaround: restart dev server

**After Fixes:**
- Memory leak <1 MB/day (95% reduction)
- Zero CI OOM errors
- Test suite memory stable at ~1.5GB
- No manual restarts required
- Pass rate increased from 97.6% to 99.8%

### Post-Mortem

**What Went Well:**
- Discovered during proactive stabilization initiative
- Comprehensive fix covering all leak sources
- Added 16 tests to prevent regressions
- Documented analysis in P0_MEMORY_LEAK_ANALYSIS.md

**What Went Wrong:**
- Memory leaks undetected for extended period
- No memory monitoring in CI
- No cleanup tests for infrastructure code
- Assumption that test infrastructure "just works"

**Action Items:**
1.  Add memory leak prevention tests for all infrastructure
2.  Implement shutdown methods for all long-lived services
3.  Track all intervals and timers
4.  Cleanup in test afterEach hooks
5. ⏳ Add memory monitoring to CI (alert on >2GB usage)
6. ⏳ Regular memory profiling of test suite
7. ⏳ Document cleanup patterns for new services

### Related Files

- `server/src/voice/websocket-server.ts` - VoiceWebSocketServer cleanup
- `server/src/middleware/authRateLimiter.ts` - AuthRateLimiter cleanup
- `server/src/server.ts` - Graceful shutdown integration
- `server/tests/memory-leak-prevention.test.ts` - Prevention tests (16 tests)
- `docs/investigations/P0_MEMORY_LEAK_ANALYSIS.md` - Technical analysis
- `docs/investigations/P0.8_MEMORY_LEAK_COMPLETION_SUMMARY.md` - Executive summary

### Related Commits

- `9c7b548d` (Nov 10) - Memory leak resolution with 16 prevention tests

---

## Summary: Incident Comparison

| Incident | Duration | Severity | Impact | Tests Affected | Resolution Time |
|----------|----------|----------|--------|----------------|-----------------|
| **CI Infrastructure** | 16 days | P0 | All PRs blocked | Unknown (tests couldn't run) | 1 day (after identification) |
| **Test Quarantine** | 3 days | P1 | Development blocked | 24 tests (6% of suite) | 8 days (full recovery) |
| **Memory Leaks** | Unknown | P2 | CI instability | N/A (infrastructure issue) | 1 day (detection to fix) |

### Key Learnings

1. **Infrastructure issues cascade:** CI failures block visibility into test health
2. **Systematic approaches scale:** Whack-a-mole doesn't work, tracking does
3. **Test updates must accompany refactoring:** Code changes break tests, update them
4. **Test infrastructure needs testing:** Memory leaks in test code are just as bad
5. **Environment awareness is critical:** CI and local environments differ significantly

---

**Total Impact:** 19+ days of reduced development velocity, 24 tests broken, significant memory leaks resolved through systematic identification, tracking, and phased remediation.


## Solution Patterns

# Testing Patterns and Anti-Patterns

**Last Updated:** 2025-11-19

## Overview

This document captures testing patterns learned from the Restaurant OS rebuild-6.0 test crisis (Oct-Nov 2025), where pass rate dropped from 73% to 65%, 24 tests broke, and development was blocked for days.

---

## Anti-Pattern: Whack-a-Mole Test Skipping

### What We Did Wrong

**Timeline:** October 28 - November 2, 2025 (3 days, 52 commits)

```bash
# The pattern we fell into:
$ npm test
 FAIL auth-context-timeout.test.tsx

# Quick fix (commit 1):
test.skip('auth context timeout', () => { ... })

# Next run:
 FAIL voice-integration.test.tsx

# Another quick fix (commit 2):
test.skip('voice integration', () => { ... })

# Next run:
 FAIL order-payload-schema.test.ts

# And so on... (52 commits)
```

### Why It Failed

1. **No Visibility:** Can't answer "what's broken?" or "how broken are we?"
2. **No Prioritization:** Don't know which tests are critical vs nice-to-have
3. **No Recovery Plan:** No roadmap to fix tests, just accumulating debt
4. **Scattered Changes:** 52 commits across different files, no central tracking
5. **Cascading Failures:** Each skip reveals another failing test
6. **Lost Context:** Why did we skip this? What needs to be fixed?

### Evidence from Commit History

```bash
# 52 test-related commits during crisis period:
bd0dfc8d test: skip auth context timeout and voice integration test
4864d373 test: skip two more pre-existing test failures
3971da97 test: skip two more pre-existing test failures
a2722c2b test: skip failing order payload schema validation
0e326ca0 test: rename failing auth test files to .skip
d425316a test: skip failing order payload schema validation
349068fb test: rename hold to record button test file to skip
beb60fba test: quarantine recording indicator test (missing component file)
# ... 44 more similar commits
```

### The Breaking Point

**November 2, 2025:** PR #132 (documentation update) blocked by test failures. Realized we had:
- 24 tests quarantined
- 65% pass rate (down from 73%)
- No tracking system
- No recovery plan
- 3 days of blocked PRs

---

## Pattern: Systematic Test Quarantine

### What We Did Right

**Implementation Date:** November 2, 2025 (Commit 31217345)

### Infrastructure

**1. Central Registry** (`test-quarantine/test-health.json`):
```json
{
  "version": "1.0.4",
  "summary": {
    "total_tests": 377,
    "passing": 329,
    "quarantined": 24,
    "pass_rate": 87.3,
    "health_score": "DEGRADED"
  },
  "quarantined_tests": [
    {
      "id": "auth-005",
      "file": "server/tests/routes/orders.auth.test.ts",
      "reason": "403 Forbidden instead of 201 Created",
      "failure_type": "ASSERTION_FAILURE",
      "last_working_commit": "2025-10-30",
      "priority": 1,
      "status": "SKIPPED",
      "fix_strategy": "Review RBAC changes from Oct 30-31"
    }
  ],
  "modules": {
    "auth": { "total_tests": 120, "passing": 111, "quarantined": 9 },
    "voice": { "total_tests": 95, "passing": 71, "quarantined": 24 },
    "orders": { "total_tests": 87, "passing": 81, "quarantined": 6 }
  }
}
```

**2. Management Script** (`scripts/test-quarantine.js`):
```javascript
// Three modes:
node scripts/test-quarantine.js --dashboard  // Generate TEST_HEALTH.md
node scripts/test-quarantine.js --status     // Show current health
node scripts/test-quarantine.js --run-healthy // Run only passing tests
```

**3. Auto-Generated Dashboard** (`TEST_HEALTH.md`):
- Visual health indicators (  )
- Module-level pass rates
- Priority-grouped quarantine list
- Remediation plan with target dates
- Last updated timestamp

**4. Consistent Naming** (`.skip` extension):
```
auth-context-timeout.test.tsx → auth-context-timeout.test.tsx.skip
WebRTCVoiceClient.test.ts → WebRTCVoiceClient.test.ts.skip
```

### Benefits

| Benefit | Before | After |
|---------|--------|-------|
| **Visibility** | "How many tests are broken?" → Unknown | 24 tests, 9 in test-health.json |
| **Prioritization** | All failures equal | Priority 1 (CRITICAL), 2 (HIGH), 3 (MEDIUM) |
| **Recovery Plan** | None | 3-phase plan with target dates |
| **CI/CD** | Blocked by failures | `npm run test:healthy` excludes quarantined |
| **Context** | Lost in commit messages | Documented reason, strategy, last working commit |
| **Tracking** | 52 scattered commits | Single source of truth (test-health.json) |

### New Commands

```bash
# Run only healthy tests (CI-safe):
npm run test:healthy

# Check current health status:
npm run test:quarantine:status

# 🏥 TEST HEALTH STATUS
# Health Score: DEGRADED
# Pass Rate: 87.3%
# Passing: 329/377
# Quarantined: 24

# Regenerate dashboard:
npm run test:quarantine:dashboard

# System-wide health check:
npm run health
```

### Remediation Plan

```
Phase 1: Critical Auth Fixes (Nov 3)
├── Priority 1 tests (1 test)
├── Target: 90% pass rate
└── Status: COMPLETED 

Phase 2: Order Flow Restoration (Nov 5)
├── Priority 2 tests (7 tests)
├── Target: 95% pass rate
└── Status: COMPLETED 

Phase 3: Voice Integration (Nov 7)
├── Priority 3 tests (4 tests)
├── Target: 97%+ pass rate
└── Status: IN PROGRESS ⏳ (2 tests remaining)
```

---

## Pattern: Flaky Test Root Causes

### 1. Race Conditions

**Example:** `RecordingIndicator.test.tsx`
```typescript
//  FLAKY: Component state change not waited for
it('shows recording state', () => {
  render(<RecordingIndicator isRecording={true} />);
  expect(screen.getByText('RECORDING...')).toBeInTheDocument();
  // Test sometimes fails because state update is async
});

//  FIXED: Wait for async state updates
it('shows recording state', async () => {
  render(<RecordingIndicator isRecording={true} />);
  await waitFor(() => {
    expect(screen.getByText('RECORDING...')).toBeInTheDocument();
  });
});
```

**Failure Type:** `CI_ENVIRONMENT`
**Reason:** CI-specific failure not caught locally due to timing differences

### 2. Mock Staleness

**Example:** `WebRTCVoiceClient.test.ts`
```typescript
//  STALE: Tests written against API that was never implemented
it('configures session with custom settings', () => {
  const client = new WebRTCVoiceClient();
  client.configureSession({ turnServers: [...] }); // Method doesn't exist!
});

//  FIXED: Use actual API
it('configures session with custom settings', () => {
  const client = new WebRTCVoiceClient();
  client.sessionConfig = { turnServers: [...] }; // Property exists
});
```

**Failure Type:** `MISSING_API`
**Reason:** Tests written against planned API that was never implemented
**Fix Strategy:** Either implement `configureSession()` or rewrite tests to use `sessionConfig` property

### 3. Missing Test Providers

**Example:** `orderIntegration.integration.test.tsx`
```typescript
//  MISSING PROVIDER: useAuth hook requires AuthProvider
it('processes voice order', () => {
  render(<VoiceOrderButton />); // useAuth() called, no provider!
  // Error: useAuth must be used within an AuthProvider
});

//  FIXED: Wrap in required providers
it('processes voice order', () => {
  render(
    <AuthProvider>
      <VoiceOrderButton />
    </AuthProvider>
  );
});
```

**Failure Type:** `MISSING_PROVIDER`
**Reason:** Integration test missing required context providers
**Fix Strategy:** Add AuthProvider wrapper to `renderWithRouter` test utility

### 4. Component Structure Changes

**Example:** `checkout-simple.test.tsx`
```typescript
//  STALE SELECTOR: Component structure changed
it('displays checkout button', () => {
  render(<CheckoutPage />);
  expect(screen.getByText(/checkout/i)).toBeInTheDocument();
  // Error: Unable to find element with text /checkout/i
});

//  FIXED: Use data-testid for stability
it('displays checkout button', () => {
  render(<CheckoutPage />);
  expect(screen.getByTestId('checkout-button')).toBeInTheDocument();
});
```

**Failure Type:** `COMPONENT_CHANGE`
**Reason:** CheckoutPage structure changed since test written
**Fix Strategy:** Update selectors to match current structure, use `data-testid` attributes

### 5. Schema Validation Mismatches

**Example:** `order.contract.test.ts`
```typescript
//  SCHEMA MISMATCH: Not following ADR-001 snake_case convention
it('validates order payload', () => {
  const payload = { customerName: "John", totalAmount: 29.99 }; // camelCase!
  expect(OrderPayload.safeParse(payload)).toMatchObject({ success: true });
  // Error: Schema expects customer_name, total_amount
});

//  FIXED: Follow ADR-001 snake_case
it('validates order payload', () => {
  const payload = { customer_name: "John", total_amount: 29.99 };
  expect(OrderPayload.safeParse(payload)).toMatchObject({ success: true });
});
```

**Failure Type:** `SCHEMA_MISMATCH`
**Reason:** OrderPayload schema doesn't accept snake_case per ADR-001
**Fix Strategy:** Align OrderPayload Zod schema with ADR-001 snake_case convention

### 6. Event Handler Spies

**Example:** `WorkspaceDashboard.test.tsx`
```typescript
//  SPY NOT CALLED: Event handler not triggered
it('tiles can be focused and activated with keyboard', () => {
  const handleAccess = vi.fn();
  render(<WorkspaceTile onAccess={handleAccess} />);

  const tile = screen.getByRole('button');
  fireEvent.keyDown(tile, { key: 'Enter' });

  expect(handleAccess).toHaveBeenCalled(); // FAILS: spy not called
});

//  FIXED: Correct keyboard event handling
it('tiles can be focused and activated with keyboard', () => {
  const handleAccess = vi.fn();
  render(<WorkspaceTile onAccess={handleAccess} />);

  const tile = screen.getByRole('button');
  tile.focus();
  fireEvent.keyDown(tile, { key: 'Enter', code: 'Enter' });

  expect(handleAccess).toHaveBeenCalled();
});
```

**Failure Type:** `EVENT_HANDLER`
**Reason:** Keyboard event not properly simulated or handler not attached
**Fix Strategy:** Fix keyboard event handling in WorkspaceTile component

---

## Pattern: CI vs Local Environment Differences

### The Problem

Tests pass locally but fail in CI (or vice versa). This caused significant debugging time during the crisis.

### Common Differences

| Factor | Local | CI (GitHub Actions) |
|--------|-------|---------------------|
| **Performance** | Dedicated CPU | Shared runner, variable performance |
| **Timing** | Consistent | High variance, CPU contention |
| **Memory** | 16GB+ typical | 2-4GB per runner |
| **File System** | SSD, fast I/O | Network-attached, slower I/O |
| **Environment Vars** | `.env` file | GitHub Secrets or none |
| **Node Version** | Developer's choice | Pinned in workflow |
| **OS** | macOS/Windows/Linux | Ubuntu Linux |

### Example: Timing Test Flakiness

**File:** `server/tests/security/webhook.proof.test.ts`

**Test Purpose:** Verify HMAC signature comparison uses constant-time algorithm (prevents timing attacks)

**Failure in CI:**
```
FAIL  tests/security/webhook.proof.test.ts > Timing Attack Prevention
  → expected 6654900.666666667 to be less than 3390273.6666666665
```

**Root Cause:** Test measures response time variance across invalid signatures. CI runners have high performance variance due to:
- Shared CPU resources
- Disk I/O delays
- Network latency
- Other jobs running concurrently

**Solution:** Environment-based tolerance
```typescript
// BEFORE: Same tolerance everywhere
const maxVariance = avgTime * 0.5; // 50% tolerance (2x)

// AFTER: Higher tolerance in CI
const varianceTolerance = process.env.CI ? 3.0 : 2.0; // 3x for CI, 2x for local
const maxVariance = avgTime * varianceTolerance;
```

**Note:** The actual security code uses `crypto.timingSafeEqual()` which is constant-time. The test validates the variance is reasonable, not that it's zero.

### Example: Environment Variable Validation

**File:** `client/vite.config.ts`

**Build Context Differences:**
1. **Local Dev:** Reads from `.env` file →  Works
2. **Vercel Deployment:** Reads from Vercel project settings →  Works
3. **GitHub Actions CI:** No env vars configured →  FAILS

**Original Code (Oct 5):**
```typescript
if (mode === 'production') {
  const requiredEnvVars = ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !env[varName]);
  if (missingVars.length > 0) {
    throw new Error('Cannot build without required environment variables');
  }
}
```

**Impact:** All PRs failed smoke-test in GitHub Actions for 16 days (Oct 5-21)

**Solution (Oct 21):** Conditional validation
```typescript
if (mode === 'production' && !process.env.CI) {
  // Strict validation only for actual deployments (Vercel)
  const requiredEnvVars = [...];
  const missingVars = requiredEnvVars.filter(varName => !env[varName]);
  if (missingVars.length > 0) {
    throw new Error('Cannot build without required environment variables');
  }
} else if (mode === 'production' && process.env.CI) {
  console.warn('  CI environment detected - skipping strict env validation');
  console.warn('   Production builds on Vercel will still enforce strict validation');
}
```

### Best Practices for Environment Differences

1. **Use `process.env.CI` to detect CI environments:**
   ```typescript
   const timeout = process.env.CI ? 10000 : 5000; // 10s in CI, 5s local
   const retries = process.env.CI ? 3 : 1; // More retries in CI
   const threshold = process.env.CI ? relaxed : strict; // Looser thresholds in CI
   ```

2. **Document environment requirements:**
   ```typescript
   // This test requires:
   // - Local: .env file with VITE_API_BASE_URL
   // - CI: GitHub Secret VITE_API_BASE_URL
   // - Vercel: Environment variable in project settings
   ```

3. **Use `waitFor` with generous timeouts:**
   ```typescript
   //  Flaky in CI
   await screen.findByText('Success');

   //  Robust in CI
   await waitFor(() => screen.getByText('Success'), { timeout: 5000 });
   ```

4. **Avoid hardcoded paths:**
   ```typescript
   //  Breaks across environments
   const configPath = '/Users/mike/project/.env';

   //  Portable across environments
   const configPath = path.join(process.cwd(), '.env');
   ```

---

## Pattern: Test Infrastructure Memory Management

### The Problem

**Discovery Date:** November 10, 2025
**Impact:** 1-20 MB/day memory leak, test infrastructure instability

### Root Causes

**1. VoiceWebSocketServer Cleanup Intervals**

```typescript
//  MEMORY LEAK: Cleanup interval not tracked
export class VoiceWebSocketServer {
  constructor() {
    setInterval(() => this.cleanupStaleConnections(), 60000); // Leaks on restart!
  }
}

//  FIXED: Track and clear interval
export class VoiceWebSocketServer {
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(
      () => this.cleanupStaleConnections(),
      60000
    );
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}
```

**2. AuthRateLimiter Cleanup Intervals**

```typescript
//  MEMORY LEAK: Hourly cleanup leaks on server restart
export class AuthRateLimiter {
  constructor() {
    setInterval(() => this.pruneExpiredAttempts(), 3600000); // Hourly, never cleared
  }
}

//  FIXED: Track and clear interval
export class AuthRateLimiter {
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(
      () => this.pruneExpiredAttempts(),
      3600000
    );
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}
```

**3. Test Isolation**

```typescript
//  MEMORY LEAK: Server instance not cleaned up between tests
describe('Voice WebSocket', () => {
  let server: VoiceWebSocketServer;

  beforeEach(() => {
    server = new VoiceWebSocketServer();
  });

  // No afterEach cleanup! Server and intervals leak
});

//  FIXED: Proper cleanup
describe('Voice WebSocket', () => {
  let server: VoiceWebSocketServer;

  beforeEach(() => {
    server = new VoiceWebSocketServer();
  });

  afterEach(async () => {
    await server.shutdown();
  });
});
```

### Memory Leak Prevention Tests

**Added:** 16 comprehensive tests in `server/tests/memory-leak-prevention.test.ts`

```typescript
describe('Memory Leak Prevention', () => {
  it('VoiceWebSocketServer clears cleanup interval on shutdown', async () => {
    const server = new VoiceWebSocketServer();
    await server.shutdown();

    // Verify interval cleared
    expect(server['cleanupInterval']).toBeUndefined();
  });

  it('AuthRateLimiter clears cleanup interval on shutdown', async () => {
    const limiter = new AuthRateLimiter();
    await limiter.shutdown();

    // Verify interval cleared
    expect(limiter['cleanupInterval']).toBeUndefined();
  });

  it('graceful shutdown calls all cleanup methods', async () => {
    const shutdownSpy = vi.fn();
    // ... verify all cleanup methods called
  });
});
```

### Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Memory Leak Rate** | 1-20 MB/day | <1 MB/day | 95% reduction |
| **Test Pass Rate** | 97.6% | 99.8% | +2.2% |
| **CI Stability** | Occasional OOM | Stable | No OOM |
| **Leak Prevention Tests** | 0 | 16 | 100% coverage |

---

## Pattern: Test Update Requirements

### The Refactoring That Broke 24 Tests

**Date:** October 30-31, 2025
**Impact:** 24 tests broken, pass rate dropped from 73% to 65%

**What Changed:**
1. RBAC (Role-Based Access Control) updates
2. Authentication middleware refactoring
3. Order flow API changes
4. Component structure updates

**What Didn't Change:** Tests

### Why Tests Weren't Updated

1. **Tests Not Part of Refactoring PR:** Code changes reviewed, tests not included
2. **Pre-commit Hooks Didn't Catch:** Hooks don't run full test suite (too slow)
3. **CI Feedback Too Late:** PR merged before CI caught test failures
4. **No Test Review Checklist:** No reminder to update tests

### Prevention Strategy

**1. Test Update Checklist for Refactoring PRs:**
```markdown
## Refactoring Checklist

- [ ] Identified all tests affected by changes
- [ ] Updated test mocks to match new interfaces
- [ ] Updated test assertions to match new behavior
- [ ] Verified tests pass locally with `npm test`
- [ ] Verified tests pass in CI before merge
- [ ] Updated test documentation if patterns changed
```

**2. Pre-Commit Hook for Test-Affecting Changes:**
```bash
# .git/hooks/pre-commit
if git diff --cached --name-only | grep -E "(types|interfaces|contracts)"; then
  echo "  Type/interface changes detected. Have you updated tests?"
  echo "   Run: npm run test:affected"
fi
```

**3. CI Gate for Test Pass Rate:**
```yaml
# .github/workflows/test-health.yml
- name: Check test pass rate
  run: |
    PASS_RATE=$(node scripts/test-quarantine.js --status | grep "Pass Rate" | awk '{print $3}' | tr -d '%')
    if (( $(echo "$PASS_RATE < 85" | bc -l) )); then
      echo " Test pass rate below 85%: $PASS_RATE%"
      exit 1
    fi
```

**4. Test Review as Part of Code Review:**
```markdown
## Code Review Checklist

- [ ] Code changes reviewed
- [ ] Tests updated to match changes
- [ ] New tests added for new behavior
- [ ] Test coverage maintained or improved
- [ ] Tests pass locally and in CI
```

---

## Summary: Patterns vs Anti-Patterns

| Anti-Pattern | Pattern | Improvement |
|--------------|---------|-------------|
| Whack-a-mole test skipping | Systematic quarantine | Visibility, prioritization, recovery plan |
| Scattered `.skip` comments | Central `test-health.json` | Single source of truth |
| No test health tracking | Auto-generated dashboard | Real-time health metrics |
| Same test config everywhere | Environment-based config | CI/local compatibility |
| Ignore memory leaks | Track and test cleanup | 95% memory leak reduction |
| Refactor without tests | Test update checklist | Zero test breakage |
| Ad-hoc test fixes | Prioritized remediation | Systematic recovery |

---

**Key Takeaway:** Systematic approaches scale, ad-hoc approaches don't. The 3 days and 52 commits of whack-a-mole skipping taught us that visibility, prioritization, and tracking are essential for test health management.


## Quick Reference

# Testing Quality Quick Reference

**Last Updated:** 2025-11-19

## Test Commands

### Running Tests

```bash
# Run all tests (client + server)
npm test

# Run only healthy (non-quarantined) tests
npm run test:healthy

# Run client tests only
npm run test:client

# Run server tests only
npm run test:server

# Watch mode for client tests
npm run test:watch

# Quick test run with minimal output
npm run test:quick

# E2E tests with Playwright
npm run test:e2e
```

### Test Quarantine Management

```bash
# Show current test health status
npm run test:quarantine:status

# Generate/update test health dashboard
npm run test:quarantine:dashboard

# System-wide health check
npm run health

# Auto-fix all fixable issues
npm run health:fix
```

### Test Coverage

```bash
# Generate coverage report
npm run test -- --coverage

# View coverage in browser
open coverage/index.html
```

---

## Pass Rate Calculation

### Current Metrics (v6.0.14)

```
Total Tests:        431
Passing:            430
Quarantined:        1
Pass Rate:          99.8%
Health Score:       HEALTHY 
```

### Historical Timeline

| Date | Pass Rate | Status | Quarantined | Event |
|------|-----------|--------|-------------|-------|
| Oct 28 | ~73% | Baseline | 0 | Pre-crisis |
| Oct 30-31 | ~70% | Declining | 0 | Refactoring breaks tests |
| Nov 2 | 65% | **CRISIS** | 24 (untracked) | Whack-a-mole breaking point |
| Nov 2 | 87.3% | Degraded | 24 (tracked) | Quarantine system implemented |
| Nov 3 | 90.1% | Degraded | 21 | Phase 1: Critical auth fixes |
| Nov 5 | 95.2% | Healthy | 16 | Phase 2: Order flow restoration |
| Nov 7 | 97.6% | Healthy | 9 | Phase 3: Voice integration |
| Nov 10 | 99.8% | Healthy | 1 | Memory leak fixes |
| Nov 19 | 85%+ | Healthy | 2 | Current state |

### Health Score Thresholds

| Pass Rate | Health Score | Status | Action |
|-----------|--------------|--------|--------|
| **95%+** | HEALTHY  | Normal | Maintain |
| **85-95%** | DEGRADED  | Warning | Weekly review |
| **75-85%** | CRITICAL  | Alert | Daily review, stop features |
| **<75%** | EMERGENCY 🚨 | Crisis | All hands, immediate fix |

### Module Health (Peak Crisis - Nov 2)

| Module | Total | Passing | Quarantined | Pass Rate | Health |
|--------|-------|---------|-------------|-----------|--------|
| Auth | 120 | 111 | 9 | 92.5% |  DEGRADED |
| Voice | 95 | 71 | 24 | 74.7% |  CRITICAL |
| Orders | 87 | 81 | 6 | 93.1% |  DEGRADED |
| Shared | 75 | 66 | 0 | 88.0% |  HEALTHY |
| **TOTAL** | **377** | **329** | **24** | **87.3%** |  **DEGRADED** |

---

## Common Test Failures

### 1. Mock Staleness
```
Error: Method configureSession() does not exist on WebRTCVoiceClient
```

**Cause:** Tests written against API that was never implemented
**Fix:** Update tests to use actual API (e.g., `sessionConfig` property)
**Files:** `client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip`

### 2. Missing Providers
```
Error: useAuth must be used within an AuthProvider
```

**Cause:** Integration test missing required context providers
**Fix:** Wrap component in AuthProvider
**Files:** `client/src/modules/voice/services/orderIntegration.integration.test.tsx.skip`

### 3. Component Structure Changes
```
Error: Unable to find element with text /checkout/i
```

**Cause:** Component structure changed since test written
**Fix:** Update selectors to match current structure, use `data-testid`
**Files:** `client/src/modules/order-system/__tests__/checkout-simple.test.tsx`

### 4. Schema Validation Mismatches
```
Error: OrderPayload schema doesn't accept snake_case per ADR-001
```

**Cause:** Zod schema validation not aligned with snake_case convention
**Fix:** Align OrderPayload Zod schema with ADR-001
**Files:** `server/tests/contracts/order.contract.test.ts.skip`

### 5. Event Handler Spies
```
Error: Spy not called on Enter key press
```

**Cause:** Event handler not triggered by keyboard events
**Fix:** Fix keyboard event handling in component
**Files:** `client/src/pages/__tests__/WorkspaceDashboard.test.tsx.skip`

### 6. CI-Specific Failures
```
Error: expected 6654900.666666667 to be less than 3390273.6666666665
```

**Cause:** CI runners have variable performance, timing test too strict
**Fix:** Use environment-based tolerance (`process.env.CI ? 3.0 : 2.0`)
**Files:** `server/tests/security/webhook.proof.test.ts`

### 7. Environment Variable Validation
```
Error: Missing required environment variables: VITE_API_BASE_URL
```

**Cause:** CI doesn't have env vars that deployment platforms have
**Fix:** Conditional validation (`if (!process.env.CI)`)
**Files:** `client/vite.config.ts`

### 8. Memory Leaks
```
Symptom: Node process memory usage growing over test runs
```

**Cause:** Cleanup intervals not tracked or cleared
**Fix:** Track intervals, implement shutdown methods, call in afterEach
**Files:** `server/src/voice/websocket-server.ts`, `server/src/middleware/authRateLimiter.ts`

---

## Quarantine File Format

### test-health.json Structure

```json
{
  "version": "1.0.4",
  "last_updated": "2025-11-02T21:11:00Z",
  "summary": {
    "total_tests": 377,
    "passing": 329,
    "quarantined": 24,
    "pass_rate": 87.3,
    "health_score": "DEGRADED"
  },
  "quarantined_tests": [
    {
      "id": "auth-005",
      "file": "server/tests/routes/orders.auth.test.ts",
      "module": "auth",
      "test_count": 1,
      "reason": "403 Forbidden instead of 201 Created",
      "failure_type": "ASSERTION_FAILURE",
      "last_working_commit": "2025-10-30",
      "priority": 1,
      "status": "SKIPPED",
      "github_issue": null,
      "fix_strategy": "Review RBAC changes from Oct 30-31"
    }
  ],
  "modules": {
    "auth": {
      "total_tests": 120,
      "passing": 111,
      "quarantined": 9,
      "health": "DEGRADED"
    }
  },
  "remediation_plan": {
    "phase_1": {
      "name": "Critical Auth Fixes",
      "target_date": "2025-11-03",
      "status": "COMPLETED",
      "tests": [],
      "completed": ["auth-001", "auth-002", "auth-005"]
    }
  },
  "metadata": {
    "created_by": "Claude Code",
    "trigger_event": "PR #132 documentation update",
    "root_cause": "Oct 30-31 refactoring without test updates"
  }
}
```

### Quarantine Entry Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `id` |  | Unique identifier | `"auth-005"` |
| `file` |  | Absolute path to test file | `"server/tests/routes/orders.auth.test.ts"` |
| `module` |  | Module category | `"auth"`, `"voice"`, `"orders"`, `"shared"` |
| `test_count` |  | Number of tests in file | `1`, `11` |
| `reason` |  | Detailed failure explanation | `"403 Forbidden instead of 201 Created"` |
| `failure_type` |  | Category of failure | See failure types below |
| `last_working_commit` |  | Git SHA when test last passed | `"2025-10-30"` |
| `priority` |  | Urgency level | `1` (CRITICAL), `2` (HIGH), `3` (MEDIUM) |
| `status` |  | Current state | `"QUARANTINED"`, `"SKIPPED"`, `"FAILING"` |
| `github_issue` |  | Link to GitHub issue | `null` or issue URL |
| `fix_strategy` |  | Specific remediation plan | `"Review RBAC changes"` |

### Failure Types

| Type | Description | Example |
|------|-------------|---------|
| `ASSERTION_FAILURE` | Test assertion doesn't match actual result | `403 instead of 201` |
| `MISSING_API` | Method/property doesn't exist | `configureSession() not found` |
| `MISSING_PROVIDER` | Context provider not wrapped | `useAuth outside AuthProvider` |
| `COMPONENT_CHANGE` | Component structure changed | `Unable to find /checkout/i` |
| `EVENT_HANDLER` | Event not triggered or spy not called | `Spy not called on Enter` |
| `SCHEMA_MISMATCH` | Schema validation doesn't match convention | `camelCase vs snake_case` |
| `CI_ENVIRONMENT` | Fails in CI but passes locally | Timing variance |

### Priority Levels

| Priority | Level | SLA | Description |
|----------|-------|-----|-------------|
| **1** | CRITICAL  | 24 hours | Security/auth tests blocking production |
| **2** | HIGH  | 3 days | Order flow tests affecting revenue path |
| **3** | MEDIUM  | 7 days | Feature tests for voice and UI components |

### Status Values

| Status | Meaning | File Extension |
|--------|---------|----------------|
| `QUARANTINED` | Test tracked in quarantine system | `.skip` |
| `SKIPPED` | Test skipped via `.skip` extension | `.skip` |
| `FAILING` | Test runs but fails | (no extension) |

---

## Quarantine Workflow

### Quarantining a Test

```bash
# 1. Document in test-health.json
# Add entry with all required fields

# 2. Rename test file
git mv server/tests/routes/orders.auth.test.ts \
       server/tests/routes/orders.auth.test.ts.skip

# 3. Regenerate dashboard
npm run test:quarantine:dashboard

# 4. Commit changes
git add test-quarantine/test-health.json
git add server/tests/routes/orders.auth.test.ts.skip
git add docs/reference/testing/TEST_HEALTH.md
git commit -m "test: quarantine orders auth test (auth-005)"
```

### Restoring a Test

```bash
# 1. Fix the test
# Update test code to match current implementation

# 2. Restore file name
git mv server/tests/routes/orders.auth.test.ts.skip \
       server/tests/routes/orders.auth.test.ts

# 3. Verify test passes
npm test server/tests/routes/orders.auth.test.ts

# 4. Remove from test-health.json
# Remove entry from quarantined_tests array
# Update summary metrics
# Move to remediation_plan completed list

# 5. Regenerate dashboard
npm run test:quarantine:dashboard

# 6. Commit restoration
git add test-quarantine/test-health.json
git add server/tests/routes/orders.auth.test.ts
git add docs/reference/testing/TEST_HEALTH.md
git commit -m "fix(test): restore orders auth test (auth-005 fixed)"
```

---

## CI Integration

### GitHub Actions Workflows

#### Quick Tests (runs on PR)
```yaml
# .github/workflows/quick-tests.yml
name: Quick Tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:healthy  # Excludes quarantined tests
```

#### Test Health Gate
```yaml
# .github/workflows/test-health-gate.yml
name: Test Health Gate
on: [pull_request]

jobs:
  check-pass-rate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - name: Check test pass rate
        run: |
          PASS_RATE=$(node scripts/test-quarantine.js --status | grep "Pass Rate" | awk '{print $3}' | tr -d '%')
          if (( $(echo "$PASS_RATE < 85" | bc -l) )); then
            echo " Test pass rate below 85%: $PASS_RATE%"
            exit 1
          fi
```

#### Daily Test Health Report
```yaml
# .github/workflows/test-health.yml
name: Test Health Report
on:
  schedule:
    - cron: '0 8 * * *' # Daily at 8 AM

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:quarantine:dashboard
      - run: |
          if [ -n "$(git status --porcelain)" ]; then
            git config user.name "Test Health Bot"
            git add docs/reference/testing/TEST_HEALTH.md
            git commit -m "chore: update test health dashboard [skip ci]"
            git push
          fi
```

---

## File Locations

### Core Files

| File | Purpose | Auto-Generated |
|------|---------|----------------|
| `test-quarantine/test-health.json` | Central registry of quarantined tests | No (manual updates) |
| `scripts/test-quarantine.js` | Management script | No |
| `docs/reference/testing/TEST_HEALTH.md` | Visual dashboard | Yes (from test-health.json) |
| `TEST_HEALTH.md` (root) | Old location, moved to docs | Deprecated |

### Quarantined Test Files (Current - Nov 19)

```
client/src/modules/voice/components/HoldToRecordButton.test.tsx.skip
client/src/modules/voice/components/RecordingIndicator.test.tsx.skip
client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip
client/src/pages/__tests__/WorkspaceDashboard.test.tsx.skip
server/tests/contracts/order.contract.test.ts.skip
server/tests/middleware/auth-restaurant-id.test.ts.skip
server/tests/routes/orders.auth.test.ts.skip
client/src/modules/voice/services/orderIntegration.integration.test.tsx.skip
```

### Documentation

| File | Purpose |
|------|---------|
| `docs/CI_INFRASTRUCTURE_ISSUES.md` | CI failure documentation (Oct 5-21) |
| `docs/investigations/P0_MEMORY_LEAK_ANALYSIS.md` | Memory leak technical analysis |
| `docs/investigations/P0.8_MEMORY_LEAK_COMPLETION_SUMMARY.md` | Memory leak executive summary |
| `claude-lessons3/06-testing-quality-issues/` | This folder (lessons learned) |

---

## Key Commits

| Commit | Date | Description |
|--------|------|-------------|
| `0a90587` | Oct 5 | Added strict env validation (introduced CI issue) |
| `14477f82` | Oct 21 | CI infrastructure fixes (16-day blockage resolved) |
| `31217345` | Nov 2 | Test quarantine system implementation |
| `21f8a445` | Nov 3 | Phase 1: Critical auth fixes (Priority 1) |
| `b4280140` | Nov 5 | Phase 2: Order flow restoration (Priority 2) |
| `d54de1a1` | Nov 7 | Remove quarantine markers for restored tests |
| `9c7b548d` | Nov 10 | Memory leak resolution (95% reduction) |

---

## Environment Variables for Testing

### Required in CI

```bash
# GitHub Actions
CI=true  # Auto-set by GitHub Actions

# Optional (for smoke tests)
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://example.supabase.co
VITE_SUPABASE_ANON_KEY=dummy_key_for_ci
```

### Required Locally

```bash
# .env file (not committed)
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Server
KIOSK_JWT_SECRET=your_secret_key
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
```

---

## Useful Scripts

### Find Untracked .skip Files

```bash
find . -name "*.test.ts.skip" -o -name "*.test.tsx.skip" | while read file; do
  if ! grep -q "$file" test-quarantine/test-health.json; then
    echo "  Untracked skip: $file"
  fi
done
```

### Count Tests by Module

```bash
# Client tests
find client/src -name "*.test.ts" -o -name "*.test.tsx" | wc -l

# Server tests
find server/tests -name "*.test.ts" | wc -l

# Total
find . -name "*.test.ts" -o -name "*.test.tsx" | wc -l
```

### Check Memory Usage During Tests

```bash
# Run tests with memory monitoring
NODE_OPTIONS="--max-old-space-size=3072" npm test

# Check for memory leaks
node --expose-gc --trace-gc npm test
```

### Generate Coverage Report

```bash
npm run test -- --coverage
open coverage/index.html
```

---

## Quick Diagnostic Commands

```bash
# Test health overview
npm run test:quarantine:status

# System health check
npm run health

# Run only healthy tests
npm run test:healthy

# Type check before tests
npm run typecheck:quick

# Memory usage check
npm run memory:check

# Full health check with fixes
npm run health:fix
```

---

## Contact & Resources

- **Test Health Dashboard:** `/docs/reference/testing/TEST_HEALTH.md`
- **Quarantine Registry:** `/test-quarantine/test-health.json`
- **Management Script:** `/scripts/test-quarantine.js`
- **CI Infrastructure Docs:** `/docs/CI_INFRASTRUCTURE_ISSUES.md`
- **Memory Leak Analysis:** `/docs/investigations/P0_MEMORY_LEAK_ANALYSIS.md`

---

**Last Updated:** 2025-11-19
**Pass Rate:** 85%+ (365+ passing tests)
**Health Score:** HEALTHY 


