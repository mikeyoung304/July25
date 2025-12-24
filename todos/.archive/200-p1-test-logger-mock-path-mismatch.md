# TODO: Fix Logger Mock Path Mismatch Breaking 156 Tests

**Priority:** P1 - Critical
**Category:** Test Infrastructure
**Detected:** 2025-12-24 (Health Check)
**Status:** pending

## Problem

156 out of 781 tests are failing due to a logger mock path resolution mismatch:
- Tests mock `@/services/logger` (using Vite alias)
- Implementation imports `../../../services/logger` (relative path)
- Vitest is not resolving these as the same module for mocking purposes

Example failing test:
```
FAIL  client/src/modules/voice/services/__tests__/VoiceEventHandler.test.ts
AssertionError: expected "spy" to be called at least once
  expect(logger.error).toHaveBeenCalled()
```

## Impact

- CI/CD pipeline broken
- Cannot merge PRs safely
- 126 test files affected
- Blocking development velocity

## Proposed Fix

Create a centralized auto-hoisted mock in `client/src/services/__mocks__/logger.ts`:

```typescript
import { vi } from 'vitest'

export const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
```

Then update `client/vitest.config.ts` to auto-mock:
```typescript
test: {
  // ... existing config
  deps: {
    inline: ['@/services/logger']
  }
}
```

Or normalize all imports to use consistent path aliases.

## Files

- `client/src/services/__mocks__/logger.ts` (create)
- `client/vitest.config.ts` (update)
- `client/src/modules/voice/services/VoiceEventHandler.ts` (normalize import)
- Multiple test files using `vi.mock('@/services/logger')`

## Testing

- Run `npm run test:client` - should reduce failures from 156 to near 0
- Verify logger mocks are being called correctly
