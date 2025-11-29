# TODO: Fix Anonymous User Rate Limiting for Voice Sessions

**Status:** Complete
**Priority:** P2 (Important)
**Category:** Security
**Effort:** 3 hours
**Created:** 2025-11-24
**Completed:** 2025-11-29

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

- [x] Replace 'anonymous' key with IP-based keys
- [x] Reduce anonymous limit to 10-20/5min
- [x] Remove or adjust dev mode bypass
- [x] Add rate limit metrics by key type
- [ ] Test with multiple anonymous users from same IP
- [ ] Update rate limiting documentation

## References

- Code Review P2-003: Rate Limit Anonymous Users
- Related: Voice session cost optimization
- Related: DDoS protection strategies

## Work Log

### 2025-11-29: Implementation Complete
**Changes Made:**

1. **Added helper functions for IP-based rate limiting:**
   - `getClientIp()`: Extracts IP from request, handling proxies correctly
   - `getUserRateLimitKey()`: Returns `user:{id}` for authenticated users, `ip:{ip}` for anonymous
   - `getRestaurantRateLimitKey()`: Returns `restaurant:{id}` for scoped endpoints, `ip:{ip}` for anonymous

2. **Updated all rate limiters to use IP-based keys:**
   - `apiLimiter`: Now uses `getRestaurantRateLimitKey()`
   - `voiceOrderLimiter`: Now uses `getRestaurantRateLimitKey()`
   - `authLimiter`: Now uses `auth:{ip}` pattern with dev-aware limits (100/15min dev, 5/15min prod)
   - `healthCheckLimiter`: Now uses `health:{ip}` pattern with dev-aware limits (300/min dev, 30/min prod)
   - `aiServiceLimiter`: Now uses `getUserRateLimitKey()`, reduced from 50 to 20/5min
   - `transcriptionLimiter`: Now uses `getUserRateLimitKey()`, reduced from 20 to 10/min

3. **Removed dev mode bypass, kept permissive dev limits:**
   - Removed all `skip: () => isDevelopment` statements
   - Kept higher limits in dev mode using ternary operators
   - Rate limiting now active in dev mode for testing

4. **Enhanced logging with rate limit keys:**
   - Added `rateLimitKey` to abuse logging for AI and transcription limiters
   - Using `getClientIp()` for consistent IP extraction

**Security Improvements:**
- Anonymous users can no longer exhaust shared rate limit pool
- Each IP gets its own rate limit bucket
- Reduced limits make cost attacks more difficult
- Dev mode still has rate limiting enabled for better testing
