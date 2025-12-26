# Security Audit Report - Restaurant OS v6.0.14

**Audit Date:** 2025-12-26
**Auditor:** Agent C4 - Security & Data Handling
**Scope:** Authentication, Authorization, Input Validation, Secrets Management, PCI Compliance

---

## Executive Summary

The Restaurant OS codebase demonstrates **strong security fundamentals** with multiple defense-in-depth layers. Recent security fixes (v6.0.14) have addressed critical vulnerabilities around multi-tenant isolation and auth header trust. The payment system follows PCI-DSS best practices with server-side amount validation and comprehensive audit logging.

### Security Posture Score: **B+** (Good with minor improvements needed)

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | Strong | JWT-only auth, no test bypasses, STRICT_AUTH mode |
| Authorization | Strong | RBAC with scope-based access, restaurant isolation |
| Input Validation | Good | Zod schemas, but some routes lack validation |
| SQL Injection | Strong | Parameterized queries via Supabase/Prisma |
| XSS | Good | No dangerouslySetInnerHTML usage found |
| CSRF | Acceptable | Disabled for REST (uses JWT + RBAC instead) |
| Secrets | Good | Environment-based, but some fallback peppers |
| Rate Limiting | Strong | Multi-tier with IP blocking |
| Error Handling | Good | Production-safe error messages |
| Logging | Good | Structured logging, PII redaction |
| PCI Compliance | Strong | Server-side validation, audit trail, idempotency |

---

## P0 - Critical Issues (Immediate Action Required)

### [server/src/services/auth/pinAuth.ts:17] - Default PIN Pepper Fallback

- **Category**: Secrets
- **Severity**: P0
- **OWASP**: A02:2021-Cryptographic Failures
- **Evidence**:
```typescript
const PIN_PEPPER = process.env['PIN_PEPPER'] || 'default-pepper-change-in-production';
```
- **Exploitability**: Medium - If production deployment misses PIN_PEPPER, all PIN hashes use a predictable pepper, enabling rainbow table attacks.
- **Fix**: Remove fallback and fail-fast if PIN_PEPPER is missing in production.
- **Safe Hardening Diff**:
```diff
- const PIN_PEPPER = process.env['PIN_PEPPER'] || 'default-pepper-change-in-production';
+ const PIN_PEPPER = process.env['PIN_PEPPER'];
+ if (!PIN_PEPPER && process.env['NODE_ENV'] === 'production') {
+   throw new Error('PIN_PEPPER environment variable is required in production');
+ }
+ const effectivePepper = PIN_PEPPER || 'dev-only-pepper';
```

---

### [server/src/routes/ai.routes.ts:102,159] - Restaurant ID Header Fallback

- **Category**: AuthZ (Multi-tenant isolation)
- **Severity**: P0
- **OWASP**: A01:2021-Broken Access Control
- **Evidence**:
```typescript
const restaurantId = req.headers['x-restaurant-id'] as string || env.DEFAULT_RESTAURANT_ID;
```
- **Exploitability**: Medium - Unauthenticated AI endpoints fall back to DEFAULT_RESTAURANT_ID, potentially leaking menu data across tenants.
- **Fix**: Require explicit restaurant ID or return 400 for public AI endpoints.
- **Note**: These endpoints may be intentionally public. If so, document the security decision in an ADR.

---

## P1 - High Priority Issues

### [server/src/routes/realtime.routes.ts:238] - Header Fallback in Realtime Routes

- **Category**: AuthZ
- **Severity**: P1
- **OWASP**: A01:2021-Broken Access Control
- **Evidence**:
```typescript
const rawRestaurantId = (req.restaurantId || req.headers['x-restaurant-id'] || undefined) as string | undefined;
```
- **Exploitability**: Medium - While optionalAuth is used, the header fallback could allow cross-tenant WebSocket connections.
- **Fix**: Only use req.restaurantId from authenticated token; remove header fallback for authenticated routes.

---

### [server/src/middleware/auth.ts:153-168] - Header Trust for Unauthenticated Requests

- **Category**: AuthZ
- **Severity**: P1
- **OWASP**: A01:2021-Broken Access Control
- **Evidence**:
```typescript
// optionalAuth allows x-restaurant-id header for unauthenticated requests
const restaurantId = req.headers['x-restaurant-id'] as string;
if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null') {
  req.restaurantId = restaurantId;
```
- **Exploitability**: Low - This is intentional for public endpoints (menu browsing). However, downstream routes must validate this is appropriate.
- **Fix**: Add comment documenting this is intentional, and ensure all routes using optionalAuth explicitly check authentication state before trusting restaurantId.

---

### [server/src/config/environment.ts:129-132] - Auth Secrets Empty String Fallback

- **Category**: Secrets
- **Severity**: P1
- **OWASP**: A02:2021-Cryptographic Failures
- **Evidence**:
```typescript
auth: {
  kioskJwtSecret: env.KIOSK_JWT_SECRET || '',
  stationTokenSecret: env.STATION_TOKEN_SECRET || '',
  pinPepper: env.PIN_PEPPER || '',
  deviceFingerprintSalt: env.DEVICE_FINGERPRINT_SALT || '',
},
```
- **Exploitability**: Medium - Empty strings for crypto secrets could lead to predictable token generation if code doesn't check for empty values.
- **Fix**: Fail startup validation if critical secrets are missing in production.

---

### [server/src/routes/payments.routes.ts:60] - Any Type in Payment Handler

- **Category**: Input Validation
- **Severity**: P1
- **OWASP**: A03:2021-Injection
- **Evidence**:
```typescript
async (req: AuthenticatedRequest, res, next): Promise<any> => {
```
- **Exploitability**: Low - The return type `Promise<any>` is a TypeScript issue, not a runtime vulnerability, but it weakens type safety.
- **Fix**: Use explicit return type `Promise<Response | void>`.

---

## P2 - Medium Priority Issues

### [server/src/routes/orders.routes.ts:244] - Status Parameter Not Validated

- **Category**: Input Validation
- **Severity**: P2
- **OWASP**: A03:2021-Injection
- **Evidence**:
```typescript
const { status, notes } = req.body;
if (!status) {
  throw BadRequest('Status is required');
}
// No validation that status is a valid OrderStatus enum value
```
- **Exploitability**: Low - The service layer validates via state machine, but defense-in-depth suggests validating at route level.
- **Fix**: Add Zod schema validation for status update endpoint.
- **Safe Hardening Diff**:
```diff
+ import { z } from 'zod';
+ const StatusUpdateSchema = z.object({
+   status: z.enum(['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled']),
+   notes: z.string().optional()
+ });
+
- router.patch('/:id/status', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
+ router.patch('/:id/status', authenticate, validateRestaurantAccess, validateBody(StatusUpdateSchema), async (req: AuthenticatedRequest, res, next) => {
```

---

### [server/src/middleware/rbac.ts:174-179] - Deprecated kiosk_demo Role Still Active

- **Category**: AuthZ
- **Severity**: P2
- **OWASP**: A01:2021-Broken Access Control
- **Evidence**:
```typescript
// Kiosk demo role for self-service (friends & family online orders)
// DEPRECATED: Use 'customer' role instead (backwards compat via AUTH_ACCEPT_KIOSK_DEMO_ALIAS)
kiosk_demo: [
  ApiScope.ORDERS_CREATE,
  ApiScope.ORDERS_READ,
  ApiScope.PAYMENTS_PROCESS, // Required for completing demo orders
  ApiScope.MENU_READ // View menu items (no write access)
],
```
- **Exploitability**: Low - The role is rejected in auth.ts (lines 71-77), but still defined in RBAC. This creates confusion.
- **Fix**: Remove the deprecated role from ROLE_SCOPES after confirming all tokens have migrated.

---

### [server/src/middleware/errorHandler.ts:42] - Restaurant ID in Error Logs

- **Category**: Logging
- **Severity**: P2
- **OWASP**: A09:2021-Security Logging and Monitoring Failures
- **Evidence**:
```typescript
restaurantId: req.headers['x-restaurant-id'],
```
- **Exploitability**: Low - Logging header value (which could be spoofed) might pollute logs with misleading tenant data.
- **Fix**: Log `req.restaurantId` (validated) instead of raw header.

---

### [server/src/routes/payments.routes.ts:705] - Webhook Route Accepts Express Body

- **Category**: Input Validation
- **Severity**: P2
- **OWASP**: A08:2021-Software and Data Integrity Failures
- **Evidence**:
```typescript
router.post('/webhook',
  async (req: Request & { rawBody?: string }, res, _next): Promise<any> => {
```
- **Exploitability**: Low - The code correctly uses rawBody for signature verification (lines 715-719), but depends on server.ts capturing it via verify callback. If misconfigured, signature validation fails safely (returns 400).
- **Fix**: Add explicit check that signature verification is active; fail loudly if rawBody capture is misconfigured.

---

## P3 - Low Priority / Hardening Suggestions

### [server/src/middleware/authRateLimiter.ts:97] - Development Rate Limit is 100x Production

- **Category**: Rate Limiting
- **Severity**: P3
- **Evidence**:
```typescript
max: isDevelopment ? 100 : 5, // 100 in local dev, 5 in production
```
- **Exploitability**: None - This is intentional for development, but ensure CI/CD doesn't deploy with NODE_ENV=development.
- **Fix**: Add deployment validation that NODE_ENV=production in production deployments.

---

### [client/src/services/http/httpClient.ts:113-135] - localStorage Token Fallback

- **Category**: Auth
- **Severity**: P3
- **OWASP**: A07:2021-Identification and Authentication Failures
- **Evidence**:
```typescript
// Fallback to localStorage for demo/PIN/station sessions
const savedSession = localStorage.getItem('auth_session')
```
- **Exploitability**: Low - This is documented as intentional (ADR-006) for shared devices. However, localStorage tokens are vulnerable to XSS.
- **Fix**: Document in CLAUDE.md that this is a known trade-off. Consider HttpOnly cookies for future enhancement.

---

### [server/src/middleware/security.ts:46] - Unsafe-Inline CSP for Tailwind

- **Category**: XSS
- **Severity**: P3
- **OWASP**: A03:2021-Injection
- **Evidence**:
```typescript
styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind
```
- **Exploitability**: Low - inline styles are a minor XSS vector compared to inline scripts.
- **Fix**: Consider Tailwind's extracted CSS approach to eliminate unsafe-inline requirement.

---

## Security Strengths (No Issues)

### Multi-Tenant Isolation - STRONG

The codebase implements proper multi-tenant isolation:
- `restaurant_id` is extracted from JWT tokens (auth.ts:113)
- `validateRestaurantAccess` middleware verifies database access (restaurantAccess.ts:54-68)
- Cross-tenant attempts are logged to audit (restaurantAccess.ts:81-87)
- Cache keys include tenant prefix (httpClient.ts:229)

### SQL Injection - STRONG

- No raw SQL queries found (`\.raw\(` or `prisma\.\$queryRaw` grep returned 0 results)
- All database access via Supabase client with parameterized queries
- UUID format validation prevents injection via restaurant_id (auth.ts:90-97)

### XSS Protection - STRONG

- No `dangerouslySetInnerHTML` or `innerHTML` usage found in client code
- Helmet CSP headers configured (security.ts:43-62)
- Suspicious activity detection blocks XSS patterns (security.ts:418-421)

### Payment Security (PCI-DSS) - STRONG

- Server-side amount calculation prevents price manipulation (payment.service.ts:82-155)
- Idempotency keys generated server-side (payment.service.ts:136-138)
- Two-phase audit logging ensures no charges without audit trail (payment.service.ts:215-263)
- Double-payment prevention via order status check (payments.routes.ts:127-144)
- Stripe webhook signature verification (payments.routes.ts:723-732)

### Rate Limiting - STRONG

- Multi-tier rate limiting (login: 5/15min, PIN: 3/5min, station: 5/10min)
- IP blocking after 10 failed attempts (authRateLimiter.ts:43-62)
- Suspicious activity detection and blocking (security.ts:407-462)
- TOCTOU race condition fixed in recent commits

### JWT Authentication - STRONG

- Single configured secret (no fallbacks in verify)
- Token expiration handling (auth.ts:60-66)
- STRICT_AUTH mode for strict multi-tenant enforcement (auth.ts:79-87)
- No test token bypasses (security comment at auth.ts:46-47)

---

## Recommendations Summary

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Remove PIN_PEPPER fallback | Low | High |
| P0 | Add restaurant ID validation to AI routes | Low | High |
| P1 | Remove x-restaurant-id header fallback in realtime | Medium | High |
| P1 | Fail-fast on missing auth secrets in production | Low | Medium |
| P2 | Add Zod validation to status update endpoint | Low | Low |
| P2 | Remove deprecated kiosk_demo role | Low | Low |
| P3 | Document localStorage auth trade-off | Low | Low |

---

## Compliance Notes

### PCI-DSS Alignment

The payment system demonstrates strong PCI-DSS alignment:
1. **Requirement 3.4**: No cardholder data stored (Stripe handles all card data)
2. **Requirement 6.5**: Input validation, parameterized queries
3. **Requirement 10.1**: Payment audit logging with two-phase commit
4. **Requirement 10.2**: All payment attempts logged before processing
5. **Requirement 10.3**: Audit logs include timestamp, user, IP, action

### OWASP Top 10 2021 Coverage

| Rank | Category | Status |
|------|----------|--------|
| A01 | Broken Access Control | Strong (RBAC + multi-tenant) |
| A02 | Cryptographic Failures | Good (minor fallback issue) |
| A03 | Injection | Strong (parameterized queries) |
| A04 | Insecure Design | Good (defense-in-depth) |
| A05 | Security Misconfiguration | Good (Helmet, CSP) |
| A06 | Vulnerable Components | Not assessed (requires npm audit) |
| A07 | Auth Failures | Strong (JWT, rate limiting) |
| A08 | Data Integrity Failures | Good (webhook verification) |
| A09 | Logging Failures | Good (structured logging, redaction) |
| A10 | SSRF | Good (Sentry DSN validation) |

---

*Report generated by Agent C4 - Security & Data Handling*
*For questions or follow-up, review the specific file paths listed in each issue.*
