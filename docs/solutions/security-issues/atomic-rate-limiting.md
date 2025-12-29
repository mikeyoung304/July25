---
title: "Atomic Rate Limiting Pattern"
slug: atomic-rate-limiting
category: security-issues
severity: high
date_solved: 2025-12-28
---

# Atomic Rate Limiting Pattern

## Problem Summary

Non-atomic rate limit counters allow concurrent requests to bypass limits via race conditions. In-memory rate limiting resets on server restart, creating vulnerability windows.

## Symptoms

- Rate limit bypassed during high concurrency
- Server restart clears all rate limit state
- Multiple server instances don't share rate limit counters

## Root Cause

1. **Race Condition**: Read-modify-write pattern in `server/src/services/auth/pinAuth.ts:303-319`:
   ```typescript
   // VULNERABLE - race condition
   const attempts = await getAttempts(userId);  // READ
   if (attempts >= MAX_ATTEMPTS) return locked;
   await setAttempts(userId, attempts + 1);     // WRITE (stale)
   ```

2. **In-Memory Storage**: `server/src/middleware/rateLimiter.ts` uses memory store:
   ```typescript
   // VULNERABLE - lost on restart
   const store = new Map<string, { count: number; timestamp: number }>();
   ```

## Solution

### PostgreSQL Atomic Increment:

```typescript
// Atomic increment with single query
const result = await prisma.$executeRaw`
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (${key}, 1, NOW())
  ON CONFLICT (key)
  DO UPDATE SET
    count = CASE
      WHEN rate_limits.window_start < NOW() - INTERVAL '15 minutes'
      THEN 1
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < NOW() - INTERVAL '15 minutes'
      THEN NOW()
      ELSE rate_limits.window_start
    END
  RETURNING count;
`;
```

### Redis-Based Rate Limiting:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function checkRateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const multi = redis.multi();

  multi.incr(key);
  multi.expire(key, windowSec);

  const results = await multi.exec();
  const count = results[0][1] as number;

  return count <= limit;
}

// Usage
const allowed = await checkRateLimit(`pin:${userId}`, 5, 900); // 5 attempts per 15 min
if (!allowed) {
  throw new RateLimitError('Too many attempts');
}
```

### Sliding Window with Redis:

```typescript
async function slidingWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Include zcard in the transaction to avoid TOCTOU race condition
  const results = await redis
    .multi()
    .zremrangebyscore(key, 0, windowStart)
    .zadd(key, now, `${now}:${Math.random()}`)
    .zcard(key)  // Get count atomically within transaction
    .expire(key, Math.ceil(windowMs / 1000))
    .exec();

  // zcard result is at index 2 (after zremrangebyscore and zadd)
  const count = results[2][1] as number;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
```

## Prevention

1. **Use atomic operations** - Single query for read+write
2. **Use distributed storage** - Redis or PostgreSQL, not memory
3. **Add grace period after restart** - Don't immediately enforce strict limits
4. **Include device fingerprint** - Not just IP for shared devices

## Migration Path

1. Add `rate_limits` table to PostgreSQL
2. Update rate limiter to use atomic PostgreSQL queries
3. Add Redis for performance (optional)
4. Add metrics for rate limit hits

## References

- `audit_output/02_RISK_REGISTER.md` - P2-001, P1-004
- `server/src/middleware/rateLimiter.ts`
- `server/src/services/auth/pinAuth.ts:303-319`
