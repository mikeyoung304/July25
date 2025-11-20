# Lessons: security compliance issues

## Key Incidents

# Major Security Incidents - Detailed Reports

This document provides comprehensive incident reports for the five critical security vulnerabilities discovered and resolved during the Restaurant OS rebuild project.

---

## Incident #1: Multi-Tenancy Access Control Vulnerability

**Severity**: P0 (Critical)
**Discovered**: 2025-10-25
**Resolved**: 2025-10-25 (commit df228afd)
**Impact**: Cross-restaurant data access vulnerability
**Prevented Loss**: $500K-1M+ (data breach, legal liability, regulatory fines)

### Executive Summary

The authentication middleware was prematurely setting `req.restaurantId` from untrusted HTTP headers BEFORE validation, allowing users from Restaurant A to access Restaurant B's data by simply changing the `X-Restaurant-ID` header value. This bypassed all multi-tenancy protections.

### Timeline

- **2025-09-15**: Initial auth middleware implementation
- **2025-10-20**: First reports of cross-restaurant test failures
- **2025-10-25 14:00**: Bug identified during test debugging session
- **2025-10-25 15:30**: Fix implemented and tested
- **2025-10-25 21:27**: Fix committed and deployed (df228afd)
- **2025-10-25 22:00**: All 24 multi-tenancy tests passing

### Technical Details

#### Vulnerable Code

**File**: `server/src/middleware/auth.ts` (before fix)

```typescript
export async function authenticate(req: AuthenticatedRequest, ...): Promise<void> {
  // Verify JWT
  const decoded = jwt.verify(token, jwtSecret);
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role
  };

  // BUG: Setting restaurantId from header BEFORE validation
  req.restaurantId = req.headers['x-restaurant-id'] as string;

  next();
}
```

#### The Vulnerability

1. User authenticates with Restaurant 1 JWT token
2. User sends request with `X-Restaurant-ID: restaurant-2-uuid`
3. Auth middleware sets `req.restaurantId = restaurant-2-uuid` WITHOUT checking access
4. All subsequent code trusts `req.restaurantId` is validated
5. User gains access to Restaurant 2 data

#### Attack Scenario

```bash
# Step 1: Login to Restaurant 1
curl -X POST /api/v1/auth/login \
  -d '{"email": "attacker@restaurant1.com", "password": "..."}'
# Receives: JWT token for Restaurant 1

# Step 2: Access Restaurant 2 data (exploit)
curl -X GET /api/v1/orders \
  -H "Authorization: Bearer <restaurant1-token>" \
  -H "X-Restaurant-ID: 22222222-2222-2222-2222-222222222222"
# Result: Returns Restaurant 2's orders!
```

#### Impact Analysis

**Affected Endpoints**:
- `/api/v1/orders` - All order operations
- `/api/v1/menu` - Menu management
- `/api/v1/tables` - Table/floor plan data
- `/api/v1/payments` - Payment history
- `/api/v1/reports` - Analytics and reports

**Data Exposure**:
- Customer orders and personal information
- Payment records and amounts
- Menu items and pricing
- Table layouts and reservations
- Business analytics

**Regulatory Implications**:
- GDPR violation (unauthorized data access)
- PCI DSS violation (payment data exposure)
- Potential $500K-20M in fines
- Loss of payment processing capability
- Mandatory breach notification to affected customers

### Fix Implementation

**File**: `server/src/middleware/auth.ts` (after fix)

```typescript
export async function authenticate(req: AuthenticatedRequest, ...): Promise<void> {
  const decoded = jwt.verify(token, jwtSecret);
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    restaurant_id: decoded.restaurant_id // Extract from JWT
  };

  // DON'T set req.restaurantId here - validation happens in next middleware
  next();
}
```

**File**: `server/src/middleware/restaurantAccess.ts` (after fix)

```typescript
export async function validateRestaurantAccess(req: AuthenticatedRequest, ...): Promise<void> {
  if (!req.user) {
    throw Unauthorized('Authentication required');
  }

  // Get requested restaurant from header
  const requestedRestaurantId = req.headers['x-restaurant-id'] as string;

  if (!requestedRestaurantId) {
    throw Forbidden('Restaurant ID is required');
  }

  // Validate user has access to this restaurant (database lookup)
  const { data: userRestaurant, error } = await supabase
    .from('user_restaurants')
    .select('restaurant_id, role')
    .eq('user_id', req.user.id)
    .eq('restaurant_id', requestedRestaurantId)
    .single();

  if (error || !userRestaurant) {
    throw Forbidden('Access denied to this restaurant');
  }

  // ONLY set req.restaurantId AFTER validation passes
  req.restaurantId = requestedRestaurantId;
  req.restaurantRole = userRestaurant.role;

  next();
}
```

### Verification

**Tests Added**: 24 multi-tenancy tests covering:
- Cross-restaurant list access prevention
- Single order access prevention
- Order mutation prevention
- Scheduled order multi-tenancy
- PIN mutation isolation
- RLS policy enforcement

**Test Results**:
```
 should only return orders from restaurant 1 when using restaurant 1 token
 should prevent restaurant 1 user from accessing restaurant 2 orders list
 should prevent restaurant 1 user from accessing restaurant 2 order
 should prevent restaurant 1 user from updating restaurant 2 order status
 should prevent restaurant 2 user from deleting restaurant 1 order
```

### Lessons Learned

1. **Never Trust Headers**: HTTP headers are user-controlled and must be validated
2. **Middleware Order**: Authentication → Validation → Authorization (strict order)
3. **Defense in Depth**: Multiple layers (middleware, service, DB) all validate
4. **Test Cross-Tenant**: Always test with multiple tenants attempting cross-access
5. **Explicit Assignment**: Only set `req.restaurantId` after all validation passes

### Prevention Measures

- Pre-commit hook checks for `.eq('restaurant_id', ...)` in service methods
- Code review checklist includes multi-tenancy validation
- All new endpoints require multi-tenancy tests
- Quarterly security audit of access control logic

---

## Incident #2: Credential Exposure in Git History

**Severity**: P0 (Critical)
**Discovered**: 2025-11-10
**Status**: TOKEN EXPIRED, documented incident
**Exposure Duration**: 60+ days (Sept 25 - Nov 10)
**Prevented Loss**: $100K+ (infrastructure compromise, unauthorized deployments)

### Executive Summary

Production credentials (Vercel OIDC token) were committed to `.env.production` file in git history for approximately 60 days before discovery. The token provided access to Vercel deployment infrastructure but expired naturally before any evidence of compromise.

### Timeline

- **2025-09-25**: First credential commit (43334589)
- **2025-09-29**: Latest credential commit (7cecc248)
- **2025-10-05**: Vercel OIDC token expired (JWT exp claim)
- **2025-11-10**: Exposure discovered during security audit
- **2025-11-10**: Incident response initiated
- **2025-11-10**: Documentation completed

### Technical Details

#### Exposed Credentials

**Vercel OIDC Token**:
- **First Exposure**: Commit `43334589` (Sept 25, 2025)
- **File**: `.env.production`
- **Scope**: Development environment access to `july25-client` project
- **Token Expiration**: October 5, 2025 (JWT `exp`: 1759740336)
- **Status**: Token expired before discovery

#### Git History Analysis

```bash
# Commits containing exposed credentials
7cecc248 - chore: sync local changes (Sept 29, 2025)
305647a7 - chore: sync local changes (Sept 29, 2025)
43334589 - docs: major documentation cleanup (Sept 25, 2025)
2b6ac6c2 - docs: major documentation cleanup (Sept 25, 2025)

# Search pattern used
git log --all --full-history -S "VERCEL_OIDC_TOKEN" --source --all
```

#### Current Protection Status

 **Good News**:
- `.env.production` currently in `.gitignore` (line 33)
- File not currently tracked by git
- Token expired naturally (Oct 5, 2025)
- No evidence of unauthorized access in logs

 **Concerns**:
- Token remains in git history (accessible via `git log`)
- Repository may have been pushed to remote origins
- Any collaborator with repo access has historical access
- Unknown if token was used during exposure window

#### Why This Happened

**Root Causes**:
1. `.gitignore` was present but file was still committed manually
2. No pre-commit hooks to block `.env*` files
3. No automated secret scanning in repository
4. Hurried "sync local changes" commits bypassed safety checks

### Remediation Actions

#### Immediate Actions Taken

1. **Token Verification**: Confirmed token expired Oct 5, 2025
2. **Access Log Review**: Checked Vercel access logs for suspicious activity
3. **Environment Audit**: Verified all other secrets not committed
4. **Documentation**: Created incident report

#### Long-Term Fixes Implemented

**Pre-Commit Hooks** (`.husky/pre-commit`):
```bash
#!/usr/bin/env bash

# Prevent committing .env files
if git diff --cached --name-only | grep -E "^\.env(\.|$)"; then
  echo "🚨 ERROR: Attempting to commit .env file(s)"
  echo "Blocked files:"
  git diff --cached --name-only | grep -E "^\.env(\.|$)"
  exit 1
fi

# Check for hardcoded secrets
if git diff --cached -U0 | grep -iE "(api[_-]?key|secret[_-]?key|password|token)"; then
  echo "  WARNING: Potential secrets detected in staged changes"
fi
```

**Startup Validation** (`server/src/config/environment.ts`):
```typescript
export function validateEnvironment(): void {
  // Critical secrets required
  const requiredSecrets = [
    'SUPABASE_JWT_SECRET',
    'KIOSK_JWT_SECRET',
    'SQUARE_ACCESS_TOKEN',
    'PIN_PEPPER',
    'DEVICE_FINGERPRINT_SALT'
  ];

  const missing = requiredSecrets.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required secrets: ${missing.join(', ')}\n` +
      'Server cannot start without these secrets configured.'
    );
  }

  // Validate JWT secret format
  if (env.SUPABASE_JWT_SECRET.length < 32) {
    throw new Error('SUPABASE_JWT_SECRET too short - check configuration');
  }
}
```

### Lessons Learned

1. **Pre-Commit Hooks Are Essential**: `.gitignore` alone is insufficient
2. **Automated Scanning**: Need CI/CD secret scanning (GitHub Advanced Security)
3. **Environment Variables Only**: Never store secrets in files
4. **Regular Audits**: Periodic git history audits for exposed secrets
5. **Token Rotation**: Regular rotation even without known exposure

### Prevention Strategy

**Policy Updates**:
-  NEVER commit files matching `.env*` patterns
-  NEVER commit credentials, even to feature branches
-  ALWAYS use environment variable injection (Vercel dashboard)
-  ALWAYS rotate tokens after exposure, even if expired
-  ALWAYS use pre-commit hooks to block secrets

**Monitoring**:
- Vercel token usage alerts
- Supabase auth attempts from unexpected regions
- Database connections outside trusted infrastructure
- Unusual API usage patterns

---

## Incident #3: Test-Token Authentication Bypass

**Severity**: P0 (Critical)
**Discovered**: 2025-08-15
**Resolved**: 2025-08-15 (commit bfd25924)
**Impact**: Production admin access via test credentials
**Prevented Loss**: $250K+ (unauthorized access, data manipulation, fraud)

### Executive Summary

Test authentication tokens functioned in production and Render environments, allowing anyone with knowledge of the test-token value to authenticate as admin without valid credentials. This was caused by incomplete environment checks that only verified `NODE_ENV` without checking deployment platform flags.

### Timeline

- **2025-07-01**: Initial auth middleware with test-token bypass
- **2025-08-10**: First production deployment to Render
- **2025-08-15 10:00**: Test-token discovered working on Render staging
- **2025-08-15 15:00**: Emergency fix implemented
- **2025-08-15 20:44**: Fix deployed to production (bfd25924)

### Technical Details

#### Vulnerable Code

```typescript
//  WRONG: Only checking NODE_ENV
const isDevelopment = process.env['NODE_ENV'] === 'development';

export async function authenticate(req: AuthenticatedRequest, ...): Promise<void> {
  const token = authHeader.substring(7);

  // BUG: Works on Render if NODE_ENV=development
  if (isDevelopment && token === 'test-token') {
    req.user = {
      id: 'test-admin',
      email: 'admin@test.com',
      role: 'admin',
      scopes: ['*'] // Full access!
    };
    return next();
  }

  // Normal JWT verification...
}
```

#### Attack Scenario

```bash
# Works on production/Render if NODE_ENV=development
curl -X GET /api/v1/orders \
  -H "Authorization: Bearer test-token" \
  -H "X-Restaurant-ID: any-restaurant-uuid"
# Result: Returns ALL orders with admin privileges
```

#### Impact Analysis

**Access Granted**:
- Admin role with all permissions
- Access to all restaurants (multi-tenancy bypass)
- Order creation, modification, deletion
- Payment processing and refunds
- User management and role changes
- Menu and pricing modifications

**Potential Damage**:
- Unauthorized order cancellations → revenue loss
- Fraudulent refunds → financial loss
- Data exfiltration → GDPR violations
- Price manipulation → customer complaints
- Account takeovers → reputation damage

### Fix Implementation

```typescript
//  CORRECT: Check NODE_ENV AND deployment platform
const isDevelopment = process.env['NODE_ENV'] === 'development'
  && process.env['RENDER'] !== 'true'
  && process.env['VERCEL'] !== '1';

export async function authenticate(req: AuthenticatedRequest, ...): Promise<void> {
  const token = authHeader.substring(7);

  // Test tokens ONLY work in true local development
  if (isDevelopment && token === 'test-token') {
    logger.warn(' Test-token authentication used (local dev only)');
    req.user = {
      id: 'test-admin',
      email: 'admin@test.com',
      role: 'admin',
      scopes: ['*']
    };
    return next();
  }

  // Normal JWT verification (no bypasses in production)
  const jwtSecret = config.supabase.jwtSecret;
  if (!jwtSecret) {
    logger.error('⛔ JWT_SECRET not configured');
    throw new Error('Server authentication not configured');
  }

  const decoded = jwt.verify(token, jwtSecret);
  // ...
}
```

### Rate Limiting Enhancement

Also fixed rate limiting that was disabled in production:

```typescript
//  Apply rate limits in ALL environments except local dev
const isDevelopment = process.env['NODE_ENV'] === 'development'
  && process.env['RENDER'] !== 'true';

export const aiServiceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDevelopment ? 100 : 50, // Reduced from 200 to 50
  skip: (_req: Request) => isDevelopment,
  handler: (req, res) => {
    // Log abuse for monitoring
    console.error(`[RATE_LIMIT] AI service limit exceeded for ${req.ip}`);
    res.status(429).json({ error: 'Too many AI requests' });
  }
});
```

### Lessons Learned

1. **Multiple Environment Checks**: NODE_ENV + platform flags required
2. **Default Secure**: Assume production unless explicitly local dev
3. **Log Bypasses**: Always log when development features are used
4. **Rate Limiting Critical**: Must be active in all non-local environments
5. **Test on Real Platforms**: Staging environment should match production

### Prevention Measures

- Environment guard pattern documented in security guidelines
- Code review checklist includes environment check verification
- CI/CD tests verify test-token doesn't work in test environment
- Staging environment configured identically to production

---

## Incident #4: Payment Audit Logging Race Condition

**Severity**: P0 (Critical)
**Discovered**: 2025-11-10
**Resolved**: 2025-11-10 (commit dc8afec6)
**Impact**: Charged customers without audit trail
**Prevented Loss**: $50K+ (PCI DSS fines, reconciliation issues, customer disputes)

### Executive Summary

Payment audit logging occurred AFTER Square payment processing, creating a critical timing vulnerability. If audit logging failed after a successful payment, customers would be charged but the payment would not be recorded in the audit log, violating PCI DSS compliance requirements.

### Timeline

- **2025-09-01**: Initial payment route implementation
- **2025-11-05**: PCI DSS compliance audit identifies timing issue
- **2025-11-10 15:00**: P0 analysis document created
- **2025-11-10 18:00**: Two-phase logging solution designed
- **2025-11-10 21:26**: Fix implemented and committed (dc8afec6)

### Technical Details

#### Vulnerable Code Flow

```typescript
//  WRONG: Audit happens AFTER payment
router.post('/api/v1/payments', async (req, res) => {
  // 1. Validate order
  const order = await OrdersService.getOrder(order_id, restaurantId);

  // 2. Process payment with Square
  paymentResult = await paymentsApi.create(paymentRequest);
  // Customer charged at this point!

  // 3. Check if payment succeeded
  if (paymentResult.payment?.status !== 'COMPLETED') {
    return res.status(400).json({ error: 'Payment failed' });
  }

  // 4. Update order status
  await OrdersService.updateOrderPayment(order_id, ...);

  // 5. Log audit AFTER everything else
  await PaymentService.logPaymentAttempt({
    orderId: order_id,
    status: 'success',
    paymentId: paymentResult.payment.id
  });
  // If this fails, customer is charged but payment not recorded!

  res.json({ success: true });
});
```

#### The Problem Scenario

1. Customer submits payment
2. Square charges $50.00 successfully
3. Order marked as paid in database
4. Audit log insert fails (DB connection issue)
5. Error thrown to client
6. Customer sees error, thinks payment failed
7. **Customer charged $50.00 with no audit record** 

#### Compliance Impact

**PCI DSS Requirement 10.2**: All payment actions must be logged

**Violation**:
- Payment processed without corresponding audit log
- No trail for reconciliation
- Cannot prove payment was legitimate
- Audit gap could result in fines or loss of payment processing

**Financial Impact**:
- PCI DSS fines: $5K-100K per month
- Customer disputes: Refunds without proof
- Reconciliation failures: Unable to track revenue
- Loss of Square payment processing capability

### Fix Implementation: Two-Phase Audit Logging

```typescript
//  CORRECT: Two-phase audit logging
router.post('/api/v1/payments', async (req, res) => {
  // Phase 1: Log BEFORE Square call
  await PaymentService.logPaymentAttempt({
    orderId: order_id,
    status: 'initiated',  // Log intent before charging
    restaurantId: restaurantId,
    amount: validation.orderTotal,
    idempotencyKey: serverIdempotencyKey,
    paymentMethod: 'card',
    userAgent: req.headers['user-agent'],
    metadata: { /* context */ },
    ...(req.user?.id && { userId: req.user.id }),
    ...(req.ip && { ipAddress: req.ip })
  });
  // If audit fails here, NO CHARGE happens (safe)

  // Phase 2: Call Square API
  paymentResult = await paymentsApi.create(paymentRequest);
  // Customer charged at this point

  // Phase 3: Update audit log with final status
  if (paymentResult.payment?.status !== 'COMPLETED') {
    await PaymentService.updatePaymentAuditStatus(
      serverIdempotencyKey,
      'failed',
      undefined,
      paymentResult.payment?.status,
      'Payment not completed'
    );
    return res.status(400).json({ error: 'Payment failed' });
  }

  // Update order
  await OrdersService.updateOrderPayment(order_id, ...);

  // Update audit to success
  await PaymentService.updatePaymentAuditStatus(
    serverIdempotencyKey,
    'success',
    paymentResult.payment.id
  );
  // If this fails, throws error but we have 'initiated' log

  res.json({ success: true });
});
```

#### New Service Method

```typescript
/**
 * Update existing payment audit log status
 * Used to update 'initiated' logs to final status after processing
 */
static async updatePaymentAuditStatus(
  idempotencyKey: string,
  status: 'success' | 'failed',
  paymentId?: string,
  errorCode?: string,
  errorDetail?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('payment_audit_logs')
      .update({
        status,
        payment_id: paymentId,
        error_code: errorCode,
        error_detail: errorDetail,
        updated_at: new Date().toISOString()
      })
      .eq('idempotency_key', idempotencyKey);

    if (error) {
      logger.error('CRITICAL: Failed to update payment audit status', {
        idempotencyKey,
        status,
        error
      });
      // STILL fail-fast - incomplete audit trail is compliance violation
      throw new Error('Payment audit system failure');
    }
  } catch (error) {
    logger.error('CRITICAL: Exception updating payment audit', { error });
    throw new Error('Payment audit system failure');
  }
}
```

### Benefits of Two-Phase Logging

 **Prevents Charged-But-Unrecorded**: Initial log created before charge
 **Maintains Fail-Fast**: If initial log fails, no charge happens
 **Complete Audit Trail**: Shows initiation, result, and timing
 **Forensic Analysis**: Can identify incomplete payments
 **Idempotency**: Prevents duplicate audit logs
 **PCI DSS Compliant**: All payments have corresponding logs

### Testing Added

```typescript
describe('Two-Phase Payment Audit', () => {
  it('should create initiated log before Square API call', async () => {
    // Verify audit log created with status='initiated'
    // Verify NO Square API call yet
  });

  it('should update to success after successful payment', async () => {
    // Verify audit log updated to status='success'
    // Verify payment_id recorded
  });

  it('should update to failed after failed payment', async () => {
    // Verify audit log updated to status='failed'
    // Verify error details recorded
  });

  it('should prevent payment if initial audit fails', async () => {
    // Mock audit log insert failure
    // Verify Square API never called
    // Verify customer NOT charged
  });
});
```

### Lessons Learned

1. **Log Before Action**: Always log intent before state-changing operations
2. **Fail-Fast for Compliance**: Audit failures MUST block operations
3. **Two-Phase Pattern**: Log initiation, update result
4. **Idempotency Keys**: Prevent duplicate logs during retries
5. **Complete Context**: Log user, IP, metadata for forensics

---

## Incident #5: CSRF Protection Blocking REST APIs

**Severity**: P1 (High)
**Discovered**: 2025-10-12
**Resolved**: 2025-10-12 (commit 9b4a9905)
**Impact**: Demo orders failing in production
**Prevented Loss**: $10K+ (customer experience, demo failures, lost sales)

### Executive Summary

CSRF (Cross-Site Request Forgery) protection was incorrectly applied to REST API endpoints that use JWT authentication. CSRF is designed for traditional browser form submissions that use cookies, not for programmatic API calls with bearer tokens.

### Timeline

- **2025-10-10**: CSRF protection enabled globally
- **2025-10-11**: Production demo orders start failing
- **2025-10-12 18:00**: Root cause identified (CSRF on REST APIs)
- **2025-10-12 22:23**: Fix deployed (9b4a9905)

### Technical Details

#### The Problem

```typescript
//  WRONG: CSRF applied to all endpoints
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict'
  }
});

app.use(csrfProtection); // Applied to ALL routes
```

#### Why This Is Wrong

**CSRF Protection Purpose**: Prevent malicious websites from making authenticated requests using cookies stored in the browser.

**REST API Reality**: Our APIs use:
- JWT tokens in `Authorization: Bearer <token>` header
- No cookies for authentication
- Programmatic clients (not browser forms)

**Result**: Programmatic API calls (demo orders, mobile apps) fail with "CSRF token validation failed" because they don't send CSRF tokens.

#### Error in Production

```bash
curl -X POST /api/v1/orders \
  -H "Authorization: Bearer <valid-jwt>" \
  -H "X-Restaurant-ID: restaurant-123" \
  -d '{"items": [...], "type": "dine-in"}'

# Response: 403 Forbidden
{
  "error": "Invalid CSRF token",
  "message": "Form submission failed. Please refresh and try again."
}
```

### Fix Implementation

```typescript
export function csrfMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF in development
    if (process.env['NODE_ENV'] === 'development') {
      return next();
    }

    // Skip CSRF for REST API endpoints (JWT-authenticated, not cookie-based)
    const skipPaths = [
      '/api/v1/health',
      '/api/v1/auth/',             // Auth endpoints use rate limiting
      '/api/v1/realtime/session',  // WebRTC doesn't support CSRF
      '/api/v1/orders',            // REST API with JWT auth
      '/api/v1/payments',          // REST API with JWT + Square validation
      '/api/v1/tables'             // REST API with JWT + RBAC
    ];

    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Apply CSRF protection to traditional form submissions
    csrfProtection(req, res, next);
  };
}
```

### When to Use CSRF Protection

 **Use CSRF for**:
- Traditional HTML form submissions
- Cookie-based authentication
- Browser-rendered pages with state-changing actions
- Server-side rendered forms

 **Don't Use CSRF for**:
- REST APIs with JWT tokens in headers
- WebSocket connections
- OAuth flows
- WebRTC signaling
- Health check endpoints
- Mobile app APIs

### Alternative Security Measures

For REST APIs, use:
1. **JWT Authentication**: Verify token signature
2. **Rate Limiting**: Prevent abuse
3. **Input Validation**: Reject malformed requests
4. **RBAC**: Verify permissions for actions
5. **CORS**: Restrict allowed origins

### Lessons Learned

1. **Understand Security Mechanisms**: CSRF is for cookies, not bearer tokens
2. **API vs Forms**: Different authentication methods need different protection
3. **Test End-to-End**: Verify security doesn't break legitimate use cases
4. **Defense in Depth**: Multiple security layers, not just CSRF
5. **Documentation**: Clearly document why certain paths skip CSRF

---

## Cross-Incident Patterns

### Common Themes Across All Incidents

1. **Premature Trust**: Setting values before validation (multi-tenancy)
2. **Incomplete Environment Checks**: Only checking NODE_ENV (test-token)
3. **Missing Startup Validation**: Not validating secrets (credentials)
4. **Timing Issues**: Logging after state changes (payment audit)
5. **Over-Application**: Applying security wrong context (CSRF)

### Defense in Depth Approach

Each incident resolution added multiple layers:

**Multi-Tenancy** (3 layers):
- Middleware validation
- Service-level filtering
- Database RLS policies

**Authentication** (3 layers):
- Environment guards
- JWT validation
- Rate limiting

**Payment Audit** (3 phases):
- Log initiation
- Process payment
- Update result

**Secret Protection** (3 mechanisms):
- Pre-commit hooks
- Startup validation
- Runtime checks

### Incident Response Process

1. **Detection**: Monitoring, testing, or audit discovery
2. **Assessment**: Determine severity and scope
3. **Containment**: Prevent further damage
4. **Eradication**: Remove vulnerability
5. **Recovery**: Restore normal operations
6. **Lessons**: Document and prevent recurrence

---

**Document Version**: 1.0
**Last Updated**: 2025-11-19
**Related**: README.md, PATTERNS.md, PREVENTION.md


## Solution Patterns

# Security Patterns & Best Practices

This document outlines the security patterns learned from fixing critical vulnerabilities in the Restaurant OS rebuild project.

## Table of Contents

1. [Middleware Ordering Patterns](#middleware-ordering-patterns)
2. [Development Bypass Prevention](#development-bypass-prevention)
3. [JWT Secret Management](#jwt-secret-management)
4. [Multi-Tenancy Validation](#multi-tenancy-validation)
5. [Exposed Secrets Detection](#exposed-secrets-detection)
6. [Rate Limiting Patterns](#rate-limiting-patterns)
7. [Audit Logging Patterns](#audit-logging-patterns)

---

## Middleware Ordering Patterns

### The Problem
Incorrect middleware ordering allowed cross-restaurant data access. The auth middleware was setting `req.restaurantId` from untrusted headers BEFORE validation.

### The Pattern: Authentication → Validation → Authorization

```typescript
//  WRONG: Setting restaurantId before validation
export async function authenticate(req: AuthenticatedRequest, ...): Promise<void> {
  // Verify JWT
  const decoded = jwt.verify(token, jwtSecret);
  req.user = { id: decoded.sub, ... };

  // DANGEROUS: Setting restaurantId from header without validation
  req.restaurantId = req.headers['x-restaurant-id'] as string;
  next();
}

//  CORRECT: Only set after validation
export async function authenticate(req: AuthenticatedRequest, ...): Promise<void> {
  // Verify JWT
  const decoded = jwt.verify(token, jwtSecret);
  req.user = {
    id: decoded.sub,
    restaurant_id: decoded.restaurant_id // From trusted JWT
  };

  // DON'T set req.restaurantId here - let restaurantAccess middleware do it
  next();
}

export async function validateRestaurantAccess(req: AuthenticatedRequest, ...): Promise<void> {
  // Get requested restaurant from header
  const requestedRestaurantId = req.headers['x-restaurant-id'] as string;

  // Validate user has access to this restaurant (DB lookup)
  const { data: userRestaurant } = await supabase
    .from('user_restaurants')
    .select('restaurant_id, role')
    .eq('user_id', req.user.id)
    .eq('restaurant_id', requestedRestaurantId)
    .single();

  if (!userRestaurant) {
    throw Forbidden('Access denied to this restaurant');
  }

  // ONLY set after validation succeeds
  req.restaurantId = requestedRestaurantId;
  req.restaurantRole = userRestaurant.role;
  next();
}
```

### Application in Express Routes

```typescript
//  CORRECT middleware order
app.use(authenticate);                    // 1. Verify JWT, extract user
app.use(validateRestaurantAccess);        // 2. Validate restaurant access
app.use('/api/v1/orders', orderRoutes);   // 3. Business logic
app.use(errorHandler);                    // 4. Error handling
```

### Key Principles

1. **Extract → Validate → Assign**: Extract from JWT, validate access, then assign to request
2. **Trust JWT, Not Headers**: JWT payload is cryptographically verified
3. **Validate Before Use**: Never use header values without validation
4. **Set Once**: `req.restaurantId` set only after all validation passes

---

## Development Bypass Prevention

### The Problem
Test authentication tokens worked in production environments, allowing unauthorized admin access.

### The Pattern: Environment Guards with Multiple Checks

```typescript
//  WRONG: Only checking NODE_ENV
const isDevelopment = process.env['NODE_ENV'] === 'development';

if (isDevelopment && token === 'test-token') {
  // Allow test token
  // BUG: Works on Render if NODE_ENV=development
}

//  CORRECT: Check NODE_ENV AND deployment platform
const isDevelopment = process.env['NODE_ENV'] === 'development'
  && process.env['RENDER'] !== 'true'
  && process.env['VERCEL'] !== '1';

if (isDevelopment && token === 'test-token') {
  // Allow test token only in true local development
}
```

### Rate Limiting Guards

```typescript
//  Apply rate limits in ALL environments except local dev
export const aiServiceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDevelopment ? 100 : 50, // Higher in dev, strict in prod
  skip: (_req: Request) => isDevelopment, // Skip ONLY in local dev
  handler: (req, res) => {
    // Log potential abuse for monitoring
    console.error(`[RATE_LIMIT] AI service limit exceeded for ${req.ip}`);
    res.status(429).json({ error: 'Too many AI requests' });
  }
});
```

### Key Principles

1. **Multiple Flags**: Check both `NODE_ENV` AND platform environment variables
2. **Explicit Platform Checks**: Verify not on Render, Vercel, or other production platforms
3. **Log Bypasses**: Log when development bypasses are used
4. **Fail Closed**: Default to secure behavior if environment unclear

---

## JWT Secret Management

### The Problem
Missing JWT secrets allowed the server to start without authentication configured, and dangerous fallbacks existed in config code.

### The Pattern: Startup Validation with No Fallbacks

```typescript
//  WRONG: Dangerous fallback
export function getConfig(): EnvironmentConfig {
  return {
    supabase: {
      jwtSecret: env.SUPABASE_JWT_SECRET || '', // DANGEROUS: Empty string fallback
    }
  };
}

//  CORRECT: Fail-fast validation at startup
export function validateEnvironment(): void {
  // JWT_SECRET is critical for authentication
  if (!env.SUPABASE_JWT_SECRET) {
    throw new Error(
      'SUPABASE_JWT_SECRET is required for authentication.\n' +
      'Find it in Supabase Dashboard: Settings > API > JWT Secret\n' +
      'It should be a base64-encoded string (~88 characters).'
    );
  }

  // Validate JWT_SECRET format
  const jwtSecret = env.SUPABASE_JWT_SECRET.trim();
  if (jwtSecret.length < 32) {
    throw new Error(
      'SUPABASE_JWT_SECRET appears invalid: too short (expected ~88 characters)'
    );
  }

  // Check for base64 format (warning, not error)
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (!base64Regex.test(jwtSecret)) {
    logger.warn('SUPABASE_JWT_SECRET format warning: expected base64-encoded string');
  }

  logger.info(' JWT authentication configured');
}

// Call at server startup BEFORE listening
validateEnvironment();
```

### JWT Verification with No Fallbacks

```typescript
//  CORRECT: No fallback secrets
export async function authenticate(req: AuthenticatedRequest, ...): Promise<void> {
  const config = getConfig();
  const jwtSecret = config.supabase.jwtSecret;

  if (!jwtSecret) {
    logger.error('⛔ JWT_SECRET not configured - authentication cannot proceed');
    throw new Error('Server authentication not configured');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret); // Single secret, no fallbacks
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw Unauthorized('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw Unauthorized('Invalid token');
    }
    throw Unauthorized('Token verification failed');
  }
}
```

### Key Principles

1. **Fail at Startup**: Validate secrets before server accepts connections
2. **No Fallbacks**: Never fall back to empty strings or default secrets
3. **Format Validation**: Check length and format of secrets
4. **Clear Error Messages**: Explain where to find the secret
5. **Single Source**: One configured secret, no fallback keys

---

## Multi-Tenancy Validation

### The Problem
Application layer set restaurant ID from headers without validation, allowing cross-tenant access.

### The Pattern: Defense in Depth (3 Layers)

#### Layer 1: Middleware Validation

```typescript
// Validate user has access to requested restaurant
export async function validateRestaurantAccess(req: AuthenticatedRequest, ...): Promise<void> {
  const requestedRestaurantId = req.headers['x-restaurant-id'] as string;

  if (!req.user) {
    throw Unauthorized('Authentication required');
  }

  // Database lookup to verify access
  const { data: userRestaurant, error } = await supabase
    .from('user_restaurants')
    .select('restaurant_id, role')
    .eq('user_id', req.user.id)
    .eq('restaurant_id', requestedRestaurantId)
    .single();

  if (error || !userRestaurant) {
    throw Forbidden('Access denied to this restaurant');
  }

  // ONLY set after validation passes
  req.restaurantId = requestedRestaurantId;
  req.restaurantRole = userRestaurant.role;
  next();
}
```

#### Layer 2: Service-Level Filtering

```typescript
// ALWAYS include restaurant_id in queries
export class OrdersService {
  static async getOrders(restaurantId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId) // REQUIRED for multi-tenancy
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getOrder(orderId: string, restaurantId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId) // REQUIRED - prevents cross-tenant access
      .single();

    if (error) return null;
    return data;
  }
}
```

#### Layer 3: Database RLS Policies

```sql
-- Row Level Security policies
CREATE POLICY "tenant_select_orders" ON orders
  FOR SELECT
  USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_update_orders" ON orders
  FOR UPDATE
  USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
  WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "tenant_delete_orders" ON orders
  FOR DELETE
  USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);
```

### Testing Multi-Tenancy

```typescript
describe('Multi-Tenancy Enforcement', () => {
  const RESTAURANT_1_ID = '11111111-1111-1111-1111-111111111111';
  const RESTAURANT_2_ID = '22222222-2222-2222-2222-222222222222';

  it('should prevent restaurant 1 user from accessing restaurant 2 orders', async () => {
    const response = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${restaurant1Token}`)
      .set('X-Restaurant-ID', RESTAURANT_2_ID)
      .expect(403);

    expect(response.body.error.code).toBe('RESTAURANT_ACCESS_DENIED');
  });

  it('should prevent cross-tenant order updates', async () => {
    const response = await request(app)
      .patch(`/api/v1/orders/${restaurant2OrderId}/status`)
      .set('Authorization', `Bearer ${restaurant1Token}`)
      .set('X-Restaurant-ID', RESTAURANT_1_ID)
      .send({ status: 'preparing' })
      .expect(404);
  });
});
```

### Key Principles

1. **Three Layers**: Middleware, service, and database all validate
2. **Explicit Filtering**: Always include `.eq('restaurant_id', restaurantId)`
3. **Never Trust Headers**: Validate access via database lookup
4. **Test Cross-Tenant**: Verify users cannot access other restaurants
5. **Return 404, Not 403**: Don't leak existence of cross-tenant resources

---

## Exposed Secrets Detection

### The Problem
Vercel OIDC token committed to git history for 60+ days.

### The Pattern: Pre-Commit Hooks + Startup Validation

#### Pre-Commit Hook

```bash
#!/usr/bin/env bash
# .husky/pre-commit

# Prevent committing .env files
if git diff --cached --name-only | grep -E "^\.env(\.|$)"; then
  echo "🚨 ERROR: Attempting to commit .env file(s)"
  echo "Blocked files:"
  git diff --cached --name-only | grep -E "^\.env(\.|$)"
  exit 1
fi

# Check for hardcoded secrets (basic pattern matching)
if git diff --cached -U0 | grep -iE "(api[_-]?key|secret[_-]?key|password|token)" | grep -vE "^[+-]\s*//"; then
  echo "  WARNING: Potential secrets detected in staged changes"
  echo "Review carefully before committing"
  # Don't block, just warn
fi
```

#### Startup Secret Validation

```typescript
// Validate critical secrets at startup
export function validateEnvironment(): void {
  const requiredSecrets = [
    'SUPABASE_JWT_SECRET',
    'KIOSK_JWT_SECRET',
    'PIN_PEPPER',
    'DEVICE_FINGERPRINT_SALT',
    'SQUARE_ACCESS_TOKEN'
  ];

  const missing = requiredSecrets.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required secrets: ${missing.join(', ')}\n` +
      'Server cannot start without these secrets configured.'
    );
  }

  // Validate secret formats
  if (env.SUPABASE_JWT_SECRET.length < 32) {
    throw new Error('SUPABASE_JWT_SECRET too short - check configuration');
  }

  if (env.SQUARE_ACCESS_TOKEN === 'demo' && env.NODE_ENV === 'production') {
    throw new Error('Cannot use demo Square token in production');
  }
}
```

#### .gitignore Enforcement

```gitignore
# Environment files
.env
.env.*
!.env.example

# Never commit these patterns
*.key
*.pem
*credentials*.json
```

### Secret Rotation Procedure

1. **Detect**: Discover secret in git history
2. **Revoke**: Immediately revoke the exposed secret
3. **Rotate**: Generate new secret and update environments
4. **Audit**: Check access logs for suspicious activity
5. **Document**: Record incident in security log

### Key Principles

1. **Pre-Commit Checks**: Block secrets before they enter git
2. **Startup Validation**: Fail fast if secrets missing/invalid
3. **Format Checks**: Validate secret length and format
4. **Never Rewrite History**: If secret exposed and expired, document instead
5. **Assume Compromise**: Treat any committed secret as compromised

---

## Rate Limiting Patterns

### The Problem
Rate limiting was disabled in production, allowing unlimited expensive AI API calls.

### The Pattern: Tiered Rate Limits by Cost

```typescript
// Health checks (cheap)
export const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 per minute
  keyGenerator: (req) => req.ip || 'anonymous'
});

// General API (moderate)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 10000 : 1000, // 1000 per 15 minutes
  keyGenerator: (req) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.restaurantId || authReq.ip || 'anonymous';
  },
  skip: (_req) => isDevelopment
});

// AI services (expensive)
export const aiServiceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDevelopment ? 100 : 50, // 50 per 5 minutes
  keyGenerator: (req) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id || authReq.restaurantId || authReq.ip || 'anonymous';
  },
  handler: (req, res) => {
    // Log abuse for monitoring
    console.error(`[RATE_LIMIT] AI service limit exceeded for ${req.ip}`);
    res.status(429).json({
      error: 'Too many AI requests. Please wait 5 minutes.',
      retryAfter: 300
    });
  }
});

// Transcription (very expensive)
export const transcriptionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isDevelopment ? 30 : 20, // 20 per minute
  keyGenerator: (req) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id || authReq.restaurantId || authReq.ip || 'anonymous';
  },
  handler: (req, res) => {
    console.error(`[RATE_LIMIT] Transcription limit exceeded for ${req.ip}`);
    res.status(429).json({
      error: 'Too many transcription requests. Please wait 1 minute.',
      retryAfter: 60
    });
  }
});
```

### Key Principles

1. **Cost-Based Limits**: More expensive operations have stricter limits
2. **User-Based Keys**: Key by user ID or restaurant ID when possible
3. **Development Bypass**: Skip or increase limits in local dev only
4. **Log Abuse**: Always log rate limit violations for monitoring
5. **Clear Messages**: Tell users when they can retry

---

## Audit Logging Patterns

### The Problem
Audit logging happened AFTER payment processing, allowing charged-but-unrecorded scenarios.

### The Pattern: Two-Phase Audit Logging

```typescript
// Phase 1: Log BEFORE external API call
await PaymentService.logPaymentAttempt({
  orderId: order_id,
  status: 'initiated',  // Log intent before charging
  restaurantId: restaurantId,
  amount: validation.orderTotal,
  idempotencyKey: serverIdempotencyKey,
  paymentMethod: 'card',
  userAgent: req.headers['user-agent'],
  metadata: { /* context */ },
  ...(req.user?.id && { userId: req.user.id }),
  ...(req.ip && { ipAddress: req.ip })
});

// Phase 2: Call external API (Square)
paymentResult = await paymentsApi.create(paymentRequest);

// Phase 3: Update audit log with final status
await PaymentService.updatePaymentAuditStatus(
  serverIdempotencyKey,  // Find by idempotency key
  paymentResult.payment?.status === 'COMPLETED' ? 'success' : 'failed',
  paymentResult.payment.id
);
```

### Fail-Fast for Compliance

```typescript
static async logPaymentAttempt(data: PaymentAuditLog): Promise<void> {
  try {
    const { error } = await supabase
      .from('payment_audit_logs')
      .insert(auditLog);

    if (error) {
      logger.error('CRITICAL: Payment audit log failed', { error });
      // FAIL-FAST: Per ADR-009, audit log failures MUST block payment
      throw new Error('Payment processing unavailable - audit system failure');
    }
  } catch (dbError) {
    logger.error('CRITICAL: Database error storing payment audit', { dbError });
    // FAIL-FAST: Same as above
    throw new Error('Payment processing unavailable - audit system failure');
  }
}
```

### Key Principles

1. **Log Before Action**: Record intent before external calls
2. **Update After Action**: Record result after external calls
3. **Fail-Fast**: Audit failures MUST block operations
4. **Idempotency**: Use keys to prevent duplicate logs
5. **Complete Context**: Log user, IP, metadata, timestamps

---

## Summary: Security Pattern Checklist

When implementing any security-sensitive feature:

- [ ] Middleware ordered correctly (auth → validation → business logic)
- [ ] Development bypasses check multiple environment flags
- [ ] JWT secrets validated at startup with no fallbacks
- [ ] Multi-tenancy enforced at 3 layers (middleware, service, DB)
- [ ] No credentials committed (pre-commit hooks active)
- [ ] Rate limiting appropriate for operation cost
- [ ] Audit logging happens BEFORE state-changing operations
- [ ] All patterns tested with cross-tenant attack scenarios
- [ ] Error messages don't leak sensitive information
- [ ] Logging captures security events for monitoring

---

**Last Updated**: 2025-11-19
**Related**: INCIDENTS.md, PREVENTION.md, QUICK-REFERENCE.md


## Quick Reference

# Security Quick Reference Guide

Fast reference for developers implementing security-sensitive features. Use this as a checklist when writing authentication, authorization, payment, or multi-tenancy code.

---

## Security Checklist for New Features

```
[ ] Middleware ordered correctly (auth → validation → business logic)
[ ] Multi-tenancy validated at 3 layers (middleware, service, DB)
[ ] JWT secrets validated at startup (no fallbacks)
[ ] Environment guards check multiple platform flags
[ ] Rate limiting appropriate for operation cost
[ ] Audit logging happens BEFORE state changes
[ ] No secrets in code or git history
[ ] Error messages don't leak sensitive data
[ ] Cross-tenant attack tests written
[ ] RBAC permissions checked
```

---

## Middleware Order Template

Use this exact order for all protected routes:

```typescript
import { authenticate } from './middleware/auth';
import { validateRestaurantAccess } from './middleware/restaurantAccess';
import { requireScope } from './middleware/rbac';
import { errorHandler } from './middleware/errorHandler';

// Protected route with multi-tenancy
app.use('/api/v1/orders',
  authenticate,                    // 1. Verify JWT
  validateRestaurantAccess,        // 2. Validate restaurant access
  requireScope(['orders:read']),   // 3. Check RBAC
  orderRoutes                      // 4. Business logic
);

// Error handler MUST be last
app.use(errorHandler);
```

### Middleware Responsibilities

| Middleware | Purpose | Sets |
|-----------|---------|------|
| `authenticate` | Verify JWT, extract user | `req.user` |
| `validateRestaurantAccess` | Validate restaurant access | `req.restaurantId`, `req.restaurantRole` |
| `requireScope` | Check RBAC permissions | (none) |
| `errorHandler` | Format errors, log | (none) |

**Critical**: Never set `req.restaurantId` in `authenticate` middleware!

---

## JWT Validation Rules

### Startup Validation

```typescript
//  DO: Validate at startup (fail-fast)
export function validateEnvironment(): void {
  if (!env.SUPABASE_JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET is required');
  }

  if (env.SUPABASE_JWT_SECRET.length < 32) {
    throw new Error('SUPABASE_JWT_SECRET too short');
  }

  logger.info(' JWT authentication configured');
}
```

### Runtime Validation

```typescript
//  DO: Single secret, no fallbacks
export async function authenticate(req, res, next): Promise<void> {
  const jwtSecret = config.supabase.jwtSecret;

  if (!jwtSecret) {
    throw new Error('Server authentication not configured');
  }

  const decoded = jwt.verify(token, jwtSecret); // Single secret
  req.user = { id: decoded.sub, ... };
  next();
}
```

### What NOT to Do

```typescript
//  DON'T: Fallback to empty string
jwtSecret: env.SUPABASE_JWT_SECRET || ''

//  DON'T: Multiple fallback secrets
jwt.verify(token, secret1) || jwt.verify(token, secret2)

//  DON'T: Skip validation in any environment
if (env.NODE_ENV !== 'production') { return next(); }
```

---

## Environment Guards

### Pattern

```typescript
//  DO: Check NODE_ENV AND platform flags
export function isLocalDevelopment(): boolean {
  return process.env['NODE_ENV'] === 'development'
    && process.env['RENDER'] !== 'true'
    && process.env['VERCEL'] !== '1'
    && process.env['HEROKU'] !== 'true'
    && !process.env['AWS_EXECUTION_ENV'];
}

// Usage
if (isLocalDevelopment() && token === 'test-token') {
  // Allow test token ONLY in local dev
}
```

### Platform Detection

| Platform | Variable | Value |
|----------|----------|-------|
| Render | `RENDER` | `"true"` |
| Vercel | `VERCEL` | `"1"` |
| Heroku | `HEROKU` | `"true"` |
| AWS Lambda | `AWS_EXECUTION_ENV` | (any) |

### What NOT to Do

```typescript
//  DON'T: Only check NODE_ENV
if (process.env['NODE_ENV'] === 'development') {
  // BUG: Works on Render/Vercel if they set NODE_ENV=development
}
```

---

## Multi-Tenancy Validation

### Service Method Pattern

```typescript
//  DO: Always include restaurant_id filter
export class OrdersService {
  static async getOrder(
    orderId: string,
    restaurantId: string // REQUIRED parameter
  ): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId) // REQUIRED filter
      .single();

    return data;
  }
}
```

### Database Query Checklist

Every query MUST include:

```
[ ] .eq('restaurant_id', restaurantId)
[ ] restaurantId parameter required
[ ] Return 404 for cross-tenant access (not 403)
```

### Testing Pattern

```typescript
it('should prevent cross-restaurant access', async () => {
  const restaurant1Token = createToken({ restaurant_id: R1_ID });
  const restaurant2Order = await createOrder(R2_ID);

  await request(app)
    .get(`/api/v1/orders/${restaurant2Order.id}`)
    .set('Authorization', `Bearer ${restaurant1Token}`)
    .set('X-Restaurant-ID', R1_ID)
    .expect(404); // Not 403 - don't leak existence
});
```

---

## Audit Logging Patterns

### Two-Phase Pattern

```typescript
// Phase 1: Log BEFORE action
await logPaymentAttempt({
  orderId,
  status: 'initiated',
  restaurantId,
  amount,
  idempotencyKey,
  ...context
});

// Phase 2: Perform action
const result = await externalApi.call();

// Phase 3: Update log
await updatePaymentAuditStatus(
  idempotencyKey,
  result.success ? 'success' : 'failed',
  result.id
);
```

### Fail-Fast Enforcement

```typescript
//  DO: Throw if audit fails
static async logPaymentAttempt(data): Promise<void> {
  const { error } = await supabase
    .from('payment_audit_logs')
    .insert(data);

  if (error) {
    logger.error('CRITICAL: Audit failed', { error });
    throw new Error('Payment unavailable - audit system failure');
  }
}
```

### What to Log

```
[ ] User ID (if authenticated)
[ ] IP address
[ ] User agent
[ ] Restaurant ID
[ ] Timestamp
[ ] Operation type
[ ] Status (initiated/success/failed)
[ ] Error details (if failed)
[ ] Idempotency key
```

---

## Rate Limiting Quick Config

### By Cost Tier

```typescript
// Tier 1: General API (moderate)
windowMs: 15 * 60 * 1000,
max: isLocalDev ? 10000 : 1000,
keyGenerator: (req) => req.restaurantId || req.ip

// Tier 2: AI Services (expensive)
windowMs: 5 * 60 * 1000,
max: isLocalDev ? 100 : 50,
keyGenerator: (req) => req.user?.id || req.ip

// Tier 3: Transcription (very expensive)
windowMs: 1 * 60 * 1000,
max: isLocalDev ? 30 : 20,
keyGenerator: (req) => req.user?.id || req.ip

// Tier 4: Auth (security-critical)
windowMs: 15 * 60 * 1000,
max: 5,
keyGenerator: (req) => req.ip,
skipSuccessfulRequests: true
```

### Application

```typescript
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/ai', aiServiceLimiter);
app.use('/api/v1/realtime/transcribe', transcriptionLimiter);
app.use('/api/v1', apiLimiter);
```

---

## Secret Management

### Pre-Commit Hook

```bash
# .husky/pre-commit
if git diff --cached --name-only | grep -E "^\.env(\.|$)"; then
  echo "🚨 ERROR: Attempting to commit .env file"
  exit 1
fi
```

### .gitignore

```gitignore
.env
.env.*
!.env.example
*.key
*.pem
*credentials*.json
```

### Startup Validation

```typescript
const requiredSecrets = [
  'SUPABASE_JWT_SECRET',
  'KIOSK_JWT_SECRET',
  'SQUARE_ACCESS_TOKEN',
  'PIN_PEPPER'
];

requiredSecrets.forEach(key => {
  if (!process.env[key]) {
    throw new Error(`${key} is required`);
  }
});
```

---

## Error Handling

### What to Return

```typescript
//  DO: Generic error messages
throw Unauthorized('Invalid token');
throw Forbidden('Access denied');
throw NotFound('Resource not found');

//  DON'T: Leak sensitive info
throw new Error('User john@restaurant2.com not authorized');
throw new Error('Order belongs to restaurant 22222222-2222-...');
```

### Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Authenticated but no access |
| 404 | Not Found | Cross-tenant access (hide existence) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | System failures |

---

## RBAC Scope Patterns

### JWT Scopes

```typescript
// JWT payload includes scopes array
{
  sub: 'user-123',
  role: 'server',
  restaurant_id: 'restaurant-123',
  scope: ['orders:read', 'orders:create', 'payments:create']
}
```

### Middleware Usage

```typescript
// Require specific scopes
app.use('/api/v1/orders',
  authenticate,
  validateRestaurantAccess,
  requireScope(['orders:read', 'orders:create']),
  orderRoutes
);

// Check for any of multiple scopes
requireScope(['orders:manage', 'admin:*'])
```

### Common Scopes

| Scope | Permissions |
|-------|------------|
| `orders:read` | View orders |
| `orders:create` | Create orders |
| `orders:update` | Update order status |
| `orders:delete` | Delete orders |
| `payments:create` | Process payments |
| `menu:manage` | Edit menu |
| `reports:view` | View analytics |
| `admin:*` | Full admin access |

---

## Testing Checklist

Security tests to write for every feature:

```
[ ] Happy path with valid credentials
[ ] Missing JWT token (401)
[ ] Invalid JWT token (401)
[ ] Expired JWT token (401)
[ ] Cross-restaurant access attempt (403 or 404)
[ ] Missing required scope (403)
[ ] Header spoofing attempt (403)
[ ] Rate limit exceeded (429)
[ ] Audit logging failure (500)
[ ] Environment bypass in production (401)
```

---

## Common Security Mistakes

### 1. Setting restaurantId Too Early

```typescript
//  WRONG
export async function authenticate(req, res, next) {
  req.user = jwt.verify(token, secret);
  req.restaurantId = req.headers['x-restaurant-id']; // TOO EARLY
}

//  CORRECT
export async function authenticate(req, res, next) {
  req.user = jwt.verify(token, secret);
  // Don't set restaurantId here - let validateRestaurantAccess do it
}
```

### 2. Only Checking NODE_ENV

```typescript
//  WRONG
if (process.env['NODE_ENV'] === 'development') {
  // Bypasses work on production platforms!
}

//  CORRECT
if (isLocalDevelopment()) {
  // Checks NODE_ENV AND platform flags
}
```

### 3. Logging After State Changes

```typescript
//  WRONG
await externalApi.charge(amount);
await logAudit({ status: 'success' }); // If this fails, no audit!

//  CORRECT
await logAudit({ status: 'initiated' });
await externalApi.charge(amount);
await updateAudit({ status: 'success' });
```

### 4. Missing restaurant_id Filter

```typescript
//  WRONG
const order = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId) // Missing restaurant_id!
  .single();

//  CORRECT
const order = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId)
  .eq('restaurant_id', restaurantId) // REQUIRED
  .single();
```

### 5. Returning 403 for Cross-Tenant

```typescript
//  WRONG
if (order.restaurant_id !== req.restaurantId) {
  throw Forbidden('Not your order'); // Leaks order existence
}

//  CORRECT
if (order.restaurant_id !== req.restaurantId) {
  throw NotFound('Order not found'); // Hides existence
}
```

---

## Emergency Response

If you discover a security vulnerability:

1. **DO NOT commit the fix yet** - assess scope first
2. **Notify technical lead immediately**
3. **Determine if credentials are exposed**
4. **Revoke compromised credentials**
5. **Document the incident**
6. **Implement fix with tests**
7. **Deploy emergency patch**
8. **Monitor for suspicious activity**

---

## References

- [PATTERNS.md](./PATTERNS.md) - Detailed pattern explanations
- [INCIDENTS.md](./INCIDENTS.md) - Historical incident reports
- [PREVENTION.md](./PREVENTION.md) - Complete prevention guides
- [ADR-009](../../docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md) - Error handling philosophy
- [SECURITY.md](../../docs/SECURITY.md) - Security policies

---

**Last Updated**: 2025-11-19
**Version**: 1.0
**For**: Developers implementing security-sensitive features


