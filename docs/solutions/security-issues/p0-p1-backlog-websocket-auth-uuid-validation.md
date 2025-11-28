# P0/P1 Backlog Resolution: WebSocket Auth Parity & UUID Validation

**Last Updated:** 2025-11-28

## Metadata
- **Date**: 2025-11-28
- **Category**: Security / Multi-tenancy
- **Severity**: P0 (Critical Security) + P1 (Feature Completion)
- **Files Changed**: 10 files, +312/-91 lines
- **Test Impact**: 376 tests passing (1 skipped)

## Problem Statement

The TODO scan identified several critical security gaps and incomplete features:

### P0 Security Issues
1. **WebSocket auth lacked STRICT_AUTH enforcement** - HTTP endpoints enforced STRICT_AUTH but WebSocket connections allowed tokens without `restaurant_id`
2. **UUID validation used RFC 4122 strict mode** - `uuid.validate()` rejected valid test UUIDs like `11111111-1111-1111-1111-111111111111`
3. **kiosk_demo role still accepted** - Deprecated role alias was still functional

### P1 Feature Gaps
1. Table status broadcasts missing WebSocket implementation
2. Kitchen notifications incomplete
3. Customer SMS/email notifications unimplemented
4. Refund processing on cancellation missing
5. Health check lacking database connectivity test

## Root Cause Analysis

### WebSocket Auth Gap
The `verifyWebSocketAuth` function was implemented separately from `authenticate()` and didn't receive the STRICT_AUTH updates. This created a security boundary inconsistency where:
- HTTP: Enforced `restaurant_id` in JWT when STRICT_AUTH=true
- WebSocket: Allowed connections without `restaurant_id`

### UUID Validation Issue
The `uuid` package's `validate()` function enforces RFC 4122 compliance, which requires specific version and variant bits. Test UUIDs like `11111111-1111-1111-1111-111111111111` are valid UUID format but fail RFC 4122 checks.

## Solution

### 1. UUID Regex Validation (auth.ts)

Replaced `uuid.validate()` with regex pattern:

```typescript
// UUID format regex (accepts any UUID-like format, not just RFC 4122)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Usage in authenticate() and verifyWebSocketAuth()
if (decoded.restaurant_id && !UUID_REGEX.test(decoded.restaurant_id)) {
  logger.error('⛔ Invalid restaurant_id format in token', {...});
  throw Unauthorized('Invalid restaurant context');
}
```

### 2. WebSocket STRICT_AUTH Parity (auth.ts:236-253)

Added matching enforcement to `verifyWebSocketAuth`:

```typescript
// STRICT_AUTH enforcement: Reject tokens without restaurant_id
const strictAuth = process.env['STRICT_AUTH'] === 'true';
if (strictAuth && !decoded.restaurant_id) {
  logger.error('⛔ WebSocket STRICT_AUTH: token missing restaurant_id rejected', {
    userId: decoded.sub,
    path: request.url
  });
  return null;
}

// UUID format validation for restaurant_id
if (decoded.restaurant_id && !UUID_REGEX.test(decoded.restaurant_id)) {
  logger.error('⛔ WebSocket: Invalid restaurant_id format in token', {...});
  return null;
}
```

### 3. kiosk_demo Role Rejection (auth.ts:71-77)

Removed the alias and added explicit rejection:

```typescript
if (userRole === 'kiosk_demo') {
  logger.error("⛔ auth: role 'kiosk_demo' rejected - no longer supported", {
    userId: decoded.sub,
    path: req.path
  });
  throw Unauthorized("Role 'kiosk_demo' is no longer supported. Use 'customer' role instead.");
}
```

### 4. Table Broadcast Implementation (table.service.ts)

Added WebSocket broadcast for table status updates:

```typescript
import { WebSocketServer } from 'ws';
import { broadcastToRestaurant } from '../utils/websocket';

export class TableService {
  private static wss: WebSocketServer;

  static setWebSocketServer(wss: WebSocketServer): void {
    this.wss = wss;
  }

  // In updateStatusAfterPayment:
  if (this.wss) {
    broadcastToRestaurant(this.wss, restaurantId, {
      type: 'table:status_updated',
      payload: { table_id: tableId, status: 'paid', table_number, label },
      timestamp: new Date().toISOString()
    });
  }
}
```

### 5. Order State Machine Hooks (orderStateMachine.ts)

Added notification hooks with environment variable gates (dormant without credentials):

- **`*->confirmed`**: Kitchen ticket formatting for KDS
- **`*->ready`**: Customer SMS (Twilio) and email (SendGrid)
- **`*->cancelled`**: Stripe refund with idempotency key

### 6. Database Health Check (metrics.ts:50-93)

Added `/health/detailed` endpoint with database latency measurement:

```typescript
let dbStatus = 'healthy';
const start = Date.now();
const { error } = await supabase.from('restaurants').select('id').limit(1);
dbLatency = Date.now() - start;
if (error) dbStatus = 'error';
else if (dbLatency > 1000) dbStatus = 'degraded';
```

## Files Changed

| File                                              | Changes                                               |
| ------------------------------------------------- | ----------------------------------------------------- |
| `server/src/middleware/auth.ts`                   | UUID regex, STRICT_AUTH WebSocket, kiosk_demo rejection |
| `server/src/services/table.service.ts`            | WebSocket broadcast implementation                    |
| `server/src/services/orderStateMachine.ts`        | Kitchen, customer, refund hooks                       |
| `server/src/routes/metrics.ts`                    | Database health check                                 |
| `server/src/server.ts`                            | TableService WebSocket wiring                         |
| `server/tests/routes/orders.auth.test.ts`         | UUID format, kiosk_demo tests                         |
| `server/tests/security/rbac.proof.test.ts`        | UUID format constants                                 |
| `server/tests/security/ratelimit.proof.test.ts`   | UUID format in tokens                                 |
| `server/tests/services/orderStateMachine.test.ts` | Refund hook expectations                              |

## Prevention Strategies

### 1. Auth Parity Checklist
When modifying authentication:
- [ ] Update both `authenticate()` and `verifyWebSocketAuth()`
- [ ] Update both `optionalAuth()` if applicable
- [ ] Add tests for both HTTP and WebSocket paths

### 2. UUID Validation Pattern
Always use regex for UUID format validation in multi-tenant systems:
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

### 3. Test UUID Constants
Standardize on these test UUIDs across all tests:
```typescript
const TEST_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
const TEST_RESTAURANT_ID_2 = '22222222-2222-2222-2222-222222222222';
```

### 4. Feature Flag Pattern
Ship dormant code behind environment variable gates:
```typescript
if (process.env.TWILIO_ACCOUNT_SID) {
  // Feature active
}
```

## Verification

```bash
# Run all tests
npm run test:server

# Specific security tests
npm run test:server -- tests/security/rbac.proof.test.ts
npm run test:server -- tests/routes/orders.auth.test.ts

# Health check
curl http://localhost:3001/health/detailed
```

## Related Documentation

- [CL-AUTH-001: STRICT_AUTH Drift](.claude/lessons/CL-AUTH-001-strict-auth-drift.md)
- [ADR-006: Dual Authentication Pattern](docs/adr/ADR-006-dual-auth.md)
- [WebSocket Station Auth Solution](docs/solutions/auth-issues/websocket-station-auth-dual-pattern.md)
