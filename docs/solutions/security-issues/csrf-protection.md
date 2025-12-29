---
title: "CSRF Protection Pattern"
slug: csrf-protection
category: security-issues
severity: high
date_solved: 2025-12-28
---

# CSRF Protection Pattern

## Problem Summary

State-changing requests (POST/PUT/DELETE) can be triggered by malicious sites if no CSRF protection is in place. Combined with cookie-based auth, this allows cross-site request forgery.

## Symptoms

- No `X-CSRF-Token` header required on mutations
- Forms submit successfully from external sites
- No token validation in Express middleware

## Root Cause

REST API was designed without CSRF protection, assuming tokens would be passed in headers. With migration to HTTPOnly cookies, CSRF becomes a concern.

## Solution

### Option A: CSRF Token Pattern

```typescript
// server/src/middleware/csrf.ts
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

// Apply to state-changing routes
app.post('/api/*', csrfProtection, handler);
app.put('/api/*', csrfProtection, handler);
app.delete('/api/*', csrfProtection, handler);

// Provide token to client
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

### Option B: SameSite Cookie (Simpler)

If using `SameSite=Strict` or `SameSite=Lax` cookies, CSRF is largely mitigated:

```typescript
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict', // Prevents cross-site cookie sending
});
```

### Client-side (if using tokens):
```typescript
// Fetch CSRF token on page load
const { csrfToken } = await fetch('/api/csrf-token').then(r => r.json());

// Include in mutations
fetch('/api/orders', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
  credentials: 'include',
  body: JSON.stringify(data),
});
```

## Prevention

1. **Always use SameSite cookies** - First line of defense
2. **Add CSRF tokens for critical mutations** - Belt and suspenders
3. **Verify Origin/Referer headers** - Additional validation
4. **Use POST for mutations, GET for reads** - REST semantics matter

## References

- `audit_output/02_RISK_REGISTER.md` - P2-002
- OWASP CSRF Prevention Cheat Sheet
