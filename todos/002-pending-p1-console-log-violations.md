# TODO-002: Replace console.log/warn/error with Logger

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 002
- **Tags**: security, code-quality, voice, logging
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Security Sentinel + WebRTC Specialist Agents

---

## Problem Statement

Voice modules use `console.log`, `console.warn`, and `console.error` directly instead of the logger service. This:

1. **Violates project standards** - CLAUDE.md states "Never use console.log - enforced by pre-commit hook"
2. **Creates PII exposure risk** - Full event objects logged may contain user voice transcripts
3. **Bypasses log level controls** - Can't disable in production
4. **Pre-commit failures** - Commits containing console.* will be rejected

---

## Findings

### VoiceEventHandler.ts Violations
```typescript
// Line 158
console.log('[VoiceEventHandler] Data channel already open, flushing queued messages');

// Line 161
console.log(`[VoiceEventHandler] Flushing ${this.messageQueue.length} queued messages`);

// Line 257
console.log(`🔔 [VoiceEventHandler] Received: ${event.type}`);

// Lines 716-717 - CRITICAL: Logs full event objects
console.error('[VoiceEventHandler] API error:', JSON.stringify(event.error, null, 2));
console.error('[VoiceEventHandler] Full error event:', JSON.stringify(event, null, 2));
```

### WebRTCConnection.ts Violations
```typescript
// Lines 306-310
console.warn('[WebRTCConnection] enableMicrophone() called', {...});

// Lines 321-327
console.warn('[WebRTCConnection] Audio track state', {...});

// Lines 338-342
console.warn('[WebRTCConnection] Microphone ENABLED', {...});

// Lines 356-360
console.warn('[WebRTCConnection] Audio transmission stats (after 2s)', {...});

// Lines 365-371
console.error('[WebRTCConnection] CRITICAL: Audio track exists but ZERO bytes sent!');
```

### Total Count
- **VoiceEventHandler.ts**: 12+ violations
- **WebRTCConnection.ts**: 10+ violations
- **Other voice files**: 5+ violations

---

## Proposed Solutions

### Option A: Direct Replacement (Recommended)
Replace all console.* calls with logger equivalents, gated by debug flag.

**Pros**: Clean, consistent, follows standards
**Cons**: Manual work
**Effort**: Low (1-2 hours)
**Risk**: Low

### Option B: ESLint Auto-fix
Configure ESLint rule to auto-replace console.* with logger.*

**Pros**: Automated, catches future violations
**Cons**: May need manual review of replacements
**Effort**: Medium (setup + review)
**Risk**: Low

---

## Recommended Action

**Option A** with pattern:

```typescript
// BEFORE
console.log(`[VoiceEventHandler] Received: ${event.type}`);

// AFTER
if (this.config.debug) {
  logger.info('[VoiceEventHandler] Received event', { type: event.type });
}
```

For error logging (NEVER log full event objects):
```typescript
// BEFORE - DANGEROUS
console.error('[VoiceEventHandler] Full error event:', JSON.stringify(event, null, 2));

// AFTER - SAFE
logger.error('[VoiceEventHandler] API error', {
  code: event.error?.code,
  type: event.error?.type,
  // NEVER include: event.error, event.arguments, transcript text
});
```

---

## Technical Details

### Affected Files
- `client/src/modules/voice/services/VoiceEventHandler.ts`
- `client/src/modules/voice/services/WebRTCConnection.ts`
- `client/src/modules/voice/services/WebRTCVoiceClient.ts`
- `client/src/modules/voice/hooks/useWebRTCVoice.ts`

### Logger Import
```typescript
import { logger } from 'utils/logger';
```

---

## Acceptance Criteria

- [ ] Zero `console.log` in voice module files
- [ ] Zero `console.warn` in voice module files
- [ ] Zero `console.error` in voice module files
- [ ] All logging uses `logger` service
- [ ] Sensitive data (transcripts, event objects) never logged
- [ ] Debug logs gated by `config.debug` or `import.meta.env.DEV`
- [ ] Pre-commit hook passes

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From security + WebRTC review |

---

## Resources

- [Logger Utility](client/src/utils/logger.ts)
- [CLAUDE.md Logging Standards](CLAUDE.md)
