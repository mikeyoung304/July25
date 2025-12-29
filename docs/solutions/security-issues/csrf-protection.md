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

### Option A: Double Submit Cookie Pattern (Recommended)

Note: The `csurf` package is deprecated. Use the Double Submit Cookie pattern instead:

```typescript
// server/src/middleware/csrf.ts
import crypto from 'crypto';

// Generate CSRF token
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Set CSRF cookie and return token
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken();
  res.cookie('csrf_token', token, {
    httpOnly: false,  // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 60 * 60 * 1000, // 1 hour
  });
  res.json({ csrfToken: token });
});

// Validate CSRF on state-changing routes
function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

app.post('/api/*', csrfProtection, handler);
app.put('/api/*', csrfProtection, handler);
app.delete('/api/*', csrfProtection, handler);
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

- `docs/archive/2025-12/security-audit/02_RISK_REGISTER.md` - P2-002
- OWASP CSRF Prevention Cheat Sheet
