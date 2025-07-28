# 📊 Monitoring & Observability

## Overview

Rebuild 6.0 includes built-in monitoring and observability features to help track system health, performance, and usage patterns.

## Health Endpoints

### `/healthz` - Simple Health Check
Returns basic service health status.

```bash
curl http://localhost:3001/healthz
```

Response:
```json
{
  "ok": true,
  "uptime": 123.456,
  "version": "1.0.0"
}
```

### `/health` - Basic Health Status
Returns more detailed health information.

```bash
curl http://localhost:3001/health
```

### `/health/status` - Comprehensive Status
Returns detailed status including database connectivity and cache statistics.

```bash
curl http://localhost:3001/health/status
```

### `/health/ready` - Readiness Probe
Kubernetes readiness probe endpoint. Returns 200 if service is ready to accept traffic.

### `/health/live` - Liveness Probe
Kubernetes liveness probe endpoint. Returns 200 if service is alive.

## Prometheus Metrics

### Endpoint
Metrics are exposed at `/metrics` in Prometheus format.

```bash
curl http://localhost:3001/metrics
```

### Available Metrics

#### HTTP Metrics (automatic)
- `http_request_duration_seconds` - HTTP request latency
- `http_requests_total` - Total HTTP requests
- `up` - Service up/down status

#### Voice Service Metrics
- `voice_chunks_total` - Total voice audio chunks received
- `voice_overrun_total` - Voice buffer overruns
- `voice_active_connections` - Active voice WebSocket connections

#### System Metrics (default)
- `rebuild_process_cpu_*` - CPU usage metrics
- `rebuild_nodejs_gc_*` - Garbage collection metrics
- `rebuild_nodejs_heap_*` - Memory heap metrics

## Grafana Setup

### Basic Alert Configuration
A basic alert configuration is provided in `ops/grafana/basic-alert.json`.

To import:
1. Open Grafana UI
2. Navigate to Alerting → Alert rules
3. Click Import
4. Upload `ops/grafana/basic-alert.json`

The alert monitors:
- Service downtime (> 5 minutes)
- Critical severity notifications

### Recommended Dashboards

1. **Service Health Dashboard**
   - Service uptime
   - Request rate
   - Error rate
   - Response time percentiles

2. **Voice Service Dashboard**
   - Active voice connections
   - Audio chunks processed
   - Buffer overrun rate

## Code Analysis

### Running Analysis
Generate a code quality report:

```bash
npm run analyze
```

This creates:
- `code-analysis.json` - Machine-readable statistics
- `code-analysis.md` - Human-readable report

### CI Integration
Code analysis runs automatically on:
- Every push to main/develop
- All pull requests

Results are:
- Uploaded as artifacts
- Posted as PR comments (for PRs)

### Metrics Tracked
- Total files and lines of code
- Language breakdown
- ESLint errors and warnings
- Dependency statistics

## Monitoring Best Practices

### 1. Health Checks
- Use `/healthz` for load balancer health checks
- Use `/health/ready` for Kubernetes readiness
- Use `/health/live` for Kubernetes liveness

### 2. Metrics Collection
- Scrape `/metrics` every 15-30 seconds
- Set up alerts for:
  - Service downtime
  - High error rates (> 1%)
  - Slow response times (p95 > 1s)
  - Voice buffer overruns

### 3. Dashboard Setup
- Create separate dashboards for different concerns
- Use variables for filtering by environment
- Set up alert annotations on graphs

### 4. Alert Thresholds
- **Critical**: Service down > 5 minutes
- **Warning**: Error rate > 0.5%
- **Info**: Response time p95 > 500ms

## Troubleshooting

### Service Won't Start
Check health endpoint manually:
```bash
curl -v http://localhost:3001/healthz
```

### Metrics Not Updating
1. Verify Prometheus is scraping the endpoint
2. Check for errors in Prometheus targets page
3. Ensure service is running on expected port

### Voice Metrics Missing
Voice metrics only appear after:
1. WebSocket connections are established
2. Voice data is processed

## Future Enhancements

- [ ] Distributed tracing with OpenTelemetry
- [ ] Custom business metrics (orders/hour, etc.)
- [ ] Log aggregation integration
- [ ] Performance profiling endpoints