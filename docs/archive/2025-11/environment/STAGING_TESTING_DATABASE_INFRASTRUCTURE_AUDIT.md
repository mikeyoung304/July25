# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Environment Audits

---

# Comprehensive Staging & Testing Database Infrastructure Investigation

## Executive Summary

Your project uses a **decoupled test architecture** with:
- **NO dedicated staging database** - staging uses production Supabase instance
- **Mocked/stubbed databases for unit tests** (via vitest + environment fallbacks)
- **PostgreSQL service container in CI** (migration-integration.yml only)
- **E2E tests connect to production Supabase** with fallback to localhost:54321
- **Significant test isolation gaps** - no per-test database reset mechanism
- **Single CI database for migrations** - shared across all migration tests
- **Risk of test data collisions** - especially in E2E and integration tests

---

## 1. STAGING DATABASE CONFIGURATION

### Status: NO ISOLATED STAGING DATABASE EXISTS

#### What Exists:
- **Production Supabase Instance**: `xiwfhcikfdoshxwbtjxt.supabase.co`
- All non-local environments use the SAME production database
- No separate "staging" Supabase project or environment

#### Current Configuration:
```
PRODUCTION/STAGING (Combined):
├── Database: aws-0-us-east-2.pooler.supabase.com (Supabase prod)
├── URL: https://xiwfhcikfdoshxwbtjxt.supabase.co
├── ANON_KEY: [Long JWT token]
├── SERVICE_KEY: [Long JWT token]
└── Used by: Vercel deployments, E2E tests, production

DEVELOPMENT (Local):
├── Database: localhost:3001 (Express server mock)
├── Fallback: http://localhost:54321 (Supabase local - if running)
└── Used by: Local development only
```

#### Environment Files Found:
- `.env` - Production credentials (DO NOT COMMIT)
- `.env.example` - Template with placeholder values
- `.env.staging.example` - EMPTY/MINIMAL (no actual staging setup)
- `.env.test` - Test-specific overrides (Supabase localhost fallback)
- `.env.production` - Vercel production deployment config
- `.env.production.vercel` - Secondary Vercel prod config
- `.env.preview.vercel` - Vercel preview deployments

**RISK**: No staging environment isolation means staging and production share the same database. Test data created on staging could affect production users.

---

## 2. TEST DATABASE SETUP & LIFECYCLE

### Unit Tests (Vitest)

#### Configuration:
- **Framework**: Vitest with `vitest.config.ts`
- **Environment**: Node.js (no real database connection)
- **Database Connection**: MOCKED (via environment fallbacks)
- **Setup File**: `tests/bootstrap.ts` and `server/tests/bootstrap.ts`

#### Test Database Initialization:
```typescript
// /Users/mikeyoung/CODING/rebuild-6.0/tests/server/bootstrap.ts
process.env.SUPABASE_URL         ||= 'http://localhost:54321';
process.env.SUPABASE_SERVICE_KEY ||= 'test-service';
process.env.SUPABASE_ANON_KEY    ||= 'test-anon';

// Fallback dummy values for all tests
process.env.OPENAI_API_KEY       ||= 'test-dummy';
process.env.VITE_OPENAI_API_KEY  ||= 'test-dummy';
```

**Database Type**: STUBBED - Not connecting to real database during unit tests

#### Test Execution Flow:
1. Vitest loads `vitest.config.ts`
2. Bootstrap file sets test environment variables
3. Tests run with mocked Supabase client
4. Tests do NOT execute actual database queries

### E2E/Integration Tests (Playwright)

#### Configuration:
- **Framework**: Playwright
- **Target**: Real running instance (Vite dev server on localhost:5173)
- **Database**: Connects to production Supabase (via VITE_ prefixed env vars)
- **Port Configuration**: 
  ```
  baseURL: http://localhost:5173 (frontend)
  API_BASE_URL: http://localhost:3001 (backend)
  ```

#### Test Fixtures & Mocks:
```typescript
// From /Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/fixtures/test-data.ts
export const TEST_MENU_ITEMS = {
  burger: { name: 'Classic Burger', price: 12.99 },
  fries: { name: 'French Fries', price: 4.99 },
  soda: { name: 'Soft Drink', price: 2.99 }
};

export const TEST_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
```

These are hardcoded test data fixtures, not dynamically created.

---

## 3. TEST DATA MANAGEMENT

### Seed Scripts (Server-side):
Located in `/Users/mikeyoung/CODING/rebuild-6.0/server/scripts/`:

1. **seed-minimal-restaurant.ts**
   - Upserts single test restaurant (ID: `11111111-1111-1111-1111-111111111111`)
   - Creates one test user (email: test@example.com)
   - Used for quick test environment setup

2. **seed-menu.ts**
   - Seeds menu items for the test restaurant
   - Maps menu items to categories

3. **seed-restaurants.ts**
   - Bulk restaurant seeding

4. **seed-tables.ts**
   - Creates dining room table layouts

5. **seed-tables-simple.ts**
   - Minimal table setup for quick start

### Test Fixtures (Client-side):
```typescript
// /Users/mikeyoung/CODING/rebuild-6.0/tests/fixtures/multi-seat-orders.ts
export const MOCK_TABLE_5 = {
  id: 'test-table-5-id',
  restaurant_id: '11111111-1111-1111-1111-111111111111',
  table_number: '5',
  capacity: 4,
  status: 'available'
};

// Seat-specific order items
export const SEAT_1_ITEMS = [
  { id: 'item-1-1', name: 'Soul Bowl', quantity: 1, price: 12.99 },
  { id: 'item-1-2', name: 'Green Juice', quantity: 1, price: 6.99 }
];
```

### Seeding Approach:
- **Upsert Pattern**: Used in most seed scripts (creates or updates if exists)
- **No Transaction Rollback**: Seed scripts don't include rollback mechanisms
- **Shared Test Data**: All tests use the same hardcoded IDs (00000000...01, table-5, etc.)
- **Risk**: Multiple tests creating data with same IDs can conflict

---

## 4. DATABASE RESET PROCEDURES

### Between Test Runs:
**NO AUTOMATIC RESET MECHANISM EXISTS**

What happens instead:
1. Unit tests: SKIP database entirely (mocked)
2. E2E tests: Connect to live production Supabase
3. Each test: Uses hardcoded IDs that persist across runs

### Cleanup Hooks Found:

#### Memory Leak Prevention (Server Tests):
```typescript
// /Users/mikeyoung/CODING/rebuild-6.0/server/tests/memory-leak-prevention.test.ts
afterEach(() => {
  server.shutdown();  // WebSocket cleanup
  vi.clearAllTimers();
  vi.clearAllMocks();
});
```

#### Environment Variable Cleanup:
```typescript
// /Users/mikeyoung/CODING/rebuild-6.0/server/tests/config/env-validation.test.ts
afterEach(() => {
  process.env = originalEnv;  // Restore environment
  vi.resetModules();
});
```

#### Auth Security Tests:
```typescript
afterEach(() => {
  process.env = originalEnv;
  vi.clearAllMocks();
});
```

**Critical Gap**: These clean up in-memory state ONLY, not database state.

### CI Migration Testing:
Only the `migration-integration.yml` workflow resets the database:

```yaml
services:
  postgres:
    image: supabase/postgres:15.1.0.117
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
```

**Fresh database created for EACH CI run** (ephemeral container)
- Migrations applied sequentially
- Test data inserted
- Database deleted after workflow completes

---

## 5. TEST ISOLATION & COLLISION RISKS

### Isolation Level: MINIMAL

#### Gaps Identified:

1. **No Test-Scoped Databases**
   - Each test runs against shared production Supabase
   - Test data not isolated by test ID or transaction

2. **Hardcoded Test IDs**
   ```
   DEFAULT_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'
   Test table IDs = 'test-table-001', 'test-table-002'
   Test user IDs = 'e2e-server-001', 'e2e-cashier-001'
   ```
   - Multiple tests using same IDs can overwrite each other's data

3. **No Row-Level Transaction Isolation**
   - Tests don't use database transactions
   - Other tests/users can see uncommitted data

4. **No Test Data Cleanup**
   - Test orders persist in production database after tests finish
   - Previous test data contaminates subsequent test runs

### Collision Risk Scenarios:

**Scenario 1: Concurrent Order Tests**
```
Test A: Creates order for table-5-seat-1 (ID: 00000000-001)
Test B: Creates order for table-5-seat-1 (ID: 00000000-001) simultaneously
→ Race condition: Both tests get same order ID, one overwrites the other
```

**Scenario 2: Data Persistence Across CI Runs**
```
Staging E2E Tests (Run 1): Create test user "test@example.com"
Staging E2E Tests (Run 2): Create same user "test@example.com" again
→ Duplicate key error or data contamination
```

**Scenario 3: Payment Audit Trail Collision**
```
Multiple tests inserting payment records with same order_id
→ Audit logs show multiple payments for single order
```

### Test Quarantine System:
```
/Users/mikeyoung/CODING/rebuild-6.0/server/tests/quarantine.list
src/**/*.{test,spec}.{ts,tsx}
**/__tests__/**/*.{ts,tsx}
```

Tests marked as unstable are skipped from normal CI runs. However, this is a workaround, not a solution to isolation issues.

---

## 6. CI/CD TEST DATABASE INFRASTRUCTURE

### Test Workflows:

#### 1. quick-tests.yml (Pull Requests)
```yaml
- name: Run healthy tests (excluding quarantined)
  run: npm run test:healthy
```
- Runs: Unit tests + healthy integration tests
- Database: Uses mocked Supabase (localhost:54321 fallback)
- Isolation: MODERATE (mocked DB, but shared state within test run)

#### 2. frontend-ci.yml (Client Changes)
```yaml
- name: E2E Puppeteer
  run: node scripts/puppeteer-test.mjs
  env:
    CI: true
```
- Runs: Puppeteer headless tests
- Database: Connects to production Supabase
- Isolation: POOR (production DB shared across all CI runs)

#### 3. migration-integration.yml (Migration Tests)
```yaml
services:
  postgres:
    image: supabase/postgres:15.1.0.117
    ports:
      - 5432:5432
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
```
- **Only workflow with true database isolation**
- Creates fresh PostgreSQL container per workflow
- Applies all migrations sequentially
- Tests RPC functions and schema consistency
- Database destroyed after workflow

**Process**:
1. Detect modified migration files
2. Create test PostgreSQL (15.1.0.117)
3. Apply all migrations from supabase/migrations/
4. Create test data (test restaurant, users)
5. Test RPC functions (create_order_with_audit, batch_update_tables)
6. Verify schema consistency
7. Test rollback scripts
8. Cleanup: Delete test database

#### 4. ci.yml (Main Branch Push)
```yaml
- name: Run tests
  run: npm test -- --runInBand --maxWorkers=2
  env:
    NODE_ENV: test

- name: Run Playwright tests
  run: npm run test:e2e
  env:
    NODE_ENV: test
```
- Runs: Full test suite including E2E
- Database: Supabase (both mocked for unit tests, real for E2E)
- Isolation: POOR for E2E tests

### Test Execution Configuration:

#### Server Tests (vitest.config.ts):
```typescript
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    exclude: ['**/node_modules/**','**/dist/**','**/tests/quarantine/**'],
    passWithNoTests: true,
    setupFiles: ['./tests/bootstrap.ts'],
  },
});
```

**Key Settings**:
- `singleThread: true` - Tests run sequentially (prevents race conditions)
- `setupFiles: ./tests/bootstrap.ts` - Initializes test environment variables
- Test timeout: 15 seconds (generous for integration tests)

#### Client Tests (vitest.config.ts):
```typescript
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    watch: false,
    reporters: ['dot'],
    passWithNoTests: true,
    isolate: true,
    hookTimeout: 15000,
    testTimeout: 15000,
    poolOptions: { threads: { singleThread: true } },
    setupFiles: ['tests/setup.ts'],
  },
});
```

#### Playwright Config:
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,  // ← PARALLEL EXECUTION!
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

**CRITICAL ISSUE**: E2E tests run in parallel (`fullyParallel: true`) against shared production database!

---

## 7. OPERATIONAL FRICTION & PAIN POINTS

### High-Priority Issues:

#### 1. **No Staging Database** (CRITICAL)
- **Impact**: Cannot test in isolated environment before production
- **Risk**: Test failures affect real users
- **Workaround**: Manual testing or separate Supabase project needed
- **Cost**: Time to set up + operational complexity

#### 2. **E2E Tests Connect to Production** (CRITICAL)
- **Impact**: Test data persists in production
- **Evidence**: Hardcoded test user "test@example.com" in production database
- **Risk**: Data pollution, accidental deletion by tests, payment record conflicts
- **Current Workaround**: Acceptance of test data in production (not a real solution)

#### 3. **Parallel E2E Test Execution Against Shared DB** (CRITICAL)
- **Code**: `fullyParallel: true` in playwright.config.ts
- **Impact**: Race conditions between concurrent tests
- **Risk**: Order conflicts, payment audit trail corruption
- **Symptoms**: 
  - Flaky tests that pass/fail randomly
  - "Order ID already exists" errors
  - Concurrent payment processing conflicts

#### 4. **No Database Reset Between Test Runs** (HIGH)
- **Impact**: Tests depend on previous test data
- **Risk**: Test failure cascade (one failed test breaks subsequent tests)
- **Workaround**: Manual database cleanup or script execution

#### 5. **Seed Scripts Use Upsert Not Insert** (MEDIUM)
- **Code**: `ON CONFLICT DO NOTHING` pattern
- **Impact**: Can't detect duplicate test data creation
- **Risk**: Silent data overwrites during test setup

#### 6. **Test Quarantine Over Fixes** (MEDIUM)
- **Evidence**: `/server/tests/quarantine.list` exists
- **Impact**: Unstable tests skipped rather than fixed
- **Risk**: Hidden bugs, false confidence in test suite
- **Count**: Multiple tests marked as quarantined (see TEST_HEALTH.md)

#### 7. **No Database Transactions for Tests** (MEDIUM)
- **Impact**: Test data visible to other tests/users
- **Risk**: Data leak between tests, unpredictable test state

#### 8. **Hardcoded Test Data IDs** (LOW-MEDIUM)
- **Issue**: All tests use `11111111-1111-1111-1111-111111111111`
- **Impact**: Tests can't run in parallel with unique test contexts
- **Risk**: Any custom ID logic gets bypassed

---

## 8. CURRENT TESTING STRATEGY SUMMARY

### What Works:
✅ Unit tests are well-isolated (mocked database)
✅ Seed scripts provide reproducible data creation
✅ Migration CI tests have proper isolation
✅ Environment variable validation is comprehensive
✅ Bootstrap files properly initialize test environments

### What Doesn't Work:
❌ No staging environment (prod = staging)
❌ E2E tests share production database
❌ Parallel E2E test execution against sequential database
❌ No per-test database cleanup
❌ Test data persists after runs
❌ Quarantine system masks flaky tests
❌ No transaction isolation

### By Test Type:

| Test Type | Database | Isolation | Risk Level | Notes |
|-----------|----------|-----------|-----------|-------|
| Unit (Vitest) | Mocked | Excellent | Low | No real DB queries |
| Integration | Mocked | Excellent | Low | Some E2E via mocks |
| Migration CI | Isolated PostgreSQL | Excellent | Low | Ephemeral container |
| E2E (Playwright) | Production | Poor | Critical | Parallel + shared DB |
| Smoke Tests | Production | Poor | High | Hardcoded test IDs |
| Performance | Production | Poor | High | Load creates test data |

---

## 9. RECOMMENDATIONS FOR IMPROVEMENT

### Immediate Actions (Week 1):

1. **Serial E2E Tests**
   ```typescript
   // playwright.config.ts
   - fullyParallel: true
   + fullyParallel: false  // Or set workers: 1
   ```
   Impact: Eliminates race conditions

2. **Create Staging Supabase Project**
   - New Supabase project: `staging-xiwf...`
   - Update `.env.staging` with staging credentials
   - Switch Vercel preview deployments to staging DB

3. **Database Reset Between Runs**
   ```bash
   #!/bin/bash
   # scripts/reset-test-db.sh
   psql $SUPABASE_URL -c "TRUNCATE orders CASCADE;"
   psql $SUPABASE_URL -c "TRUNCATE orders_items CASCADE;"
   psql $SUPABASE_URL -c "DELETE FROM test_users WHERE email LIKE '%test%';"
   ```

### Short-term (Sprint 1-2):

4. **Transaction-Based Test Isolation**
   ```typescript
   beforeEach(async () => {
     await db.begin();  // Start transaction
   });
   
   afterEach(async () => {
     await db.rollback();  // Undo changes
   });
   ```

5. **Unique Test IDs**
   ```typescript
   // Instead of hardcoded 11111111...11
   const TEST_RESTAURANT_ID = crypto.randomUUID();
   // Or per-suite: TEST_RESTAURANT_ID = `test-${Date.now()}`
   ```

6. **E2E Test Data Isolation**
   - Create test restaurant per test suite
   - Cleanup restaurant (cascade delete orders) after tests
   - Use unique email/identifier per test

### Medium-term (Sprint 3-4):

7. **Separate Test Database**
   - Create dedicated test.supabase.co instance
   - Run E2E tests against test instance
   - Keep production separate for smoke tests only

8. **Fix Quarantined Tests**
   - Investigate each quarantined test
   - Fix root cause (not isolation, but actual bugs)
   - Remove from quarantine list

9. **CI Database Provisioning**
   - Extend migration-integration.yml to create test database
   - Use for E2E tests in CI
   - Delete after tests complete

### Long-term Architecture:

10. **Database Per Test File** (Advanced)
    - Create temporary schema per test file
    - Parallel execution with isolation
    - Auto cleanup after file completes

---

## 10. FILE LOCATIONS REFERENCE

### Configuration Files:
- `.env` - Production config (DO NOT COMMIT)
- `.env.example` - Template
- `.env.staging.example` - Empty/minimal
- `.env.test` - Test overrides
- `server/.env.test` - Server test config
- `.github/workflows/migration-integration.yml` - Migration CI tests
- `.github/workflows/ci.yml` - Main CI tests

### Test Configuration:
- `vitest.config.ts` - Root vitest config
- `server/vitest.config.ts` - Server tests
- `client/vitest.config.ts` - Client tests
- `playwright.config.ts` - E2E tests

### Bootstrap/Setup Files:
- `tests/setup.ts` - Root test setup
- `tests/server/bootstrap.ts` - Server test bootstrap
- `tests/server/setup.ts` - Server test setup
- `tests/server/setupEnv.ts` - Environment setup
- `server/tests/bootstrap.ts` - Server unit test bootstrap

### Test Fixtures:
- `tests/e2e/fixtures/test-data.ts` - Menu/order fixtures
- `tests/e2e/fixtures/test-users.ts` - User fixtures
- `tests/e2e/fixtures/test-helpers.ts` - Helper utilities
- `tests/fixtures/multi-seat-orders.ts` - Multi-seat fixtures

### Seed Scripts:
- `server/scripts/seed-minimal-restaurant.ts`
- `server/scripts/seed-menu.ts`
- `server/scripts/seed-restaurants.ts`
- `server/scripts/seed-tables.ts`
- `server/scripts/seed-tables-simple.ts`

### Migrations:
- `supabase/migrations/` - All database migrations
- `supabase/migrations/.archive/` - Old/archived migrations

### Quarantine Management:
- `scripts/test-quarantine.js` - Quarantine dashboard
- `server/tests/quarantine.list` - Quarantined test patterns
- `TEST_HEALTH.md` - Health status (generated)

### Related CI Workflows:
- `.github/workflows/quick-tests.yml` - PR tests
- `.github/workflows/frontend-ci.yml` - Client tests
- `.github/workflows/ci.yml` - Main CI
- `.github/workflows/migration-integration.yml` - Migration tests
- `.github/workflows/deploy-migrations.yml` - Migration deployment

---

## CONCLUSION

Your testing infrastructure has **strong unit test isolation** (vitest mocks) but **critical gaps in E2E test isolation**:

1. **No staging database** - staging and prod use same Supabase
2. **Parallel E2E tests** - all connect to production simultaneously
3. **No database reset** - test data persists indefinitely
4. **Hardcoded test IDs** - all tests use same identifiers
5. **No transaction rollback** - changes committed permanently

The **migration-integration.yml workflow is the gold standard** for your organization:
- Ephemeral database per run
- Isolated PostgreSQL container
- Sequential test execution
- Comprehensive validation

**Recommended priority fixes**:
1. Create staging Supabase project (blocks new staging tests)
2. Serial E2E test execution (fixes race conditions today)
3. Unique test IDs per run (enables parallel execution later)
4. Database transaction cleanup (long-term solution)

Current state: **Development/Integration safe, Staging/Production at risk**.
