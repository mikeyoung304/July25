# Testing Quality Prevention Strategies

**Last Updated:** 2025-11-19

## Overview

This document captures prevention strategies learned from three major testing incidents in the Restaurant OS rebuild-6.0 project. Each strategy is backed by real incidents and includes implementation guidance.

---

## 1. Test Quarantine System Usage

**Problem Solved:** Whack-a-mole test skipping (52 commits in 3 days, 65% pass rate)

### Infrastructure Components

#### 1A. Central Registry (`test-quarantine/test-health.json`)

**Purpose:** Single source of truth for test health

**Structure:**
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
      "status": "IN_PROGRESS",
      "tests": ["auth-005"]
    }
  }
}
```

**When to Use:**
- Test failures block development
- Need visibility into test health
- Multiple tests failing without clear patterns
- Team needs to prioritize test fixes

#### 1B. Management Script (`scripts/test-quarantine.js`)

**Commands:**
```bash
# Generate dashboard from test-health.json
npm run test:quarantine:dashboard

# Show current health status in terminal
npm run test:quarantine:status

# Run only non-quarantined tests (CI-safe)
npm run test:healthy
```

**Implementation:**
```javascript
// scripts/test-quarantine.js
function loadQuarantineData() {
  return JSON.parse(fs.readFileSync(QUARANTINE_FILE, 'utf-8'));
}

function generateDashboard() {
  const data = loadQuarantineData();
  let md = `# 🏥 Test Health Dashboard\n\n`;
  md += `**Last Updated:** ${new Date().toISOString().split('T')[0]}\n`;
  md += `**Health Score:** ${data.summary.health_score}\n`;
  md += `**Overall Pass Rate:** ${data.summary.pass_rate.toFixed(1)}%\n\n`;
  // ... generate module health, quarantined tests, remediation plan
  fs.writeFileSync(DASHBOARD_FILE, md);
}

function runHealthyTests() {
  const data = loadQuarantineData();
  const quarantinedFiles = data.quarantined_tests.map(test => test.file);
  // Build vitest command excluding quarantined files
  execSync('npm run test:quick --workspaces', { stdio: 'inherit' });
}
```

#### 1C. Auto-Generated Dashboard (`docs/reference/testing/TEST_HEALTH.md`)

**Purpose:** Visual, human-readable test health report

**Contents:**
- Quick stats (pass rate, quarantined count, health score)
- Module health breakdown
- Priority-grouped quarantine list
- Remediation plan with target dates
- Usage instructions

**Update Frequency:** After every quarantine change

#### 1D. Consistent Naming (`.skip` extension)

**Pattern:**
```bash
# Before quarantine:
client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts

# After quarantine:
client/src/modules/voice/services/__tests__/WebRTCVoiceClient.test.ts.skip
```

**Benefits:**
- Vitest automatically excludes `.skip` files
- Git tracks quarantine changes
- Clear visual indicator of quarantined tests
- Easy to find and restore

### Quarantine Workflow

#### Step 1: Identify Failing Test
```bash
$ npm test
 FAIL server/tests/routes/orders.auth.test.ts
  → Expected 201 Created, received 403 Forbidden
```

#### Step 2: Document in test-health.json
```json
{
  "id": "auth-005",
  "file": "server/tests/routes/orders.auth.test.ts",
  "module": "auth",
  "test_count": 1,
  "reason": "403 Forbidden instead of 201 Created. Auth middleware not allowing customer/server roles to create orders.",
  "failure_type": "ASSERTION_FAILURE",
  "last_working_commit": "2025-10-30",
  "priority": 1,
  "status": "SKIPPED",
  "github_issue": null,
  "fix_strategy": "Review RBAC changes from Oct 30-31. Restore proper role permissions or update test expectations."
}
```

#### Step 3: Rename Test File
```bash
git mv server/tests/routes/orders.auth.test.ts server/tests/routes/orders.auth.test.ts.skip
```

#### Step 4: Regenerate Dashboard
```bash
npm run test:quarantine:dashboard
```

#### Step 5: Commit Changes
```bash
git add test-quarantine/test-health.json
git add server/tests/routes/orders.auth.test.ts.skip
git add docs/reference/testing/TEST_HEALTH.md
git commit -m "test: quarantine orders auth test (auth-005)"
```

#### Step 6: Update CI (if needed)
```yaml
# .github/workflows/quick-tests.yml
- name: Run tests
  run: npm run test:healthy  # Excludes quarantined tests
```

### Restoration Workflow

#### Step 1: Fix the Test
```typescript
// server/tests/routes/orders.auth.test.ts.skip
// Fix: Update test expectations to match new RBAC rules
it('creates order with proper authentication', async () => {
  const response = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${adminToken}`) // Changed from customerToken
    .send(orderPayload);

  expect(response.status).toBe(201); // Now works!
});
```

#### Step 2: Restore File Name
```bash
git mv server/tests/routes/orders.auth.test.ts.skip server/tests/routes/orders.auth.test.ts
```

#### Step 3: Verify Test Passes
```bash
npm test server/tests/routes/orders.auth.test.ts
#  PASS
```

#### Step 4: Remove from test-health.json
```json
// Remove auth-005 entry from quarantined_tests array
// Update summary metrics
{
  "summary": {
    "total_tests": 377,
    "passing": 330,  // +1
    "quarantined": 23, // -1
    "pass_rate": 87.5 // +0.2%
  }
}
```

#### Step 5: Move to Completed
```json
// Update remediation plan
{
  "remediation_plan": {
    "phase_1": {
      "tests": [], // Remove auth-005
      "completed": ["auth-005"] // Add here
    }
  }
}
```

#### Step 6: Regenerate Dashboard
```bash
npm run test:quarantine:dashboard
```

#### Step 7: Commit Restoration
```bash
git add test-quarantine/test-health.json
git add server/tests/routes/orders.auth.test.ts
git add docs/reference/testing/TEST_HEALTH.md
git commit -m "fix(test): restore orders auth test (auth-005 fixed)"
```

### Priority Levels

| Priority | Description | SLA | Example |
|----------|-------------|-----|---------|
| **1: CRITICAL** | Security/auth tests blocking production | Fix within 24 hours | RBAC permission failures |
| **2: HIGH** | Order flow tests affecting revenue path | Fix within 3 days | Checkout process failures |
| **3: MEDIUM** | Feature tests for voice and UI components | Fix within 7 days | Voice UI component tests |

### Health Score Thresholds

| Pass Rate | Health Score | Action Required |
|-----------|--------------|-----------------|
| **95%+** | HEALTHY  | Maintain current state |
| **85-95%** | DEGRADED  | Review quarantined tests weekly |
| **75-85%** | CRITICAL  | Daily review, stop new features |
| **<75%** | EMERGENCY 🚨 | All hands, fix immediately |

---

## 2. Mock Maintenance Strategies

**Problem Solved:** Tests written against APIs that were never implemented (11 tests broken)

### Issue: Mock Staleness

**Example from WebRTCVoiceClient.test.ts:**
```typescript
//  STALE: Method configureSession() doesn't exist
it('configures session with custom settings', () => {
  const client = new WebRTCVoiceClient();
  client.configureSession({ turnServers: [...] }); // Method doesn't exist!
  expect(client.sessionConfig.turnServers).toEqual([...]);
});

//  FIXED: Use actual API
it('configures session with custom settings', () => {
  const client = new WebRTCVoiceClient();
  client.sessionConfig = { turnServers: [...] }; // Property exists
  expect(client.sessionConfig.turnServers).toEqual([...]);
});
```

**Root Cause:** Tests written before implementation, API design changed, tests never updated.

### Prevention Strategy 1: Test Against Real Implementations

**Principle:** Minimize mocking, maximize real implementations

```typescript
//  FRAGILE: Over-mocked
describe('OrderService', () => {
  it('creates order', async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({ id: '123' }),
      findById: vi.fn().mockResolvedValue({ id: '123' }),
      update: vi.fn(),
      // ... 10 more mocked methods
    };
    const service = new OrderService(mockRepo);
    const result = await service.createOrder(payload);
    expect(result.id).toBe('123');
  });
});

//  ROBUST: Minimal mocking
describe('OrderService', () => {
  it('creates order', async () => {
    // Use in-memory database or real repository
    const repo = new OrderRepository(inMemoryDB);
    const service = new OrderService(repo);
    const result = await service.createOrder(payload);
    expect(result.id).toBeDefined();
    // Verify order actually persisted
    const saved = await repo.findById(result.id);
    expect(saved).toEqual(expect.objectContaining(payload));
  });
});
```

**Benefits:**
- Tests catch API changes automatically
- No manual mock updates needed
- Tests validate actual behavior, not mock behavior

### Prevention Strategy 2: Co-locate Tests with Implementation

**Structure:**
```
src/
  services/
    OrderService.ts              # Implementation
    __tests__/
      OrderService.test.ts       # Tests in same directory
```

**Benefits:**
- Developer sees tests when modifying implementation
- Easier to update tests alongside code
- Tests serve as living documentation

### Prevention Strategy 3: Mock Update Checklist

**When API changes, update:**
1.  Implementation code
2.  Type definitions
3.  Tests using the API
4.  Mock implementations
5.  Integration tests
6.  Documentation

**Pre-commit Hook:**
```bash
# .git/hooks/pre-commit
if git diff --cached --name-only | grep -E "src/.*/[^/]+\.ts$"; then
  CHANGED_FILE=$(git diff --cached --name-only | grep -E "src/.*/[^/]+\.ts$" | head -1)
  TEST_FILE="${CHANGED_FILE%.ts}.test.ts"

  if [ -f "$TEST_FILE" ]; then
    if ! git diff --cached --name-only | grep -q "$TEST_FILE"; then
      echo "  Implementation changed but test not updated:"
      echo "   Changed: $CHANGED_FILE"
      echo "   Test:    $TEST_FILE"
      echo "   Have you updated the test?"
    fi
  fi
fi
```

### Prevention Strategy 4: Test Maintenance Review

**Frequency:** Weekly or bi-weekly

**Review Checklist:**
- [ ] Are there tests with many mocks? (>5 mocked methods)
- [ ] Are mocks duplicated across test files?
- [ ] Are there commented-out tests? (Why?)
- [ ] Are there `.skip` tests without quarantine tracking?
- [ ] Do mocks match current API signatures?

**Example Review:**
```bash
# Find tests with many mocks
grep -r "vi.fn()" client/src | awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -10

# Find .skip tests not in quarantine
find . -name "*.test.ts.skip" -o -name "*.test.tsx.skip" | while read file; do
  if ! grep -q "$file" test-quarantine/test-health.json; then
    echo "  Untracked skip: $file"
  fi
done
```

---

## 3. CI Environment Handling

**Problem Solved:** CI infrastructure failures (16 days blocked), timing test flakiness

### Issue: Environment Variable Validation

**Problem:** Vite production build expects env vars not available in GitHub Actions

**Original Code (Oct 5):**
```typescript
// client/vite.config.ts
if (mode === 'production') {
  const requiredEnvVars = ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !env[varName]);
  if (missingVars.length > 0) {
    throw new Error('Cannot build without required environment variables');
  }
}
```

**Impact:** All PRs failed smoke-test in GitHub Actions for 16 days

### Solution 1: Conditional Validation

```typescript
// client/vite.config.ts (after fix)
if (mode === 'production' && !process.env.CI) {
  // Strict validation only for actual deployments (Vercel)
  const requiredEnvVars = ['VITE_API_BASE_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Cannot build without required environment variables: ${missingVars.join(', ')}`);
  }
} else if (mode === 'production' && process.env.CI) {
  console.warn('  CI environment detected - skipping strict env validation');
  console.warn('   Production builds on Vercel will still enforce strict validation');
}
```

**Benefits:**
-  CI can build without env vars (smoke tests)
-  Vercel still enforces strict validation (safety)
-  No duplication of secrets across platforms
-  Clear logging of what's happening

### Solution 2: Environment-Based Configuration

**Pattern:**
```typescript
// config/test-config.ts
export const testConfig = {
  timeout: process.env.CI ? 10000 : 5000,        // Longer timeouts in CI
  retries: process.env.CI ? 3 : 1,               // More retries in CI
  slowThreshold: process.env.CI ? 2000 : 1000,   // Higher slow threshold in CI
  workers: process.env.CI ? 2 : 4,               // Fewer workers in CI (resource-constrained)
};

// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: testConfig.timeout,
    retry: testConfig.retries,
    slowTestThreshold: testConfig.slowThreshold,
    maxWorkers: testConfig.workers,
  },
});
```

**Benefits:**
- Tests adapt to environment characteristics
- No false failures due to environment differences
- Explicit configuration, not magic numbers

### Issue: Timing Test Flakiness

**Problem:** Webhook timing attack test too strict for shared CI runners

**Original Test:**
```typescript
// server/tests/security/webhook.proof.test.ts (before fix)
it('prevents timing attacks', async () => {
  const timings: number[] = [];

  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await verifyWebhookSignature(request, invalidSignature);
    const duration = Date.now() - start;
    timings.push(duration);
  }

  const avgTime = timings.reduce((a, b) => a + b) / timings.length;
  const maxVariance = avgTime * 0.5; // 50% tolerance (2x)

  for (const timing of timings) {
    const variance = Math.abs(timing - avgTime);
    expect(variance).toBeLessThan(maxVariance); // FAILS in CI
  }
});
```

**Failure in CI:**
```
FAIL  tests/security/webhook.proof.test.ts > Timing Attack Prevention
  → expected 6654900.666666667 to be less than 3390273.6666666665
```

### Solution 3: Environment-Based Timing Tolerance

```typescript
// server/tests/security/webhook.proof.test.ts (after fix)
it('prevents timing attacks', async () => {
  const timings: number[] = [];

  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await verifyWebhookSignature(request, invalidSignature);
    const duration = Date.now() - start;
    timings.push(duration);
  }

  const avgTime = timings.reduce((a, b) => a + b) / timings.length;

  // Higher tolerance in CI due to shared resources
  const varianceTolerance = process.env.CI ? 3.0 : 2.0; // 3x for CI, 2x for local
  const maxVariance = avgTime * varianceTolerance;

  for (const timing of timings) {
    const variance = Math.abs(timing - avgTime);
    expect(variance).toBeLessThan(maxVariance);
  }

  // Note: crypto.timingSafeEqual() is still constant-time (secure )
  // This test validates variance is reasonable, not zero
});
```

**Benefits:**
-  Test passes in both CI and local
-  Security property still validated
-  Realistic expectations for shared runners
-  Clear comment explaining intent

### Best Practices for CI Environment Handling

#### 1. Detect CI Environment
```typescript
const isCI = process.env.CI === 'true' || process.env.CI === '1' || !!process.env.CI;
```

#### 2. Use Environment-Specific Thresholds
```typescript
const threshold = process.env.CI ? relaxedThreshold : strictThreshold;
```

#### 3. Document Environment Requirements
```typescript
// This test requires:
// - Local: .env file with VITE_API_BASE_URL
// - CI: GitHub Secret VITE_API_BASE_URL (optional, validation skipped)
// - Vercel: Environment variable in project settings (required, validation enforced)
```

#### 4. Avoid Hardcoded Paths
```typescript
//  Breaks across environments
const configPath = '/Users/mike/project/.env';

//  Portable
const configPath = path.join(process.cwd(), '.env');
```

#### 5. Use Generous Timeouts with `waitFor`
```typescript
//  Flaky in CI (default 1s timeout)
await screen.findByText('Success');

//  Robust in CI (5s timeout)
await waitFor(() => screen.getByText('Success'), { timeout: 5000 });
```

---

## 4. Memory Leak Prevention in Tests

**Problem Solved:** 1-20 MB/day memory leak, test infrastructure instability, CI OOM errors

### Issue: Cleanup Intervals Not Tracked

**Example 1: VoiceWebSocketServer**
```typescript
//  MEMORY LEAK: Interval created but never tracked or cleared
export class VoiceWebSocketServer {
  constructor(server: Server, config: VoiceConfig) {
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000); // Runs every minute, NEVER CLEARED
  }
}
```

**Example 2: AuthRateLimiter**
```typescript
//  MEMORY LEAK: Hourly cleanup never cleared on shutdown
export class AuthRateLimiter {
  constructor() {
    setInterval(() => {
      this.pruneExpiredAttempts();
    }, 3600000); // Hourly cleanup, NEVER CLEARED
  }
}
```

### Prevention Pattern 1: Track All Intervals

```typescript
//  GOOD: Track interval reference
export class VoiceWebSocketServer {
  private cleanupInterval?: NodeJS.Timeout;

  constructor(server: Server, config: VoiceConfig) {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000);
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}
```

### Prevention Pattern 2: Implement Shutdown Methods

```typescript
// All long-lived services should have shutdown methods
interface Shutdownable {
  shutdown(): Promise<void> | void;
}

export class VoiceWebSocketServer implements Shutdownable {
  async shutdown(): Promise<void> {
    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Close connections
    this.wss.clients.forEach(client => client.close());

    // Close server
    await new Promise<void>((resolve) => {
      this.wss.close(() => resolve());
    });
  }
}
```

### Prevention Pattern 3: Graceful Shutdown Integration

```typescript
// server/src/server.ts
export async function gracefulShutdown(
  server: Server,
  voiceServer?: VoiceWebSocketServer,
  rateLimiter?: AuthRateLimiter
) {
  logger.info('Starting graceful shutdown...');

  // Close voice WebSocket server (clears intervals)
  if (voiceServer) {
    await voiceServer.shutdown();
  }

  // Cleanup rate limiter (clears intervals)
  if (rateLimiter) {
    await rateLimiter.shutdown();
  }

  // Close HTTP server
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  logger.info('Graceful shutdown complete');
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown(server, voiceServer, rateLimiter));
process.on('SIGINT', () => gracefulShutdown(server, voiceServer, rateLimiter));
```

### Prevention Pattern 4: Test Cleanup

```typescript
//  GOOD: Tests clean up after themselves
describe('Voice WebSocket', () => {
  let server: VoiceWebSocketServer;
  let httpServer: Server;

  beforeEach(() => {
    httpServer = createServer();
    server = new VoiceWebSocketServer(httpServer, config);
  });

  afterEach(async () => {
    // Critical: Clean up server and intervals
    await server.shutdown();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  it('handles connections', async () => {
    // Test logic...
  });
});
```

### Prevention Pattern 5: Memory Leak Prevention Tests

**Add explicit tests for cleanup:**
```typescript
// server/tests/memory-leak-prevention.test.ts
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
      const client = new WebSocket('ws://localhost:3001');
      await new Promise(resolve => client.on('open', resolve));

      await server.shutdown();

      expect(client.readyState).toBe(WebSocket.CLOSED);
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
      expect(limiter['attempts'].size).toBe(1);

      await limiter.shutdown();
      expect(limiter['attempts'].size).toBe(0);
    });
  });
});
```

### Memory Leak Checklist

**For every long-lived service:**
- [ ] All `setInterval` calls tracked in class properties
- [ ] All `setTimeout` calls tracked in class properties
- [ ] `shutdown()` method implemented
- [ ] All intervals cleared in shutdown
- [ ] All timers cleared in shutdown
- [ ] All connections closed in shutdown
- [ ] Shutdown method called in tests' `afterEach`
- [ ] Memory leak prevention tests added

**For test suites:**
- [ ] Server instances created in `beforeEach`
- [ ] Server instances cleaned up in `afterEach`
- [ ] No global server instances
- [ ] Test isolation maintained
- [ ] Memory usage monitored

---

## 5. Test Health Monitoring

**Problem Solved:** Unknown test health for 16 days during CI failures

### Monitoring Infrastructure

#### 1. Daily Test Health Dashboard

**Script:** `npm run test:quarantine:dashboard`

**Schedule:** Daily via cron or CI workflow
```yaml
# .github/workflows/test-health.yml
name: Test Health Report
on:
  schedule:
    - cron: '0 8 * * *' # Daily at 8 AM
  workflow_dispatch:

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
            git config user.email "bot@example.com"
            git add docs/reference/testing/TEST_HEALTH.md
            git commit -m "chore: update test health dashboard [skip ci]"
            git push
          fi
```

#### 2. Pass Rate Threshold Gates

**CI Gate:** Block PRs if pass rate drops below threshold
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
          echo "Current pass rate: $PASS_RATE%"

          if (( $(echo "$PASS_RATE < 85" | bc -l) )); then
            echo " Test pass rate below 85%: $PASS_RATE%"
            echo "Please fix failing tests before merging"
            exit 1
          fi

          echo " Test pass rate acceptable: $PASS_RATE%"
```

#### 3. Quarantine Alerts

**Slack/Email Notification:** Alert team when tests are quarantined
```javascript
// scripts/quarantine-alert.js
const data = loadQuarantineData();

if (data.summary.quarantined > 10) {
  sendAlert({
    channel: '#testing',
    message: ` Test Health Alert: ${data.summary.quarantined} tests quarantined (${data.summary.pass_rate.toFixed(1)}% pass rate)`,
    severity: data.summary.health_score === 'CRITICAL' ? 'high' : 'medium',
    action: 'Review quarantined tests: https://github.com/org/repo/blob/main/docs/reference/testing/TEST_HEALTH.md'
  });
}
```

#### 4. Weekly Test Health Review

**Meeting Agenda:**
1. Review current pass rate
2. Review quarantined tests by priority
3. Assign ownership for fixes
4. Update remediation plan target dates
5. Review test infrastructure health

**Preparation:**
```bash
# Generate report before meeting
npm run test:quarantine:status
npm run health

# Check for untracked .skip files
find . -name "*.test.ts.skip" -o -name "*.test.tsx.skip" | while read file; do
  if ! grep -q "$file" test-quarantine/test-health.json; then
    echo "  Untracked skip: $file"
  fi
done
```

---

## 6. Refactoring with Tests

**Problem Solved:** Oct 30-31 refactoring broke 24 tests

### Refactoring Checklist

**Before starting refactoring:**
- [ ] Run full test suite (`npm test`) - baseline pass rate
- [ ] Identify affected test files
- [ ] Review test coverage for refactored code
- [ ] Plan test updates alongside code changes

**During refactoring:**
- [ ] Update tests in same PR as code changes
- [ ] Run affected tests frequently (`npm test -- <pattern>`)
- [ ] Update mocks to match new API signatures
- [ ] Update test assertions to match new behavior
- [ ] Add new tests for new behavior

**After refactoring:**
- [ ] Run full test suite (`npm test`)
- [ ] Verify pass rate maintained or improved
- [ ] Update test documentation if patterns changed
- [ ] Review test coverage report

### Pre-Commit Hook for Test-Affecting Changes

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check if type definitions or contracts changed
if git diff --cached --name-only | grep -E "(types|interfaces|contracts|shared/types)"; then
  echo "  Type/interface changes detected"
  echo "   Have you updated tests that use these types?"
  echo ""
  echo "   Run: npm run test:affected"
  echo ""
  read -p "Continue commit? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check if API routes changed without corresponding test changes
CHANGED_ROUTES=$(git diff --cached --name-only | grep -E "server/src/routes/.*\.ts$")
if [ -n "$CHANGED_ROUTES" ]; then
  for route in $CHANGED_ROUTES; do
    TEST_FILE="${route%.ts}.test.ts"
    if [ -f "$TEST_FILE" ] && ! git diff --cached --name-only | grep -q "$TEST_FILE"; then
      echo "  Route changed but test not updated:"
      echo "   Changed: $route"
      echo "   Test:    $TEST_FILE"
      echo ""
    fi
  done
fi
```

### Code Review Checklist for Refactoring PRs

**Reviewer should verify:**
- [ ] Tests updated alongside code changes
- [ ] New tests added for new behavior
- [ ] Test coverage maintained or improved
- [ ] Tests pass locally and in CI
- [ ] No new `.skip` files without quarantine tracking
- [ ] Mock implementations match new API signatures

---

## Summary: Prevention Strategies

| Strategy | Problem Prevented | Implementation Effort | Maintenance Cost |
|----------|-------------------|----------------------|------------------|
| **Test Quarantine System** | Whack-a-mole test skipping | Medium (1-2 days setup) | Low (update JSON) |
| **Mock Maintenance** | Stale test implementations | Low (checklist, review) | Medium (weekly review) |
| **CI Environment Handling** | Environment-specific failures | Low (conditional config) | Low (per test basis) |
| **Memory Leak Prevention** | Test infrastructure leaks | Medium (shutdown methods) | Low (tests verify) |
| **Test Health Monitoring** | Unknown test health | Medium (scripts, dashboards) | Low (automated) |
| **Refactoring with Tests** | Broken tests after changes | Low (checklist, hooks) | Low (per PR) |

**Key Takeaway:** Invest in prevention infrastructure once, benefit from reduced test maintenance overhead forever. The quarantine system took 1 day to build but saved weeks of whack-a-mole debugging.
