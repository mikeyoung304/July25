---
status: pending
priority: p2
issue_id: "121"
tags: [architecture, duplication, monitoring, maintainability]
dependencies: []
created_date: 2025-12-02
source: code-review-pr-151
---

# Missing Monitoring Abstraction Layer

## Problem

Over 80 lines of duplicated HTTP client code across multiple files with no abstraction for monitoring providers. Each file implements its own HTTP forwarding logic to DataDog, Sentry, and New Relic:

```typescript
// server/src/middleware/security.ts:132-216
async function forwardSecurityEventToMonitoring(event: SecurityEvent) {
  if (!config.monitoring.enabled) return;

  const payload = {
    title: `Security Event: ${event.event_type}`,
    // ... 30+ lines of DataDog-specific code
  };

  // Duplicate implementations for each provider
  if (config.monitoring.datadog?.enabled) { /* ... */ }
  if (config.monitoring.sentry?.enabled) { /* ... */ }
  if (config.monitoring.newRelic?.enabled) { /* ... */ }
}

// server/src/routes/metrics.ts:34-110
async function forwardMetricsToMonitoring(metrics: any) {
  // Nearly identical structure with different payload shapes
  if (config.monitoring.datadog?.enabled) { /* ... */ }
  if (config.monitoring.sentry?.enabled) { /* ... */ }
  if (config.monitoring.newRelic?.enabled) { /* ... */ }
}
```

## Risk Assessment

- **Severity:** IMPORTANT
- **Impact:**
  - Hard to add new monitoring providers (e.g., Prometheus)
  - Inconsistent implementations across files
  - High maintenance burden (changes must be replicated)
  - Increased risk of bugs in HTTP handling
  - Duplicate error handling logic
- **Likelihood:** High (any monitoring changes affect multiple files)

## Current Duplication

**Files with duplicate monitoring code:**
- `server/src/middleware/security.ts` (84 lines)
- `server/src/routes/metrics.ts` (76 lines)

**Common duplicated patterns:**
- HTTP client initialization
- Error handling and timeouts
- Provider-specific payload formatting
- API key validation
- Retry logic

## Required Fix

Create a monitoring abstraction layer with provider adapters:

```typescript
// server/src/services/monitoring/MonitoringProvider.ts
export interface MonitoringProvider {
  sendEvent(event: MonitoringEvent): Promise<void>;
  sendMetric(metric: MonitoringMetric): Promise<void>;
  isEnabled(): boolean;
}

export interface MonitoringEvent {
  title: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  tags: Record<string, string>;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface MonitoringMetric {
  name: string;
  value: number;
  type: 'gauge' | 'counter' | 'histogram';
  tags: Record<string, string>;
  timestamp: string;
}

// server/src/services/monitoring/adapters/DataDogAdapter.ts
export class DataDogAdapter implements MonitoringProvider {
  private readonly client: HttpClient;
  private readonly apiKey: string;

  constructor(config: DataDogConfig) {
    this.apiKey = config.apiKey;
    this.client = new HttpClient({
      baseURL: 'https://api.datadoghq.com',
      timeout: 5000,
      headers: { 'DD-API-KEY': this.apiKey }
    });
  }

  async sendEvent(event: MonitoringEvent): Promise<void> {
    await this.client.post('/api/v1/events', {
      title: event.title,
      text: JSON.stringify(event.details),
      alert_type: this.mapSeverity(event.severity),
      tags: this.formatTags(event.tags)
    });
  }

  async sendMetric(metric: MonitoringMetric): Promise<void> {
    await this.client.post('/api/v2/series', {
      series: [{
        metric: metric.name,
        type: this.mapMetricType(metric.type),
        points: [{ timestamp: metric.timestamp, value: metric.value }],
        tags: this.formatTags(metric.tags)
      }]
    });
  }

  isEnabled(): boolean {
    return !!this.apiKey;
  }

  private mapSeverity(severity: string): string { /* ... */ }
  private mapMetricType(type: string): number { /* ... */ }
  private formatTags(tags: Record<string, string>): string[] { /* ... */ }
}

// Similar adapters for Sentry and NewRelic
// server/src/services/monitoring/adapters/SentryAdapter.ts
// server/src/services/monitoring/adapters/NewRelicAdapter.ts

// server/src/services/monitoring/MonitoringService.ts
export class MonitoringService {
  private providers: MonitoringProvider[] = [];

  constructor(config: MonitoringConfig) {
    if (config.datadog?.enabled) {
      this.providers.push(new DataDogAdapter(config.datadog));
    }
    if (config.sentry?.enabled) {
      this.providers.push(new SentryAdapter(config.sentry));
    }
    if (config.newRelic?.enabled) {
      this.providers.push(new NewRelicAdapter(config.newRelic));
    }
  }

  async sendEvent(event: MonitoringEvent): Promise<void> {
    await Promise.allSettled(
      this.providers.map(provider => provider.sendEvent(event))
    );
  }

  async sendMetric(metric: MonitoringMetric): Promise<void> {
    await Promise.allSettled(
      this.providers.map(provider => provider.sendMetric(metric))
    );
  }
}

// Usage in security middleware
const monitoring = new MonitoringService(config.monitoring);

async function forwardSecurityEventToMonitoring(event: SecurityEvent) {
  await monitoring.sendEvent({
    title: `Security Event: ${event.event_type}`,
    severity: 'warning',
    tags: {
      event_type: event.event_type,
      restaurant_id: event.restaurant_id
    },
    details: event.details,
    timestamp: event.timestamp
  });
}
```

## Benefits

1. **Single Responsibility:** Each adapter handles one provider
2. **Easy to Extend:** Add Prometheus by creating `PrometheusAdapter`
3. **Consistent Behavior:** All providers use same interface
4. **Testable:** Mock `MonitoringProvider` interface
5. **DRY:** HTTP logic centralized in adapters
6. **Type Safe:** Interfaces ensure correct usage

## Files to Create

- `server/src/services/monitoring/MonitoringProvider.ts` - Interface definitions
- `server/src/services/monitoring/MonitoringService.ts` - Main service
- `server/src/services/monitoring/adapters/DataDogAdapter.ts` - DataDog implementation
- `server/src/services/monitoring/adapters/SentryAdapter.ts` - Sentry implementation
- `server/src/services/monitoring/adapters/NewRelicAdapter.ts` - New Relic implementation

## Files to Modify

- `server/src/middleware/security.ts` - Replace 84 lines with service call
- `server/src/routes/metrics.ts` - Replace 76 lines with service call

## Verification

- Test each adapter independently with mocked HTTP clients
- Test MonitoringService with multiple providers
- Verify security events still forward correctly
- Verify metrics still forward correctly
- Test error handling when providers fail
- Verify no regression in existing functionality

## References

- **Pattern:** Adapter Pattern (GoF Design Patterns)
- **Principle:** DRY (Don't Repeat Yourself)
- **Principle:** Single Responsibility Principle
- Related: TODO-099 (metrics code duplication)
