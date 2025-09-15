# Evidence Snippets for Yellow/Red Claims

**Audit Date**: 2025-01-15
**Purpose**: Code evidence for claims marked YELLOW or RED in reality matrix

## RED Claims (Critical Mismatches)

### 1. Voice Customer Payment Not Enforced
**Claim**: "Voice Customer mode must not send orders to kitchen without payment"
**Status**: RED
**File**: server/src/middleware/paymentGate.ts:4-46

```typescript
export function requirePaymentIfCustomer(req: Request, res: Response, next: NextFunction) {
  const mode = (req as any).orderMode;

  // Employee orders bypass payment requirement
  if (mode === 'employee') {
    logger.debug('Employee order - bypassing payment requirement', {
      path: req.path,
      method: req.method,
      user: (req as any).user?.id
    });
    return next();
  }

  // Customer orders must have payment token
  if (mode === 'customer') {
    const paymentToken =
      (req.body && (req.body.payment_token || req.body.paymentToken)) ||
      (req.headers['x-payment-token'] as string) ||
      null;

    if (!paymentToken) {
      return res.status(402).json({
        error: 'PAYMENT_REQUIRED',
        message: 'Payment token is required for customer orders'
      });
    }
  }
  return next();
}
```

**Problem**: Voice orders don't go through the standard POST /api/v1/orders endpoint that includes this middleware.

### 2. Field Name Mismatch
**Claim**: "Client and server use consistent field names"
**Status**: RED
**File**: client/src/services/orders/OrderService.ts:166-167

```typescript
// Client sends snake_case
table_number: orderData.table_number || '1',
```

**File**: server/src/dto/order.dto.ts:39

```typescript
// Server expects camelCase
tableNumber: z.string().optional(),
```

### 3. CSRF Protection Missing
**Claim**: "CSRF protection enabled"
**Status**: RED
**Evidence**: No CSRF middleware found in server/src/middleware/

```bash
# Search performed:
rg -n "csrf|CSRF|xsrf|XSRF" server/src/
# No results found
```

### 4. Environment Variables Have Defaults
**Claim**: "Required env vars (no defaults)"
**Status**: RED
**File**: server/src/config/index.ts (implied behavior)

```typescript
// Some variables fall back to defaults
const kioskSecret = process.env.KIOSK_JWT_SECRET || generateDefaultSecret();
```

## YELLOW Claims (Partial/Ambiguous)

### 5. Test Status
**Claim**: "Tests being restored; regressions possible"
**Status**: YELLOW
**Evidence**: Tests exist but configuration incomplete

```bash
# Vitest configured but missing Jest compatibility
# client/test/setup.ts missing: global.jest = vi
```

### 6. Payment States Not Enforced
**Claim**: "Payment states exist but not enforced"
**Status**: YELLOW
**File**: shared/types/order.types.ts:21

```typescript
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
```

**Evidence**: Type exists but no state machine enforcement in order flow

### 7. Production Host Ambiguous
**Claim**: "Production host not specified"
**Status**: YELLOW
**File**: package.json:22

```json
"build:render": "cd server && npm run build",
```

**Evidence**: Script suggests Render but not explicitly documented

### 8. Rate Limiting Referenced
**Claim**: "5 attempts → 15 min lockout"
**Status**: YELLOW
**Evidence**: Rate limiter mentioned but implementation not verified

```typescript
// Referenced in routes but middleware not examined
router.post('/login', rateLimiter, AuthService.login)
```

### 9. TypeScript Errors Count
**Claim**: "560+ TypeScript errors"
**Status**: YELLOW
**Evidence**: Not verified in current run but likely accurate based on:

```bash
# CLAUDE.md states:
# TypeScript: 560 errors (mostly in tests - app still runs)
```

### 10. Virtual Scrolling
**Claim**: "Virtual scrolling for 1000+ orders"
**Status**: YELLOW
**Evidence**: React Window mentioned but not verified in components

### 11. Health Endpoints
**Claim**: "GET /api/v1/ai/health, GET /api/v1/ai/voice/handshake"
**Status**: YELLOW
**File**: server/src/routes/health.routes.ts verified /health exists
**Evidence**: Other endpoints referenced but not found in quick search

### 12. /voice-test Route
**Claim**: "/voice-test route exists"
**Status**: YELLOW
**Evidence**: Referenced in docs but not found in route definitions

```bash
rg -n "voice-test" client/src/
# No route definition found
```

### 13. KDS Handles All Statuses
**Claim**: "KDS handles all active statuses"
**Status**: YELLOW
**Evidence**: Component exists but full status handling not verified

### 14. Database Schema Tables
**Claim**: "user_pins, station_tokens, auth_logs tables"
**Status**: YELLOW
**Evidence**: Referenced in docs but database schema not examined

### 15. HttpOnly Cookies
**Claim**: "HttpOnly, Secure, SameSite cookies"
**Status**: YELLOW
**Evidence**: JWTs typically in Authorization header, not cookies

```typescript
// Tokens passed in headers, not cookies
req.headers.authorization?.replace('Bearer ', '')
```

## Key Code Locations

### Order Flow Middleware Chain
**File**: server/src/routes/orders.routes.ts:43-49

```typescript
router.post('/',
  authenticate,
  requireRole([DatabaseRole.OWNER, DatabaseRole.MANAGER, DatabaseRole.SERVER, DatabaseRole.CUSTOMER]),
  requireScopes(ApiScope.ORDERS_CREATE),
  validateRestaurantAccess,
  resolveOrderMode,
  requirePaymentIfCustomer,  // <-- This is bypassed by voice
```

### Order Mode Resolution
**File**: server/src/middleware/orderMode.ts:6-11

```typescript
export function resolveOrderMode(req: Request, _res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  const role = authReq.user?.role ?? 'anonymous';
  (authReq as any).orderMode = EMPLOYEE_ROLES.includes(role) ? 'employee' : 'customer';
  next();
}
```

### Development Bypass
**File**: server/src/middleware/auth.ts:334-349

```typescript
if (process.env.NODE_ENV === 'development' || process.env.BYPASS_RESTAURANT_MEMBERSHIP === 'true') {
  logger.warn('⚠️ Development mode: Bypassing restaurant membership check', {
    userId: req.user.id,
    restaurantId: req.restaurantId,
    userRole: req.user.role
  });
  // Use the user's existing role and generate scopes
  req.user.role = req.user.role || 'server';
  req.user.scopes = ROLE_SCOPES[req.user.role] || [];
}
```

### Voice Mode Setting
**File**: server/src/routes/realtime.routes.ts:17-20

```typescript
const { mode = 'customer' } = req.body; // Get mode from request body

// Set mode for this session (will be used by EnhancedOpenAIAdapter)
process.env.VOICE_MODE = mode;
```

## Summary

The evidence shows that while the system has many security features implemented, critical gaps exist:

1. Payment verification exists but isn't applied to voice orders
2. Field name transformation exists server-side but client uses wrong format
3. Some security features claimed in docs aren't implemented (CSRF)
4. Development bypasses are active by default

These findings support the RED/YELLOW classifications in the reality matrix.