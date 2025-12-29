---
title: "HTTPOnly Cookie Authentication"
slug: httponly-cookie-auth
category: security-issues
severity: critical
date_solved: 2025-12-28
---

# HTTPOnly Cookie Authentication

## Problem Summary

Tokens stored in localStorage are accessible to JavaScript and vulnerable to XSS attacks. An attacker exploiting XSS can steal all session tokens.

## Symptoms

- Tokens visible in browser DevTools → Application → Local Storage
- `localStorage.getItem('token')` returns sensitive auth tokens
- Any XSS vulnerability exposes all user sessions

## Root Cause

Token storage in `client/src/contexts/AuthContext.tsx:237-241` uses localStorage:

```typescript
// VULNERABLE
localStorage.setItem('token', token);
localStorage.setItem('demo_token', demoToken);
```

JavaScript running in the page can read these tokens, including injected scripts.

## Solution

Migrate sensitive tokens to HTTPOnly cookies:

### Server-side (set cookies):
```typescript
// On successful auth
res.cookie('auth_token', token, {
  httpOnly: true,     // Not accessible via JavaScript
  secure: true,       // HTTPS only
  sameSite: 'strict', // CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
});
```

### Server-side (read cookies):
```typescript
// In auth middleware
const token = req.cookies.auth_token;
if (!token) {
  return res.status(401).json({ error: 'Not authenticated' });
}
```

### Client-side:
```typescript
// No need to manage tokens - cookies sent automatically
// Just ensure credentials are included
fetch('/api/endpoint', {
  credentials: 'include', // Include cookies in request
});
```

### On Logout (Clear Cookies):

```typescript
// Clear auth cookie on logout
res.clearCookie('auth_token', {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  path: '/',
});

res.status(200).json({ message: 'Logged out' });
```

## Prevention

1. **Never store sensitive tokens in localStorage** - Use HTTPOnly cookies
2. **Set Secure flag** - Cookies only sent over HTTPS
3. **Set SameSite=Strict** - Prevents CSRF attacks
4. **Implement token rotation** - Short-lived tokens with refresh
5. **Clear cookies on logout** - Explicitly clear with same options used to set

## Trade-offs

| localStorage | HTTPOnly Cookies |
|--------------|------------------|
| Easy to implement | Requires server changes |
| Works with any backend | Needs cookie parsing middleware |
| Vulnerable to XSS | Protected from XSS |
| Manual token management | Automatic browser management |

## References

- `docs/archive/2025-12/security-audit/02_RISK_REGISTER.md` - P0-002
- `plans/security-remediation-v2.md` - Task 0.2
- `client/src/contexts/AuthContext.tsx:237-241`
