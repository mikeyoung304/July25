# TODO: Make OpenAI timeout configurable via environment variable

**Priority**: P3 (Nice-to-have)
**Status**: Pending
**Created**: 2025-11-24
**Category**: Configuration

## Problem

The OpenAI API timeout is hardcoded to 30000ms in the realtime routes, preventing configuration for different environments or debugging scenarios.

**Location**: `server/src/features/voice/realtime/realtime.routes.ts:187`

```typescript
const openai = new OpenAI({
  apiKey: openaiApiKey,
  timeout: 30000, // Hardcoded value
});
```

## Current Behavior

- Timeout value cannot be adjusted without code changes
- No flexibility for:
  - Development/debugging (longer timeouts)
  - Production optimization (shorter timeouts)
  - Network-specific tuning

## Proposed Solution

### 1. Add Environment Variable

```typescript
// In server/src/config/env.ts
export const env = {
  // ... existing config
  OPENAI_API_TIMEOUT_MS: z.coerce.number().default(30000),
};
```

### 2. Update OpenAI Client Initialization

```typescript
// In realtime.routes.ts
import { env } from '../../../../config/env';

const openai = new OpenAI({
  apiKey: openaiApiKey,
  timeout: env.OPENAI_API_TIMEOUT_MS,
});
```

### 3. Document in .env.example

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-...
OPENAI_API_TIMEOUT_MS=30000  # API request timeout in milliseconds (default: 30000)
```

## Acceptance Criteria

- [ ] OPENAI_API_TIMEOUT_MS added to env.ts with validation
- [ ] Default value remains 30000ms (no behavior change)
- [ ] realtime.routes.ts uses env variable
- [ ] .env.example documented with description
- [ ] README.md updated if needed
- [ ] Validation ensures positive integer value

## Files to Modify

- `server/src/config/env.ts`
- `server/src/features/voice/realtime/realtime.routes.ts`
- `.env.example`

## Validation Logic

```typescript
// In env.ts
OPENAI_API_TIMEOUT_MS: z.coerce
  .number()
  .positive('Timeout must be positive')
  .int('Timeout must be an integer')
  .default(30000),
```

## Testing Strategy

```typescript
describe('OpenAI client configuration', () => {
  it('uses default timeout when not configured', () => {
    delete process.env.OPENAI_API_TIMEOUT_MS;
    // Should use 30000
  });

  it('respects custom timeout from environment', () => {
    process.env.OPENAI_API_TIMEOUT_MS = '60000';
    // Should use 60000
  });

  it('rejects invalid timeout values', () => {
    process.env.OPENAI_API_TIMEOUT_MS = '-1000';
    // Should throw validation error
  });
});
```

## Notes

- 30000ms (30 seconds) is a reasonable default for real-time voice
- Longer timeouts useful for debugging network issues
- Shorter timeouts can improve UX by failing faster
- Consider logging timeout value at startup for visibility

## Use Cases

**Development**: Set to 60000ms for debugging
**Production**: Keep default 30000ms
**Testing**: Set to 5000ms for faster failure detection

## References

- Code review finding: P3 configuration improvements
- Related: ADR-009 environment variable patterns
