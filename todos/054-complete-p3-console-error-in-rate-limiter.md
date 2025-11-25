---
status: complete
priority: p3
issue_id: "054"
tags: [code-review, logging, voice-ordering]
dependencies: []
---

# Rate Limiter Uses console.error Instead of Logger

## Problem Statement

The rate limiter middleware uses `console.error` instead of the structured `logger`, breaking centralized logging and violating CLAUDE.md rule #4.

**Location:** `server/src/middleware/rateLimiter.ts:72,93`

```typescript
handler: (req, res) => {
  // Log potential abuse for monitoring
  console.error(`[RATE_LIMIT] AI service limit exceeded for ${req.ip} at ${new Date().toISOString()}`);
```

**Why It Matters:**
- Missed abuse detection in centralized logging systems
- Inconsistent log formatting
- Violation of codebase logging standards

## Findings

### From CLAUDE.md Rule #4:
> **Logging**: Use `logger`, never `console.log`

### Impact:
- Rate limit events not visible in production logging (Datadog, etc.)
- Cannot correlate with other request logs
- Missing structured context (userId, restaurantId)

## Proposed Solutions

### Solution 1: Use Structured Logger (Recommended)
**Pros:** Consistent with codebase, rich context
**Cons:** None
**Effort:** Low (15 minutes)
**Risk:** None

```typescript
import { logger } from '../utils/logger';

export const aiServiceLimiter = rateLimit({
  handler: (req, res) => {
    const authReq = req as AuthenticatedRequest;
    logger.warn('[RATE_LIMIT] AI service limit exceeded', {
      ip: req.ip,
      userId: authReq.user?.id,
      restaurantId: authReq.restaurantId,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      error: 'Too many AI requests. Please wait 5 minutes.',
      retryAfter: 300
    });
  }
});
```

## Recommended Action
<!-- To be filled after triage -->

## Technical Details

**Affected Files:**
- `server/src/middleware/rateLimiter.ts`

## Acceptance Criteria

- [ ] No `console.error` in rate limiter
- [ ] Rate limit events visible in production logs
- [ ] Includes userId and restaurantId context
- [ ] Pre-commit hook passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-11-24 | Created from code review | Security events need structured logging |

## Resources

- CLAUDE.md logging standards
- Pre-commit hook enforces no console.log
