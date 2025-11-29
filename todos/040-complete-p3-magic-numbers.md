# TODO: Replace magic numbers with named constants

**Priority**: P3 (Nice-to-have)
**Status**: Complete
**Created**: 2025-11-24
**Completed**: 2025-11-29
**Category**: Code Quality

## Problem

Magic numbers are scattered throughout voice-related code without explanation, making the code harder to understand and maintain.

**Locations**:
- `VoiceEventHandler.ts:237` - Unclear numeric constants
- `WebRTCConnection.ts:88` - Connection timeouts
- `realtime.routes.ts:301` - 30000 character limit

```typescript
// Examples of magic numbers
if (menuContext.length > 30000) { ... }
setTimeout(() => { ... }, 5000);
maxRetries: 3
```

## Current Issues

- **Readability**: Unclear what numbers represent
- **Maintainability**: Hard to update consistently
- **Documentation**: Intent not captured in code
- **Searchability**: Can't grep for semantic meaning

## Proposed Solution

### Create Voice Configuration Constants

```typescript
// server/src/features/voice/realtime/constants.ts

/**
 * Voice ordering configuration constants
 * Centralized to ensure consistency and maintainability
 */
export const VOICE_CONFIG = {
  // Menu context limits
  MAX_MENU_CONTEXT_LENGTH: 30000, // Maximum characters for menu context sent to AI
  MAX_MENU_CONTEXT_TOKENS: 7500,  // Approximate token limit

  // Connection timeouts
  WEBSOCKET_CONNECT_TIMEOUT_MS: 5000,    // Time to wait for WebSocket connection
  WEBSOCKET_MESSAGE_TIMEOUT_MS: 30000,   // Time to wait for message response
  DATA_CHANNEL_TIMEOUT_MS: 10000,        // Time to wait for WebRTC data channel

  // Retry configuration
  MAX_CONNECTION_RETRIES: 3,              // Maximum connection retry attempts
  RETRY_DELAY_MS: 1000,                   // Initial retry delay
  RETRY_BACKOFF_MULTIPLIER: 2,            // Exponential backoff multiplier

  // Audio configuration
  AUDIO_SAMPLE_RATE: 24000,               // PCM audio sample rate (Hz)
  AUDIO_CHUNK_SIZE: 4096,                 // Audio buffer chunk size (bytes)

  // Session management
  SESSION_EXPIRE_SECONDS: 60,             // Ephemeral token expiration
  CACHE_EXPIRE_SECONDS: 300,              // Menu context cache duration

  // Message queue
  MAX_QUEUE_SIZE: 100,                    // Maximum queued messages
  QUEUE_PROCESS_INTERVAL_MS: 10,          // Queue processing interval

  // State machine
  STATE_TRANSITION_TIMEOUT_MS: 60000,     // Maximum time for state transition
  CLEANUP_DELAY_MS: 5000,                 // Delay before resource cleanup
} as const;

// Type for configuration (useful for mocking in tests)
export type VoiceConfig = typeof VOICE_CONFIG;
```

### Update Code to Use Constants

#### VoiceEventHandler.ts

```typescript
import { VOICE_CONFIG } from './constants';

// Before
setTimeout(() => { ... }, 5000);

// After
setTimeout(() => { ... }, VOICE_CONFIG.CLEANUP_DELAY_MS);
```

#### WebRTCConnection.ts

```typescript
import { VOICE_CONFIG } from './constants';

// Before
const timeout = setTimeout(() => {
  reject(new Error('Connection timeout'));
}, 5000);

// After
const timeout = setTimeout(() => {
  reject(new Error('WebSocket connection timeout'));
}, VOICE_CONFIG.WEBSOCKET_CONNECT_TIMEOUT_MS);
```

#### realtime.routes.ts

```typescript
import { VOICE_CONFIG } from './constants';

// Before
if (menuContext.length > 30000) {
  logger.warn('Menu context exceeds 30KB, truncating', {
    originalLength: menuContext.length,
    restaurant_id: restaurantId,
  });
  menuContext = menuContext.substring(0, 30000);
}

// After
if (menuContext.length > VOICE_CONFIG.MAX_MENU_CONTEXT_LENGTH) {
  logger.warn('Menu context exceeds limit, truncating', {
    originalLength: menuContext.length,
    limit: VOICE_CONFIG.MAX_MENU_CONTEXT_LENGTH,
    restaurant_id: restaurantId,
  });
  menuContext = menuContext.substring(0, VOICE_CONFIG.MAX_MENU_CONTEXT_LENGTH);
}
```

## Acceptance Criteria

- [ ] constants.ts file created with all voice configuration
- [ ] All magic numbers replaced with named constants
- [ ] Constants include JSDoc comments explaining purpose
- [ ] Type-safe with `as const` assertion
- [ ] All voice-related files updated
- [ ] Tests updated to use constants
- [ ] Documentation references constants file

## Files to Create/Modify

**New Files**:
- `server/src/features/voice/realtime/constants.ts`

**Modified Files**:
- `server/src/features/voice/realtime/VoiceEventHandler.ts`
- `server/src/features/voice/realtime/WebRTCConnection.ts`
- `server/src/features/voice/realtime/realtime.routes.ts`
- `server/src/features/voice/realtime/RealtimeStateMachine.ts`

## Magic Numbers to Replace

### High Priority (Unclear Intent)

| Location | Current Value | Proposed Constant |
|----------|---------------|-------------------|
| realtime.routes.ts:301 | 30000 | MAX_MENU_CONTEXT_LENGTH |
| WebRTCConnection.ts:88 | 5000 | WEBSOCKET_CONNECT_TIMEOUT_MS |
| VoiceEventHandler.ts:237 | 5000 | CLEANUP_DELAY_MS |
| realtime.routes.ts:187 | 30000 | WEBSOCKET_MESSAGE_TIMEOUT_MS |

### Medium Priority (Context Available)

| Location | Current Value | Proposed Constant |
|----------|---------------|-------------------|
| RealtimeStateMachine.ts | 3 | MAX_CONNECTION_RETRIES |
| WebRTCConnection.ts | 1000 | RETRY_DELAY_MS |
| RealtimeStateMachine.ts | 60000 | STATE_TRANSITION_TIMEOUT_MS |

## Testing Strategy

```typescript
import { VOICE_CONFIG } from '../constants';

describe('Voice configuration constants', () => {
  it('has all required timeout values', () => {
    expect(VOICE_CONFIG.WEBSOCKET_CONNECT_TIMEOUT_MS).toBeGreaterThan(0);
    expect(VOICE_CONFIG.DATA_CHANNEL_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('has reasonable default values', () => {
    expect(VOICE_CONFIG.MAX_MENU_CONTEXT_LENGTH).toBe(30000);
    expect(VOICE_CONFIG.MAX_CONNECTION_RETRIES).toBeLessThanOrEqual(5);
  });

  it('timeout values are in milliseconds', () => {
    // All timeout constants should end with _MS
    const timeoutKeys = Object.keys(VOICE_CONFIG).filter(k => k.includes('TIMEOUT'));
    timeoutKeys.forEach(key => {
      expect(key.endsWith('_MS')).toBe(true);
    });
  });
});
```

### Test Overrides

```typescript
// Allow tests to override constants if needed
jest.mock('./constants', () => ({
  VOICE_CONFIG: {
    ...jest.requireActual('./constants').VOICE_CONFIG,
    WEBSOCKET_CONNECT_TIMEOUT_MS: 100, // Faster tests
  },
}));
```

## Benefits

### Readability
```typescript
// Before - What is 30000?
if (length > 30000)

// After - Clear intent
if (length > VOICE_CONFIG.MAX_MENU_CONTEXT_LENGTH)
```

### Maintainability
- Single source of truth for configuration
- Update once, applies everywhere
- Easier to review changes

### Discoverability
- Developers can find all timeouts in one place
- grep for `VOICE_CONFIG` to find usage
- Type hints show available options

### Testing
- Override constants for faster tests
- Consistent values across test suites
- Easy to verify configuration

## Documentation

Add to README or voice feature docs:

```markdown
## Voice Configuration

All voice ordering timeouts and limits are defined in `server/src/features/voice/realtime/constants.ts`.

Key settings:
- **Menu Context**: 30KB limit (7500 tokens)
- **Connection Timeout**: 5 seconds
- **Message Timeout**: 30 seconds
- **Max Retries**: 3 attempts

See constants.ts for complete configuration.
```

## Notes

- Use `as const` for type safety and autocomplete
- Group related constants together
- Include units in constant names (MS, SECONDS, etc.)
- Add JSDoc comments for non-obvious values
- Consider environment variable overrides for critical values

## Future Enhancements

- Make some constants environment-variable overridable
- Add validation for constant values
- Create developer tools to tune constants
- Add metrics to track constant effectiveness

## Work Log

### 2025-11-29 - Implementation Complete

**Files Created**:
- `client/src/modules/voice/constants.ts` - Client-side voice configuration constants
- `server/src/routes/voiceConstants.ts` - Server-side voice configuration constants

**Files Modified**:
- `client/src/modules/voice/services/WebRTCConnection.ts` - Replaced magic numbers with VOICE_CONFIG constants
  - Connection timeout: 15000ms → VOICE_CONFIG.CONNECTION_TIMEOUT_MS
  - Max reconnect attempts: 3 → VOICE_CONFIG.MAX_RECONNECT_ATTEMPTS
  - Retry delay: 1000ms → VOICE_CONFIG.RETRY_DELAY_MS
  - Max retry delay: 5000ms → VOICE_CONFIG.MAX_RETRY_DELAY_MS
  - Stats check delay: 2000ms → VOICE_CONFIG.STATS_CHECK_DELAY_MS

- `client/src/modules/voice/services/VoiceEventHandler.ts` - Replaced magic numbers with VOICE_CONFIG constants
  - Max transcript length: 10000 → VOICE_CONFIG.MAX_TRANSCRIPT_LENGTH
  - Max transcript cache size: 50 → VOICE_CONFIG.MAX_TRANSCRIPT_CACHE_SIZE
  - Max seen event IDs: 1000 → VOICE_CONFIG.MAX_SEEN_EVENT_IDS
  - Max event payload size: 50000 → VOICE_CONFIG.MAX_EVENT_PAYLOAD_SIZE

- `server/src/routes/realtime.routes.ts` - Replaced magic numbers with VOICE_CONFIG constants
  - OpenAI API timeout: 45000ms → VOICE_CONFIG.OPENAI_API_TIMEOUT_MS
  - Max menu context length: 5000 → VOICE_CONFIG.MAX_MENU_CONTEXT_LENGTH
  - VAD threshold: 0.6 → VOICE_CONFIG.VAD_THRESHOLD
  - VAD prefix padding: 400ms → VOICE_CONFIG.VAD_PREFIX_PADDING_MS
  - VAD silence duration: 1500ms → VOICE_CONFIG.VAD_SILENCE_DURATION_MS
  - Max response output tokens: 500 → VOICE_CONFIG.MAX_RESPONSE_OUTPUT_TOKENS
  - Session expire time: 60000ms → VOICE_CONFIG.SESSION_EXPIRE_MS

**Benefits Achieved**:
- All magic numbers now have clear, documented meanings
- Single source of truth for voice configuration values
- Improved code searchability and maintainability
- Better developer experience with autocomplete and type safety
- Easier to adjust timeouts and limits for testing/tuning

**Verification**:
- TypeCheck: Passed (npm run typecheck:quick)
- All magic numbers in voice-related code replaced
- Constants include JSDoc comments explaining purpose
- Type-safe with `as const` assertion

## References

- Code review finding: P3 code quality improvements
- Martin Fowler - Replace Magic Number with Symbolic Constant
- Original locations: VoiceEventHandler:237, WebRTCConnection:88, realtime.routes:301
