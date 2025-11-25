# TODO: Fix Anonymous User Rate Limiting for Voice Sessions

**Status:** Pending
**Priority:** P2 (Important)
**Category:** Security
**Effort:** 3 hours
**Created:** 2025-11-24

## Problem

Anonymous users share a single rate limit key, and rate limiting is skipped entirely in dev mode:

**Location:** `server/src/middleware/rateLimiter.ts:58-68`

```typescript
// All anonymous users share this key
const key = userId || 'anonymous';

// Dev mode bypass
if (process.env.NODE_ENV === 'development') {
  return next();
}
```

**Risk:**
- Cost attacks on `/session` endpoint (OpenAI API calls)
- Single attacker can exhaust rate limit for all anonymous users
- No protection during local development testing

## Solution

1. **Reduce anonymous user limits:**
   - Current: 100/5min (too generous)
   - Proposed: 10-20/5min (reasonable for legitimate use)

2. **Add IP-based secondary limiting:**
```typescript
function getRateLimitKey(req: Request): string {
  const userId = req.user?.id;

  if (userId) {
    return `user:${userId}`;
  }

  // Use IP for anonymous users
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `ip:${ip}`;
}
```

3. **Keep rate limiting in dev mode:**
```typescript
// Remove dev bypass entirely, or use more permissive limits
const devLimit = process.env.NODE_ENV === 'development' ? 100 : 20;
```

## Acceptance Criteria

- [ ] Replace 'anonymous' key with IP-based keys
- [ ] Reduce anonymous limit to 10-20/5min
- [ ] Remove or adjust dev mode bypass
- [ ] Add rate limit metrics by key type
- [ ] Test with multiple anonymous users from same IP
- [ ] Update rate limiting documentation

## References

- Code Review P2-003: Rate Limit Anonymous Users
- Related: Voice session cost optimization
- Related: DDoS protection strategies
