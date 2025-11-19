# Production Monitoring Guide

**Last Updated:** 2025-11-19
**Version:** 1.0.0

[Home](../../../../index.md) > [Docs](../../../README.md) > [How-To](../../README.md) > [Operations](../../../README.md) > [Monitoring](../../../README.md) > Production Monitoring

---

## Executive Summary

This guide provides comprehensive monitoring, alerting, and observability configuration for Restaurant OS production environments. It covers metrics collection, alert thresholds, dashboard setup, log aggregation, and health check endpoints.

**Quick Links:**
- Health Endpoint: https://july25.onrender.com/api/health
- Status Endpoint: https://july25.onrender.com/api/status
- Readiness Probe: https://july25.onrender.com/api/ready
- Liveness Probe: https://july25.onrender.com/api/live

---

## Table of Contents

1. [Health Check Endpoints](#health-check-endpoints)
2. [Key Metrics to Monitor](#key-metrics-to-monitor)
3. [Alert Configuration](#alert-configuration)
4. [Dashboard Setup](#dashboard-setup)
5. [Log Aggregation Strategy](#log-aggregation-strategy)
6. [Error Tracking](#error-tracking)
7. [Performance Monitoring](#performance-monitoring)
8. [WebSocket Monitoring](#websocket-monitoring)
9. [Third-Party Service Monitoring](#third-party-service-monitoring)
10. [Incident Detection](#incident-detection)

---

## Health Check Endpoints

Restaurant OS provides multiple health check endpoints for different monitoring needs.

### `/api/health` - Basic Health Check

**Purpose:** Quick system health check for load balancers and basic monitoring

**Method:** GET
**URL:** https://july25.onrender.com/api/health

**Response Codes:**
- `200` - System healthy or degraded (but operational)
- `503` - System unhealthy (service unavailable)

**Response Schema:**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-11-19T12:00:00.000Z",
  "uptime": 86400,
  "environment": "production",
  "version": "6.0.14",
  "services": {
    "server": {
      "status": "ok"
    },
    "database": {
      "status": "ok",
      "latency": 45
    },
    "cache": {
      "status": "ok",
      "keys": 150,
      "hits": 1200,
      "misses": 50
    },
    "payments": {
      "status": "ok",
      "provider": "square",
      "environment": "production"
    },
    "monitoring": {
      "status": "ok",
      "provider": "sentry"
    }
  }
}
```

**Health Status Determination:**
- `healthy`: All services operational, database latency < 1000ms
- `degraded`: Database latency > 1000ms OR payments degraded (returns 200)
- `unhealthy`: Database error (returns 503)

**Usage:**
```bash
# Automated monitoring
*/5 * * * * curl -f https://july25.onrender.com/api/health || alert-team

# Load balancer health check
curl -f https://july25.onrender.com/api/health
```

---

### `/api/status` - Detailed Status

**Purpose:** Comprehensive system status including AI services

**Method:** GET
**URL:** https://july25.onrender.com/api/status

**Additional Fields:**
```json
{
  "services": {
    "ai": {
      "status": "healthy" | "degraded" | "unhealthy",
      "provider": "openai" | "stubs",
      "details": {
        "model": "gpt-4o-realtime-preview-2024-10-01",
        "lastCheck": "2025-11-19T12:00:00.000Z"
      }
    }
  }
}
```

**Usage:**
```bash
# Detailed monitoring
curl https://july25.onrender.com/api/status | jq '.'

# Check specific service
curl https://july25.onrender.com/api/status | jq '.services.ai.status'
```

---

### `/api/ready` - Kubernetes Readiness Probe

**Purpose:** Kubernetes-style readiness probe (service ready to accept traffic)

**Method:** GET
**URL:** https://july25.onrender.com/api/ready

**Response:**
```json
// Ready
{
  "ready": true
}

// Not Ready
{
  "ready": false,
  "reason": "Database not ready, AI service not ready"
}
```

**Response Codes:**
- `200` - Service ready to accept traffic
- `503` - Service not ready (still starting or degraded)

**Readiness Criteria:**
- Database status: `ok`
- AI status: NOT `unhealthy` (degraded is acceptable)

**Usage:**
```yaml
# Kubernetes deployment
readinessProbe:
  httpGet:
    path: /api/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

---

### `/api/live` - Kubernetes Liveness Probe

**Purpose:** Kubernetes-style liveness probe (process alive, restart if not)

**Method:** GET
**URL:** https://july25.onrender.com/api/live

**Response:**
```json
{
  "alive": true
}
```

**Response Codes:**
- `200` - Process alive (always returns 200 unless server crashed)

**Usage:**
```yaml
# Kubernetes deployment
livenessProbe:
  httpGet:
    path: /api/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

---

### `/api/healthz` - Simple Health Check

**Purpose:** Lightweight health check (server process alive)

**Method:** GET
**URL:** https://july25.onrender.com/api/healthz

**Response:**
```json
{
  "ok": true,
  "uptime": 86400,
  "version": "6.0.14"
}
```

**Usage:**
```bash
# Minimal health check
curl -f https://july25.onrender.com/api/healthz
```

---

## Key Metrics to Monitor

### System Metrics

| Metric | Target | Warning | Critical | Alert |
|--------|--------|---------|----------|-------|
| CPU Usage | < 70% | 70-85% | > 85% | Yes (Critical) |
| Memory Usage | < 80% | 80-90% | > 90% | Yes (Critical) |
| Disk Usage | < 80% | 80-90% | > 90% | Yes (Warning) |
| Uptime | 99.9% | 99.0-99.9% | < 99.0% | Yes (Critical) |

**Where to Monitor:**
- Render Dashboard > Service > Metrics
- Vercel Dashboard > Analytics > System

**Alert Rules:**
```javascript
// Render custom monitoring (if available)
if (cpu_usage > 85 || memory_usage > 90) {
  alert('P1: High resource usage');
}
```

---

### Application Metrics

| Metric | Target | Warning | Critical | Alert |
|--------|--------|---------|----------|-------|
| API Response Time (p95) | < 200ms | 200-500ms | > 500ms | Yes (Warning) |
| API Response Time (p99) | < 500ms | 500ms-1s | > 1s | Yes (Critical) |
| Error Rate | < 1% | 1-5% | > 5% | Yes (Critical) |
| Request Rate | Baseline | +50% | +200% | Yes (Warning) |

**Where to Monitor:**
- Render Logs: Response times in request logs
- Sentry: Error rates and performance
- Custom metrics endpoint (if implemented)

**Example Log Query:**
```bash
# Render logs - find slow requests
grep "duration_ms" logs.txt | awk '$4 > 500' | wc -l
```

---

### Database Metrics

| Metric | Target | Warning | Critical | Alert |
|--------|--------|---------|----------|-------|
| Query Latency (p95) | < 100ms | 100-200ms | > 200ms | Yes (Warning) |
| Connection Pool Usage | < 70% | 70-85% | > 85% | Yes (Critical) |
| Active Connections | < 20 | 20-40 | > 40 | Yes (Warning) |
| Failed Connections | 0 | 1-5/min | > 5/min | Yes (Critical) |

**Where to Monitor:**
- Supabase Dashboard > Database > Performance
- Health endpoint: `/api/health` - `services.database.latency`

**Query for Monitoring:**
```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';

-- Long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 seconds';
```

**Alert Script:**
```bash
#!/bin/bash
# Check database latency
LATENCY=$(curl -s https://july25.onrender.com/api/health | jq -r '.services.database.latency')

if [ "$LATENCY" -gt 200 ]; then
  echo "ALERT: Database latency ${LATENCY}ms exceeds threshold"
  # Send alert
fi
```

---

### Payment Processing Metrics

| Metric | Target | Warning | Critical | Alert |
|--------|--------|---------|----------|-------|
| Payment Success Rate | > 99% | 95-99% | < 95% | Yes (Critical) |
| Payment Latency | < 2s | 2-5s | > 5s | Yes (Warning) |
| Failed Payments | < 1% | 1-5% | > 5% | Yes (Critical) |

**Where to Monitor:**
- Application logs (Render)
- Square Dashboard > Reporting
- Health endpoint: `/api/health` - `services.payments.status`

**Custom Monitoring:**
```sql
-- Payment success rate (last hour)
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
FROM payment_audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

### Voice Ordering Metrics

| Metric | Target | Warning | Critical | Alert |
|--------|--------|---------|----------|-------|
| AI Service Availability | > 99% | 95-99% | < 95% | Yes (Warning) |
| Transcription Success Rate | > 95% | 90-95% | < 90% | Yes (Warning) |
| Voice Session Duration | < 60s | 60-120s | > 120s | No |

**Where to Monitor:**
- Application logs (Render)
- OpenAI Dashboard > Usage
- Status endpoint: `/api/status` - `services.ai.status`

**Custom Monitoring:**
```javascript
// Client-side metrics (if implemented)
const voiceMetrics = {
  sessionsStarted: 0,
  sessionsCompleted: 0,
  sessionsFailed: 0,
  avgDuration: 0
};

// Calculate success rate
const successRate = (voiceMetrics.sessionsCompleted / voiceMetrics.sessionsStarted) * 100;
```

---

### WebSocket Metrics

| Metric | Target | Warning | Critical | Alert |
|--------|--------|---------|----------|-------|
| Active Connections | Baseline | +50% | +200% | Yes (Warning) |
| Connection Failures | < 1% | 1-5% | > 5% | Yes (Critical) |
| Message Latency | < 500ms | 500ms-1s | > 1s | Yes (Warning) |
| Reconnection Rate | < 5% | 5-10% | > 10% | Yes (Warning) |

**Where to Monitor:**
- Application logs (Render)
- Health endpoint: `/api/health` - `services.websocket.connections`

**Custom Monitoring:**
```javascript
// Server-side WebSocket metrics
const wsMetrics = {
  activeConnections: wss.clients.size,
  totalConnections: 0,
  failedConnections: 0,
  messagesReceived: 0,
  messagesSent: 0
};
```

---

## Alert Configuration

### Critical Alerts (P0/P1)

**Trigger Immediately:**

1. **Complete Service Outage**
```bash
# Health check failure
curl -f https://july25.onrender.com/api/health || send_alert "P0: Service Down"
```

2. **Database Connection Failure**
```bash
# Check database status
DB_STATUS=$(curl -s https://july25.onrender.com/api/health | jq -r '.services.database.status')
if [ "$DB_STATUS" = "error" ]; then
  send_alert "P0: Database Connection Failed"
fi
```

3. **High Error Rate**
```bash
# Error rate > 5% in last 5 minutes
ERROR_RATE=$(calculate_error_rate_from_logs)
if [ "$ERROR_RATE" -gt 5 ]; then
  send_alert "P1: High Error Rate: ${ERROR_RATE}%"
fi
```

4. **Payment Processing Failure**
```bash
# Payment service down
PAYMENT_STATUS=$(curl -s https://july25.onrender.com/api/health | jq -r '.services.payments.status')
if [ "$PAYMENT_STATUS" = "error" ]; then
  send_alert "P1: Payment Processing Failed"
fi
```

5. **Memory/CPU Critical**
```bash
# Resource usage > 90%
if [ "$MEMORY_USAGE" -gt 90 ] || [ "$CPU_USAGE" -gt 90 ]; then
  send_alert "P1: Critical Resource Usage"
fi
```

---

### Warning Alerts (P2)

**Trigger for Investigation:**

1. **Slow Response Times**
```bash
# p95 latency > 500ms
if [ "$P95_LATENCY" -gt 500 ]; then
  send_alert "P2: Slow Response Times"
fi
```

2. **Database Latency**
```bash
# Database latency > 200ms
DB_LATENCY=$(curl -s https://july25.onrender.com/api/health | jq -r '.services.database.latency')
if [ "$DB_LATENCY" -gt 200 ]; then
  send_alert "P2: High Database Latency: ${DB_LATENCY}ms"
fi
```

3. **WebSocket Connection Issues**
```bash
# Reconnection rate > 10%
if [ "$RECONNECTION_RATE" -gt 10 ]; then
  send_alert "P2: High WebSocket Reconnection Rate"
fi
```

---

### Alert Channels

**Recommended Setup:**

1. **Critical Alerts (P0/P1):**
   - PagerDuty / Opsgenie (immediate page)
   - Slack #incidents channel
   - Email to on-call
   - SMS to on-call

2. **Warning Alerts (P2):**
   - Slack #monitoring channel
   - Email to team

3. **Info Alerts (P3/P4):**
   - Slack #monitoring channel
   - Daily digest email

---

### Sample Alert Script

```bash
#!/bin/bash
# monitor.sh - Production monitoring script

API_URL="https://july25.onrender.com/api/health"
SLACK_WEBHOOK="<your-slack-webhook>"

# Function to send Slack alert
send_slack_alert() {
  local severity=$1
  local message=$2

  curl -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"[$severity] $message\"}"
}

# Check health
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL")

if [ "$HEALTH_RESPONSE" != "200" ]; then
  send_slack_alert "P0" "Health check failed (HTTP $HEALTH_RESPONSE)"
  exit 1
fi

# Check individual services
HEALTH_JSON=$(curl -s "$API_URL")

# Database check
DB_STATUS=$(echo "$HEALTH_JSON" | jq -r '.services.database.status')
DB_LATENCY=$(echo "$HEALTH_JSON" | jq -r '.services.database.latency')

if [ "$DB_STATUS" = "error" ]; then
  send_slack_alert "P0" "Database connection failed"
elif [ "$DB_LATENCY" -gt 200 ]; then
  send_slack_alert "P2" "Database latency high: ${DB_LATENCY}ms"
fi

# Payment check
PAYMENT_STATUS=$(echo "$HEALTH_JSON" | jq -r '.services.payments.status')

if [ "$PAYMENT_STATUS" = "error" ]; then
  send_slack_alert "P1" "Payment processing failed"
fi

echo "Monitoring check completed successfully"
```

**Cron Setup:**
```cron
# Run every 5 minutes
*/5 * * * * /path/to/monitor.sh >> /var/log/monitor.log 2>&1
```

---

## Dashboard Setup

### Recommended Dashboard Layout

**1. System Health Overview**
- Overall system status (healthy/degraded/unhealthy)
- Uptime percentage (30d rolling)
- Active incidents
- Service status grid (all services)

**2. Performance Metrics**
- API response time (p50, p95, p99) - Last 24h
- Database query latency - Last 24h
- Error rate % - Last 24h
- Request rate - Last 24h

**3. Resource Utilization**
- CPU usage - Last 24h
- Memory usage - Last 24h
- Disk usage
- Network I/O

**4. Service-Specific**
- Payment success rate
- Voice ordering success rate
- WebSocket active connections
- Cache hit rate

**5. Business Metrics**
- Orders created (last hour/day)
- Revenue processed (last hour/day)
- Active users
- Active restaurants

---

### Grafana Dashboard Example

```json
{
  "dashboard": {
    "title": "Restaurant OS - Production",
    "panels": [
      {
        "title": "System Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"restaurant-os-api\"}",
            "legendFormat": "API Status"
          }
        ]
      },
      {
        "title": "API Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

---

### Simple HTML Dashboard

For teams without Grafana, use a simple HTML dashboard:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Restaurant OS - Monitoring</title>
  <script>
    async function updateDashboard() {
      const response = await fetch('https://july25.onrender.com/api/health');
      const health = await response.json();

      document.getElementById('status').textContent = health.status;
      document.getElementById('status').className = health.status;
      document.getElementById('uptime').textContent = formatUptime(health.uptime);
      document.getElementById('db-latency').textContent = health.services.database.latency + 'ms';
      document.getElementById('payment-status').textContent = health.services.payments.status;

      // Color code
      document.getElementById('status').style.backgroundColor =
        health.status === 'healthy' ? 'green' :
        health.status === 'degraded' ? 'yellow' : 'red';
    }

    function formatUptime(seconds) {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days}d ${hours}h`;
    }

    // Update every 30 seconds
    setInterval(updateDashboard, 30000);
    updateDashboard();
  </script>
</head>
<body>
  <h1>Restaurant OS - Production Status</h1>
  <div class="status-grid">
    <div class="metric">
      <h2>System Status</h2>
      <div id="status" class="value"></div>
    </div>
    <div class="metric">
      <h2>Uptime</h2>
      <div id="uptime" class="value"></div>
    </div>
    <div class="metric">
      <h2>DB Latency</h2>
      <div id="db-latency" class="value"></div>
    </div>
    <div class="metric">
      <h2>Payments</h2>
      <div id="payment-status" class="value"></div>
    </div>
  </div>
</body>
</html>
```

---

## Log Aggregation Strategy

### Log Levels

Use structured logging with appropriate levels:

```javascript
// Server-side logging (Winston)
logger.error('Critical error', { error: err, context: {...} });   // P0/P1 incidents
logger.warn('Degraded performance', { latency: 500 });            // P2 issues
logger.info('Order created', { orderId: '123' });                 // Business events
logger.debug('Cache hit', { key: 'menu-123' });                   // Debug info
```

**Log Level Guidelines:**
- `ERROR`: System errors requiring immediate attention (P0/P1)
- `WARN`: Degraded performance, approaching thresholds (P2)
- `INFO`: Normal business events (orders, payments, auth)
- `DEBUG`: Detailed debugging (disabled in production by default)

---

### Log Sources

**Backend (Render):**
- Location: Render Dashboard > Service > Logs
- Retention: 7 days (Render free tier)
- Format: JSON structured logs

**Frontend (Vercel):**
- Location: Vercel Dashboard > Project > Logs
- Retention: 7 days
- Format: Function logs

**Database (Supabase):**
- Location: Supabase Dashboard > Logs
- Retention: 7 days (free tier)
- Types: Database logs, API logs, Auth logs

---

### Log Aggregation Tools

**Recommended: Sentry (Already Integrated)**

Setup:
```bash
# Render environment variable
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
```

Features:
- Automatic error grouping
- Performance monitoring
- Release tracking
- User context
- Breadcrumb tracking

**Alternative: Logtail (Render Integration)**

Setup via Render Dashboard > Add-ons > Logtail

Features:
- Log aggregation
- Real-time search
- Alerting
- 7-day retention (free tier)

**Alternative: CloudWatch Logs (If using AWS)**

```javascript
// Winston CloudWatch transport
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

logger.add(new CloudWatchTransport({
  logGroupName: 'restaurant-os-production',
  logStreamName: 'api-server',
  awsRegion: 'us-east-1'
}));
```

---

### Log Query Examples

**Render Log Queries:**

```bash
# Find all errors in last hour
grep "level\":\"error" logs.txt | tail -100

# Find slow requests (> 500ms)
grep "duration_ms" logs.txt | awk -F':' '$NF > 500' | tail -50

# Find payment failures
grep "payment.*failed" logs.txt -i | tail -50

# Count errors by type
grep "level\":\"error" logs.txt | jq -r '.message' | sort | uniq -c | sort -rn
```

**Supabase Log Queries:**

```sql
-- Failed authentication attempts
SELECT * FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND payload->>'action' = 'login'
  AND payload->>'status' = 'failed'
ORDER BY created_at DESC;

-- Slow queries
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

### Log Retention Policy

| Log Type | Retention | Storage | Archive |
|----------|-----------|---------|---------|
| Error logs | 30 days | Sentry | S3 (1 year) |
| Access logs | 7 days | Render/Vercel | Not archived |
| Payment logs | 7 years | Database | S3 (compliance) |
| Audit logs | 1 year | Database | S3 (compliance) |
| Debug logs | 1 day | Render | Not archived |

---

## Error Tracking

### Sentry Integration

**Current Implementation:**
- Location: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/config/sentry.ts`
- Status: Integrated but requires DSN configuration

**Setup:**

1. **Get Sentry DSN:**
   - Sign up: https://sentry.io
   - Create project: Node.js
   - Copy DSN

2. **Configure Environment:**
```bash
# Render environment variables
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

3. **Verify Integration:**
```bash
# Check health endpoint
curl https://july25.onrender.com/api/health | jq '.services.monitoring'

# Expected: {"status":"ok","provider":"sentry"}
```

**Features Enabled:**
- Automatic error capture
- Performance monitoring (10% sampling)
- CPU profiling
- Request/response sanitization (no sensitive data)
- Error grouping and deduplication

**Ignored Errors:**
```javascript
// Already configured in sentry.ts
ignoreErrors: [
  'NetworkError',
  'Network request failed',
  'EBADCSRFTOKEN',
  'invalid csrf token',
  'ECONNRESET',
  'EPIPE',
  'Too Many Requests'
]
```

---

### Error Alert Rules

**Sentry Alert Configuration:**

1. **High Error Rate Alert**
   - Condition: Error count > 50 in 5 minutes
   - Action: Slack #incidents + PagerDuty
   - Severity: P1

2. **New Error Alert**
   - Condition: First occurrence of error
   - Action: Slack #monitoring
   - Severity: P2

3. **Error Spike Alert**
   - Condition: 300% increase from baseline
   - Action: Slack #monitoring + Email
   - Severity: P2

4. **Critical Error Alert**
   - Condition: Error matching "database|payment|auth"
   - Action: Slack #incidents + PagerDuty
   - Severity: P1

---

## Performance Monitoring

### Server-Side Performance

**Metrics to Track:**

1. **Request Duration**
```javascript
// Already implemented in server middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration
    });
  });
  next();
});
```

2. **Database Query Performance**
```javascript
// Prisma middleware for query logging
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;

  if (duration > 100) {
    logger.warn('Slow query detected', {
      model: params.model,
      action: params.action,
      duration_ms: duration
    });
  }

  return result;
});
```

3. **External API Latency**
```javascript
// Track Square API latency
const start = Date.now();
const payment = await squareClient.payments.create(...);
const latency = Date.now() - start;

logger.info('Square API call', {
  endpoint: 'payments.create',
  latency_ms: latency,
  status: 'success'
});
```

---

### Client-Side Performance

**Implementation Location:** `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/performance/performanceMonitor.ts`

**Metrics Tracked:**
- Page load time
- Time to first byte (TTFB)
- First contentful paint (FCP)
- Largest contentful paint (LCP)
- Cumulative layout shift (CLS)
- First input delay (FID)

**Usage:**
```typescript
import { performanceMonitor } from '@/services/performance';

// Automatically tracks web vitals
performanceMonitor.trackWebVitals();

// Manual timing
const timer = performanceMonitor.startTimer('checkout-flow');
// ... checkout logic ...
timer.end(); // Logs timing
```

**Performance Targets (Web Vitals):**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

---

## WebSocket Monitoring

### Connection Metrics

**Server-Side Tracking:**
```javascript
// Track WebSocket connections
const wsMetrics = {
  activeConnections: 0,
  totalConnections: 0,
  failedAuth: 0,
  messagesSent: 0,
  messagesReceived: 0
};

wss.on('connection', (ws, req) => {
  wsMetrics.activeConnections++;
  wsMetrics.totalConnections++;

  ws.on('close', () => {
    wsMetrics.activeConnections--;
  });
});

// Expose metrics
app.get('/api/metrics/websocket', (req, res) => {
  res.json(wsMetrics);
});
```

**Monitoring Queries:**
```bash
# Active WebSocket connections
curl https://july25.onrender.com/api/metrics/websocket | jq '.activeConnections'

# Alert if too high
if [ "$ACTIVE_WS" -gt 1000 ]; then
  send_alert "P2: High WebSocket connection count: $ACTIVE_WS"
fi
```

---

### Message Latency Tracking

```javascript
// Client-side latency measurement
const sentTimestamp = Date.now();
ws.send(JSON.stringify({
  type: 'ping',
  timestamp: sentTimestamp
}));

ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'pong') {
    const latency = Date.now() - message.timestamp;
    console.log('WebSocket latency:', latency, 'ms');

    if (latency > 1000) {
      console.warn('High WebSocket latency detected');
    }
  }
});
```

---

## Third-Party Service Monitoring

### External Dependencies

| Service | Status Page | SLA | Monitor |
|---------|-------------|-----|---------|
| Supabase | https://status.supabase.com | 99.9% | Yes |
| Square | https://status.squareup.com | 99.9% | Yes |
| OpenAI | https://status.openai.com | - | Yes |
| Render | https://status.render.com | 99.95% | Yes |
| Vercel | https://vercel-status.com | 99.99% | Yes |

### Service Health Checks

**Automated Checks:**
```bash
#!/bin/bash
# check-external-services.sh

# Check Supabase
SUPABASE_STATUS=$(curl -s https://status.supabase.com/api/v2/status.json | jq -r '.status.indicator')
if [ "$SUPABASE_STATUS" != "none" ]; then
  send_alert "P1: Supabase incident detected: $SUPABASE_STATUS"
fi

# Check Square
SQUARE_STATUS=$(curl -s https://www.issquareup.com/api/status | jq -r '.status')
if [ "$SQUARE_STATUS" != "operational" ]; then
  send_alert "P1: Square incident detected"
fi

# Check OpenAI via our health endpoint
AI_STATUS=$(curl -s https://july25.onrender.com/api/status | jq -r '.services.ai.status')
if [ "$AI_STATUS" = "unhealthy" ]; then
  send_alert "P2: OpenAI service unhealthy"
fi
```

---

### Degraded Mode Triggers

**Automatic Fallback:**
```javascript
// Check if external service is down
async function checkSquareHealth() {
  try {
    await squareClient.locations.list();
    return true;
  } catch (error) {
    logger.error('Square API unreachable', { error });
    return false;
  }
}

// Enable demo mode if Square is down
if (!await checkSquareHealth()) {
  logger.warn('Enabling payment demo mode due to Square outage');
  process.env.SQUARE_ACCESS_TOKEN = 'demo';
}
```

---

## Incident Detection

### Automated Incident Detection

**Health Check Monitor:**
```bash
#!/bin/bash
# incident-detection.sh

API_URL="https://july25.onrender.com/api/health"
INCIDENT_FILE="incidents/$(date +%Y-%m-%d-%H-%M)-auto-detected.md"

# Check health
HEALTH=$(curl -s "$API_URL")
STATUS=$(echo "$HEALTH" | jq -r '.status')

if [ "$STATUS" = "unhealthy" ]; then
  # Create incident file
  cat > "$INCIDENT_FILE" <<EOF
# Incident: System Unhealthy (Auto-Detected)

**Incident ID:** INC-$(date +%Y%m%d-%H%M)
**Severity:** P0
**Started:** $(date -u +"%Y-%m-%d %H:%M UTC")
**Status:** Investigating
**Detection:** Automated health check

## Impact
- System Status: UNHEALTHY
- Health Check: FAILED

## Services Status
$(echo "$HEALTH" | jq '.services')

## Timeline
- $(date -u +"%H:%M UTC") - Incident auto-detected by monitoring
- $(date -u +"%H:%M UTC") - Incident file created
- $(date -u +"%H:%M UTC") - On-call team alerted

## Next Steps
1. Acknowledge incident
2. Check Render/Vercel dashboards
3. Review logs for root cause
4. Execute appropriate runbook
EOF

  # Send alert
  send_alert "P0: System unhealthy - Incident file created: $INCIDENT_FILE"
fi
```

---

### Log-Based Detection

**Error Pattern Matching:**
```bash
#!/bin/bash
# error-pattern-detection.sh

# Download recent logs
LOGS=$(render logs --service restaurant-os-api --tail 1000)

# Count errors in last 5 minutes
ERROR_COUNT=$(echo "$LOGS" | grep -c '"level":"error"')

# Calculate error rate (errors per minute)
ERROR_RATE=$((ERROR_COUNT / 5))

if [ "$ERROR_RATE" -gt 10 ]; then
  send_alert "P1: High error rate detected: $ERROR_RATE errors/min"
fi

# Check for specific error patterns
if echo "$LOGS" | grep -q "ECONNREFUSED.*database"; then
  send_alert "P0: Database connection failures detected"
fi

if echo "$LOGS" | grep -q "SQUARE_LOCATION_ID mismatch"; then
  send_alert "P1: Payment configuration error detected"
fi
```

---

### Anomaly Detection

**Baseline Comparison:**
```javascript
// Track request rate baseline
const requestRateBaseline = {
  '00-01': 10,  // requests per minute
  '01-02': 5,
  // ... hourly baselines
  '12-13': 100,
  '13-14': 120
};

// Check for anomalies
function checkRequestRateAnomaly(currentRate) {
  const hour = new Date().getHours();
  const key = `${hour.toString().padStart(2, '0')}-${(hour + 1).toString().padStart(2, '0')}`;
  const baseline = requestRateBaseline[key] || 50;

  if (currentRate > baseline * 3) {
    sendAlert('P2: Request rate spike detected (3x baseline)');
  }

  if (currentRate < baseline * 0.1 && baseline > 10) {
    sendAlert('P2: Request rate drop detected (90% below baseline)');
  }
}
```

---

## Monitoring Checklist

### Daily Monitoring Tasks
- [ ] Check health endpoint status
- [ ] Review error logs for new issues
- [ ] Check performance metrics (response times)
- [ ] Verify payment processing working
- [ ] Check database latency
- [ ] Review WebSocket connection stability

### Weekly Monitoring Tasks
- [ ] Review Sentry error trends
- [ ] Check resource utilization trends
- [ ] Review slow query logs
- [ ] Update baseline metrics
- [ ] Test alerting system
- [ ] Review incident response times

### Monthly Monitoring Tasks
- [ ] Review and update alert thresholds
- [ ] Analyze performance trends
- [ ] Review SLA compliance
- [ ] Update monitoring documentation
- [ ] Test disaster recovery procedures
- [ ] Review third-party service SLAs

---

## Appendix: Monitoring Tools Comparison

| Tool | Purpose | Cost | Integration Effort | Recommended |
|------|---------|------|-------------------|-------------|
| Sentry | Error tracking | Free tier: 5K errors/mo | Low (already integrated) | Yes |
| Logtail | Log aggregation | Free tier: 1GB/mo | Low (Render add-on) | Yes |
| Grafana Cloud | Dashboards | Free tier: 10K series | Medium | Optional |
| New Relic | APM | Free tier: 100GB/mo | High | No |
| Datadog | Full observability | $15/host/mo | High | No |
| UptimeRobot | Health checks | Free tier: 50 monitors | Low | Yes |

**Recommended Minimal Stack:**
1. Sentry (error tracking) - Free tier
2. UptimeRobot (health checks) - Free tier
3. Render built-in metrics
4. Custom monitoring scripts

**Recommended Full Stack:**
1. Sentry (error tracking + performance)
2. Logtail (log aggregation)
3. Grafana Cloud (dashboards)
4. PagerDuty (alerting)
5. Custom monitoring scripts

---

**Document Version:** 1.0.0
**Last Reviewed:** 2025-11-19
**Next Review:** 2025-12-19 (Monthly)
**Owner:** System Owner
