# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../README.md)
> Category: Environment Audits

---

# Staging & Testing Database - Quick Reference Guide

## Critical Finding: NO STAGING DATABASE EXISTS

Your project currently has:
- **Production**: xiwfhcikfdoshxwbtjxt.supabase.co
- **Staging**: SAME AS PRODUCTION (no isolation)
- **Local**: localhost:3001 (mocked) or localhost:54321 (Supabase local if running)

**Risk Level**: CRITICAL - Test data and production data are in the same database

---

## Test Database Status By Type

| Test Type | Database | Isolation | Status |
|-----------|----------|-----------|--------|
| Unit (Vitest) | Mocked | Excellent | ✅ Safe |
| Migration CI | Ephemeral PostgreSQL | Excellent | ✅ Safe |
| E2E (Playwright) | Production Supabase | Poor | ❌ Risky |
| Smoke Tests | Production Supabase | Poor | ❌ Risky |

---

## Key Pain Points

1. **Parallel E2E Tests** - `fullyParallel: true` in playwright.config.ts
   - Tests run concurrently against shared database
   - Race conditions possible (orders, payments, users)

2. **Hardcoded Test IDs** - All tests use `11111111-1111-1111-1111-111111111111`
   - Tests can overwrite each other's data
   - No unique test isolation

3. **No Database Reset** - Test data persists after runs
   - Previous test orders remain in production
   - Test users contaminate real database

4. **No Transaction Rollback** - Changes committed permanently
   - No per-test cleanup mechanism
   - Data leaks between test runs

5. **Seed Scripts Use Upsert** - Silent overwrites possible
   - Can't detect duplicate test data creation
   - Doesn't fail on conflicts

---

## File Locations

**Test Configuration**:
- `vitest.config.ts` - Root test config
- `server/vitest.config.ts` - Server tests
- `playwright.config.ts` - E2E tests (HAS THE ISSUE)

**Bootstrap/Setup**:
- `tests/server/bootstrap.ts` - Sets localhost:54321 fallback
- `server/tests/bootstrap.ts` - Sets test environment

**Seed Scripts**:
- `server/scripts/seed-minimal-restaurant.ts`
- `server/scripts/seed-menu.ts`
- `server/scripts/seed-*.ts` (5 total)

**CI Workflows**:
- `.github/workflows/migration-integration.yml` - GOOD MODEL (isolated DB)
- `.github/workflows/ci.yml` - Runs tests against prod
- `.github/workflows/quick-tests.yml` - PR tests (mocked)
- `.github/workflows/frontend-ci.yml` - E2E tests (prod DB)

**Environment**:
- `.env` - Production (DO NOT COMMIT)
- `.env.example` - Template
- `.env.staging.example` - EMPTY (no staging setup)
- `server/.env.test` - Test overrides

**Quarantine**:
- `server/tests/quarantine.list` - Flaky tests skipped (workaround)

---

## Quick Wins (Week 1)

### 1. Serial E2E Tests (5 min)
```typescript
// playwright.config.ts line 6
- fullyParallel: true,
+ fullyParallel: false,
```
**Impact**: Eliminates race conditions immediately

### 2. Reset E2E Test Data (30 min)
```bash
# Add after each E2E test suite
afterAll(async () => {
  // Delete all test data created by this suite
  await deleteTestOrders(TEST_RESTAURANT_ID);
});
```

### 3. Create Staging Project (1 hour)
- Create new Supabase project: `staging-project`
- Update `.env.staging` with credentials
- Point Vercel preview to staging

---

## Medium-term Fixes (Sprint 1-2)

1. **Unique Test IDs** - Per-run UUIDs instead of hardcoded
2. **Transaction Isolation** - Rollback changes after each test
3. **Separate Test Database** - Dedicated test.supabase.co instance
4. **Database Reset Script** - TRUNCATE test data between runs

---

## The Good Model: Migration Testing

`.github/workflows/migration-integration.yml` gets it right:

```yaml
services:
  postgres:
    image: supabase/postgres:15.1.0.117
    # Fresh DB per run, deleted after tests
```

Why it works:
- Ephemeral database (created, tested, destroyed)
- Isolated from production
- Sequential execution
- Comprehensive schema validation
- Includes rollback testing

**Recommended**: Extend this pattern to E2E tests

---

## Test Quarantine Workaround

File: `server/tests/quarantine.list`

Current approach: Skip flaky tests instead of fixing them
- Works: Tests don't fail randomly
- Problem: Hides real bugs

Better approach: Fix the root cause (usually isolation issues)

---

## How to Test This Investigation

### Check current E2E behavior:
```bash
npm run test:e2e  # Should fail/be flaky due to parallel execution
```

### Try serial execution:
```typescript
// playwright.config.ts
- fullyParallel: true,
+ fullyParallel: false,  // Add this
+ workers: 1,            // Or this
```

### Check where test data comes from:
```bash
# In production database, look for:
# - Orders with user_id = 'e2e-*'
# - User emails = 'test@example.com'
# - Restaurant id = '11111111-1111-1111-1111-111111111111'
```

---

## Database URLs Reference

**Development (Local)**:
- Mocked: http://localhost:3001
- Supabase Local: http://localhost:54321
- Uses: server/tests/bootstrap.ts environment variables

**Staging (Current = Production)**:
- URL: https://xiwfhcikfdoshxwbtjxt.supabase.co
- Uses: VITE_ prefixed env vars
- Same as production (RISK)

**Migration CI (Isolated)**:
- Database: PostgreSQL in Docker (supabase/postgres:15.1.0.117)
- URL: postgresql://postgres:postgres@localhost:5432/postgres
- Fresh per run, deleted after tests

---

## Recommended Reading

1. Full report: `/STAGING_TESTING_DATABASE_INFRASTRUCTURE_AUDIT.md`
2. Migration testing: `.github/workflows/migration-integration.yml`
3. Playwright config: `playwright.config.ts` (note: fullyParallel=true issue)

---

## One-Page Summary

**Current State**: 
- Unit tests: ✅ Safe (mocked DB)
- E2E tests: ❌ Risky (prod DB, parallel execution)
- Staging: ❌ Missing (uses prod DB)

**Biggest Risk**:
Parallel E2E tests against shared production database = race conditions

**Quickest Fix**:
Change `fullyParallel: true` to `false` in playwright.config.ts

**Real Solution**:
Create staging Supabase + run E2E tests sequentially or with unique test data

---

**Generated**: 2025-11-11
**Investigation Depth**: Very Thorough (All test files analyzed)
**Confidence**: High (Based on actual code inspection)
