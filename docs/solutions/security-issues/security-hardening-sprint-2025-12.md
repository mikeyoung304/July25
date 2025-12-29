---
title: "Security Hardening Sprint: CSRF, HTTPOnly Cookies, Timing-Safe Auth, Webhook Protection"
date: 2025-12-29
category: security-issues
severity: P0
tags:
  - authentication
  - csrf-protection
  - httponly-cookies
  - timing-safe-comparison
  - webhook-security
  - multi-tenancy
  - token-management
components:
  - server/src/middleware/csrf.ts
  - server/src/middleware/auth.ts
  - server/src/middleware/restaurantAccess.ts
  - server/src/services/auth/pinAuth.ts
  - server/src/services/auth/stationAuth.ts
  - server/src/routes/auth.routes.ts
  - server/src/routes/webhook.routes.ts
  - client/src/services/http/httpClient.ts
symptoms:
  - XSS attacks could steal authentication tokens from localStorage
  - CSRF attacks could force state-changing requests
  - Timing attacks could reveal valid PINs through response latency
  - Weak fallback secrets could be hardcoded defaults
  - Demo mode bypass allowed unauthorized access
  - Webhook replay attacks via missing timestamp verification
root_cause: |
  Post-security-audit P0 findings required defense-in-depth improvements:
  - Phase B: Removed insecure defaults (demo bypass, weak secrets, STRICT_AUTH)
  - Phase C: Added cryptographic protections (CSRF, HTTPOnly, timing-safe, webhooks)
related_docs:
  - docs/solutions/security-issues/csrf-protection.md
  - docs/solutions/security-issues/httponly-cookie-auth.md
  - docs/solutions/security-issues/timing-safe-comparison.md
  - docs/solutions/security-issues/demo-bypass-prevention.md
  - docs/solutions/auth-issues/strict-auth-environment-drift.md
---

# Security Hardening Sprint (2025-12)

## Problem Summary

A comprehensive security audit identified multiple P0 vulnerabilities requiring immediate remediation:

1. **XSS Token Theft**: Auth tokens in localStorage exposed to JavaScript
2. **CSRF Attacks**: No protection against cross-site request forgery
3. **Timing Attacks**: PIN verification timing revealed user existence
4. **Demo Bypass**: Demo mode enabled by default in production
5. **Weak Secrets**: Fallback values allowed missing environment variables
6. **Replay Attacks**: Webhooks accepted without timestamp verification

## Solutions Implemented

### 1. CSRF Protection (Phase C.1)

**File:** `server/src/middleware/csrf.ts`

Added double-submit cookie pattern with timing-safe validation:

```typescript
// Generate cryptographically secure CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Timing-safe comparison prevents timing attacks
const cookieBuffer = Buffer.from(cookieToken, 'utf8');
const headerBuffer = Buffer.from(headerToken, 'utf8');

if (cookieBuffer.length !== headerBuffer.length ||
    !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
  res.status(403).json({ error: 'CSRF token invalid' });
  return;
}
```

**Client integration** (`client/src/services/http/httpClient.ts`):
```typescript
// Add CSRF token for state-changing requests
const method = (requestOptions.method || 'GET').toUpperCase()
if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }
}
```

### 2. HTTPOnly Cookies (Phase C.2)

**File:** `server/src/routes/auth.routes.ts`

Migrated from response body tokens to HTTPOnly cookies:

```typescript
function setAuthCookie(res: Response, token: string): void {
  res.cookie('auth_token', token, {
    httpOnly: true,        // JavaScript cannot read
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: AUTH_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    path: '/'
  });
}

// On login:
setAuthCookie(res, customToken);  // HTTPOnly (JS cannot read)
setCsrfCookie(res);               // Readable (for X-CSRF-Token header)

// Response no longer contains token
res.json({ user: { ... }, restaurantId });
```

**Auth middleware** reads from cookie or header:
```typescript
// Try HTTPOnly cookie first, fall back to Authorization header
const cookieToken = req.cookies?.['auth_token'];
if (cookieToken) {
  token = cookieToken;
} else {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
}
```

### 3. Demo Mode Gating (Phase B.1)

**File:** `server/src/middleware/restaurantAccess.ts`

Demo bypass now requires explicit environment variable:

```typescript
const isDemoUser = req.user.id.startsWith('demo:');
const isDemoModeEnabled = process.env['DEMO_MODE'] === 'enabled';

if (isDemoUser) {
  if (!isDemoModeEnabled) {
    throw Forbidden('Demo mode not enabled', 'DEMO_MODE_DISABLED');
  }
  // Cross-tenant check
  if (req.user.restaurant_id !== requestedRestaurantId) {
    throw Forbidden('Access denied', 'DEMO_CROSS_TENANT');
  }
}
```

### 4. Required Secrets (Phase B.2)

**File:** `server/src/services/auth/stationAuth.ts`

No fallback values - fail-fast per ADR-009:

```typescript
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`FATAL: ${name} environment variable is required`);
  }
  return value;
}

const STATION_TOKEN_SECRET = getRequiredEnvVar('STATION_TOKEN_SECRET');
const DEVICE_FINGERPRINT_SALT = getRequiredEnvVar('DEVICE_FINGERPRINT_SALT');
```

### 5. STRICT_AUTH Default (Phase B.3)

**File:** `server/src/middleware/auth.ts`

STRICT_AUTH now enabled by default:

```typescript
// Changed from: process.env['STRICT_AUTH'] === 'true'
const strictAuth = process.env['STRICT_AUTH'] !== 'false';

if (strictAuth && !decoded.restaurant_id) {
  throw Unauthorized('Token missing restaurant context in strict auth mode');
}
```

### 6. Timing-Safe PIN Verification (Phase C.3)

**File:** `server/src/services/auth/pinAuth.ts`

Dummy hash prevents timing attacks when user not found:

```typescript
// Pre-computed at module load
const DUMMY_PIN_HASH = bcrypt.hashSync('dummy-pin-never-matches' + PIN_PEPPER, 10);

// In validatePin():
if (pinError || !pinRecords || pinRecords.length === 0) {
  // SECURITY: Perform dummy comparison for consistent timing
  bcrypt.compareSync(pin + PIN_PEPPER, DUMMY_PIN_HASH);

  return { isValid: false, error: 'Invalid PIN' };
}
```

### 7. Webhook Timestamp Verification (Phase C.4)

**File:** `server/src/routes/webhook.routes.ts`

All webhooks now use timestamp verification:

```typescript
// Changed from: webhookAuth
router.post('/payments', webhookAuthWithTimestamp, async (req, res) => { ... });
router.post('/orders', webhookAuthWithTimestamp, async (req, res) => { ... });
router.post('/inventory', webhookAuthWithTimestamp, async (req, res) => { ... });
```

Rejects webhooks older than 5 minutes to prevent replay attacks.

## Breaking Changes

| Change | Impact | Migration |
|--------|--------|-----------|
| `STATION_TOKEN_SECRET` required | Server won't start | Set in environment |
| `DEVICE_FINGERPRINT_SALT` required | Server won't start | Set in environment |
| `STRICT_AUTH=true` default | Tokens need restaurant_id | Set `=false` for dev |
| `DEMO_MODE` required for demo | Demo users blocked | Set `=enabled` for dev |
| Tokens in HTTPOnly cookies | Not in response body | Use cookie-based auth |
| CSRF token required | POST/PUT/DELETE need header | Send X-CSRF-Token |
| Webhook timestamp required | x-webhook-timestamp header | Include timestamp |

## Environment Variables

**Required (no fallbacks):**
```bash
STATION_TOKEN_SECRET=[GENERATE_32_CHAR_HEX]
DEVICE_FINGERPRINT_SALT=[GENERATE_32_CHAR_HEX]
SUPABASE_JWT_SECRET=your_jwt_secret
```

**Security Defaults:**
```bash
STRICT_AUTH=true          # Default, set =false for development
DEMO_MODE=disabled        # Set =enabled for development/testing
```

## Prevention Checklist

- [ ] All secrets set without fallbacks
- [ ] STRICT_AUTH not disabled in production
- [ ] DEMO_MODE not enabled in production
- [ ] CSRF tokens validated on state-changing requests
- [ ] Auth tokens in HTTPOnly cookies only
- [ ] PIN validation uses timing-safe comparison
- [ ] Webhooks verify timestamp within 5 minutes

## Testing

```bash
# Verify CSRF protection
curl -X POST /api/v1/orders -H "Cookie: auth_token=..."
# Should fail: "CSRF token required"

# Verify HTTPOnly cookie
curl -X POST /api/v1/auth/login -c cookies.txt ...
# cookies.txt should contain HttpOnly auth_token

# Verify STRICT_AUTH
# Token without restaurant_id should fail with 401
```

## Commits

- `2e004217` docs: complete documentation hygiene sprint
- `b3207c4c` security: harden authentication defaults (Phase 0)
- `8ab8e7b2` security: implement CSRF protection and HTTPOnly cookies
- `4a338c8f` security: timing-safe PIN verification and webhook timestamp checks

## References

- [ADR-009: Error Handling Philosophy (Fail-Fast)](../explanation/architecture-decisions/ADR-009-error-handling-philosophy.md)
- [ADR-006: Dual Authentication Pattern](../explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)
- [Security Audit Archive](../archive/2025-12/security-audit/)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
