---
status: ready
priority: p1
issue_id: "009"
tags: [security, data-integrity, rate-limiter]
dependencies: []
---

# TODO: Race Condition in Rate Limiter trackFailedAttempt

**Priority:** P1 - Critical
**Category:** Security / Data Integrity
**Detected:** 2025-12-24 (Code Review)
**Commits:** a6db0e58, b325e910

## Problem

In `server/src/middleware/authRateLimiter.ts`, the `trackFailedAttempt` function has a race condition:

```typescript
export function trackFailedAttempt(ip: string): void {
  const attempts = failedAttempts.get(ip) ?? 0;  // Read
  const newAttempts = attempts + 1;

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {      // Check (uses stale value)
    blockedIPs.add(ip);
    // ... cleanup and timer setup
  }

  failedAttempts.set(ip, newAttempts);           // Write
}
```

If two requests for the same IP arrive simultaneously (e.g., both at attempt 4), both could read `attempts = 4`, both calculate `newAttempts = 5`, and neither triggers the block because the check happens before the write.

## Impact

- Attacker could bypass rate limiting by timing requests
- MAX_FAILED_ATTEMPTS threshold could be exceeded without blocking
- Security control weakened under concurrent attack

## Proposed Fix

Use atomic increment pattern:

```typescript
export function trackFailedAttempt(ip: string): void {
  // Atomic increment
  const attempts = failedAttempts.get(ip) ?? 0;
  const newAttempts = attempts + 1;
  failedAttempts.set(ip, newAttempts);  // Write immediately

  // Check after write
  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    blockedIPs.add(ip);
    // ... rest of blocking logic
  }
}
```

Or for multi-instance: migrate to Redis with atomic INCR.

## Files

- `server/src/middleware/authRateLimiter.ts:45-65`

## Testing

- Add concurrent request test with Promise.all
- Verify blocking occurs at exactly MAX_FAILED_ATTEMPTS
