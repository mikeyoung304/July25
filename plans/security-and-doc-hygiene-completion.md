# Security & Documentation Hygiene Completion Plan

**Last Updated:** 2025-12-29

**Type**: Security / Documentation
**Priority**: P0 (Security) + P1 (Docs)
**Total Effort**: ~6.5 hours remaining (revised after review)
**Based On**: Hostile Enterprise Audit + Doc Hygiene Sprint
**Reviewed By**: DHH, Kieran (TypeScript), Simplicity Reviewer (2025-12-29)

---

## Overview

This plan consolidates the remaining work from two existing plans:
1. `plans/security-remediation-v2.md` - Security hardening (P0)
2. `plans/doc-hygiene-sprint.md` - Documentation improvements (P1)

### Review Feedback Incorporated

| Feedback | Action |
|----------|--------|
| Atomic PIN counter is overengineered | **Deleted** - existing rate limiting sufficient |
| Dummy bcrypt hash is invalid | **Fixed** - use `bcrypt.hashSync()` |
| Phase B should be single deploy | **Merged** - one task, one deploy |
| Cookie/JWT expiry mismatch | **Added** - sync maxAge to JWT expiry |
| Missing test plan | **Added** - test requirements per task |

### Current Status

| Item | Status | Notes |
|------|--------|-------|
| docs/INDEX.md | ✅ Done | Created 2025-12-28 |
| ADR Quick Links in CLAUDE.md | ❌ Not done | Missing |
| Compound Engineering Protocol | ❌ Not done | Missing |
| Archive audit_output/ | ❌ Not done | 10 files at root |
| Task 0.1 Demo bypass | ⚠️ Partial | Scoped but not gated behind DEMO_MODE |
| Task 0.2 Weak secrets | ❌ Vulnerable | Fallback still exists |
| Task 0.3 STRICT_AUTH default | ❌ Vulnerable | Defaults to false |
| Task 0.4 Refund idempotency | ✅ Done | Line 680 |

---

## Phase A: Documentation Hygiene (~30 minutes)

Quick wins that compound all future work. **Do all three together in one commit.**

### A.1 Add ADR Quick Links to CLAUDE.md

**File**: `/CLAUDE.md`
**Location**: After "### Quick Links (Most Used)" section
**Effort**: 10 minutes (combined with A.2, A.3)

```markdown
### ADR Quick Links

| Decision | ADR |
|----------|-----|
| Snake case everywhere | `docs/explanation/architecture-decisions/ADR-001-snake-case-convention.md` |
| Multi-tenant isolation | `docs/explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md` |
| Dual auth pattern | `docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md` |
| Fail-fast philosophy | `docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md` |
| Remote DB truth | `docs/explanation/architecture-decisions/ADR-010-remote-database-source-of-truth.md` |
| CommonJS required | `docs/explanation/architecture-decisions/ADR-016-module-system-commonjs.md` |
```

**Acceptance Criteria**:
- [ ] ADR Quick Links section exists in CLAUDE.md
- [ ] All 6 key ADRs are linked

---

### A.2 Archive audit_output/

**Current Location**: `/audit_output/` (10 files)
**New Location**: `/docs/archive/2025-12/security-audit/`
**Effort**: 15 minutes

```bash
mkdir -p docs/archive/2025-12/security-audit
mv audit_output/*.md docs/archive/2025-12/security-audit/
rmdir audit_output
```

**Update References**:
- `docs/INDEX.md` lines 26-28: Update paths from `/audit_output/` to `/docs/archive/2025-12/security-audit/`

**Acceptance Criteria**:
- [ ] audit_output/ directory removed
- [ ] All 10 files in docs/archive/2025-12/security-audit/
- [ ] docs/INDEX.md paths updated
- [ ] No broken internal links

---

### A.3 Add Compound Engineering Protocol to CLAUDE.md

**File**: `/CLAUDE.md`
**Location**: After "## Debugging Quick Reference" section
**Effort**: 15 minutes

```markdown
## Compound Engineering Protocol

### After Every Non-Trivial Fix

1. **Immediate**: Run `/workflows:compound` if debugging took >15 min
2. **Check**: Does CLAUDE.md Quick Links need update?
3. **Check**: Does this need an ADR?

### Signs You Must Compound

- [ ] Debugging took >15 minutes
- [ ] Solution wasn't obvious
- [ ] You'd want to find this later
- [ ] It affects security or payments
- [ ] You created a workaround

### Review Triggers (Proactive)

After writing:
- Auth/security code -> invoke `security-sentinel`
- Database queries -> invoke `performance-oracle`
- State management -> invoke `architecture-strategist`
- Any significant change -> invoke `code-simplicity-reviewer`
```

**Acceptance Criteria**:
- [ ] Compound Engineering Protocol section exists
- [ ] Review triggers documented
- [ ] Checklist for when to compound

---

## Phase B: Security Defaults Hardening (~1 hour, single deploy)

**All three tasks done together, tested together, deployed together.**

### B.1 Gate Demo Bypass Behind DEMO_MODE

**File**: `server/src/middleware/restaurantAccess.ts:43-50`
**Effort**: 20 minutes

**Current Code** (line 45-48):
```typescript
const isDemoUser = req.user.id.startsWith('demo:');
if (isDemoUser && req.user.restaurant_id === requestedRestaurantId) {
  req.restaurantId = requestedRestaurantId;
  req.restaurantRole = req.user.role || 'demo';
```

**Fix**:
```typescript
const isDemoUser = req.user.id.startsWith('demo:');
const isDemoModeEnabled = process.env['DEMO_MODE'] === 'enabled';

if (isDemoUser) {
  if (!isDemoModeEnabled) {
    logger.warn('Demo bypass attempted outside demo mode', {
      userId: req.user.id,
      restaurantId: requestedRestaurantId
    });
    res.status(403).json({ error: 'Demo mode not enabled' });
    return;
  }

  if (req.user.restaurant_id !== requestedRestaurantId) {
    logger.warn('Demo user cross-tenant access attempt', {
      userId: req.user.id,
      userRestaurant: req.user.restaurant_id,
      requestedRestaurant: requestedRestaurantId
    });
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  logger.info('Demo access granted', {
    userId: req.user.id,
    restaurantId: requestedRestaurantId
  });
  req.restaurantId = requestedRestaurantId;
  req.restaurantRole = req.user.role || 'demo';
  return next();
}
```

**Environment**:
- Add `DEMO_MODE=enabled` to development .env
- Do NOT set in production Render environment

**Acceptance Criteria**:
- [ ] Demo bypass gated behind DEMO_MODE env var
- [ ] All demo access logged
- [ ] Cross-tenant demo attempts blocked and logged
- [ ] Test: `demo:*` tokens rejected when DEMO_MODE not set

---

### B.2 Remove Weak Secret Fallbacks

**File**: `server/src/services/auth/stationAuth.ts:11-13`
**Effort**: 20 minutes

**Current Code**:
```typescript
const STATION_TOKEN_SECRET = process.env['STATION_TOKEN_SECRET'] ||
  process.env['KIOSK_JWT_SECRET'] ||
  'station-secret-change-in-production';
```

**Fix**:
```typescript
const STATION_TOKEN_SECRET = process.env['STATION_TOKEN_SECRET'];
if (!STATION_TOKEN_SECRET) {
  throw new Error('FATAL: STATION_TOKEN_SECRET environment variable is required');
}
```

**Also check for DEVICE_FINGERPRINT_SALT** (same file, likely similar pattern):
```typescript
const DEVICE_FINGERPRINT_SALT = process.env['DEVICE_FINGERPRINT_SALT'];
if (!DEVICE_FINGERPRINT_SALT) {
  throw new Error('FATAL: DEVICE_FINGERPRINT_SALT environment variable is required');
}
```

**Environment**:
- Ensure `STATION_TOKEN_SECRET` is set in Render
- Ensure `DEVICE_FINGERPRINT_SALT` is set in Render
- Add both to development .env.example

**Acceptance Criteria**:
- [ ] Server crashes on startup without STATION_TOKEN_SECRET
- [ ] Server crashes on startup without DEVICE_FINGERPRINT_SALT
- [ ] No fallback to KIOSK_JWT_SECRET
- [ ] No hardcoded default secrets
- [ ] Render environment variables configured

---

### B.3 Enable STRICT_AUTH by Default

**File**: `server/src/middleware/auth.ts:44, 236, 308`
**Effort**: 20 minutes

**Current Code** (3 locations):
```typescript
const strictAuth = process.env['STRICT_AUTH'] === 'true';
```

**Fix** (change at all 3 locations):
```typescript
const strictAuth = process.env['STRICT_AUTH'] !== 'false';
if (!strictAuth) {
  logger.warn('STRICT_AUTH disabled - development only', {
    source: 'auth.ts:authenticate'
  });
}
```

**Logic Change**:
- Before: Off by default, must set `STRICT_AUTH=true` to enable
- After: On by default, must set `STRICT_AUTH=false` to disable

**Environment**:
- Development: Add `STRICT_AUTH=false` to .env (explicit opt-out)
- Production: No change needed (defaults to true)

**Acceptance Criteria**:
- [ ] STRICT_AUTH defaults to true (enabled)
- [ ] Warning logged when explicitly disabled
- [ ] Restaurant header fallback blocked in production
- [ ] Tests pass with STRICT_AUTH=false in test env

---

## Phase C: Security Hardening (~5 hours)

**Note**: Atomic PIN counter (C.5) removed per reviewer feedback - existing rate limiting is sufficient for single-instance deployment.

### C.1 Add CSRF Protection Middleware

**New File**: `server/src/middleware/csrf.ts`
**Effort**: 1.5 hours

```typescript
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF cookie on initial page load / login
 */
export function setCsrfCookie(res: Response): string {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,  // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,  // 8 hours
    path: '/'
  });
  return token;
}

/**
 * Validate CSRF token on state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    logger.warn('CSRF token missing', {
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      path: req.path,
      method: req.method
    });
    res.status(403).json({ error: 'CSRF token required' });
    return;
  }

  // Timing-safe comparison
  try {
    const cookieBuffer = Buffer.from(cookieToken, 'utf8');
    const headerBuffer = Buffer.from(headerToken, 'utf8');

    if (cookieBuffer.length !== headerBuffer.length ||
        !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
      logger.warn('CSRF token mismatch', {
        path: req.path,
        method: req.method
      });
      res.status(403).json({ error: 'CSRF token invalid' });
      return;
    }
  } catch (err) {
    logger.error('CSRF validation error', { error: err });
    res.status(403).json({ error: 'CSRF validation failed' });
    return;
  }

  next();
}
```

**Integration** (`server/src/server.ts`):
```typescript
import { csrfProtection } from './middleware/csrf';

// Add after cookie-parser, before routes
app.use(csrfProtection);
```

**Exempt Webhooks** (routes that use raw body):
```typescript
// In payments.routes.ts webhook handler
// Already exempted because it uses express.raw() before middleware
```

**Client Update** (`client/src/services/http/httpClient.ts`):
```typescript
function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

// In request method:
if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
}
```

**Acceptance Criteria**:
- [ ] CSRF middleware validates POST/PUT/DELETE/PATCH
- [ ] CSRF cookie set on login
- [ ] Client sends X-CSRF-Token header
- [ ] Timing-safe comparison used
- [ ] Webhooks exempted
- [ ] Requests without valid token return 403

---

### C.2 Migrate to HTTPOnly Cookies

**Files**: Multiple (see below)
**Effort**: 3 hours

#### Server - Auth Routes

**File**: `server/src/routes/auth.routes.ts`

Add helper function:
```typescript
import { setCsrfCookie } from '../middleware/csrf';

function setAuthCookie(res: Response, token: string): void {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,  // 8 hours
    path: '/'
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
}
```

Update PIN login endpoint:
```typescript
router.post('/pin-login', async (req, res) => {
  // ... existing validation ...

  const token = generateToken(user);

  // Set HTTPOnly cookie (JS cannot read)
  setAuthCookie(res, token);

  // Set CSRF cookie (JS CAN read)
  setCsrfCookie(res);

  // Return user only - NOT the token
  res.json({
    user: {
      id: user.id,
      role: user.role,
      restaurant_id: user.restaurant_id
    }
  });
});
```

Add logout endpoint:
```typescript
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.clearCookie('csrf_token');
  res.json({ success: true });
});
```

#### Server - Auth Middleware

**File**: `server/src/middleware/auth.ts`

Update token extraction:
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

#### Server - CORS Config

**File**: `server/src/server.ts`

```typescript
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true  // CRITICAL for cookies
}));
```

#### Client - AuthContext

**File**: `client/src/contexts/AuthContext.tsx`

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

**Remove localStorage token storage**:
```typescript
// DELETE these lines:
// localStorage.setItem('token', token);
// localStorage.setItem('demo_token', token);
// const token = localStorage.getItem('token');
```

#### Client - httpClient

**File**: `client/src/services/http/httpClient.ts`

```typescript
// Ensure credentials: 'include' on all requests
const response = await fetch(url, {
  ...options,
  credentials: 'include',
  headers
});
```

**Acceptance Criteria**:
- [ ] PIN/station tokens in HTTPOnly cookies
- [ ] Response body does NOT contain token
- [ ] localStorage no longer stores auth tokens
- [ ] CORS allows credentials
- [ ] Logout clears cookies server-side
- [ ] Supabase header auth still works (fallback)

---

### C.3 Timing-Safe PIN Verification

**File**: `server/src/services/auth/pinAuth.ts`
**Effort**: 30 minutes

**Current Issue**: Early return when user not found reveals timing information.

**Fix**:
```typescript
import bcrypt from 'bcrypt';

// CRITICAL: Generate a VALID dummy hash at module load
// Invalid hash strings will cause bcrypt.compare to fail immediately,
// defeating the timing-safe purpose
const DUMMY_HASH = bcrypt.hashSync('dummy-pin-never-matches', 10);

async function verifyPinLogin(
  pin: string,
  restaurant_id: string
): Promise<AuthResult> {
  // Always fetch user (don't early return)
  const user = await findUserByRestaurant(restaurant_id);

  // Use real hash if user exists, dummy hash otherwise
  const hashToCompare = user?.pin_hash || DUMMY_HASH;

  // bcrypt.compare is already constant-time (~100ms with 10 rounds)
  const isValid = await bcrypt.compare(pin, hashToCompare);

  // Only succeed if BOTH user exists AND password matches
  if (!user || !isValid) {
    // Generic error - don't reveal which failed
    return { success: false, error: 'Invalid credentials' };
  }

  return { success: true, user };
}
```

**Why `bcrypt.hashSync()` at module load?**
- The dummy hash must be a VALID bcrypt hash (exactly 60 chars, proper format)
- Invalid strings cause immediate failure, leaking timing info
- Synchronous generation at startup is fine (one-time cost)

**Acceptance Criteria**:
- [ ] Dummy hash generated with `bcrypt.hashSync()` (not a string literal)
- [ ] Always compare against a hash (real or dummy)
- [ ] Generic error message for all failures
- [ ] No early returns that leak timing info
- [ ] Same response time for existing/non-existing users

---

### C.4 Wire Up Webhook Timestamp Verification

**File**: `server/src/routes/payments.routes.ts`
**Effort**: 20 minutes

**Current State**: `webhookAuthWithTimestamp` exists in `webhookSignature.ts:136-185` but may not be used.

**Verify and Fix**:
```typescript
import { webhookAuthWithTimestamp } from '../middleware/webhookSignature';

// Change from webhookAuth to webhookAuthWithTimestamp
router.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  webhookAuthWithTimestamp,  // Use timestamp-aware version
  async (req, res) => {
    // ... existing handler
  }
);
```

**Acceptance Criteria**:
- [ ] All webhook routes use `webhookAuthWithTimestamp`
- [ ] Webhooks older than 5 minutes rejected
- [ ] Rejection logged with event ID

---

## Verification Checklist

### Phase A - Documentation
```bash
# Verify ADR links
grep -n "ADR Quick Links" CLAUDE.md

# Verify archive
ls docs/archive/2025-12/security-audit/

# Verify no broken links
grep -r "audit_output" docs/
```

### Phase B - Security Phase 0
```bash
# Test demo bypass
curl -H "Authorization: Bearer demo.fake.jwt" /api/orders
# Expected: 401 or 403 (without DEMO_MODE)

# Test secret requirement
STATION_TOKEN_SECRET= npm start
# Expected: Crash with error

# Test STRICT_AUTH
curl -H "X-Restaurant-ID: test" /api/orders
# Expected: 401 (header fallback blocked)
```

### Phase C - Security Phase 1
```javascript
// In browser console after implementation:
localStorage.getItem('token')           // → null
document.cookie.includes('auth_token')  // → false (HTTPOnly)
document.cookie.includes('csrf_token')  // → true (readable)
```

---

## Summary

| Phase | Task | Time | Status |
|-------|------|------|--------|
| A | Documentation hygiene (all 3 tasks) | 30m | Not started |
| B | Security defaults (all 3 tasks, 1 deploy) | 1h | Not started |
| C | CSRF + HTTPOnly cookies (C.1 + C.2) | 4h | Not started |
| C | Timing-safe PIN (C.3) | 30m | Not started |
| C | Webhook timestamps (C.4) | 20m | Not started |
| **Total** | | **~6.5h** | |

### Removed (Per Review Feedback)
- ~~C.5 Atomic PIN counter~~ - Existing rate limiting sufficient for single-instance deployment

### Already Complete (Reference)
- ✅ docs/INDEX.md created
- ✅ Task 0.4: Refund idempotency (line 680)
- ✅ 48 solutions in docs/solutions/
- ✅ 11 security solutions documented

---

## Dependencies

- **Phase A**: No blockers, can run anytime
- **Phase B**: Single deploy to Render after completing all 3 tasks
- **Phase C.1-C.2**: Must be deployed together (CSRF + cookies)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Cookie migration breaks existing sessions | Deploy during low-traffic window, clear old tokens |
| CSRF blocks legitimate requests | Add CSRF to client before enabling middleware |
| STRICT_AUTH breaks development | Ensure .env has STRICT_AUTH=false |
| Demo mode needed for testing | Ensure DEMO_MODE=enabled in dev .env |

---

*Plan created: 2025-12-29*
*Revised: 2025-12-29 (incorporated review feedback, removed C.5, merged tasks)*
*Based on: security-remediation-v2.md + doc-hygiene-sprint.md*
*Aligned with: Compound Engineering North Star*
