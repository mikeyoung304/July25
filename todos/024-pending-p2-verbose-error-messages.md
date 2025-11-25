# TODO: Sanitize Error Messages to Prevent Information Disclosure

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Security
**Effort:** 3 hours
**Created:** 2025-11-24

## Problem

Error messages sent to clients reveal internal implementation details that could aid attackers:

**Locations:**
- `server/src/routes/realtime.routes.ts:359,385,515`
- `server/src/services/voice/WebRTCConnection.ts:221,235`

**Examples:**
```typescript
// Exposes internal structure
res.status(500).json({ error: error.message });

// Reveals dependency information
throw new Error(`Failed to generate ephemeral token: ${error.message}`);
```

**Risk:** Information disclosure helps attackers understand system architecture, dependencies, and failure modes.

## Solution

1. Return generic error messages to clients
2. Log detailed errors server-side only
3. Use error codes for client-side error handling

**Pattern:**
```typescript
// Client response
res.status(500).json({
  error: 'Session creation failed',
  code: 'SESSION_CREATE_ERROR'
});

// Server logs
logger.error('Failed to generate ephemeral token', {
  error: error.message,
  stack: error.stack,
  userId: req.user?.id
});
```

## Acceptance Criteria

- [ ] All client-facing errors use generic messages
- [ ] Detailed errors logged server-side with context
- [ ] Error codes added for client error handling
- [ ] Test error scenarios return sanitized messages
- [ ] Update error handling documentation

## References

- Code Review P2-001: Verbose Error Messages
- OWASP: Error Handling and Logging
- Related: Server error handling patterns
