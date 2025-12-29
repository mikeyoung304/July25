---
title: "Demo User Bypass Prevention"
slug: demo-bypass-prevention
category: security-issues
severity: critical
date_solved: 2025-12-28
---

# Demo User Bypass Prevention

## Problem Summary

JWT tokens with `sub: 'demo:...'` prefix bypass all database permission checks in `restaurantAccess.ts`, allowing attackers to forge tokens and gain full access.

## Symptoms

- Forged `demo:anything` JWT passes middleware validation
- No database lookup for demo users
- Full restaurant access without proper authentication

## Root Cause

The demo user bypass in `server/src/middleware/restaurantAccess.ts:43-50` uses string prefix matching without validation:

```typescript
// VULNERABLE
if (sub.startsWith('demo:')) {
  return true;  // Skips all DB permission checks
}
```

## Solution

Gate behind `DEMO_MODE` environment variable and validate against whitelist.
Use constant-time logic to prevent timing attacks on mode detection:

```typescript
if (sub.startsWith('demo:')) {
  // Check both conditions before any logging to prevent timing attacks
  const isDemoMode = process.env.DEMO_MODE === 'enabled';
  const demoUsers = process.env.DEMO_USER_WHITELIST?.split(',') || [];
  const isValidUser = demoUsers.includes(sub);

  // Validate both conditions - order doesn't matter for security
  if (!isDemoMode || !isValidUser) {
    // Log after decision to avoid timing leak
    logger.warn('Demo access denied', {
      sub,
      isDemoMode,
      isValidUser,
      reason: !isDemoMode ? 'demo_mode_disabled' : 'user_not_whitelisted'
    });
    return false;
  }

  return true;
}
```

## Prevention

1. **Never use string prefix matching for auth bypass** - Always validate against explicit list
2. **Gate demo features behind explicit env vars** - Production should never have DEMO_MODE
3. **Log all bypass attempts** - Detection is critical for security
4. **Fail closed** - If uncertain, deny access

## References

- `docs/archive/2025-12/security-audit/02_RISK_REGISTER.md` - P0-001
- `plans/security-remediation-v2.md` - Task 0.1
- `server/src/middleware/restaurantAccess.ts:43-50`
