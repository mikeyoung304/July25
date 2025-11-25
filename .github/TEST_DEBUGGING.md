# Test Debugging Quick Reference

This guide covers common test failures and debugging strategies for the Restaurant OS codebase.

## Quick Diagnostics

```bash
# Check if both servers running for E2E tests
lsof -i :5173  # Vite frontend
lsof -i :3001  # Express backend

# Verify E2E infrastructure
npm run dev:e2e  # Should start BOTH servers

# Check test health
npm run test:server -- env-validation.test.ts  # Should be 14/14
npx playwright test tests/e2e/basic-routes.spec.ts --project=chromium  # Smoke test
```

## Common Gotchas (Symptom → Root Cause)

### E2E Test Issues

**"E2E tests timeout waiting for [data-testid='app-ready']"**
→ Performance marks ≠ DOM elements. App.tsx creates the marker AFTER splash screen (~6s delay).

**"WebSocket connection timeout on attempt 1"**
→ Backend not running. E2E needs BOTH servers: `npm run dev:e2e`

**"CI=true makes E2E tests fail"**
→ Fixed. Playwright now always starts servers via `dev:e2e` script.

**"Tests expect email input but can't find it"**
→ DevAuthOverlay uses Card components, not forms. Navigate to `/login` page.

### Unit Test Issues

**"expect().toThrow() fails with 'process.exit unexpectedly called'"**
→ Code must throw errors, not call process.exit(). See EnvValidationError pattern in server/src/config/env.ts

**"Cannot find module '@/services/...'"**
→ Path aliases require proper jest/vitest configuration. Check tsconfig paths match test config.

**"Supabase client not initialized"**
→ Mock Supabase in tests or ensure SUPABASE_URL/KEY are set in test environment.

## E2E Login Flow (VITE_DEMO_PANEL=1)

```
/login page
  ↓ Click DevAuthOverlay Card (.min-h-[120px])
  ↓ Real Supabase auth (not mock)
/home page
  ↓ Click Workspace Card (.min-h-[200px])
/workspace (e.g., /server, /kitchen)
```

**Available roles**: Manager, Server, Kitchen, Expo (NOT cashier, owner)
**Demo creds**: `{role}@restaurant.com` / `Demo123!`

## E2E Server Requirements

- **Frontend**: Vite on port 5173
- **Backend**: Express on port 3001 (for WebSocket, API calls)
- Both auto-start via `npm run dev:e2e` in Playwright config
- CI environments: Servers start fresh every run (reuseExistingServer: false)

## Test Commands Reference

```bash
npm test                   # Run all tests (client + server)
npm run test:client        # Client tests only
npm run test:server        # Server tests only
npm run test:watch         # Watch mode for client tests
npm run test:e2e           # E2E tests with Playwright
npm run test:quick         # Quick test run with minimal output
npm run test:healthy       # Run only healthy (non-quarantined) tests
```

## Debugging Tips

1. **Flaky tests**: Check for race conditions, add proper waits/retries
2. **Timeout issues**: Increase timeout in test config, not individual tests
3. **State pollution**: Ensure proper cleanup in afterEach/afterAll hooks
4. **Mock issues**: Verify mocks are reset between tests with `jest.clearAllMocks()`

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Main project guidance
- [Playwright Config](/playwright.config.ts) - E2E test configuration
- [Vitest Config](/client/vitest.config.ts) - Client test configuration
