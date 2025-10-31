# ADR-009: Error Handling Philosophy

**Status**: Accepted
**Date**: 2025-10-19
**Deciders**: Development Team
**Related**: STAB-004 (Issue #120), SECURITY.md, DATABASE.md

---

## Context

The codebase has demonstrated inconsistent error handling patterns, particularly around critical operations like payment processing and audit logging. This inconsistency creates compliance risks and makes system behavior unpredictable.

### Specific Example: Payment Audit Logging
Prior to this ADR, payment audit log failures were swallowed (fail-safe pattern):

```typescript
if (error) {
  logger.error('Failed to store payment audit log', { error });
  // Don't throw - audit logging failure shouldn't stop payment processing
}
```

However, our documentation explicitly states:
- **DATABASE.md line 238**: "Required for PCI compliance and fraud investigation"
- **SECURITY.md line 155-163**: PCI DSS compliance requirements
- **DEPLOYMENT.md line 358-363**: "Payment audit logs created for PCI compliance (7-year retention)"

This created a **direct conflict** between code behavior and documented compliance requirements.

---

## Decision

We adopt a **fail-fast by default** error handling philosophy with explicit decision criteria for when to use fail-safe patterns.

### Fail-Fast Policy
**Compliance-critical operations MUST fail-fast** (throw errors that halt the operation):
- Authentication failures
- Authorization failures
- **Payment audit logging failures** (PCI DSS requirement)
- Database connection failures for critical paths
- Required external service failures (payment processors, etc.)
- Schema validation failures for sensitive operations
- Data integrity violations

### Fail-Safe Policy
**Non-critical operations MAY fail-safe** (log errors but continue):
- Optional telemetry/analytics
- Non-critical notifications (email, SMS)
- Best-effort caching operations
- Diagnostic logging to external systems
- Feature flags fetch failures (use defaults)

---

## Rationale

### Why Fail-Fast for Compliance Operations?

1. **Regulatory Requirements**: PCI DSS, SOC 2, and other compliance frameworks **require** audit trails. Missing audit logs can result in:
   - Failed audits
   - Fines and penalties
   - Loss of payment processing capabilities
   - Legal liability

2. **Detectability**: Fail-fast makes problems immediately visible:
   - Fail-safe masks problems (silent failures accumulate)
   - Fail-fast triggers alerts and forces immediate resolution
   - Similar to Square credential validation (DEPLOYMENT.md line 312-316) which fails fast on startup

3. **Defense in Depth**: Aligns with multi-tenancy architecture (ADR-002):
   - Database-level RLS policies
   - Application-level authorization
   - **Audit logging as third layer** - must not be bypassed

4. **Customer Trust**: Better to temporarily deny service than to process payments without proper audit trail:
   - Temporary inconvenience < Compliance violation
   - Clear error message helps support teams diagnose issues
   - Protects both business and customers

### Why Fail-Safe for Non-Critical Operations?

1. **User Experience**: Analytics failures shouldn't block checkout
2. **Resilience**: System remains partially operational
3. **Proportionate Response**: Severity of failure matches response

---

## Decision Matrix

Use this matrix when deciding error handling strategy:

| Operation Type | Examples | Error Handling | Rationale |
|---|---|---|---|
| **Compliance-Critical** | Payment audit logs, access logs, PII access tracking | **FAIL-FAST** (throw) | Regulatory requirements, legal liability |
| **Financial Transactions** | Payment processing, refunds, order totals | **FAIL-FAST** (throw) | Financial accuracy required |
| **Authentication** | Login, token validation, session checks | **FAIL-FAST** (throw) | Security requirement |
| **Authorization** | RLS policy checks, role validation | **FAIL-FAST** (throw) | Security requirement |
| **Data Integrity** | Schema validation for orders, referential integrity | **FAIL-FAST** (throw) | Data consistency requirement |
| **Required External Services** | Payment processor, database | **FAIL-FAST** (throw) | Operation cannot complete |
| **Optional Telemetry** | Analytics events, usage tracking | **FAIL-SAFE** (log) | Non-essential for operation |
| **Notifications** | Email confirmations, SMS alerts | **FAIL-SAFE** (log) | Best-effort delivery |
| **Caching** | Redis failures, CDN failures | **FAIL-SAFE** (log + fallback) | Performance optimization only |
| **Diagnostic Logging** | APM, error tracking services | **FAIL-SAFE** (log) | Can't let monitoring break app |

---

## Implementation Guidelines

### Fail-Fast Pattern

```typescript
// ❌ BAD: Swallow critical errors
try {
  await logPaymentAudit(data);
} catch (error) {
  logger.error('Audit failed', { error });
  // WRONG: Continue anyway
}

// ✅ GOOD: Fail-fast for compliance
try {
  await logPaymentAudit(data);
} catch (error) {
  logger.error('CRITICAL: Audit failed', { error });
  throw new Error('Payment processing unavailable - audit system failure');
}
```

### Fail-Safe Pattern

```typescript
// ✅ GOOD: Fail-safe for optional analytics
try {
  await trackAnalyticsEvent(event);
} catch (error) {
  logger.warn('Analytics tracking failed - non-critical', { error });
  // Continue - analytics is optional
}
```

### Error Messages

**For fail-fast errors**:
- Be specific but don't leak sensitive details
- Provide actionable guidance: "Please try again later"
- Log full context for debugging
- Example: "Payment processing unavailable - audit system failure. Please try again later."

**For fail-safe errors**:
- Log as WARNING or ERROR (not CRITICAL)
- Include enough context for later debugging
- Example: "Analytics tracking failed - non-critical"

---

## Consequences

### Positive

✅ **Compliance**: Payment audit log failures now properly block payments (PCI DSS requirement)
✅ **Consistency**: Clear decision matrix for all error handling
✅ **Detectability**: Critical failures immediately visible
✅ **Security**: Authentication/authorization failures properly enforced
✅ **Documentation**: Aligns code behavior with documented requirements

### Negative

⚠️ **Availability**: Some operations may be denied that previously succeeded (with missing audit logs)
- **Mitigation**: Proper monitoring and alerting for audit system health
- **Mitigation**: Database high availability for audit tables

⚠️ **Initial friction**: Developers must consult decision matrix
- **Mitigation**: Clear examples in this ADR
- **Mitigation**: Code review enforcement

---

## Examples in Codebase

### Fail-Fast (Compliance-Critical)

**Payment Audit Logging** (payment.service.ts:186-205):
```typescript
if (error) {
  logger.error('CRITICAL: Payment audit log failed', { error });
  // FAIL-FAST: Per ADR-009, audit log failures MUST block payment
  throw new Error('Payment processing unavailable - audit system failure');
}
```

**Square Credentials** (DEPLOYMENT.md line 312-316):
- Fails fast on server startup if credentials missing
- Cannot process payments without credentials
- Better to not start than to fail at runtime

### Fail-Safe (Non-Critical)

**WebSocket Broadcast** (orders.service.ts):
- Fire-and-forget for order status updates
- Clients can poll if WebSocket fails
- Not critical for order creation

---

## Related Documentation

- **SECURITY.md**: PCI DSS compliance requirements (updated 2025-10-19)
- **DATABASE.md line 238**: Payment audit logs marked as "Required for PCI compliance"
- **DEPLOYMENT.md line 312-316**: Square credential fail-fast example
- **ADR-002**: Multi-tenancy architecture (defense-in-depth approach)

---

## Revision History

- **2025-10-19**: Initial ADR created
  - Establishes fail-fast as default for compliance operations
  - Documents fail-fast vs fail-safe decision matrix
  - Resolves conflict between code and documentation (STAB-004)
