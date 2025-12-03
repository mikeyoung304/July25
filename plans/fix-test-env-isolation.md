# Plan: Fix Test Environment Isolation

## Problem Statement

CI tests are failing (116 test files, 135 tests) because:
1. `.env.test` contains production Vercel config instead of test values
2. Server test bootstrap was missing `DATABASE_URL` (already fixed)

## Root Cause Analysis

The `.env.test` file was created by Vercel CLI and contains:
- `VITE_API_BASE_URL="https://july25.onrender.com"` (production URL)
- `VITE_DEFAULT_RESTAURANT_ID="grow"` (slug format, tests expect UUID)
- `NODE_ENV="production"`

Tests expect:
- `VITE_API_BASE_URL="http://localhost:3001"`
- `VITE_DEFAULT_RESTAURANT_ID="11111111-1111-1111-1111-111111111111"` (UUID)
- `NODE_ENV="test"`

## Proposed Solution

### Step 1: Rename existing `.env.test` to `.env.vercel.development`
This preserves the Vercel-generated config while freeing the `.env.test` name for actual test config.

### Step 2: Create proper `.env.test` with test values
```env
NODE_ENV=test
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test-anon-key
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_ENVIRONMENT=test
```

### Step 3: Update `.gitignore` to exclude Vercel temp files
Add `.env.vercel.*` to prevent future Vercel CLI pollution.

### Step 4: Ensure test setup loads test env first
The client `test/setup.ts` already sets env vars at the end, but Vite may load `.env.test` before the setup runs.

## Files to Modify

1. `.env.test` → Rename to `.env.vercel.development`
2. `.env.test` → Create new with test values
3. `.gitignore` → Add `.env.vercel.*`
4. `server/tests/bootstrap.ts` → Already fixed (added DATABASE_URL)

## Risk Assessment

- **Low risk**: Only affects test environment, not production
- **Reversible**: Original file preserved with new name

## Verification

1. Run `npm run test:server` - should pass (395 tests)
2. Run `npm run test:client` - should pass (~350 tests)
3. Run `npm test` - full suite should pass

## Alternatives Considered

1. **Modify test setup to override env earlier**: More complex, affects test timing
2. **Use `vitest --env` flag**: Doesn't work for Vite env vars
3. **Delete `.env.test`**: Loses potentially useful Vercel config
