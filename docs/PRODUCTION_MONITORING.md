# Production Monitoring Setup

## Overview

This guide covers integrating production monitoring services with Rebuild 6.0's existing performance infrastructure.

## 1. Error Tracking (Sentry)

### Installation
```bash
npm install @sentry/react @sentry/node
```

### Client Setup
```typescript
// client/src/services/monitoring/sentry.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry() {
  if (!import.meta.env.DEV) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}

// Integration with AppErrorBoundary
export function reportToSentry(error: Error, errorInfo: any) {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  });
}
```

### Server Setup
```typescript
// server/src/monitoring/sentry.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initSentry(app: Express) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new ProfilingIntegration(),
    ],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

export function setupErrorHandler(app: Express) {
  app.use(Sentry.Handlers.errorHandler());
}
```

## 2. Application Performance Monitoring (DataDog)

### Installation
```bash
npm install dd-trace @datadog/browser-rum
```

### Client APM
```typescript
// client/src/services/monitoring/datadog.ts
import { datadogRum } from '@datadog/browser-rum';

export function initDataDog() {
  if (!import.meta.env.DEV) {
    datadogRum.init({
      applicationId: import.meta.env.VITE_DD_APP_ID,
      clientToken: import.meta.env.VITE_DD_CLIENT_TOKEN,
      site: 'datadoghq.com',
      service: 'rebuild-client',
      env: import.meta.env.MODE,
      sessionSampleRate: 100,
      trackInteractions: true,
      trackResources: true,
      trackLongTasks: true,
    });
  }
}

// Integration with performance monitor
export function trackToDataDog(metric: any) {
  datadogRum.addTiming(metric.name, metric.value);
}
```

### Server APM
```typescript
// server/src/monitoring/datadog.ts
import tracer from 'dd-trace';

export function initDataDog() {
  tracer.init({
    service: 'rebuild-api',
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    logInjection: true,
    runtimeMetrics: true,
    profiling: true,
  });
}
```

## 3. Uptime Monitoring (Better Uptime)

### Health Check Endpoints
```typescript
// server/src/routes/health.ts
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  });
});

router.get('/health/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    ai: await checkAIService(),
  };
  
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

## 4. Log Management (LogTail)

### Structured Logging
```typescript
// server/src/services/logger.ts
import winston from 'winston';
import { Logtail } from '@logtail/node';

const logtail = new Logtail(process.env.LOGTAIL_TOKEN);

export const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.Http({
        host: 'in.logtail.com',
        path: '/',
        ssl: true,
        headers: {
          'Authorization': `Bearer ${process.env.LOGTAIL_TOKEN}`,
        },
      })
    ] : []),
  ],
});
```

## 5. Real User Monitoring Integration

### Connect existing performance monitor
```typescript
// client/src/main.tsx
import { performanceMonitor, trackWebVital } from '@/services/performance/performanceMonitor';
import { initSentry } from '@/services/monitoring/sentry';
import { initDataDog } from '@/services/monitoring/datadog';
import { reportWebVitals } from 'web-vitals';

// Initialize monitoring services
initSentry();
initDataDog();

// Connect Web Vitals to monitoring
reportWebVitals((metric) => {
  // Local performance monitor
  trackWebVital(metric);
  
  // Send to monitoring services
  if (window.Sentry) {
    window.Sentry.captureMessage(`Web Vital: ${metric.name}`, {
      level: metric.rating === 'good' ? 'info' : 'warning',
      extra: metric,
    });
  }
  
  if (window.DD_RUM) {
    window.DD_RUM.addTiming(metric.name, metric.value);
  }
});

// Auto-export performance metrics
if (!import.meta.env.DEV) {
  setInterval(() => {
    const stats = performanceMonitor.getStatistics();
    // Send to monitoring service
    fetch('/api/v1/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats),
    });
  }, 60000); // Every minute
}
```

## 6. Environment Variables

### Client (.env.production)
```env
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_DD_APP_ID=xxx
VITE_DD_CLIENT_TOKEN=xxx
VITE_LOGROCKET_APP_ID=xxx
```

### Server (.env.production)
```env
SENTRY_DSN=https://xxx@sentry.io/xxx
DD_API_KEY=xxx
DD_APP_KEY=xxx
LOGTAIL_TOKEN=xxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx
```

## 7. Alert Configuration

### Critical Alerts
- Error rate > 1%
- Response time > 2s (p95)
- Uptime < 99.9%
- Memory usage > 80%
- CPU usage > 80%

### Warning Alerts
- Error rate > 0.5%
- Response time > 1s (p95)
- Memory usage > 60%
- Failed health checks

## 8. Dashboard Setup

### Key Metrics
1. **Error Tracking**
   - Error rate by endpoint
   - Error distribution by type
   - User impact score

2. **Performance**
   - Response time percentiles
   - Database query performance
   - API endpoint latency

3. **Business Metrics**
   - Orders per minute
   - Voice order success rate
   - Payment processing time

## 9. Deployment Checklist

- [ ] Set all production environment variables
- [ ] Configure monitoring service integrations
- [ ] Set up alert channels (email, Slack, PagerDuty)
- [ ] Create monitoring dashboards
- [ ] Test error reporting with synthetic errors
- [ ] Verify performance metrics collection
- [ ] Set up log retention policies
- [ ] Configure uptime monitoring endpoints
- [ ] Document incident response procedures

## 10. Testing Monitoring

```bash
# Test error tracking
curl -X POST http://localhost:3001/api/v1/test/error

# Test performance tracking
npm run test:performance

# Verify health checks
curl http://localhost:3001/health/detailed
```