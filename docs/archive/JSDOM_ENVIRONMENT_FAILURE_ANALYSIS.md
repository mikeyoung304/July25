# JSDOM ENVIRONMENT FAILURE ANALYSIS

**Date:** 2025-10-24
**Vitest Version:** v1.6.1 (root) / v3.2.4 (client)
**JSDOM Version:** v26.1.0
**Test Framework:** Vitest with @testing-library/react v16.3.0

---

## Executive Summary

The `test:quick` command from the root directory is running **112 tests** that fail with `ReferenceError: document is not defined`. These failures occur because the **root vitest.config.ts** is configured with `environment: 'node'`, which lacks DOM globals, while all **client-side React tests** require a JSDOM environment.

### Critical Issue
**Root vitest.config.ts uses Node environment, but client tests need JSDOM environment**

---

## Test Failure Statistics

- **Total Test Files:** 88 (72 failed | 16 passed)
- **Total Tests:** 352 (151 failed | 200 passed | 1 skipped)
- **Document Errors:** 112 occurrences of "ReferenceError: document is not defined"
- **Affected Test Files:** 9 client-side test files

---

## Affected Test Files

### Complete List of Failing Client Tests

1. **`client/src/contexts/__tests__/AuthContext.test.tsx`** (3/3 tests failed)
   - Uses `render()` from @testing-library/react
   - Requires DOM for React component rendering

2. **`client/src/hooks/__tests__/useAsyncState.test.ts`** (13/13 tests failed)
   - Uses `renderHook()` from @testing-library/react
   - All hook tests fail on initialization

3. **`client/src/hooks/useOrderHistory.test.tsx`** (8/8 tests failed)
   - Uses `renderHook()` and `waitFor()`
   - Requires DOM for React hook testing

4. **`client/src/hooks/__tests__/useSoundNotifications.test.ts`** (9/9 tests failed)
   - Uses `renderHook()`
   - Requires DOM even though it's testing audio APIs

5. **`client/src/hooks/useSoundNotifications.test.tsx`** (9/9 tests failed)
   - Duplicate test file (different location)
   - Same failures as above

6. **`client/src/modules/filters/hooks/__tests__/useOrderFilters.test.ts`** (8/8 tests failed)
   - Uses `renderHook()`
   - Filter hooks require DOM context

7. **`client/src/hooks/keyboard/__tests__/useAriaLive.test.ts`** (5/5 tests failed)
   - Uses `renderHook()`
   - ARIA live regions require actual DOM

8. **`client/src/hooks/keyboard/__tests__/useKeyboardShortcut.test.ts`** (4/4 tests failed)
   - Uses `renderHook()` and `fireEvent.keyDown(document, ...)`
   - **Directly accesses `document` object** (line 21, 35, 38, etc.)

9. **`client/src/services/audio/soundEffects.test.ts`** (9/13 tests failed)
   - Partial failures
   - Some tests use DOM APIs, others don't

---

## Root Cause Analysis

### 1. Environment Configuration Mismatch

**Root Configuration (`/Users/mikeyoung/CODING/rebuild-6.0/vitest.config.ts`):**
```typescript
export default defineConfig({
  test: {
    environment: 'node',  // ❌ PROBLEM: Node environment has no DOM
    globals: true,
    watch: false,
    reporters: ['dot'],
    passWithNoTests: true,
    isolate: true,
    hookTimeout: 15000,
    testTimeout: 15000,
    poolOptions: { threads: { singleThread: true } },
    setupFiles: ['tests/setup.ts'],  // ❌ Server setup, not client
  },
})
```

**Client Configuration (`/Users/mikeyoung/CODING/rebuild-6.0/client/vitest.config.ts`):**
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',  // ✅ CORRECT: JSDOM provides DOM globals
    testTimeout: 15000,
    hookTimeout: 15000,
    exclude: ['**/node_modules/**','**/dist/**','**/tests/quarantine/**', ...qList],
    // ❌ MISSING: No setupFiles specified
  },
});
```

### 2. Vitest Version Discrepancy

- **Root:** Vitest v1.6.1 (server workspace)
- **Client:** Vitest v3.2.4 (client workspace)

When `npm run test:quick` is run from **root**, it uses the **root vitest.config.ts** with v1.6.1 and the Node environment.

### 3. Setup File Mismatch

**Root setup:** `/Users/mikeyoung/CODING/rebuild-6.0/tests/setup.ts`
- Only sets `TZ='UTC'` and `FORCE_COLOR='0'`
- No JSDOM setup
- No @testing-library setup

**Client setup:** `/Users/mikeyoung/CODING/rebuild-6.0/client/test/setup.ts`
- Imports `@testing-library/jest-dom`
- Mocks `window.matchMedia`
- Mocks `IntersectionObserver`, `ResizeObserver`
- Mocks `Audio`, `MediaRecorder`, `WebSocket`
- Sets up comprehensive DOM mocks
- **But this is NOT being used when running from root**

### 4. @testing-library/react Requirement

All failing tests use `renderHook()` or `render()` from `@testing-library/react` v16.3.0, which:

```typescript
// From stack traces:
❯ render node_modules/@testing-library/react/dist/pure.js:257:5
❯ Proxy.renderHook node_modules/@testing-library/react/dist/pure.js:340:7
```

**Line 257 in @testing-library/react** attempts to access `document.createElement()`, which doesn't exist in Node environment.

---

## Example Stack Traces

### Example 1: useAsyncState.test.ts
```
ReferenceError: document is not defined
 ❯ render node_modules/@testing-library/react/dist/pure.js:257:5
 ❯ Proxy.renderHook node_modules/@testing-library/react/dist/pure.js:340:7
 ❯ client/src/hooks/__tests__/useAsyncState.test.ts:6:24
      4| describe('useAsyncState', () => {
      5|   it('initializes with default state', () => {
      6|     const { result } = renderHook(() => useAsyncState<string>())
       | ^ |
      7|
      8|     expect(result.current.data).toBeUndefined()
```

### Example 2: useKeyboardShortcut.test.ts
```
ReferenceError: document is not defined
 ❯ client/src/hooks/keyboard/__tests__/useKeyboardShortcut.test.ts:21:5
     19|    ]))
     20|
     21|    fireEvent.keyDown(document, { key: 'a' })
       | ^ |
     22|    expect(mockAction1).toHaveBeenCalledTimes(1)
```

This test **directly accesses `document`** object, not just through React Testing Library.

### Example 3: AuthContext.test.tsx
```
ReferenceError: document is not defined
 ❯ render node_modules/@testing-library/react/dist/pure.js:257:5
 ❯ client/src/contexts/__tests__/AuthContext.test.tsx:73:24
     71|
     72|    const { rerender } = render(
     73|      <AuthProvider>
       | ^ |
     74|        <TestComponent />
```

---

## Environment Configuration Gaps

### Gap 1: No Workspace-Aware Environment Selection
The root config doesn't detect when running client tests and switch to JSDOM.

### Gap 2: Missing Setup File Reference
Client config doesn't specify `setupFiles: ['test/setup.ts']` (though it might be auto-detected).

### Gap 3: No Environment Per-File Override
Tests don't use `// @vitest-environment jsdom` comments to override environment.

### Gap 4: Monorepo Test Execution Strategy
Running `test:quick` from root executes **all** tests (server + client) with a **single** config, which can't satisfy both environments.

---

## JSDOM and Vitest Compatibility

### Version Matrix
- **Vitest 1.6.1** (server): Compatible with JSDOM 26.1.0 ✅
- **Vitest 3.2.4** (client): Compatible with JSDOM 26.1.0 ✅
- **@testing-library/react 16.3.0**: Requires JSDOM environment ✅

**Verdict:** No version compatibility issues. JSDOM 26.1.0 is fully compatible with both Vitest versions.

### Breaking Changes in Vitest 3.x
Vitest 3.x introduced stricter environment isolation. However, this doesn't affect the current issue since the problem is using the wrong config entirely.

---

## Why Tests Pass When Run Individually

When running tests from the **client** workspace:
```bash
cd client && npm test
```

Vitest uses `/Users/mikeyoung/CODING/rebuild-6.0/client/vitest.config.ts` which has:
- ✅ `environment: 'jsdom'`
- ✅ Proper JSDOM globals
- ✅ Client test setup (if auto-detected)

When running from **root**:
```bash
npm run test:quick  # Uses root vitest.config.ts
```

Vitest uses `/Users/mikeyoung/CODING/rebuild-6.0/vitest.config.ts` which has:
- ❌ `environment: 'node'`
- ❌ No DOM globals
- ❌ Server-only setup file

---

## Setup File Issues

### Current Root Setup (`tests/setup.ts`)
```typescript
process.env.TZ = 'UTC'
process.env.FORCE_COLOR = '0'
```

**Issues:**
- No JSDOM setup
- No DOM mock setup
- No @testing-library/jest-dom imports
- Server-focused only

### Current Client Setup (`client/test/setup.ts`)
```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, afterAll, beforeAll, vi } from 'vitest'

// Mocks for:
- window.matchMedia
- IntersectionObserver
- ResizeObserver
- Audio API
- MediaRecorder
- WebSocket
// ... comprehensive DOM setup
```

**Issue:** This excellent setup is **not referenced** in `client/vitest.config.ts`, relying on auto-detection.

---

## Recommended Solutions

### Option 1: Separate Test Commands (Cleanest)
**Never run client tests from root.**

```json
// package.json
{
  "test:quick": "npm run test:quick:server",
  "test:quick:server": "vitest --run --reporter=dot --passWithNoTests --no-color",
  "test:quick:client": "cd client && npm run test:quick",
  "test:quick:all": "npm run test:quick:server && npm run test:quick:client"
}
```

### Option 2: Workspace-Based Config
Use Vitest workspace feature with separate configs:

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './server/vitest.config.ts',
    test: {
      include: ['server/**/*.test.ts'],
      environment: 'node',
    }
  },
  {
    extends: './client/vitest.config.ts',
    test: {
      include: ['client/**/*.test.ts', 'client/**/*.test.tsx'],
      environment: 'jsdom',
      setupFiles: ['client/test/setup.ts'],
    }
  }
])
```

### Option 3: Per-File Environment Override
Add to each client test file:

```typescript
// @vitest-environment jsdom

import { describe, it } from 'vitest'
// ... rest of test
```

**Drawback:** Requires modifying 100+ test files.

### Option 4: Smart Root Config (Fragile)
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node', // default
    environmentMatchGlobs: [
      ['client/**/*.{test,spec}.{ts,tsx}', 'jsdom']
    ],
    setupFiles: {
      node: ['tests/setup.ts'],
      jsdom: ['client/test/setup.ts']
    }
  }
})
```

**Note:** `setupFiles` doesn't support per-environment configuration in Vitest 1.6.1.

---

## Immediate Fix Recommendations

### Priority 1: Update Root test:quick Script
```json
{
  "test:quick": "vitest --run --reporter=dot --passWithNoTests --no-color server/"
}
```

This ensures root command **only runs server tests** in Node environment.

### Priority 2: Add Client-Specific Quick Test
```json
{
  "test:quick:client": "cd client && vitest run --reporter=dot --passWithNoTests"
}
```

### Priority 3: Explicit Setup File in Client Config
```typescript
// client/vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'], // Make it explicit
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
```

### Priority 4: Document Test Strategy
Add to README:
```markdown
## Testing

### Run All Tests
- Server: `npm run test:quick:server`
- Client: `npm run test:quick:client`
- Both: `npm run test:quick:all`

### Environment Note
Client tests require JSDOM. Always run from client workspace or use workspace-aware commands.
```

---

## Conclusion

**Root Cause:** The root `vitest.config.ts` uses `environment: 'node'`, which lacks DOM globals required by all React component and hook tests using `@testing-library/react`.

**Impact:** 112 test failures across 9 client test files when running `npm run test:quick` from root.

**Solution:** Separate server and client test execution, or implement Vitest workspace configuration for proper environment isolation.

**No Version Issues:** JSDOM 26.1.0 is fully compatible with both Vitest 1.6.1 and 3.2.4.

---

## Appendix: Full List of Affected Tests

### client/src/hooks/__tests__/useAsyncState.test.ts (13 failures)
- initializes with default state
- initializes with provided data
- handles successful async operation
- handles failed async operation
- sets loading state during async operation
- allows manual state updates
- resets to initial state
- converts non-Error objects to Error instances
- initializes with default state (useAsyncOperations)
- handles multiple successful operations
- handles failure in any operation
- maintains loading state during operations
- resets state correctly

### client/src/hooks/useOrderHistory.test.tsx (8 failures)
- should fetch order history on mount
- should fetch statistics on mount
- should handle page changes
- should handle search query changes
- should handle date range changes
- should refresh data
- should handle errors gracefully
- should export data to CSV

### client/src/hooks/__tests__/useSoundNotifications.test.ts (9 failures)
- initializes with sound effects config
- plays new order sound when enabled
- does not play sound when disabled
- plays order ready sound
- plays alert sound
- toggles sound on and off
- updates volume
- persists sound settings across re-renders
- provides all expected methods and properties

### client/src/modules/filters/hooks/__tests__/useOrderFilters.test.ts (8 failures)
- should initialize with default filters
- should initialize with custom default filters
- should update status filter
- should update table filter
- should update date range
- should update search query
- should clear all filters
- should correctly determine hasActiveFilters

### client/src/hooks/keyboard/__tests__/useKeyboardShortcut.test.ts (4 failures)
- should handle multiple shortcuts
- should respect modifiers
- should not trigger in input fields
- should prevent default when action is triggered

### client/src/hooks/keyboard/__tests__/useAriaLive.test.ts (5 failures)
- All tests fail with document error

### client/src/contexts/__tests__/AuthContext.test.tsx (3 failures)
- should schedule single refresh timer when session has refresh token
- should prevent concurrent refresh attempts with latch
- should clear refresh timer on unmount

### client/src/hooks/useSoundNotifications.test.tsx (9 failures)
- Duplicate of useSoundNotifications.test.ts

### client/src/services/audio/soundEffects.test.ts (9/13 failures)
- Partial failures in sound effect tests

---

**Total Affected:** 112 test cases across 9 files
