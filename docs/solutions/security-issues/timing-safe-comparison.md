---
title: "Timing-Safe Comparison Pattern"
slug: timing-safe-comparison
category: security-issues
severity: high
date_solved: 2025-12-28
---

# Timing-Safe Comparison Pattern

## Problem Summary

Standard string comparison (`===`) returns early on first mismatch, creating timing differences that attackers can measure to enumerate valid users or brute-force secrets.

## Symptoms

- Response time varies based on how much of the PIN/password matches
- User enumeration possible by measuring auth failures
- Attackers identify valid accounts before brute-forcing

## Root Cause

PIN verification in `server/src/services/auth/pinAuth.ts:205-216` loops through users and returns on first match/mismatch, creating measurable timing differences.

```typescript
// VULNERABLE - timing attack possible
for (const user of users) {
  if (await bcrypt.compare(pin, user.pin_hash)) {
    return user; // Early return reveals match
  }
}
return null; // Timing reveals no match found
```

## Solution

### Constant-Time Comparison:

```typescript
import crypto from 'crypto';

function timingSafeEqual(a: string, b: string): boolean {
  // Pad strings to same length to prevent length timing
  const bufA = Buffer.from(a.padEnd(64, '\0'));
  const bufB = Buffer.from(b.padEnd(64, '\0'));

  return crypto.timingSafeEqual(bufA, bufB);
}
```

### Fixed Response Delay:

```typescript
async function authenticatePIN(pin: string, userId: string) {
  const startTime = Date.now();
  const MIN_RESPONSE_TIME = 200; // ms

  try {
    const user = await findUserAndValidatePIN(pin, userId);
    return user;
  } finally {
    // Ensure consistent response time
    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_RESPONSE_TIME) {
      await sleep(MIN_RESPONSE_TIME - elapsed);
    }
  }
}
```

### For PIN/Password with bcrypt:

```typescript
// Always compare against a real hash, even for non-existent users
const DUMMY_HASH = '$2b$10$dummy.hash.for.timing.attack.prevention';

async function validatePIN(userId: string, pin: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Compare against real or dummy hash to prevent timing leak
  const hashToCompare = user?.pin_hash || DUMMY_HASH;
  const isValid = await bcrypt.compare(pin, hashToCompare);

  if (!user || !isValid) {
    return null;
  }

  return user;
}
```

## Prevention

1. **Always use crypto.timingSafeEqual** - For direct string comparisons
2. **Use bcrypt.compare with dummy hash** - For password/PIN verification
3. **Add fixed response delay** - Normalize response times
4. **Avoid early returns in auth** - Process all inputs consistently

## References

- `audit_output/02_RISK_REGISTER.md` - P1-001
- `server/src/services/auth/pinAuth.ts:205-216`
- OWASP Authentication Cheat Sheet
