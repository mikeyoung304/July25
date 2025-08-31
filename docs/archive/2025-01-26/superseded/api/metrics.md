# Metrics & Monitoring API

## Overview

The system provides Prometheus-compatible metrics for monitoring application performance, health, and usage patterns. Metrics are secured behind authentication and only accessible to admin users.

## Metrics Endpoint

### Get Prometheus Metrics
```http
GET /internal/metrics
```

**Authentication**: Required (Admin role only)  
**Format**: Prometheus text format  
**Rate Limit**: 30 requests per minute

### Response Format
```
# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.005",method="GET",route="/api/v1/menu",status="200"} 45
http_request_duration_seconds_bucket{le="0.01",method="GET",route="/api/v1/menu",status="200"} 47
http_request_duration_seconds_bucket{le="0.025",method="GET",route="/api/v1/menu",status="200"} 48
http_request_duration_seconds_sum{method="GET",route="/api/v1/menu",status="200"} 1.23
http_request_duration_seconds_count{method="GET",route="/api/v1/menu",status="200"} 48

# HELP ai_requests_total Total number of AI service requests
# TYPE ai_requests_total counter
ai_requests_total{service="transcribe",status="success"} 234
ai_requests_total{service="transcribe",status="error"} 5
ai_requests_total{service="chat",status="success"} 567
ai_requests_total{service="chat",status="error"} 12
```

## Available Metrics

### HTTP Metrics
- `http_request_duration_seconds` - Request latency histogram
  - Labels: `method`, `route`, `status`
  - Buckets: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10

### AI Service Metrics
- `ai_requests_total` - Total AI service requests
  - Labels: `service` (transcribe, chat, tts, parse), `status` (success, error)
- `ai_request_duration_seconds` - AI request processing time
  - Labels: `service`, `status`
- `ai_cost_estimate_dollars` - Estimated OpenAI API costs
  - Labels: `service`

### WebSocket Metrics
- `websocket_connections_active` - Current active WebSocket connections
- `websocket_messages_total` - Total WebSocket messages
  - Labels: `direction` (sent, received), `type`
- `websocket_errors_total` - WebSocket errors
  - Labels: `error_type`

### Order Metrics
- `orders_created_total` - Total orders created
  - Labels: `type` (dine_in, takeout, delivery, drive_thru)
- `orders_status_changes_total` - Order status transitions
  - Labels: `from_status`, `to_status`
- `order_processing_time_seconds` - Time from creation to completion
  - Labels: `type`

### Rate Limiting Metrics
- `rate_limit_hits_total` - Rate limit violations
  - Labels: `limiter` (api, ai, transcription, auth)
- `rate_limit_blocked_ips` - Currently blocked IP addresses

### Database Metrics
- `database_query_duration_seconds` - Database query latency
  - Labels: `operation` (select, insert, update, delete)
- `database_connections_active` - Active database connections
- `database_errors_total` - Database errors
  - Labels: `error_type`

## Grafana Dashboard Configuration

### Example Queries

**Request Rate**:
```promql
rate(http_request_duration_seconds_count[5m])
```

**P95 Latency**:
```promql
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket[5m])
)
```

**AI Service Success Rate**:
```promql
sum(rate(ai_requests_total{status="success"}[5m])) /
sum(rate(ai_requests_total[5m])) * 100
```

**Active WebSocket Connections**:
```promql
websocket_connections_active
```

**Order Processing Time P50**:
```promql
histogram_quantile(0.5,
  rate(order_processing_time_seconds_bucket[1h])
)
```

## Alert Rules

### Critical Alerts

```yaml
- alert: HighErrorRate
  expr: |
    sum(rate(http_request_duration_seconds_count{status=~"5.."}[5m])) /
    sum(rate(http_request_duration_seconds_count[5m])) > 0.05
  for: 5m
  annotations:
    summary: "High error rate detected (>5%)"

- alert: AIServiceDown
  expr: |
    sum(rate(ai_requests_total{status="error"}[5m])) /
    sum(rate(ai_requests_total[5m])) > 0.5
  for: 2m
  annotations:
    summary: "AI service error rate >50%"

- alert: RateLimitAbuse
  expr: rate(rate_limit_hits_total[5m]) > 10
  for: 5m
  annotations:
    summary: "Excessive rate limit violations"
```

### Warning Alerts

```yaml
- alert: SlowRequests
  expr: |
    histogram_quantile(0.95,
      rate(http_request_duration_seconds_bucket[5m])
    ) > 2
  for: 10m
  annotations:
    summary: "P95 latency exceeds 2 seconds"

- alert: LowOrderVolume
  expr: rate(orders_created_total[1h]) < 0.1
  for: 30m
  annotations:
    summary: "Unusually low order volume"
```

## Security Considerations

### Access Control
- Metrics endpoint requires JWT authentication
- Only users with `admin` role can access metrics
- Rate limited to prevent abuse

### Sensitive Data
- No PII or sensitive business data in metrics
- Only aggregated statistics and counters
- Restaurant IDs are hashed in labels

### Best Practices
1. **Never expose metrics publicly** - Always require authentication
2. **Use HTTPS in production** - Metrics can reveal system internals
3. **Rotate admin credentials regularly** - Metrics access = system insights
4. **Monitor metrics access** - Log who accesses metrics endpoint

## Integration Examples

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'restaurant-api'
    scrape_interval: 30s
    metrics_path: '/internal/metrics'
    bearer_token: 'your-admin-jwt-token'
    static_configs:
      - targets: ['july25.onrender.com']
```

### Datadog Integration

```javascript
// datadog-agent.js
const DDMetrics = require('datadog-metrics');

async function syncMetrics() {
  const response = await fetch('https://july25.onrender.com/internal/metrics', {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  });
  
  const metrics = await response.text();
  // Parse and forward to Datadog
  DDMetrics.gauge('restaurant.orders.active', parseMetric(metrics, 'orders_active'));
}
```

### CloudWatch Integration

```python
# cloudwatch_sync.py
import boto3
import requests
from prometheus_client.parser import text_string_to_metric_families

cloudwatch = boto3.client('cloudwatch')

def sync_metrics():
    response = requests.get(
        'https://july25.onrender.com/internal/metrics',
        headers={'Authorization': f'Bearer {ADMIN_TOKEN}'}
    )
    
    for family in text_string_to_metric_families(response.text):
        for sample in family.samples:
            cloudwatch.put_metric_data(
                Namespace='Restaurant/API',
                MetricData=[{
                    'MetricName': sample.name,
                    'Value': sample.value,
                    'Dimensions': [
                        {'Name': k, 'Value': v}
                        for k, v in sample.labels.items()
                    ]
                }]
            )
```

## Troubleshooting

### Common Issues

**403 Forbidden**:
- Ensure you're using an admin JWT token
- Token may be expired - refresh it

**429 Too Many Requests**:
- Reduce scrape interval (max 30 req/min)
- Use single scraper instance

**Empty Metrics**:
- Server may be starting up - wait 30s
- Check server health endpoint first

### Debug Commands

```bash
# Test metrics access
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://july25.onrender.com/internal/metrics

# Check specific metric
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://july25.onrender.com/internal/metrics | \
  grep "http_request_duration"

# Monitor live metrics
watch -n 30 'curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://july25.onrender.com/internal/metrics | \
  grep -E "(ai_requests|orders_created)"'
```

## Related Documentation

- [API Endpoints](./endpoints.md) - Complete API reference
- [Security](../SECURITY_AUDIT_SUMMARY.md) - Security configuration
- [Rate Limiting](./endpoints.md#📈-rate-limits) - Rate limit details
- [Authentication](./endpoints.md#🔐-authentication) - How to get admin token