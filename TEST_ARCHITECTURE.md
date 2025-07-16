# Test Architecture

## Overview

This document describes the testing strategy, structure, and implementation details for the Rebuild 6.0 project. We use a dual-runner approach with Jest for unit/integration tests and Playwright for end-to-end tests.

## Test Structure

```
rebuild-6.0/
├── client/
│   ├── src/
│   │   ├── **/*.test.{ts,tsx}      # Unit tests (Jest)
│   │   ├── **/*.spec.{ts,tsx}      # Unit tests (Jest)
│   │   └── test/                   # Test setup and utilities
│   │       ├── setup.ts            # Test environment setup
│   │       ├── setupJest.ts        # Browser globals and polyfills
│   │       └── jest-globals.js     # Global test utilities
│   └── jest.config.cjs             # Jest configuration
│
├── server/
│   ├── tests/                      # Backend tests
│   └── jest.config.js              # Server Jest config
│
├── tests/
│   └── e2e/                        # End-to-end tests (Playwright)
│       ├── *.e2e.test.tsx          # E2E test files
│       └── voice-ordering.spec.ts   # Playwright specs
│
├── jest.config.mjs                 # Root Jest orchestrator
└── playwright.config.ts            # Playwright configuration
```

## Test Runners

### Jest (Unit & Integration Tests)

**Purpose**: Fast, isolated testing of components, hooks, services, and utilities.

**Configuration**:
```javascript
// client/jest.config.cjs
module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'jest-environment-jsdom',
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.spec.{ts,tsx}'
  ],
  setupFiles: [
    '../test/setupImportMeta.ts',
    '<rootDir>/src/test/jest-globals.js',
    '<rootDir>/src/test/setupJest.ts'
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(isows|@supabase|@supabase/.*)/)'
  ]
}
```

**Key Features**:
- ESM support for modern JavaScript
- Browser globals mocked (WebSocket, AudioContext, MediaRecorder)
- React Testing Library integration
- Fast execution with `--maxWorkers=2`

### Playwright (E2E Tests)

**Purpose**: Real browser testing for critical user journeys.

**Configuration**:
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173'
  }
})
```

**Key Features**:
- Real browser environment
- Network interception
- Visual regression testing
- Cross-browser support

## Test Setup Files

### 1. `client/src/test/setupJest.ts`
Provides browser API mocks:
- `window.matchMedia`
- `AudioContext` and `webkitAudioContext`
- `MediaRecorder` and `MediaStream`
- `WebSocket`
- `navigator.mediaDevices`

### 2. `test/setupImportMeta.ts`
Polyfills `import.meta.env` for Vite compatibility:
```typescript
global.import = {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3001',
      VITE_WS_URL: 'ws://localhost:3001',
      MODE: 'test'
    }
  }
}
```

### 3. `client/src/test/setup.ts`
React Testing Library configuration and global test utilities.

## Test Categories

### 1. Unit Tests
- **Location**: Next to source files (`*.test.ts`, `*.test.tsx`)
- **Scope**: Single component/function in isolation
- **Mocking**: Heavy use of mocks for dependencies
- **Example**: `OrderCard.test.tsx`, `useOrderData.test.ts`

### 2. Integration Tests
- **Location**: `*.integration.test.tsx` files
- **Scope**: Multiple components/services working together
- **Mocking**: Minimal, real service interactions where possible
- **Example**: `orderFlow.integration.test.tsx`

### 3. E2E Tests
- **Location**: `tests/e2e/` directory
- **Scope**: Complete user journeys
- **Mocking**: None, real application
- **Example**: `voice-to-kitchen.e2e.test.tsx`

## Skipped Tests

We have 30 tests currently skipped with the pattern:
```typescript
test.skip('test name', async () => {
  // TODO(luis): enable when Playwright pipeline runs
})
```

### Why Tests Are Skipped

1. **WebSocket Tests** (15 tests)
   - `WebSocketService.test.ts` - Requires real WebSocket connection
   - These tests timeout with mocked WebSocket

2. **Voice Integration Tests** (10 tests)
   - `VoiceControl` connection tests
   - `orderIntegration.integration.test.tsx`
   - Require real browser APIs and WebRTC

3. **Menu-Specific Tests** (5 tests)
   - `parseVoiceOrder` tests use generic items not in Grow Fresh menu
   - Need menu-specific test data

### Enabling Skipped Tests

To run integration tests properly:
1. Set up Playwright environment
2. Use real backend services
3. Update CI pipeline with:
   ```yaml
   - name: Run Integration Tests
     run: npx playwright test tests/e2e/**
   ```

## Running Tests

### All Tests
```bash
npm test                    # Run all Jest tests
npm run test:e2e           # Run Playwright tests
```

### Specific Test Suites
```bash
# Jest tests only
npm test -- client         # Client tests only
npm test -- server         # Server tests only

# Watch mode
npm test -- --watch       # Watch for changes

# Coverage
npm test -- --coverage    # Generate coverage report
```

### CI Pipeline
```bash
# Optimized for CI environments
npm test -- --runInBand --maxWorkers=2
```

## Mock Strategies

### 1. Service Mocks
Located in `__mocks__` directories:
```
src/services/http/__mocks__/httpClient.ts
```

### 2. Module Mocks
Using Jest's module mocking:
```typescript
jest.mock('@/services/api')
```

### 3. Global Mocks
Defined in setup files for browser APIs.

## Best Practices

### DO ✅
- Keep tests close to source code
- Use descriptive test names
- Test behavior, not implementation
- Mock external dependencies
- Use `test.skip` with TODO comment for incomplete tests
- Run tests before committing

### DON'T ❌
- Test implementation details
- Mock everything (some integration is good)
- Write brittle selectors
- Ignore flaky tests
- Skip tests without documentation

## Common Issues & Solutions

### Issue: "beforeAll is not defined"
**Solution**: Don't use Jest globals in setup files. They run before Jest is initialized.

### Issue: ESM module errors
**Solution**: Add module to `transformIgnorePatterns` in Jest config.

### Issue: WebSocket connection failures
**Solution**: Use the mocked WebSocket from setupJest.ts or skip for real integration test.

### Issue: import.meta.env undefined
**Solution**: Ensure setupImportMeta.ts is in setupFiles array.

## Future Improvements

1. **Playwright Pipeline**
   - Set up GitHub Action for E2E tests
   - Enable currently skipped integration tests
   - Add visual regression tests

2. **Test Data Management**
   - Create test data factories
   - Seed test database for E2E tests
   - Mock data generators for consistent tests

3. **Performance Testing**
   - Add performance benchmarks
   - Monitor test execution time
   - Fail on performance regressions

4. **Coverage Goals**
   - Current: ~70% (estimated)
   - Target: 80% for critical paths
   - 100% for business logic

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup
- [CI/CD Configuration](./.github/workflows/ci.yml) - GitHub Actions setup
- [Contributing Guide](./CONTRIBUTING_AI.md) - How to write tests

---

*Last updated: January 2025 | Test Architecture v1.0*