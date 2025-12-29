# OBSERVABILITY & OPERATIONS ANALYSIS

**Audit Date**: 2025-12-28
**System**: Grow / Restaurant OS (rebuild-6.0)
**Deployment**: Render (Single Instance)

---

## Executive Summary

The system has **adequate logging for development** but lacks **production-grade observability**. Incident diagnosis would rely heavily on log searching with no structured alerting or dashboards. Critical silent failures exist in rate limiting and token validation.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Logging | 65/100 | Present but unstructured |
| Metrics | 30/100 | Minimal collection |
| Alerting | 20/100 | Not implemented |
| Tracing | 10/100 | Request IDs only |
| Runbooks | 15/100 | Not documented |

---

## Current Observability State

### Logging Infrastructure

**Implementation**:
```typescript
// server/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});
```

**Strengths**:
- JSON structured logging
- Consistent logger usage (console.log banned)
- Timestamps included
- Log level configurable

**Gaps**:
- No log aggregation (Render logs only)
- No log retention policy
- No correlation IDs across requests
- No sensitive data redaction

---

### What Gets Logged

| Category | Logged? | Quality | Example |
|----------|---------|---------|---------|
| Authentication success | Yes | Good | User ID, restaurant, method |
| Authentication failure | Yes | Good | Reason, attempts, IP |
| Payment initiation | Yes | Excellent | Order, amount, idempotency key |
| Payment completion | Yes | Excellent | Status, payment ID |
| Order state changes | Partial | Medium | Status change, missing actor |
| Rate limit triggers | No | None | Silent failure |
| WebSocket events | No | None | Connection lifecycle invisible |
| Database errors | Yes | Good | Query, error message |
| External API calls | Partial | Medium | Stripe yes, OpenAI partial |

---

### Silent Failures

#### 1. Rate Limiter Reset on Restart

**Location**: `server/src/middleware/rateLimiter.ts`

**What Happens**:
```typescript
// In-memory storage
const requests = new Map<string, number[]>();

// On server restart: All entries lost
// No log entry indicates this happened
```

**Impact**:
- Rate limits reset silently after deploy
- Brute force protection window opens
- No operator visibility into protection state

**Recommendation**:
- Log on startup: "Rate limiter initialized (empty state)"
- Log periodically: "Rate limiter tracking N IPs"
- Alert on restart spike in auth attempts

---

#### 2. Demo User Token Acceptance

**Location**: `server/src/middleware/restaurantAccess.ts`

**What Happens**:
```typescript
if (sub.startsWith('demo:')) {
  return true; // No logging of demo access
}
```

**Impact**:
- Demo user access leaves no audit trail
- Forged demo tokens are invisible
- Abuse cannot be detected

**Recommendation**:
- Log all demo user access with full context
- Alert on demo access in production environment
- Rate limit demo user requests

---

#### 3. WebSocket Connection Failures

**Location**: Client WebSocket handlers

**What Happens**:
- Connection drops: Client retries silently
- Server disconnect: No server-side log
- Reconnection storms: No visibility

**Impact**:
- KDS outage invisible to operators
- Connection pool exhaustion undetected
- User experience degrades silently

**Recommendation**:
- Log WebSocket lifecycle (connect, disconnect, error)
- Track connection count per restaurant
- Alert on connection rate spikes

---

#### 4. JWT Validation Failures (Non-Auth)

**Location**: `server/src/middleware/auth.ts`

**What Happens**:
- Expired tokens: Logged
- Invalid signatures: Logged
- Missing restaurant_id: May not be logged if STRICT_AUTH off

**Impact**:
- Token forgery attempts may be invisible
- Misconfigured clients not detected
- Security incidents missed

**Recommendation**:
- Log ALL JWT validation failures
- Include token claims (sanitized) in log
- Track failure rate per IP

---

## Incident Diagnosis Capabilities

### Current State: Manual Log Search

**Process**:
1. User reports issue
2. Operator accesses Render dashboard
3. Search logs by timestamp
4. Manually correlate events
5. No request tracing

**Time to Diagnose**: 30-60 minutes for simple issues

---

### Diagnosis Scenarios

#### Scenario 1: "Payment went through but order shows unpaid"

**Current Approach**:
1. Search logs for order ID
2. Find payment initiation log
3. Find Stripe webhook log
4. Check order update log
5. Manually trace failure point

**Gaps**:
- No correlation between logs
- Webhook may have failed silently
- Order update may not have logged

**Improved Approach**:
- Add correlation ID to all payment-related logs
- Alert on payment-status mismatch
- Dashboard for payment flow visualization

---

#### Scenario 2: "KDS is not updating"

**Current Approach**:
1. Check if server is running
2. Search logs for WebSocket errors
3. No visibility into client state
4. Guess at network issues

**Gaps**:
- No WebSocket connection tracking
- No client-side error reporting
- No KDS heartbeat monitoring

**Improved Approach**:
- Log WebSocket connection state changes
- Client error reporting to server
- KDS heartbeat with alerting

---

#### Scenario 3: "Staff locked out of PIN auth"

**Current Approach**:
1. Search logs for PIN failures
2. Check database for `locked_until`
3. Manually unlock via SQL

**Gaps**:
- No alert when lockout occurs
- No unlock runbook
- Rate limit state not visible

**Improved Approach**:
- Alert on lockout events
- Self-service unlock for managers
- Rate limit dashboard

---

## Metrics Collection (Current State)

### What's Measured

| Metric | Collected? | Location |
|--------|-----------|----------|
| Request count | No | - |
| Response latency | No | - |
| Error rate | No | - |
| Active connections | No | - |
| Database pool usage | No | - |
| Memory usage | Render only | Platform |
| CPU usage | Render only | Platform |
| Cache hit rate | No | - |

### Recommended Metrics

#### Application Metrics (Priority 1)

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| `http_requests_total` | Counter | N/A |
| `http_request_duration_seconds` | Histogram | P99 > 5s |
| `http_errors_total` | Counter | >10/min |
| `auth_failures_total` | Counter | >20/min |
| `payment_attempts_total` | Counter | N/A |
| `payment_failures_total` | Counter | >5/hour |

#### Infrastructure Metrics (Priority 2)

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| `nodejs_memory_heap_used_bytes` | Gauge | >3GB |
| `db_pool_active_connections` | Gauge | >80% |
| `websocket_connections_active` | Gauge | >500 |
| `rate_limiter_blocked_total` | Counter | >100/min |

---

## Alerting Strategy (Recommended)

### Tier 1: Page Immediately

| Alert | Condition | Runbook |
|-------|-----------|---------|
| Server Down | No response for 2min | Restart via Render |
| Payment Failures Spike | >10 failures in 5min | Check Stripe status |
| Database Connection Exhausted | Pool at 100% | Restart + investigate |
| Memory Critical | >3.5GB used | Restart + GC analysis |

### Tier 2: Notify Team

| Alert | Condition | Runbook |
|-------|-----------|---------|
| High Error Rate | >1% 5xx responses | Check logs |
| Auth Failures Elevated | >50/hour | Check for attack |
| WebSocket Connection Spike | >50 connects/min | Check for retry storm |
| Slow Requests | P99 > 3s for 10min | Profile endpoints |

### Tier 3: Daily Review

| Alert | Condition | Runbook |
|-------|-----------|---------|
| Rate Limit Triggers | Any in 24h | Review patterns |
| Failed PIN Attempts | >10/day | Check for brute force |
| Demo User Access | Any in prod | Verify intentional |
| Large Order Value | >$500 | Verify legitimate |

---

## Runbook Gaps

### Missing Runbooks (Critical)

| Runbook | Purpose | Priority |
|---------|---------|----------|
| Server Restart | Safe restart procedure | P0 |
| Database Recovery | Connection pool exhaustion | P0 |
| Payment Investigation | Trace payment issues | P0 |
| Account Unlock | PIN lockout resolution | P1 |
| Secret Rotation | JWT/Station secret rotation | P1 |

### Recommended Runbook Template

```markdown
# Runbook: [Issue Title]

## Symptoms
- What operators will observe

## Impact
- Users affected, severity

## Investigation Steps
1. Step with specific commands/queries
2. Expected output
3. Decision tree

## Resolution Steps
1. Safe resolution actions
2. Verification steps

## Post-Incident
- What to document
- Follow-up actions
```

---

## Tracing Recommendations

### Current State

- No distributed tracing
- No request correlation
- Log searching only

### Phase 1: Request Correlation

```typescript
// Add to all requests
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuid();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

// Include in all logs
logger.info('Processing request', {
  correlationId: req.correlationId,
  ...otherData
});
```

### Phase 2: Structured Tracing

Consider implementing:
- OpenTelemetry for distributed tracing
- Render's native tracing integration
- Trace sampling for high-volume endpoints

---

## Dashboard Recommendations

### Operations Dashboard

| Panel | Content |
|-------|---------|
| Request Volume | Requests/sec by endpoint |
| Error Rate | 4xx/5xx by endpoint |
| Response Time | P50/P95/P99 latency |
| Active Restaurants | Count of active tenants |
| Payment Status | Success/failure rate |

### Security Dashboard

| Panel | Content |
|-------|---------|
| Auth Attempts | Success/failure by method |
| Rate Limit Blocks | Count by IP |
| Failed PIN Attempts | By restaurant |
| Token Validation Failures | By type |
| Unusual Access Patterns | Demo users, cross-tenant |

### Business Dashboard

| Panel | Content |
|-------|---------|
| Orders Created | By restaurant, by hour |
| Payment Volume | Total processed |
| Average Order Value | Trend |
| Peak Usage Times | Heatmap |

---

## Implementation Roadmap

### Week 1: Foundation

1. Add correlation ID to all logs
2. Create basic runbooks (restart, payment investigation)
3. Set up Render alerting for server health

### Week 2: Metrics

1. Instrument key endpoints with timing
2. Add error rate tracking
3. Create basic dashboard

### Week 3: Alerting

1. Configure Tier 1 alerts
2. Set up notification channels
3. Test alert triggers

### Week 4: Documentation

1. Complete runbook library
2. Document escalation procedures
3. Conduct incident simulation

---

## Conclusion

The current observability posture is **inadequate for production operations**. While logging exists, the lack of structured metrics, alerting, and runbooks means incidents will be discovered by users and diagnosed slowly.

**Critical Gaps**:
1. Silent failures in rate limiting
2. No alerting infrastructure
3. No runbooks for common issues
4. No distributed tracing

**Observability Grade**: D+ (Logs exist, everything else missing)

The system needs significant investment before handling production traffic at scale. For initial soft launch with limited restaurants, the current state is acceptable if operators commit to manual monitoring.

---

**Report Prepared By**: Hostile Enterprise Auditor
**Review Date**: 2025-12-28
