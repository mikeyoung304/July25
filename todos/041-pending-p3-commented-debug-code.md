# TODO: Remove or convert commented debug logs to conditional logging

**Priority**: P3 (Nice-to-have)
**Status**: Pending
**Created**: 2025-11-24
**Category**: Code Quality

## Problem

Commented-out debug log statements are scattered throughout VoiceEventHandler.ts, creating code noise and uncertainty about whether they should be kept for future debugging.

**Locations**: `server/src/features/voice/realtime/VoiceEventHandler.ts`
- Line 230
- Line 253
- Line 375
- Line 402
- Line 426
- Additional locations throughout the file

```typescript
// Examples of commented debug code
// logger.debug('Processing audio delta', { delta: audioData });
// logger.debug('Item added to queue', { itemId: item.id });
// console.log('State transition:', from, '->', to);
```

## Current Issues

- **Code noise**: Clutters the codebase
- **Uncertainty**: Unclear if logs should be restored
- **Inconsistency**: Some debug logs active, others commented
- **Maintenance burden**: Commented code ages poorly

## Proposed Solution Options

### Option 1: Remove Commented Debug Code (Recommended)

**Rationale**: Git history preserves the code if needed later.

```typescript
// Before
private handleAudioDelta(delta: any) {
  // logger.debug('Processing audio delta', { delta: audioData });
  // console.log('Audio chunk size:', delta.length);
  this.processAudio(delta);
}

// After - Clean removal
private handleAudioDelta(delta: any) {
  this.processAudio(delta);
}
```

### Option 2: Convert to Conditional Debug Logging

**Rationale**: Keep debugging capability but make it controllable.

```typescript
// Create debug utility
// server/src/features/voice/realtime/debug.ts

import { env } from '../../../../config/env';

export const isVoiceDebugEnabled = (): boolean => {
  return env.VOICE_DEBUG === 'true' || env.NODE_ENV === 'development';
};

export const debugLog = (message: string, data?: any): void => {
  if (isVoiceDebugEnabled()) {
    logger.debug(`[VOICE_DEBUG] ${message}`, data);
  }
};
```

```typescript
// Usage in VoiceEventHandler.ts
import { debugLog } from './debug';

private handleAudioDelta(delta: any) {
  debugLog('Processing audio delta', {
    size: delta.length,
    timestamp: Date.now()
  });
  this.processAudio(delta);
}
```

### Option 3: Structured Debug Levels

**Rationale**: Different debug levels for different scenarios.

```typescript
// server/src/features/voice/realtime/debug.ts

export enum VoiceDebugLevel {
  NONE = 0,
  ERRORS = 1,
  WARNINGS = 2,
  INFO = 3,
  VERBOSE = 4,
}

class VoiceDebugger {
  private level: VoiceDebugLevel;

  constructor() {
    this.level = this.getDebugLevel();
  }

  private getDebugLevel(): VoiceDebugLevel {
    const level = env.VOICE_DEBUG_LEVEL;
    return VoiceDebugLevel[level as keyof typeof VoiceDebugLevel] || VoiceDebugLevel.NONE;
  }

  verbose(message: string, data?: any): void {
    if (this.level >= VoiceDebugLevel.VERBOSE) {
      logger.debug(`[VOICE:VERBOSE] ${message}`, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.level >= VoiceDebugLevel.INFO) {
      logger.info(`[VOICE:INFO] ${message}`, data);
    }
  }
}

export const voiceDebug = new VoiceDebugger();
```

```typescript
// Usage
import { voiceDebug } from './debug';

private handleAudioDelta(delta: any) {
  voiceDebug.verbose('Processing audio delta', { size: delta.length });
  this.processAudio(delta);
}
```

## Recommended Approach

**Hybrid: Remove most, convert critical debugging points**

1. **Remove** commented logs that are:
   - Redundant with existing logs
   - No longer relevant
   - Too verbose for debugging

2. **Convert** to conditional logging for:
   - Complex state transitions
   - Data channel operations
   - Queue processing
   - Audio stream handling

## Acceptance Criteria

- [ ] All commented debug logs identified and categorized
- [ ] Decision made for each commented section
- [ ] Conditional debug system implemented (if using Options 2/3)
- [ ] Critical debug points converted to conditional logs
- [ ] Unnecessary commented code removed
- [ ] VOICE_DEBUG env var documented (if applicable)
- [ ] Debug logging tested in development

## Files to Create/Modify

**Option 1 (Simple Removal)**:
- `server/src/features/voice/realtime/VoiceEventHandler.ts` (cleanup only)

**Option 2/3 (Conditional Logging)**:
- `server/src/features/voice/realtime/debug.ts` (new)
- `server/src/features/voice/realtime/VoiceEventHandler.ts` (convert logs)
- `server/src/features/voice/realtime/WebRTCConnection.ts` (convert logs)
- `server/src/config/env.ts` (add VOICE_DEBUG var)
- `.env.example` (document VOICE_DEBUG)

## Implementation Plan

### Phase 1: Audit Commented Code

```bash
# Find all commented debug logs
grep -n "// logger\." server/src/features/voice/realtime/VoiceEventHandler.ts
grep -n "// console\." server/src/features/voice/realtime/VoiceEventHandler.ts
```

Categorize each:
- **Keep**: Critical for debugging
- **Remove**: No longer needed
- **Uncertain**: Review with team

### Phase 2: Implement Debug System (if chosen)

Create `debug.ts` with chosen approach.

### Phase 3: Convert or Remove

For each commented log:
```typescript
// REMOVE if not needed
// logger.debug('Redundant log');

// CONVERT if valuable for debugging
debugLog('State transition', { from, to });
```

### Phase 4: Test Debug System

```typescript
// Test with debug enabled
process.env.VOICE_DEBUG = 'true';
// Verify logs appear

// Test with debug disabled
process.env.VOICE_DEBUG = 'false';
// Verify logs don't appear
```

## Commented Code Inventory

Based on locations mentioned:

| Line | Code | Action |
|------|------|--------|
| 230 | `// logger.debug('Audio delta', ...)` | Convert - audio processing |
| 253 | `// logger.debug('Item added', ...)` | Remove - redundant |
| 375 | `// console.log('State:', ...)` | Convert - state tracking |
| 402 | `// logger.debug('Queue status', ...)` | Convert - queue debugging |
| 426 | `// console.log('Message sent', ...)` | Remove - covered by other logs |

## Testing Strategy

### Manual Testing
```bash
# Enable debug logging
export VOICE_DEBUG=true
npm run dev:server

# Test voice ordering and verify debug logs appear
# Then disable and verify logs don't appear
```

### Automated Testing
```typescript
describe('Voice debug logging', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'debug');
  });

  it('logs debug messages when VOICE_DEBUG=true', () => {
    process.env.VOICE_DEBUG = 'true';

    debugLog('Test message', { data: 'test' });

    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
      { data: 'test' }
    );
  });

  it('skips debug messages when VOICE_DEBUG=false', () => {
    process.env.VOICE_DEBUG = 'false';

    debugLog('Test message', { data: 'test' });

    expect(logger.debug).not.toHaveBeenCalled();
  });
});
```

## Environment Variable

If implementing conditional logging:

```bash
# .env.example

# Voice ordering debug logging
# Set to 'true' to enable verbose debug logs for voice features
# Default: false (disabled in production)
VOICE_DEBUG=false

# Alternative: Debug levels (if using Option 3)
# Values: NONE, ERRORS, WARNINGS, INFO, VERBOSE
VOICE_DEBUG_LEVEL=NONE
```

## Benefits

### Option 1 (Removal)
- ✅ Cleanest code
- ✅ No new complexity
- ✅ Git history preserves logs
- ❌ Harder to debug issues later

### Option 2 (Conditional)
- ✅ Easy on/off debugging
- ✅ Production-safe
- ✅ Minimal complexity
- ⚠️ All-or-nothing (no granularity)

### Option 3 (Levels)
- ✅ Granular control
- ✅ Different verbosity levels
- ✅ Professional approach
- ⚠️ More complex to implement

## Production Considerations

- Ensure `VOICE_DEBUG=false` in production
- Add metric to track if debug logging accidentally enabled
- Consider performance impact of checking debug flag
- Document debugging workflow for developers

## Documentation

Add to voice feature documentation:

```markdown
## Debugging Voice Ordering

Enable debug logging for detailed voice ordering diagnostics:

\`\`\`bash
export VOICE_DEBUG=true
npm run dev:server
\`\`\`

This enables verbose logging for:
- State machine transitions
- Audio stream processing
- Message queue operations
- WebRTC connection events

**Note**: Never enable in production due to performance and log volume.
```

## Notes

- Git history preserves all removed code
- Prefer simple removal unless active debugging common
- If keeping debug logs, make them conditional
- Consider adding debug dashboard for voice features
- Review debug logging during code reviews

## Decision Required

Team should decide:
1. Remove all commented code? (simplest)
2. Implement conditional debug system? (most flexible)
3. Keep some critical debug points? (which ones?)

## References

- Code review finding: P3 code quality improvements
- Lines: 230, 253, 375, 402, 426 in VoiceEventHandler.ts
- Related: Logger standardization across codebase
