# TEST SUITE FIX RECOMMENDATIONS

**Analysis Date:** October 24, 2025
**Project:** Restaurant OS v6.0.8
**Status:** 35 client test files quarantined, only 1 sanity test running

---

## Executive Summary

The test suite has been systematically disabled via quarantine.list, excluding ALL src tests from running. Only a single sanity test in `tests/sanity/quick.spec.ts` is currently executing. This represents a critical testing gap where 35+ test files are being ignored.

**Root Cause:** The quarantine.list contains wildcard patterns that exclude all actual test files while the vitest configuration lacks proper setupFiles configuration.

---

## Priority 1 - Critical Issues

These issues prevent tests from running at all and must be fixed immediately.

### Issue 1.1: Quarantine List Excluding All Tests

**Current State:**
- File: `/Users/mikeyoung/CODING/rebuild-6.0/client/tests/quarantine.list`
- Content:
  ```
  src/**/*.{test,spec}.{ts,tsx}
  **/__tests__/**/*.{ts,tsx}
  ```
- This excludes ALL 35 test files in the client/src directory
- Only `tests/sanity/quick.spec.ts` runs (trivial pass/fail test)

**Desired State:**
- Quarantine list should contain specific problematic test files, not wildcards
- Most tests should run normally
- Only genuinely broken tests should be quarantined

**Specific Fix:**

**Step 1:** Remove wildcard exclusions from quarantine.list
```bash
# File: client/tests/quarantine.list
# Replace entire content with:

# Quarantined tests - add specific files that are genuinely broken
# Format: path/to/specific/file.test.tsx
# Example: src/hooks/problematic.test.ts
```

**Step 2:** Update server quarantine.list similarly
```bash
# File: server/tests/quarantine.list
# Replace entire content with:

# Quarantined tests - add specific files that are genuinely broken
# Format: path/to/specific/file.test.ts
```

**Risk Assessment:**
- **Risk Level:** HIGH initially, LOW after validation
- **Potential Impact:** Tests will run and may fail, revealing actual issues
- **Mitigation:** Run tests in isolation first, quarantine specific failures

**Validation Steps:**
1. Run `cd client && npm test` to see which tests fail
2. Review failures - determine if they're real bugs or test issues
3. Add only genuinely broken tests back to quarantine.list (with specific paths)
4. Document why each test is quarantined

**Expected Outcome:**
- 30+ tests will start running
- Some may fail initially (this is good - reveals issues)
- Provides baseline for actual test health

---

### Issue 1.2: Missing setupFiles in Client Vitest Config

**Current State:**
- File: `/Users/mikeyoung/CODING/rebuild-6.0/client/vitest.config.ts`
- Missing `setupFiles` configuration
- Current config:
  ```typescript
  export default defineConfig({
    test: {
      environment: 'jsdom',
      testTimeout: 15000,
      hookTimeout: 15000,
      exclude: ['**/node_modules/**','**/dist/**','**/tests/quarantine/**', ...qList],
    },
  });
  ```

**Desired State:**
- Configuration should point to proper setup file
- Should use the comprehensive setup at `client/test/setup.ts`

**Specific Fix:**

Update `/Users/mikeyoung/CODING/rebuild-6.0/client/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const qFile = join(__dirname, 'tests', 'quarantine.list');
const qList = existsSync(qFile)
  ? readFileSync(qFile, 'utf8').split('\n').map(s=>s.trim()).filter(Boolean)
  : [];

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    setupFiles: ['./test/setup.ts'],  // ADD THIS LINE
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/quarantine/**',
      ...qList
    ],
  },
});
```

**Risk Assessment:**
- **Risk Level:** LOW
- **Potential Impact:** Tests will have proper mocks and cleanup
- **Mitigation:** None needed - this is pure improvement

**Validation Steps:**
1. Verify file exists: `ls -la client/test/setup.ts`
2. Run single test: `cd client && npx vitest run src/components/shared/__tests__/LoadingSpinner.test.tsx`
3. Verify setup runs (check for console output about GC if --expose-gc is set)

**Expected Outcome:**
- Tests will have access to @testing-library/jest-dom matchers
- Global mocks (window.matchMedia, MediaRecorder, etc.) will be available
- Proper cleanup will occur between tests

---

## Priority 2 - Configuration Issues

These issues cause inconsistencies and should be fixed soon.

### Issue 2.1: Duplicate Test Setup Files

**Current State:**
Two setup files exist with different purposes:
1. `/Users/mikeyoung/CODING/rebuild-6.0/client/src/test/setup.ts` (42 lines)
   - Basic mocks: window.matchMedia, axios
   - TextEncoder/TextDecoder setup
   - No cleanup logic

2. `/Users/mikeyoung/CODING/rebuild-6.0/client/test/setup.ts` (187 lines)
   - Comprehensive setup with beforeAll/afterEach/afterAll
   - Extensive mocks: Audio, MediaRecorder, WebSocket, IntersectionObserver, ResizeObserver
   - Memory management and cleanup
   - Environment variable setup

**Desired State:**
- Single source of truth for test setup
- Comprehensive mocks and cleanup in one place
- Clear organization

**Specific Fix:**

**Option A (Recommended): Use test/setup.ts, deprecate src/test/setup.ts**

Step 1: Verify no imports of src/test/setup.ts
```bash
cd /Users/mikeyoung/CODING/rebuild-6.0/client
grep -r "from.*src/test/setup" src/
grep -r "import.*src/test/setup" src/
```

Step 2: If no imports found, delete the duplicate:
```bash
rm -f /Users/mikeyoung/CODING/rebuild-6.0/client/src/test/setup.ts
```

Step 3: Add missing features from src/test/setup.ts to test/setup.ts if needed:
- The axios mock from src/test/setup.ts could be useful
- Add to test/setup.ts if AI integration tests need it

**Option B: Merge both files**

If src/test/setup.ts is imported elsewhere, merge the unique features:
1. Keep test/setup.ts as base (it's more comprehensive)
2. Add axios mock from src/test/setup.ts
3. Update all imports to point to test/setup.ts

**Risk Assessment:**
- **Risk Level:** MEDIUM
- **Potential Impact:** Tests might reference old setup file
- **Mitigation:** Search for imports first (validation step)

**Validation Steps:**
1. Search for imports: `grep -r "src/test/setup" client/src/`
2. If none found, safe to delete
3. Run tests after deletion: `cd client && npm test`

**Expected Outcome:**
- Single, authoritative test setup file
- No confusion about which file to modify
- Easier maintenance

---

### Issue 2.2: Environment Mismatch Between Root and Package Tests

**Current State:**
- Root config (`/Users/mikeyoung/CODING/rebuild-6.0/vitest.config.ts`): `environment: 'node'`
- Client config (`/Users/mikeyoung/CODING/rebuild-6.0/client/vitest.config.ts`): `environment: 'jsdom'`
- Server config (`/Users/mikeyoung/CODING/rebuild-6.0/server/vitest.config.ts`): `environment: 'node'`

Root vitest.config.ts has node environment but would run client tests if executed from root (wrong environment).

**Desired State:**
- Root config should delegate to workspace packages
- Each package uses appropriate environment
- Clear separation of concerns

**Specific Fix:**

Update `/Users/mikeyoung/CODING/rebuild-6.0/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Root-level test config for any root-level tests (like tests/e2e)
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

    // Only include root-level tests, not workspace packages
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'client/**',  // ADD THIS - exclude client tests
      'server/**',  // ADD THIS - exclude server tests
      'shared/**',  // ADD THIS - exclude shared tests
    ],
  },
})
```

**Risk Assessment:**
- **Risk Level:** LOW
- **Potential Impact:** Clarifies test boundaries
- **Mitigation:** Tests should always run via npm scripts anyway

**Validation Steps:**
1. Run from root: `npm test` (should cd into client/server)
2. Verify test count matches
3. Check that no client tests run with node environment

**Expected Outcome:**
- Clear separation: root config for e2e tests, package configs for unit tests
- No environment mismatches
- Consistent test execution

---

### Issue 2.3: Duplicate test:e2e Scripts in package.json

**Current State:**
```json
"test:e2e": "concurrently -k \"NODE_ENV=test npm run dev\" \"wait-on tcp:3001 && npx playwright test tests/e2e/**\"",
// ... 30+ lines later ...
"test:e2e": "npx playwright test --project=chromium",
```

This causes a warning on every test run and the second definition wins.

**Desired State:**
- Single test:e2e script
- Additional scripts with descriptive names

**Specific Fix:**

Update `/Users/mikeyoung/CODING/rebuild-6.0/package.json`:
```json
{
  "scripts": {
    // ... other scripts ...
    "test:e2e": "npx playwright test --project=chromium",
    "test:e2e:dev": "concurrently -k \"NODE_ENV=test npm run dev\" \"wait-on tcp:3001 && npx playwright test tests/e2e/**\"",
    "test:e2e:smoke": "./scripts/run-smoke-tests.sh",
    // ... rest of scripts ...
  }
}
```

**Risk Assessment:**
- **Risk Level:** MINIMAL
- **Potential Impact:** Removes warning, clarifies intent
- **Mitigation:** None needed

**Validation Steps:**
1. Run `npm test` - verify no duplicate key warning
2. Check that test:e2e still works

**Expected Outcome:**
- No more duplicate key warning
- Clear naming for different e2e test scenarios

---

## Priority 3 - Best Practices

These improvements enhance maintainability but are not urgent.

### Issue 3.1: Test File Organization

**Current State:**
Tests are scattered across multiple patterns:
- `client/src/components/shared/__tests__/LoadingSpinner.test.tsx`
- `client/src/hooks/useSoundNotifications.test.tsx`
- `client/src/hooks/__tests__/useAsyncState.test.ts`

Mixed patterns: some use `__tests__` folders, some colocate with source.

**Desired State:**
Consistent pattern - either:
- **Option A:** All tests in `__tests__` folders
- **Option B:** All tests colocated (file.tsx → file.test.tsx in same folder)

**Recommendation:** Option B (colocated) because:
- Easier to find related test
- Simpler imports (no `../__tests__/`)
- Better for module refactoring

**Specific Fix:**

**Migration Plan:**
1. Choose standard: Colocated tests (recommended)
2. Move tests gradually:
   ```bash
   # Example for hooks
   mv client/src/hooks/__tests__/useAsyncState.test.ts client/src/hooks/useAsyncState.test.ts
   mv client/src/hooks/__tests__/useKitchenOrdersRealtime.test.ts client/src/hooks/useKitchenOrdersRealtime.test.ts
   ```
3. Update imports in test files if needed
4. Remove empty `__tests__` directories

**Risk Assessment:**
- **Risk Level:** LOW
- **Potential Impact:** Better organization, no functional change
- **Mitigation:** Git tracks renames automatically

**Validation Steps:**
1. Verify tests still run after moves
2. Check imports resolve correctly
3. Ensure coverage still works

**Expected Outcome:**
- Consistent, predictable test locations
- Easier navigation
- Simpler mental model

---

### Issue 3.2: Missing Test Coverage Configuration

**Current State:**
No coverage thresholds or configuration in vitest configs.

**Desired State:**
Coverage tracking with reasonable thresholds.

**Specific Fix:**

Add to `/Users/mikeyoung/CODING/rebuild-6.0/client/vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    setupFiles: ['./test/setup.ts'],
    exclude: [/*...*/],

    // ADD COVERAGE CONFIG
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '**/types/**',
      ],
      thresholds: {
        lines: 60,      // Start conservative, increase over time
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});
```

**Risk Assessment:**
- **Risk Level:** MINIMAL
- **Potential Impact:** Visibility into test coverage
- **Mitigation:** Set thresholds low initially

**Validation Steps:**
1. Run `npm run test:coverage`
2. Check that HTML report generates
3. Review coverage metrics

**Expected Outcome:**
- Coverage reports available
- Ability to track coverage trends
- Identify untested code

---

### Issue 3.3: Test Naming Consistency

**Current State:**
Mixed naming patterns:
- `LoadingSpinner.test.tsx`
- `useAsyncState.test.ts`
- `ElapsedTimer.test.tsx`

All use `.test.tsx/ts` which is good, but some files mix test and spec.

**Desired State:**
Consistent `.test.{ts,tsx}` naming (already mostly achieved).

**Specific Fix:**

Verify no `.spec.` files in src:
```bash
find client/src -name "*.spec.ts" -o -name "*.spec.tsx"
```

If found, rename to `.test.`:
```bash
# Example if any found:
# git mv file.spec.tsx file.test.tsx
```

**Risk Assessment:**
- **Risk Level:** MINIMAL
- **Potential Impact:** Consistency only
- **Mitigation:** None needed

**Validation Steps:**
1. Search for .spec files
2. Rename if found
3. Verify tests still run

**Expected Outcome:**
- 100% consistent naming
- Clear convention

---

### Issue 3.4: Add Test Documentation

**Current State:**
No documentation about:
- How to run tests
- How to write new tests
- What mocks are available
- Setup file purpose

**Desired State:**
Clear documentation in README or TESTING.md

**Specific Fix:**

Create `/Users/mikeyoung/CODING/rebuild-6.0/client/TESTING.md`:
```markdown
# Testing Guide

## Running Tests

### All tests
\`\`\`bash
npm test
\`\`\`

### Watch mode
\`\`\`bash
npm run test:watch
\`\`\`

### Coverage
\`\`\`bash
npm run test:coverage
\`\`\`

### Single file
\`\`\`bash
npx vitest run path/to/file.test.tsx
\`\`\`

## Writing Tests

### Test Location
Place tests next to the code they test:
- Component: \`Button.tsx\` → \`Button.test.tsx\`
- Hook: \`useAuth.ts\` → \`useAuth.test.ts\`

### Available Mocks

Global mocks are configured in \`test/setup.ts\`:
- \`window.matchMedia\`
- \`IntersectionObserver\`
- \`ResizeObserver\`
- \`Audio\` API
- \`MediaRecorder\` API
- \`WebSocket\`
- \`navigator.mediaDevices\`

### Environment Variables

Test environment has these variables set:
- \`VITE_API_BASE_URL\`: http://localhost:3001
- \`VITE_SUPABASE_URL\`: https://test.supabase.co
- \`VITE_SUPABASE_ANON_KEY\`: test-anon-key

### Example Test

\`\`\`typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
\`\`\`

## Troubleshooting

### Tests not running
Check quarantine list: \`tests/quarantine.list\`

### Memory issues
Run with: \`NODE_OPTIONS='--max-old-space-size=4096 --expose-gc' npm test\`

### Import errors
Verify setup file is loaded in \`vitest.config.ts\`
\`\`\`

**Risk Assessment:**
- **Risk Level:** NONE
- **Potential Impact:** Improved developer experience
- **Mitigation:** N/A

**Validation Steps:**
1. Review with team
2. Update as needed
3. Link from main README

**Expected Outcome:**
- Developers can quickly learn testing patterns
- Reduced onboarding time
- Fewer test-related questions

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Do First)
**Timeline:** 1-2 hours
**Tasks:**
1. Clear quarantine.list wildcards (Issue 1.1)
2. Add setupFiles to client vitest config (Issue 1.2)
3. Run tests to establish baseline
4. Add specific failures to quarantine with comments

**Success Criteria:**
- At least 20+ tests running
- Clear list of genuine failures
- Baseline established

### Phase 2: Configuration Cleanup (Do Soon)
**Timeline:** 2-3 hours
**Tasks:**
1. Resolve duplicate setup files (Issue 2.1)
2. Fix environment mismatch (Issue 2.2)
3. Remove duplicate script (Issue 2.3)

**Success Criteria:**
- Single setup file in use
- No warnings on test run
- Clear config hierarchy

### Phase 3: Best Practices (Do When Stable)
**Timeline:** 1-2 days
**Tasks:**
1. Standardize test locations (Issue 3.1)
2. Add coverage configuration (Issue 3.2)
3. Create testing documentation (Issue 3.4)

**Success Criteria:**
- Consistent test organization
- Coverage tracking enabled
- Documentation complete

---

## Quick Start: Minimal Fix

If you need to fix tests IMMEDIATELY, do this:

### 1. Clear Quarantine (1 minute)
```bash
cat > client/tests/quarantine.list << 'EOF'
# Quarantined tests - specific broken tests only
EOF

cat > server/tests/quarantine.list << 'EOF'
# Quarantined tests - specific broken tests only
EOF
```

### 2. Add Setup Files (1 minute)
Edit `client/vitest.config.ts`, add this line in the test object:
```typescript
setupFiles: ['./test/setup.ts'],
```

### 3. Run Tests (2 minutes)
```bash
cd client && npm test 2>&1 | tee test-results.txt
```

### 4. Review Failures (5 minutes)
Look at test-results.txt:
- Real bugs → Fix them or file issues
- Flaky tests → Add to quarantine with reason
- Test bugs → Fix test or quarantine

### 5. Document Quarantined Tests (2 minutes)
For each quarantined file, add:
```
src/components/BrokenComponent.test.tsx  # Reason: Fails due to missing mock, TODO: fix
```

**Total time: ~15 minutes to functional test suite**

---

## Appendix: File Locations

### Configuration Files
- `/Users/mikeyoung/CODING/rebuild-6.0/vitest.config.ts` (root)
- `/Users/mikeyoung/CODING/rebuild-6.0/client/vitest.config.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/vitest.config.ts`

### Setup Files
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/setup.ts` (root - minimal)
- `/Users/mikeyoung/CODING/rebuild-6.0/client/test/setup.ts` (comprehensive - USE THIS)
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/test/setup.ts` (duplicate - DEPRECATE)
- `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/bootstrap.ts` (server)

### Quarantine Files
- `/Users/mikeyoung/CODING/rebuild-6.0/client/tests/quarantine.list`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/quarantine.list`

### Test Locations
- Client: 35 test files in `client/src/**/*.test.{ts,tsx}`
- Server: 20+ test files in `server/tests/**/*.test.ts` and `server/src/**/*.test.ts`

---

## Appendix: Current Test Execution Flow

### When running `npm test` from root:
```
package.json:test
  → test:client (cd client && npm test)
    → vitest run
      → loads client/vitest.config.ts
      → excludes from quarantine.list: src/**/*.{test,spec}.{ts,tsx}
      → only runs: tests/sanity/quick.spec.ts
  → test:server (cd server && npm test)
    → vitest
      → loads server/vitest.config.ts
      → excludes from quarantine.list: src/**/*.{test,spec}.{ts,tsx}
      → runs: tests/**/*.test.ts (contracts, security proofs)
```

### After fixes:
```
package.json:test
  → test:client (cd client && npm test)
    → vitest run
      → loads client/vitest.config.ts
      → setupFiles: ['./test/setup.ts']  ✓ NEW
      → runs ALL tests except specific quarantine
      → ~30+ tests execute
  → test:server (same as before, already working)
```

---

## Questions & Answers

**Q: Why were all tests quarantined?**
A: Likely a temporary measure during instability that became permanent. The wildcard pattern was too broad.

**Q: Will fixing this break CI?**
A: Possibly - some tests may fail. But that's better than false confidence. Add real failures to quarantine individually.

**Q: Should we fix failing tests or quarantine them?**
A: Fix if possible within 30 min per test. Otherwise quarantine with detailed reason and TODO.

**Q: What about the root vitest.config.ts?**
A: It's for e2e tests in tests/e2e. Should stay as-is but exclude workspace packages.

**Q: Can we delete src/test/setup.ts safely?**
A: After confirming no imports reference it. Check with: `grep -r "src/test/setup" client/src/`

---

**Report Generated:** October 24, 2025
**Next Review:** After Phase 1 completion
**Owner:** Development Team
**Priority:** HIGH - Test coverage is essential for stability
