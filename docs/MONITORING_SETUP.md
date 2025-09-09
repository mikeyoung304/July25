# Production Monitoring Setup Guide

## Overview

Comprehensive monitoring setup for Restaurant OS production environments, including error tracking, performance monitoring, real-time alerts, and business metrics.

## Error Tracking with Sentry

### Installation & Configuration

```bash
npm install @sentry/react @sentry/tracing
```

### Frontend Setup

```typescript
// client/src/utils/sentry.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new BrowserTracing({
        // Capture interactions
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Error Filtering
    beforeSend(event) {
      // Filter out known development errors
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.value?.includes('ResizeObserver loop limit exceeded')) {
          return null;
        }
      }
      return event;
    },
    
    // User Context
    initialScope: {
      tags: {
        component: 'restaurant-os',
        version: process.env.VITE_APP_VERSION,
      },
    },
  });
};

// Error Boundary Integration
export const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }) => <>{children}</>,
  {
    fallback: ({ error, resetError }) => (
      <ErrorFallback error={error} resetError={resetError} />
    ),
  }
);
```

### Backend Setup

```typescript
// server/src/utils/sentry.ts
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

export const initSentry = (app: Express) => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
      new Tracing.Integrations.Postgres(),
    ],
    tracesSampleRate: 0.1,
  });

  // Request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  
  // Error handler must be after all controllers
  app.use(Sentry.Handlers.errorHandler());
};
```

### Custom Error Context

```typescript
// Set user context for error tracking
Sentry.setUser({
  id: user.id,
  email: user.email,
  role: user.role,
  restaurant_id: user.restaurant_id,
});

// Set transaction context
Sentry.setTag('restaurant_id', restaurant.id);
Sentry.setTag('order_type', order.type);
Sentry.setContext('order_details', {
  order_id: order.id,
  items_count: order.items.length,
  total: order.total,
});
```

## Performance Monitoring

### Real User Monitoring (RUM)

```typescript
// client/src/utils/performance.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }
  
  // Track page load times
  trackPageLoad(pageName: string) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `Page load: ${pageName}`,
      data: {
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      },
    });
  }
  
  // Track API response times
  trackAPICall(endpoint: string, duration: number, status: number) {
    if (duration > 2000) { // Log slow API calls
      Sentry.addBreadcrumb({
        category: 'api',
        message: `Slow API call: ${endpoint}`,
        data: { duration, status },
        level: 'warning',
      });
    }
  }
  
  // Track memory usage
  trackMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // > 50MB
        Sentry.addBreadcrumb({
          category: 'performance',
          message: 'High memory usage detected',
          data: {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
          },
          level: 'warning',
        });
      }
    }
  }
}
```

### Bundle Analysis Monitoring

```typescript
// scripts/bundle-monitor.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const bundleMonitor = {
  // Track bundle size over time
  trackBundleSize: (stats) => {
    const mainChunkSize = stats.assets
      .filter(asset => asset.name.includes('index'))
      .reduce((total, asset) => total + asset.size, 0);
    
    if (mainChunkSize > 100 * 1024) { // > 100KB
      console.warn(`Bundle size exceeded target: ${mainChunkSize / 1024}KB`);
      
      // Send to monitoring service
      fetch('/api/internal/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: 'bundle_size_exceeded',
          value: mainChunkSize,
          timestamp: Date.now(),
        }),
      });
    }
  },
};
```

## Real-time Health Monitoring

### Health Check Endpoints

```typescript
// server/src/routes/health.ts
import express from 'express';
import { supabase } from '../utils/supabase';

const router = express.Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    redis: boolean;
    websocket: boolean;
    external_apis: boolean;
  };
  metrics: {
    memory_usage: number;
    cpu_usage: number;
    active_connections: number;
    error_rate: number;
  };
}

router.get('/health', async (req, res) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      websocket: await checkWebSocket(),
      external_apis: await checkExternalAPIs(),
    },
    metrics: {
      memory_usage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpu_usage: process.cpuUsage().system / 1000000,
      active_connections: getActiveConnectionCount(),
      error_rate: getErrorRate(),
    },
  };
  
  // Determine overall health status
  const failedChecks = Object.values(health.checks).filter(check => !check).length;
  if (failedChecks > 0) {
    health.status = failedChecks > 2 ? 'unhealthy' : 'degraded';
  }
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

async function checkDatabase(): Promise<boolean> {
  try {
    const { error } = await supabase.from('restaurants').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}
```

### WebSocket Connection Monitoring

```typescript
// server/src/services/websocket/monitor.ts
export class WebSocketMonitor {
  private connections = new Map<string, WebSocket>();
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
  };
  
  trackConnection(id: string, ws: WebSocket) {
    this.connections.set(id, ws);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;
    
    ws.on('close', () => {
      this.connections.delete(id);
      this.metrics.activeConnections--;
    });
    
    ws.on('error', () => {
      this.metrics.errors++;
    });
  }
  
  getHealthMetrics() {
    return {
      ...this.metrics,
      connectionsByRestaurant: this.getConnectionsByRestaurant(),
      averageConnectionTime: this.getAverageConnectionTime(),
    };
  }
  
  // Send metrics to monitoring service every minute
  startMetricsReporting() {
    setInterval(() => {
      const metrics = this.getHealthMetrics();
      this.sendToMonitoringService(metrics);
    }, 60000);
  }
}
```

## Alert Configuration

### Critical Alerts (Immediate Response)

```typescript
interface AlertConfig {
  critical: {
    // System-wide failures
    database_down: { threshold: 0, cooldown: '1m' };
    high_error_rate: { threshold: 0.05, window: '5m', cooldown: '10m' };
    payment_failures: { threshold: 0.1, window: '5m', cooldown: '5m' };
    
    // Performance issues
    response_time_p99: { threshold: 5000, window: '5m', cooldown: '15m' };
    memory_usage: { threshold: 0.9, cooldown: '5m' };
    
    // Business critical
    order_processing_stopped: { threshold: 0, window: '10m', cooldown: '1m' };
    websocket_connection_loss: { threshold: 0.8, window: '2m', cooldown: '5m' };
  };
  
  warning: {
    slow_queries: { threshold: 2000, window: '10m', cooldown: '30m' };
    high_cpu_usage: { threshold: 0.8, window: '15m', cooldown: '20m' };
    bundle_size_exceeded: { threshold: 102400, cooldown: '1h' };
    low_inventory: { threshold: 10, cooldown: '4h' };
  };
}
```

### Slack Integration

```typescript
// server/src/utils/alerts.ts
export class AlertManager {
  private slackWebhook = process.env.SLACK_WEBHOOK_URL;
  
  async sendCriticalAlert(alert: Alert) {
    const message = {
      channel: '#critical-alerts',
      username: 'RestaurantOS Monitor',
      icon_emoji: ':rotating_light:',
      text: `🚨 CRITICAL ALERT: ${alert.title}`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Service', value: alert.service, short: true },
          { title: 'Environment', value: process.env.NODE_ENV, short: true },
          { title: 'Timestamp', value: new Date().toISOString(), short: true },
          { title: 'Details', value: alert.description, short: false },
        ],
      }],
    };
    
    await fetch(this.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }
}
```

### Email Alerts

```typescript
// server/src/utils/email-alerts.ts
import nodemailer from 'nodemailer';

export class EmailAlertManager {
  private transporter = nodemailer.createTransporter({
    // Configure with your email service
  });
  
  async sendAlert(alert: Alert, recipients: string[]) {
    const severity = alert.level === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING';
    
    await this.transporter.sendMail({
      from: process.env.ALERT_FROM_EMAIL,
      to: recipients.join(','),
      subject: `${severity}: ${alert.title}`,
      html: this.generateAlertHTML(alert),
    });
  }
  
  private generateAlertHTML(alert: Alert): string {
    return `
      <h2>${alert.title}</h2>
      <p><strong>Service:</strong> ${alert.service}</p>
      <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <p><strong>Details:</strong></p>
      <pre>${JSON.stringify(alert.details, null, 2)}</pre>
      <p><a href="${process.env.SENTRY_PROJECT_URL}">View in Sentry</a></p>
    `;
  }
}
```

## Business Metrics Dashboard

### Key Performance Indicators

```typescript
// server/src/services/metrics.ts
export class BusinessMetrics {
  // Order metrics
  async getOrderMetrics(restaurantId: string, timeRange: string) {
    return {
      orders_per_hour: await this.calculateOrdersPerHour(restaurantId, timeRange),
      average_order_value: await this.calculateAOV(restaurantId, timeRange),
      order_completion_rate: await this.calculateCompletionRate(restaurantId, timeRange),
      payment_success_rate: await this.calculatePaymentSuccessRate(restaurantId, timeRange),
    };
  }
  
  // System performance metrics
  async getSystemMetrics() {
    return {
      api_response_times: await this.getAPIResponseTimes(),
      websocket_connection_stability: await this.getWebSocketStability(),
      database_query_performance: await this.getDatabasePerformance(),
      memory_usage_trends: await this.getMemoryUsageTrends(),
    };
  }
  
  // Voice ordering metrics
  async getVoiceMetrics(restaurantId: string) {
    return {
      voice_session_success_rate: await this.getVoiceSuccessRate(restaurantId),
      average_voice_session_duration: await this.getAverageSessionDuration(restaurantId),
      voice_to_order_conversion_rate: await this.getVoiceConversionRate(restaurantId),
    };
  }
}
```

### Custom Dashboards

```typescript
// client/src/components/admin/MonitoringDashboard.tsx
export const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      const response = await fetch('/api/internal/metrics');
      const data = await response.json();
      setMetrics(data);
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="monitoring-dashboard">
      <SystemHealthCard metrics={metrics} />
      <AlertsCard alerts={alerts} />
      <PerformanceChartsCard metrics={metrics} />
      <BusinessMetricsCard />
    </div>
  );
};
```

## Log Aggregation

### Structured Logging

```typescript
// shared/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'restaurant-os',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Business event logging
export const businessLogger = {
  orderCreated: (order: Order) => {
    logger.info('Order created', {
      event: 'order.created',
      orderId: order.id,
      restaurantId: order.restaurant_id,
      total: order.total,
      items: order.items.length,
    });
  },
  
  paymentProcessed: (payment: Payment) => {
    logger.info('Payment processed', {
      event: 'payment.processed',
      paymentId: payment.id,
      method: payment.method,
      amount: payment.amount,
      status: payment.status,
    });
  },
};
```

## Monitoring Best Practices

### 1. Alert Fatigue Prevention
- Set appropriate thresholds to avoid false positives
- Use cooldown periods to prevent spam
- Implement alert escalation based on severity
- Regular review and tuning of alert rules

### 2. Performance Monitoring
- Monitor real user metrics, not just synthetic tests
- Track business-critical user journeys
- Set up performance budgets and alerts
- Regular performance audits

### 3. Error Tracking
- Implement proper error boundaries
- Use structured error logging
- Track error trends, not just individual errors
- Correlate errors with business impact

### 4. Security Monitoring
- Monitor authentication failures
- Track permission escalation attempts
- Alert on unusual access patterns
- Log all admin actions

### 5. Capacity Planning
- Monitor resource usage trends
- Set up scaling alerts
- Track database growth
- Monitor connection pool usage