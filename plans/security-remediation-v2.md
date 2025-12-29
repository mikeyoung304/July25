# Security Remediation Plan v2 (Post-Review)

**Type**: Security / Bug Fix
**Priority**: P0 - Launch Blocker
**Estimated Effort**: ~12 hours total (revised from 21h)
**Based On**: Hostile Enterprise Audit + 3 Reviewer Feedback

---

## Overview

This plan addresses critical security vulnerabilities in the authentication system. Key architectural change: **migrate from localStorage tokens to HTTPOnly cookies with CSRF protection**.

### Architecture Before vs After

```
BEFORE (Vulnerable)                    AFTER (Secure)
─────────────────────                  ─────────────────────
Client stores token                    Server sets HTTPOnly cookie
in localStorage                        (JS cannot read)
       ↓                                      ↓
Token sent via                         Cookie sent automatically
Authorization header                   + CSRF token in header
       ↓                                      ↓
XSS can steal token                    XSS cannot steal cookie
                                       CSRF token prevents forgery
```

---

## Phase 0: Launch Blockers (~3.5 hours)

### Task 0.1: Remove Demo User Bypass
**File**: `server/src/middleware/restaurantAccess.ts:43-50`
**Effort**: 1.5 hours

**Current Code (VULNERABLE)**:
```typescript
if (sub.startsWith('demo:')) {
  return true; // Skips ALL permission checks
}
```

**Fix**: Remove entirely in production
```typescript
// Delete the demo bypass block entirely
// OR gate behind explicit demo mode
if (sub.startsWith('demo:')) {
  if (process.env.DEMO_MODE !== 'enabled') {
    logger.warn('Demo bypass attempted outside demo mode', { sub });
    return false;
  }
  logger.info('Demo access granted', { sub, restaurantId });
  return true;
}
```

**Acceptance Criteria**:
- [ ] Demo bypass removed or gated behind DEMO_MODE env var
- [ ] All demo access logged
- [ ] Test: `demo:*` tokens rejected when DEMO_MODE not set

---

### Task 0.2: Remove Weak Secret Fallbacks
**Files**: `server/src/services/auth/stationAuth.ts:11-13`
**Effort**: 30 minutes

**Current Code (VULNERABLE)**:
```typescript
const STATION_TOKEN_SECRET = process.env['STATION_TOKEN_SECRET'] ||
  process.env['KIOSK_JWT_SECRET'] ||
  'station-secret-change-in-production';
```

**Fix**: Require explicit secret, no fallbacks
```typescript
const STATION_TOKEN_SECRET = process.env['STATION_TOKEN_SECRET'];
if (!STATION_TOKEN_SECRET) {
  throw new Error('STATION_TOKEN_SECRET environment variable is required');
}
```

**Also fix** `DEVICE_FINGERPRINT_SALT` which has same pattern.

**Acceptance Criteria**:
- [ ] Server crashes on startup without STATION_TOKEN_SECRET
- [ ] KIOSK_JWT_SECRET fallback removed
- [ ] DEVICE_FINGERPRINT_SALT fallback removed
- [ ] Render environment variables updated

---

### Task 0.3: Enable STRICT_AUTH by Default
**File**: `server/src/middleware/auth.ts:79-87`
**Effort**: 30 minutes

**Fix**:
```typescript
const strictAuth = process.env.STRICT_AUTH !== 'false';
if (!strictAuth) {
  logger.warn('STRICT_AUTH disabled - development only');
}
```

**Acceptance Criteria**:
- [ ] STRICT_AUTH defaults to true
- [ ] Warning logged when disabled
- [ ] Restaurant header fallback blocked in production

---

### Task 0.4: Add Refund Idempotency Key
**File**: `server/src/routes/payments.routes.ts:656-670`
**Effort**: 30 minutes (simplified - infrastructure already exists)

**Fix**: Add one parameter to existing Stripe call
```typescript
const idempotencyKey = generateIdempotencyKey('refund', restaurantId, paymentId);

const refund = await stripe.refunds.create(
  { payment_intent: paymentIntentId, amount: refundAmount },
  { idempotencyKey }
);
```

**Acceptance Criteria**:
- [ ] All refund calls include idempotency key
- [ ] Duplicate requests return same refund

---

## Phase 1: Security Hardening (~8.5 hours)

### Task 1.0: Add CSRF Protection (NEW - Required for Cookies)
**Files**: New middleware + auth routes
**Effort**: 2 hours

**Why**: HTTPOnly cookies prevent XSS token theft, but enable CSRF attacks. Must add CSRF tokens.

**Implementation**:

**Server Middleware** (`server/src/middleware/csrf.ts`):
```typescript
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip for GET/HEAD/OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfHeader = req.headers['x-csrf-token'] as string;
  const csrfCookie = req.cookies['csrf_token'];

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }

  next();
}

export function setCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', token, {
    httpOnly: false,  // Must be readable by JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000
  });
  return token;
}
```

**Client** (`httpClient.ts`):
```typescript
// Read CSRF token from cookie and send in header
function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add CSRF token for non-GET requests
  if (options.method && options.method !== 'GET') {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers
  });
}
```

**Acceptance Criteria**:
- [ ] CSRF middleware added to Express app
- [ ] CSRF cookie set on login
- [ ] All POST/PUT/DELETE requests include X-CSRF-Token header
- [ ] Requests without valid CSRF token return 403

---

### Task 1.1: Migrate to HTTPOnly Cookies
**Files**: auth.routes.ts, auth.ts middleware, AuthContext.tsx, httpClient.ts
**Effort**: 4 hours

**Key Architecture Points**:
1. Token goes in HTTPOnly cookie (JS cannot read)
2. Response body contains `{ user }` only, NOT `{ token, user }`
3. Browser auto-sends cookie, no Authorization header needed
4. Logout must clear cookie server-side

**Server - Login Endpoint**:
```typescript
router.post('/pin-login', async (req, res) => {
  const { pin, restaurant_id } = req.body;

  // ... validate PIN ...

  const token = generateToken(user);

  // Set HTTPOnly cookie (JS cannot read this)
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  });

  // Set CSRF cookie (JS CAN read this)
  setCsrfCookie(res);

  // Return user only - NOT the token
  res.json({ user: { id: user.id, role: user.role, restaurant_id } });
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.clearCookie('csrf_token');
  res.json({ success: true });
});
```

**Server - Auth Middleware**:
```typescript
function extractToken(req: Request): string | null {
  // 1. Check HTTPOnly cookie (primary for PIN/station)
  if (req.cookies?.auth_token) {
    return req.cookies.auth_token;
  }

  // 2. Check Authorization header (for Supabase tokens)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}
```

**Server - CORS Config**:
```typescript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true  // CRITICAL for cookies
}));
```

**Client - AuthContext**:
```typescript
const login = async (pin: string, restaurant_id: string) => {
  const { user } = await httpClient.post('/api/auth/pin-login', {
    pin,
    restaurant_id
  });
  // Cookie set automatically by server
  // Just update React state
  setUser(user);
  setIsAuthenticated(true);
};

const logout = async () => {
  await httpClient.post('/api/auth/logout');
  setUser(null);
  setIsAuthenticated(false);
};
```

**Client - Remove localStorage token storage**:
```typescript
// DELETE these lines from AuthContext:
// localStorage.setItem('token', token);
// localStorage.setItem('demo_token', token);
// const token = localStorage.getItem('token');
```

**Acceptance Criteria**:
- [ ] PIN/station tokens in HTTPOnly cookies
- [ ] Response body does NOT contain token
- [ ] localStorage no longer stores auth tokens
- [ ] CORS allows credentials
- [ ] Logout clears cookies server-side
- [ ] Supabase header auth still works (fallback)

---

### Task 1.2: Timing-Safe PIN Verification
**File**: `server/src/services/auth/pinAuth.ts`
**Effort**: 30 minutes (simplified - bcrypt already timing-safe)

**Key Insight**: bcrypt.compare() is already constant-time (~100ms with 10 rounds). We just need to prevent user enumeration via early exit.

**Fix**:
```typescript
async function verifyPinLogin(pin: string, restaurant_id: string): Promise<AuthResult> {
  const user = await findUserByRestaurant(restaurant_id);

  // Use dummy hash if user doesn't exist (prevents enumeration)
  const DUMMY_HASH = '$2b$10$dummy.hash.for.timing.normalization';
  const hashToCompare = user?.pin_hash || DUMMY_HASH;

  // bcrypt.compare is already constant-time
  const isValid = await bcrypt.compare(pin, hashToCompare);

  // Generic error regardless of reason
  if (!user || !isValid) {
    return { success: false, error: 'Invalid credentials' };
  }

  return { success: true, user };
}
```

**Acceptance Criteria**:
- [ ] Always compare against a hash (real or dummy)
- [ ] Generic error message for all failures
- [ ] No early returns that leak timing info

---

### Task 1.3: Wire Up Webhook Timestamp Verification
**File**: `server/src/routes/payments.routes.ts`
**Effort**: 30 minutes (already implemented, just needs wiring)

**Key Insight**: `webhookAuthWithTimestamp` already exists in `webhookSignature.ts:136-185`. Just use it.

**Fix**: Replace `webhookAuth` with `webhookAuthWithTimestamp` on webhook routes:
```typescript
import { webhookAuthWithTimestamp } from '../middleware/webhookSignature';

router.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  webhookAuthWithTimestamp,  // Changed from webhookAuth
  async (req, res) => {
    // ... handle webhook
  }
);
```

**Acceptance Criteria**:
- [ ] All webhook routes use `webhookAuthWithTimestamp`
- [ ] Webhooks older than 5 minutes rejected
- [ ] Rejection logged with event ID

---

### Task 1.4: Atomic PIN Attempt Counter
**File**: `server/src/services/auth/pinAuth.ts`, new migration
**Effort**: 1.5 hours (simplified - single atomic UPDATE)

**Key Insight**: Don't need `SELECT ... FOR UPDATE` locking. Single atomic UPDATE achieves same goal.

**Migration** (`supabase/migrations/XXXX_atomic_pin_attempts.sql`):
```sql
CREATE OR REPLACE FUNCTION increment_pin_attempts(
  p_user_id UUID,
  p_max_attempts INT DEFAULT 5,
  p_lockout_minutes INT DEFAULT 15
)
RETURNS TABLE (
  new_attempts INT,
  is_locked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  UPDATE user_pins
  SET
    failed_attempts = failed_attempts + 1,
    locked_until = CASE
      WHEN failed_attempts + 1 >= p_max_attempts
      THEN NOW() + (p_lockout_minutes || ' minutes')::INTERVAL
      ELSE locked_until
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING
    failed_attempts,
    (locked_until IS NOT NULL AND locked_until > NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_pin_attempts(p_user_id UUID)
RETURNS VOID AS $$
  UPDATE user_pins
  SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
  WHERE user_id = p_user_id;
$$ LANGUAGE sql;
```

**Service Code**:
```typescript
async function recordFailedAttempt(userId: string): Promise<{ isLocked: boolean }> {
  const { data, error } = await supabase.rpc('increment_pin_attempts', {
    p_user_id: userId
  });

  if (error) throw new Error('Failed to record attempt');
  return { isLocked: data[0]?.is_locked ?? false };
}

async function resetAttempts(userId: string): Promise<void> {
  await supabase.rpc('reset_pin_attempts', { p_user_id: userId });
}
```

**Acceptance Criteria**:
- [ ] PIN attempts tracked atomically
- [ ] 5 failures = 15 minute lockout
- [ ] Successful login resets counter
- [ ] Concurrent requests can't bypass limit

---

## Verification Checklist

```bash
# Phase 0
curl -H "Authorization: Bearer demo.fake.jwt" /api/orders  # → 401
STATION_TOKEN_SECRET= npm start  # → Crash
curl -H "X-Restaurant-ID: test" /api/orders  # → 401

# Phase 1
# In browser console:
localStorage.getItem('token')  # → null
document.cookie.includes('auth_token')  # → false (HTTPOnly)
document.cookie.includes('csrf_token')  # → true (readable)
```

---

## Summary

| Phase | Task | Time | Key Change |
|-------|------|------|------------|
| 0 | Remove demo bypass | 1.5h | Delete bypass code |
| 0 | Remove weak secrets | 30m | Crash if not set |
| 0 | STRICT_AUTH default | 30m | Flip default |
| 0 | Refund idempotency | 30m | Add one param |
| 1 | CSRF protection | 2h | New middleware |
| 1 | HTTPOnly cookies | 4h | Cookie-based auth |
| 1 | Timing-safe PIN | 30m | Dummy hash comparison |
| 1 | Webhook timestamps | 30m | Wire existing code |
| 1 | Atomic PIN counter | 1.5h | Database function |
| **Total** | | **~12h** | |

---

**Plan Updated**: 2025-12-28
**Incorporates**: Security, TypeScript, and Simplicity reviewer feedback
