# TODO: Add Validation for User Transcripts

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Security
**Effort:** 2 hours
**Created:** 2025-11-24

## Problem

User transcripts are processed without validation, creating security and performance risks:

**Locations:**
- `client/src/services/voice/VoiceEventHandler.ts:456-527`
- `server/src/lib/ai/realtime-menu-tools.ts:652`

**Risks:**
1. DoS via extremely long transcripts (no length limit)
2. Potential XSS if transcripts rendered without sanitization
3. Wasted processing on malformed input

## Solution

Add validation at multiple layers:

**Client-side validation:**
```typescript
const MAX_TRANSCRIPT_LENGTH = 1000;

if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
  logger.warn('Transcript too long', { length: transcript.length });
  return; // Ignore oversized transcripts
}

// Sanitize for display
const sanitized = transcript.replace(/[<>]/g, '');
```

**Server-side validation:**
```typescript
function validateTranscript(text: string): void {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid transcript');
  }
  if (text.length > MAX_TRANSCRIPT_LENGTH) {
    throw new Error('Transcript too long');
  }
}
```

## Acceptance Criteria

- [ ] Add MAX_TRANSCRIPT_LENGTH constant (1000 chars)
- [ ] Client-side length validation in VoiceEventHandler
- [ ] Server-side validation in realtime-menu-tools
- [ ] Sanitize transcripts before rendering in UI
- [ ] Add tests for edge cases (empty, oversized, special chars)
- [ ] Log validation failures with metrics

## References

- Code Review P2-002: Transcript Validation
- OWASP: Input Validation
- Related: Voice ordering security best practices
