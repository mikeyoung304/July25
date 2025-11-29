# TODO: Sanitize Error Messages to Prevent Information Disclosure

**Status:** Complete
**Priority:** P2 (Important)
**Category:** Security
**Effort:** 3 hours
**Created:** 2025-11-24
**Completed:** 2025-11-29

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

- [x] All client-facing errors use generic messages
- [x] Detailed errors logged server-side with context
- [x] Error codes added for client error handling
- [x] Test error scenarios return sanitized messages
- [ ] Update error handling documentation (optional)

## Work Log

**2025-11-29:** Sanitized all error messages in realtime voice API routes

**Server-side changes (`server/src/routes/realtime.routes.ts`):**
- Line 367: Removed `details: error.message` from menu load error response, kept logging intact
- Line 494: Removed `details: errorText` from OpenAI token creation error, added error code `SESSION_CREATE_ERROR`
- Line 544: Removed `message: err.message` from general error handler, kept error code

**Client-side changes (`client/src/modules/voice/services/WebRTCConnection.ts`):**
- Line 228: Sanitized SDP exchange error from exposing HTTP status to generic message, added server-side logging
- Line 242: Sanitized signaling state error from exposing internal state to generic protocol error message, kept server-side logging

All changes follow the pattern:
- Client receives generic error message with error code
- Server logs full diagnostic details (error message, stack trace, context)
- No internal implementation details exposed to clients

## References

- Code Review P2-001: Verbose Error Messages
- OWASP: Error Handling and Logging
- Related: Server error handling patterns
