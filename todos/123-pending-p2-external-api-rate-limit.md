---
status: pending
priority: p2
issue_id: "123"
tags: [performance, cost, rate-limiting, external-api, monitoring]
dependencies: []
created_date: 2025-12-02
source: code-review-pr-151
---

# Missing Rate Limiting on External API Calls

## Problem

The `forwardMetricsToMonitoring` function makes external API calls to monitoring services (DataDog, Sentry, New Relic) without any rate limiting or batching. Each client metric submission triggers immediate external requests:

```typescript
// server/src/routes/metrics.ts:34-110
async function forwardMetricsToMonitoring(metrics: any) {
  if (!config.monitoring.enabled) return;

  // EVERY client metric triggers 3 external API calls (if all enabled)
  if (config.monitoring.datadog?.enabled) {
    await fetch('https://api.datadoghq.com/api/v2/series', {
      method: 'POST',
      headers: { 'DD-API-KEY': config.monitoring.datadog.apiKey },
      body: JSON.stringify({ /* metric data */ })
    });
  }

  if (config.monitoring.sentry?.enabled) {
    await fetch('https://sentry.io/api/0/projects/...', { /* ... */ });
  }

  if (config.monitoring.newRelic?.enabled) {
    await fetch('https://insights-collector.newrelic.com/...', { /* ... */ });
  }
}

// Called on EVERY client metric
router.post('/metrics', async (req, res) => {
  const metrics = req.body;
  await forwardMetricsToMonitoring(metrics);  // ❌ No rate limiting
  res.json({ success: true });
});
```

## Risk Assessment

- **Severity:** IMPORTANT
- **Impact:**
  - **Cost Amplification:** 1 client metric → 3 external API calls
  - **Service Degradation:** High-frequency metrics (FCP, LCP) trigger constant requests
  - **IP Blocking Risk:** Monitoring services may rate limit or block our IP
  - **Increased Latency:** Client requests wait for external API calls
  - **Error Cascades:** External service outages block client metrics
- **Likelihood:** High (clients send metrics every page load)

## Real-World Scenario

With 100 concurrent users and FCP/LCP metrics:
- 100 users × 2 metrics/pageload × 3 providers = **600 external API calls**
- DataDog pricing: $0.001 per custom metric
- Cost: 100 users × 10 sessions/day × 2 metrics × $0.001 = **$2/day = $730/year**
- Without batching: 200,000 API calls/day per 100 users

## Required Fix

### Option 1: Rate Limiting (Minimum)

Add rate limiting to prevent excessive external calls:

```typescript
// server/src/routes/metrics.ts
import rateLimit from 'express-rate-limit';

const metricsForwardingLimiter = rateLimit({
  windowMs: 5000,  // 5 second window
  max: 1,  // Max 1 forwarding per 5 seconds
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    // Still log metrics locally, just skip external forwarding
    logger.info('Rate limited metrics forwarding', { metrics: req.body });
    res.json({ success: true, rateLimited: true });
  }
});

router.post('/metrics', metricsForwardingLimiter, async (req, res) => {
  const metrics = req.body;
  logger.info('Client performance metrics', { metrics });

  // Only forward if not rate limited
  await forwardMetricsToMonitoring(metrics);

  res.json({ success: true });
});
```

### Option 2: Batching Queue (Recommended)

Implement a batching queue that flushes periodically:

```typescript
// server/src/services/monitoring/MetricsBatcher.ts
export class MetricsBatcher {
  private queue: MetricEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly maxBatchSize = 100;
  private readonly flushIntervalMs = 30000;  // 30 seconds

  constructor() {
    this.startFlushTimer();
  }

  add(metric: MetricEvent): void {
    this.queue.push(metric);

    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);

    try {
      await this.sendBatch(batch);
    } catch (error) {
      logger.error('Failed to send metrics batch', { error, count: batch.length });
      // Could implement retry logic here
    }
  }

  private async sendBatch(batch: MetricEvent[]): Promise<void> {
    const aggregated = this.aggregateMetrics(batch);

    // Single API call per provider with batched data
    if (config.monitoring.datadog?.enabled) {
      await fetch('https://api.datadoghq.com/api/v2/series', {
        method: 'POST',
        headers: { 'DD-API-KEY': config.monitoring.datadog.apiKey },
        body: JSON.stringify({ series: aggregated })
      });
    }
  }

  private aggregateMetrics(batch: MetricEvent[]): AggregatedMetric[] {
    // Combine metrics by name and tags
    const grouped = new Map<string, MetricEvent[]>();

    for (const metric of batch) {
      const key = `${metric.name}:${JSON.stringify(metric.tags)}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    }

    return Array.from(grouped.values()).map(group => ({
      name: group[0].name,
      type: group[0].type,
      tags: group[0].tags,
      points: group.map(m => ({ timestamp: m.timestamp, value: m.value }))
    }));
  }

  shutdown(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();  // Final flush
  }
}

// Usage
const metricsBatcher = new MetricsBatcher();

router.post('/metrics', async (req, res) => {
  const metrics = req.body;

  // Log locally immediately
  logger.info('Client performance metrics', { metrics });

  // Add to batch queue (non-blocking)
  metricsBatcher.add(metrics);

  // Respond immediately to client
  res.json({ success: true });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  metricsBatcher.shutdown();
});
```

## Benefits of Batching

1. **Cost Reduction:** 600 calls → 2 calls (99.7% reduction)
2. **Better Performance:** Non-blocking client responses
3. **Resilience:** Queue buffers during outages
4. **Aggregation:** Combine similar metrics
5. **Provider Friendly:** Respects API rate limits

## Files to Create

- `server/src/services/monitoring/MetricsBatcher.ts` - Batching queue implementation

## Files to Modify

- `server/src/routes/metrics.ts` - Add rate limiting or use batcher
- `server/src/server.ts` - Register batcher shutdown handler

## Verification

- Test batching queue fills and flushes correctly
- Test rate limiting prevents excessive external calls
- Verify metrics still appear in DataDog/Sentry dashboards
- Test graceful shutdown flushes remaining metrics
- Load test with 100 concurrent clients
- Monitor external API call frequency (should be ~1 per 30s)

## References

- **DataDog Docs:** [Metrics API Batching](https://docs.datadoghq.com/api/latest/metrics/#submit-metrics)
- **Sentry Docs:** [Rate Limiting](https://docs.sentry.io/product/accounts/quotas/)
- **Pattern:** Batching Pattern (Enterprise Integration Patterns)
- Related: TODO-121 (monitoring abstraction - could include batching)
