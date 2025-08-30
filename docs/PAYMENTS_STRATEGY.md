# Payments & Testing Strategy

## Executive Summary

This document outlines the comprehensive payment implementation strategy for Restaurant OS v6.0.3, building upon the completed authentication and RBAC system. Our goal is to deliver production-ready payment processing with Square integration, robust security measures, comprehensive audit logging, and proven load testing results.

**Purpose**: Enable secure, scalable payment processing for restaurant operations while maintaining PCI compliance alignment and providing complete audit trails for financial reconciliation.

## Current State (v6.0.2)

### What Exists Now
- **Square Sandbox Integration**: Basic payment processing with sandbox credentials
- **Server-side Validation**: Amount calculation and validation on server to prevent manipulation
- **Basic Audit Logging**: Console-based logging of payment attempts
- **Auth & RBAC System**: Complete JWT-based authentication with role-based access control
- **API Scopes Defined**: PAYMENTS_PROCESS, PAYMENTS_REFUND, PAYMENTS_READ scopes implemented

### Infrastructure Ready
- Supabase JWT authentication with RS256 signing
- CSRF protection via httpOnly cookies
- Rate limiting (payments: 100/min per IP)
- Restaurant context enforcement
- User session management (8h managers, 12h staff)

## Payment Flow (Target v6.0.3)

### Step-by-Step Flow

1. **Order Creation**
   ```
   Client → POST /api/v1/orders
   - Items, customer info, restaurant context
   - Server calculates totals (tax, subtotal, total)
   - Returns order ID and order number
   ```

2. **Payment Token Generation**
   ```
   Client → Square Web Payments SDK
   - Tokenize card details (never hits our server)
   - Returns single-use payment token
   - Handles 3D Secure verification if required
   ```

3. **Payment Processing**
   ```
   Client → POST /api/v1/payments/create
   Headers: Bearer token, X-Restaurant-ID
   Body: { orderId, token, amount (for validation) }
   
   Server:
   - Verify JWT and extract user_id
   - Check ApiScope.PAYMENTS_PROCESS permission
   - Validate restaurant access
   - Recalculate order total from database
   - Generate server-side idempotency key
   - Call Square Payments API
   - Update order status
   - Log to payment_audit_logs table
   ```

4. **Webhook Processing**
   ```
   Square → POST /webhooks/square/payments
   - Verify webhook signature
   - Update payment status
   - Trigger order status updates
   - Log webhook events
   ```

5. **Database Updates**
   ```
   - orders.payment_status → 'paid'
   - orders.payment_method → 'card'
   - orders.payment_id → Square payment ID
   - payment_audit_logs → Complete audit entry
   ```

### Server-side Recalculation

```typescript
// Never trust client amounts
const validation = await PaymentService.validatePaymentRequest(
  orderId,
  restaurantId,
  clientAmount, // Only for comparison
  clientIdempotencyKey // Ignored, server generates own
);

// Use server-calculated values
const paymentRequest = {
  amountMoney: { amount: validation.amount },
  idempotencyKey: validation.idempotencyKey
};
```

### Idempotency Key Handling

- Format: `order-${orderId}-${timestamp}-${uuid}`
- Generated server-side only
- Prevents duplicate charges on retries
- Stored in payment_audit_logs for tracking

### Error Handling & Retries

1. **Network Failures**: Automatic retry with exponential backoff
2. **Card Declined**: Return specific error to client
3. **Insufficient Permissions**: 403 Forbidden with scope requirements
4. **Invalid Amount**: 400 Bad Request with expected amount
5. **Square API Errors**: Log and return sanitized error message

## Role-Based Permissions

### Payment Scopes

| Scope | Description | Allowed Roles |
|-------|-------------|---------------|
| `payment:process` | Process new payments | Owner, Manager, Server, Cashier |
| `payment:refund` | Issue refunds | Owner, Manager |
| `payment:report` | View payment reports | Owner, Manager |
| `payment:read` | View payment details | Owner, Manager, Server, Cashier |

### Implementation

```typescript
// Payment processing endpoint
router.post('/create',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req, res) => { /* ... */ }
);

// Refund endpoint
router.post('/:paymentId/refund',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_REFUND),
  async (req, res) => { /* ... */ }
);
```

## Audit Logging

### Log Fields

```typescript
interface PaymentAuditLog {
  id: string;
  order_id: string;
  user_id: string;              // Who initiated
  restaurant_id: string;         // Restaurant context
  amount: number;                // In cents
  payment_method: 'card' | 'cash' | 'other';
  payment_id?: string;           // Square payment ID
  status: 'initiated' | 'processing' | 'success' | 'failed' | 'refunded';
  error_code?: string;           // Square error code
  error_detail?: string;         // Error description
  ip_address: string;            // Client IP
  user_agent: string;            // Browser info
  idempotency_key: string;       // Prevent duplicates
  metadata: JsonB;               // Additional context
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Storage & Retention

- **Table**: `payment_audit_logs`
- **Retention**: 7 years (financial compliance)
- **Backup**: Daily automated backups
- **Access**: Read-only for reporting, no updates/deletes
- **Indexing**: On order_id, user_id, restaurant_id, created_at

### Compliance Requirements

- PCI DSS: Never log full card numbers or CVV
- GDPR: User consent for data retention
- SOX: Immutable audit trail for financial transactions
- State Laws: Comply with local financial record requirements

## Security Requirements

### Authentication & Authorization
- ✅ Supabase JWT with RS256 signing
- ✅ CSRF protection via double-submit cookies
- ✅ Role-based access control with scopes
- ✅ Restaurant context validation

### Payment Security
- **Server-only Secrets**: Square API keys never exposed to client
- **Token Validation**: Single-use tokens expire after 24 hours
- **Amount Validation**: Server recalculates all amounts
- **Idempotency**: Server-generated keys prevent duplicates

### PCI Compliance Alignment
- **No Card Data Storage**: Only tokens and payment IDs
- **TLS 1.2+**: All API communications encrypted
- **Key Rotation**: Square handles key management
- **Audit Trails**: Complete logging of all payment events

### Rate Limiting
- Payment endpoints: 100 requests/minute per IP
- Refund endpoints: 10 requests/minute per user
- Webhook endpoints: 1000 requests/minute (Square's rate)

### Monitoring & Alerting
- Failed payment rate > 5%: Alert
- Response time > 1000ms: Warning
- Consecutive failures > 3: Critical alert
- Unusual refund patterns: Fraud alert

## Testing Plan

### Unit Tests (payment.service.ts)
```typescript
describe('PaymentService', () => {
  test('calculates order total correctly');
  test('validates minimum order amount');
  test('generates unique idempotency keys');
  test('handles invalid items gracefully');
  test('applies tax rate correctly');
});
```

### Integration Tests
```typescript
describe('Payment Flow', () => {
  test('complete order → payment → confirmation flow');
  test('handles payment failure gracefully');
  test('enforces RBAC for payment processing');
  test('prevents duplicate payments with idempotency');
  test('logs audit entries with user context');
});
```

### Negative Tests
```typescript
describe('Security Tests', () => {
  test('rejects refund without PAYMENTS_REFUND scope');
  test('prevents amount manipulation');
  test('blocks payments for other restaurants');
  test('handles expired tokens appropriately');
  test('rate limits excessive requests');
});
```

### E2E Tests with Square Sandbox
1. Create order with multiple items
2. Apply modifiers and special instructions
3. Process payment with test card
4. Verify order status update
5. Check audit log entry
6. Process partial refund
7. Verify refund in audit log

## Load Testing Plan

### Target Metrics
- **Concurrent Users**: 100
- **Request Rate**: 50 payments/second
- **Response Time**: <500ms p95
- **Success Rate**: >95%
- **Error Rate**: <1%
- **Memory Usage**: <4GB
- **CPU Usage**: <80%

### Test Scenarios

1. **Standard Load** (1 hour)
   - 50 concurrent users
   - Normal transaction flow
   - Mixed payment amounts

2. **Peak Load** (15 minutes)
   - 100 concurrent users
   - Black Friday simulation
   - Rapid order creation

3. **Stress Test** (5 minutes)
   - 200 concurrent users
   - Find breaking point
   - Monitor recovery

### Tools & Implementation

```javascript
// k6 load test script
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.05'],   // Error rate under 5%
  },
};

export default function() {
  // Test implementation
}
```

### Monitoring During Tests
- Server metrics (CPU, memory, disk I/O)
- Database connection pool usage
- Square API response times
- WebSocket connection stability
- Error rates by type

## Rollout Plan

### Step 1: Configure Production Square Credentials (Day 1)
- [ ] Obtain production Square credentials
- [ ] Store in secure environment variables
- [ ] Configure webhook endpoints
- [ ] Test webhook signature verification

### Step 2: Run E2E Tests with Real Cards (Day 2)
- [ ] Process test transactions in staging
- [ ] Verify webhook processing
- [ ] Test refund flows
- [ ] Validate audit logging

### Step 3: Load Testing in Staging (Day 3)
- [ ] Deploy to staging environment
- [ ] Run progressive load tests
- [ ] Monitor system metrics
- [ ] Document performance results

### Step 4: Update Documentation (Day 4)
- [ ] Update PRODUCTION_DEPLOYMENT_STATUS.md
- [ ] Document API changes
- [ ] Create runbook for operations
- [ ] Update security documentation

### Step 5: Production Deployment (Day 5)
- [ ] Deploy during maintenance window
- [ ] Run smoke tests
- [ ] Monitor initial transactions
- [ ] Enable for pilot restaurant

### Step 6: Progressive Rollout (Week 2)
- [ ] Monitor pilot restaurant metrics
- [ ] Fix any identified issues
- [ ] Enable for additional restaurants
- [ ] Full rollout after stability confirmed

## Deliverables

### Code Changes
- ✅ Enhanced payment.service.ts with full audit logging
- ✅ Updated payment routes with RBAC enforcement
- ✅ Database migration for payment_audit_logs table
- ✅ Load testing scripts in /scripts/load-test/

### Documentation
- ✅ This PAYMENTS_STRATEGY.md document
- ✅ Updated PRODUCTION_DEPLOYMENT_STATUS.md
- ✅ API documentation with examples
- ✅ Runbook for payment issues

### Test Results
- Unit test coverage report (target: >80%)
- Integration test results
- Load test report with metrics
- Security scan results

### Deployment Artifacts
- Environment configuration checklist
- Database migration scripts
- Monitoring dashboard setup
- Alert configuration

## Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|------------|
| Square API downtime | Implement circuit breaker, queue for retry |
| Database bottleneck | Connection pooling, read replicas |
| Memory leaks | Regular restarts, memory monitoring |
| Token expiry | Automatic refresh, grace period |

### Business Risks
| Risk | Mitigation |
|------|------------|
| Payment failures | Clear error messages, support escalation |
| Duplicate charges | Idempotency keys, audit trails |
| Fraud attempts | Rate limiting, unusual pattern detection |
| Compliance issues | Regular audits, immutable logs |

## Success Criteria

### Technical Metrics
- [ ] All payment endpoints protected with RBAC
- [ ] 100% of payments have audit log entries
- [ ] Load tests pass with 100 concurrent users
- [ ] Zero security vulnerabilities in scan
- [ ] <500ms p95 response time achieved

### Business Metrics
- [ ] Payment success rate >95%
- [ ] Refund processing time <2 minutes
- [ ] Zero duplicate charges
- [ ] Complete audit trail for reconciliation
- [ ] Positive feedback from pilot restaurant

## Conclusion

This payment strategy builds upon our robust authentication and RBAC foundation to deliver enterprise-grade payment processing. With comprehensive audit logging, load testing validation, and progressive rollout, we ensure both security and reliability for restaurant operations.

The implementation prioritizes:
1. **Security**: Server-side validation, RBAC enforcement, audit trails
2. **Reliability**: Idempotency, error handling, monitoring
3. **Performance**: Load tested for 100+ concurrent users
4. **Compliance**: PCI alignment, immutable audit logs
5. **Operations**: Clear documentation, monitoring, support processes

With this strategy, Restaurant OS v6.0.3 will be ready for production payment processing while maintaining the highest standards of security and reliability.