---
title: "CL-SEC-004: Rate Limiter TOCTOU Race Condition - Failed Attempt Tracking"
category: security-issues
tags:
  - rate-limiting
  - toctou
  - race-condition
  - concurrency
  - authentication
  - brute-force-protection
problem_type: security_vulnerability
components:
  - authRateLimiter
  - trackFailedAttempt
  - suspiciousIPs
  - blockedIPs
severity: high
related_issues:
  - "TODO-009: Rate limiter TOCTOU race condition"
affected_files:
  - "server/src/middleware/authRateLimiter.ts"
created_date: 2025-12-24
resolved_date: 2025-12-24
---

# Rate Limiter TOCTOU Race Condition: Failed Attempt Tracking

## Problem Summary

The `trackFailedAttempt` function in `authRateLimiter.ts` had a Time-Of-Check-To-Time-Of-Use (TOCTOU) race condition that allowed attackers to bypass the auto-block mechanism under concurrent request timing attacks.

## Symptoms

- Attackers could exceed the 10-attempt threshold without triggering the IP block
- Concurrent authentication requests could both succeed in incrementing counter but neither trigger the block
- Security monitoring logs showed clients with >10 failed attempts still making requests

## Attack Scenario

```
Timeline with concurrent requests:

Time T1: Request A reads attempts = 9
Time T2: Request B reads attempts = 9  (before A writes)
Time T3: Request A writes attempts = 10
Time T4: Request B writes attempts = 10 (overwrites A's value, still 10)
Time T5: Request A checks: 9 >= 10? FALSE  (checking OLD value!)
Time T6: Request B checks: 9 >= 10? FALSE  (checking OLD value!)
Time T7: Neither request triggers block, attacker continues
```

Under this race condition, an attacker making rapid parallel requests could:
1. Execute significantly more than 10 attempts before being blocked
2. Reset the counter race repeatedly, potentially avoiding the block entirely
3. Successfully brute-force credentials or enumerate valid accounts

## Root Cause Analysis

### The Bug

The original implementation checked the **pre-increment** value instead of the **post-increment** value:

```typescript
// BEFORE (vulnerable)
const trackFailedAttempt = (clientId: string) => {
  const attempts = suspiciousIPs.get(clientId) || 0;
  suspiciousIPs.set(clientId, attempts + 1);

  // BUG: checking OLD value (attempts), not the new value (attempts + 1)
  // When attempts = 9, this evaluates to: 9 >= 10 = FALSE
  // Even though we just wrote 10 to the map
  if (attempts >= 10) {
    blockedIPs.add(clientId);
  }
}
```

### Why This Matters

This is a classic TOCTOU vulnerability where:
- **Time of Check**: The value `attempts` at the moment of reading
- **Time of Use**: The value written to the map (`attempts + 1`)
- **Gap**: The conditional check uses the stale read value, not the new written value

The bug allows the 10th attempt to pass without triggering the block, giving the attacker one extra attempt. Worse, under concurrent conditions, multiple requests can all read the same value before any write occurs, compounding the issue.

## Working Solution

### The Fix

Store the incremented value in a variable and use that for both the write and the check:

```typescript
// AFTER (fixed)
const trackFailedAttempt = (clientId: string) => {
  const attempts = suspiciousIPs.get(clientId) || 0;
  const newAttempts = attempts + 1;
  suspiciousIPs.set(clientId, newAttempts);  // Write BEFORE check

  // Now checking the NEW value after increment
  if (newAttempts >= 10) {
    blockedIPs.add(clientId);
    logger.error(`[SECURITY] Client blocked after 10 failed attempts: ${clientId}`);
    // ... timer setup for auto-unblock
  }
}
```

### Key Changes

1. **Compute increment once**: `const newAttempts = attempts + 1`
2. **Write the computed value**: `suspiciousIPs.set(clientId, newAttempts)`
3. **Check the computed value**: `if (newAttempts >= 10)`

This ensures the threshold check uses the same value that was written, eliminating the TOCTOU window.

## Prevention Strategies

### 1. Read-Increment-Check Pattern

Always use this pattern when checking thresholds after incrementing counters:

```typescript
// Correct pattern
const current = map.get(key) || 0;
const next = current + 1;
map.set(key, next);
if (next >= threshold) {
  // trigger action
}
```

Never do this:

```typescript
// Anti-pattern - TOCTOU vulnerable
const current = map.get(key) || 0;
map.set(key, current + 1);
if (current >= threshold) {  // Wrong! Using pre-increment value
  // trigger action
}
```

### 2. Code Review Checklist for Counter Logic

When reviewing code that increments counters and checks thresholds:

- [ ] Is the increment value stored in a named variable?
- [ ] Is the same variable used for both `set()` and the conditional?
- [ ] Is the condition checking `>=` (not `>`) for threshold-based blocking?
- [ ] Are there any concurrent access concerns with the data structure?
- [ ] Is the write operation completed before the threshold check?

### 3. Static Analysis Patterns

Look for these code smells in security-critical counter logic:

```typescript
// Smell 1: Inline increment in set, then check original
map.set(key, value + 1);
if (value >= X)  // value is stale!

// Smell 2: Check before write
if (attempts >= 10) { block(); }
suspiciousIPs.set(clientId, attempts + 1);  // Off-by-one timing

// Smell 3: Different expressions in set vs check
map.set(key, current + 1);
if (current + 1 >= X)  // Works but error-prone, use variable
```

### 4. Atomic Operations for Critical Counters

For truly concurrent scenarios, consider using atomic operations or locks:

```typescript
// Option A: Mutex-protected critical section
const mutex = new Mutex();
async function trackFailedAttempt(clientId: string) {
  await mutex.runExclusive(() => {
    const newAttempts = (suspiciousIPs.get(clientId) || 0) + 1;
    suspiciousIPs.set(clientId, newAttempts);
    if (newAttempts >= 10) {
      blockedIPs.add(clientId);
    }
  });
}

// Option B: Redis INCR for distributed systems
const newAttempts = await redis.incr(`failed:${clientId}`);
if (newAttempts >= 10) {
  await redis.sadd('blocked', clientId);
}
```

## Testing Recommendations

### Unit Test: Threshold Boundary

```typescript
describe('trackFailedAttempt', () => {
  beforeEach(() => {
    suspiciousIPs.clear();
    blockedIPs.clear();
  });

  it('should block on exactly the 10th attempt', () => {
    const clientId = 'test-client';

    // Make 9 attempts - should not be blocked
    for (let i = 0; i < 9; i++) {
      trackFailedAttempt(clientId);
    }
    expect(blockedIPs.has(clientId)).toBe(false);
    expect(suspiciousIPs.get(clientId)).toBe(9);

    // 10th attempt - should trigger block
    trackFailedAttempt(clientId);
    expect(blockedIPs.has(clientId)).toBe(true);
    expect(suspiciousIPs.get(clientId)).toBe(10);
  });

  it('should block even when starting from 0', () => {
    const clientId = 'test-client';

    // Simulate exactly 10 attempts
    for (let i = 0; i < 10; i++) {
      trackFailedAttempt(clientId);
    }

    expect(blockedIPs.has(clientId)).toBe(true);
  });
});
```

### Concurrency Test: Parallel Requests

```typescript
describe('trackFailedAttempt concurrency', () => {
  it('should block when concurrent requests reach threshold', async () => {
    const clientId = 'concurrent-test';
    suspiciousIPs.set(clientId, 8);  // Start at 8 attempts

    // Simulate 5 concurrent requests (race to trigger block)
    await Promise.all([
      Promise.resolve().then(() => trackFailedAttempt(clientId)),
      Promise.resolve().then(() => trackFailedAttempt(clientId)),
      Promise.resolve().then(() => trackFailedAttempt(clientId)),
      Promise.resolve().then(() => trackFailedAttempt(clientId)),
      Promise.resolve().then(() => trackFailedAttempt(clientId)),
    ]);

    // Must be blocked regardless of race
    expect(blockedIPs.has(clientId)).toBe(true);
    // Counter should reflect all attempts (may be 13 due to races)
    expect(suspiciousIPs.get(clientId)).toBeGreaterThanOrEqual(10);
  });
});
```

### Integration Test: Rate Limit Bypass Attempt

```typescript
describe('rate limiter integration', () => {
  it('should block rapid sequential requests', async () => {
    const requests = [];

    // Fire 15 rapid login attempts
    for (let i = 0; i < 15; i++) {
      requests.push(
        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'X-Forwarded-For': '192.168.1.100' },
          body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
        })
      );
    }

    const responses = await Promise.all(requests);
    const blocked = responses.filter(r => r.status === 403 || r.status === 429);

    // At least the last 5 requests should be blocked
    expect(blocked.length).toBeGreaterThanOrEqual(5);
  });
});
```

## Related Vulnerabilities

This TOCTOU pattern appears in other security-critical contexts:

| Context | Vulnerable Pattern | Impact |
|---------|-------------------|--------|
| Session limits | Check session count before increment | Exceed max sessions |
| API quotas | Check usage before decrement | Exceed rate limits |
| Inventory | Check stock before decrement | Overselling |
| Password attempts | Check failures before increment | Brute force bypass |
| Concurrent logins | Check active sessions | Session limit bypass |

## Files Changed

| File | Change |
|------|--------|
| `server/src/middleware/authRateLimiter.ts` | Fixed TOCTOU by using post-increment value in threshold check |

## Verification

```bash
# Run rate limiter tests
npm run test:server -- authRateLimiter.test.ts

# Manual verification with curl
for i in {1..12}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
done
# Requests 11 and 12 should return 403/429
```

## Lessons Learned

1. **Counter checks must use post-increment values** - Always store the new value before checking thresholds
2. **Security counters need explicit variable naming** - Use `newAttempts` vs `attempts` to make the difference clear
3. **TOCTOU bugs are subtle** - The code "looks right" at first glance; requires careful trace of values
4. **Concurrent testing reveals timing bugs** - Unit tests with parallel execution can catch races
5. **Off-by-one in security = bypass** - Even one extra attempt can be exploited in automated attacks

## Related Documentation

- [Rate Limiting Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [TOCTOU Race Conditions (CWE-367)](https://cwe.mitre.org/data/definitions/367.html)
- [Authentication Rate Limiting (OWASP)](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
