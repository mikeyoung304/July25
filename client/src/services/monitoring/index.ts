/**
 * Production monitoring service integrations
 * Connects internal performance monitoring with external services
 */

import { performanceMonitor } from '@/services/performance/performanceMonitor';
import { logger } from '@/services/logger';

export interface MonitoringConfig {
  enableSentry?: boolean;
  enableDataDog?: boolean;
  enableLogRocket?: boolean;
  reportInterval?: number;
}

class MonitoringService {
  private config: MonitoringConfig;
  private reportingInterval?: NodeJS.Timeout;

  constructor(config: MonitoringConfig = {}) {
    this.config = {
      enableSentry: !import.meta.env.DEV,
      enableDataDog: !import.meta.env.DEV,
      enableLogRocket: !import.meta.env.DEV,
      reportInterval: 60000, // 1 minute
      ...config,
    };
  }

  /**
   * Initialize all monitoring services
   */
  async initialize() {
    try {
      // Initialize error tracking
      if (this.config.enableSentry && import.meta.env.VITE_SENTRY_DSN) {
        const { initSentry } = await import('./sentry');
        initSentry();
        logger.info('Sentry initialized');
      }

      // Initialize APM
      if (this.config.enableDataDog && import.meta.env.VITE_DD_APP_ID) {
        const { initDataDog } = await import('./datadog');
        initDataDog();
        logger.info('DataDog RUM initialized');
      }

      // Initialize session replay
      if (this.config.enableLogRocket && import.meta.env.VITE_LOGROCKET_APP_ID) {
        const { initLogRocket } = await import('./logrocket');
        initLogRocket();
        logger.info('LogRocket initialized');
      }

      // Start performance reporting
      this.startPerformanceReporting();

      // Connect to Web Vitals
      this.connectWebVitals();

    } catch (error) {
      logger.error('Failed to initialize monitoring', error);
    }
  }

  /**
   * Start automatic performance reporting
   */
  private startPerformanceReporting() {
    if (import.meta.env.DEV) return;

    this.reportingInterval = setInterval(() => {
      this.reportPerformanceMetrics();
    }, this.config.reportInterval!);
  }

  /**
   * Report performance metrics to external services
   */
  private async reportPerformanceMetrics() {
    const stats = performanceMonitor.getStatistics();
    const metrics = performanceMonitor.getMetrics();

    // Report slow renders
    const slowRenders = performanceMonitor.getSlowRenders();
    if (slowRenders.length > 0) {
      logger.warn('Slow renders detected', {
        count: slowRenders.length,
        components: slowRenders.map(r => ({
          component: r.componentName,
          duration: r.duration,
        })),
      });
    }

    // Report slow API calls
    const slowAPIs = performanceMonitor.getSlowAPICalls();
    if (slowAPIs.length > 0) {
      logger.warn('Slow API calls detected', {
        count: slowAPIs.length,
        endpoints: slowAPIs.map(a => ({
          endpoint: a.endpoint,
          duration: a.duration,
          status: a.status,
        })),
      });
    }

    // Send aggregated metrics to backend
    try {
      await fetch('/api/v1/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats,
          slowRenders: slowRenders.length,
          slowAPIs: slowAPIs.length,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      logger.error('Failed to report metrics', error);
    }
  }

  /**
   * Connect Web Vitals reporting
   */
  private connectWebVitals() {
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      const reportVital = (metric: any) => {
        // Track in performance monitor
        performanceMonitor.trackAPICall(
          `web-vital:${metric.name}`,
          metric.value,
          metric.rating === 'good' ? 'success' : 'error'
        );

        // Log poor performance
        if (metric.rating !== 'good') {
          logger.warn(`Poor ${metric.name} performance`, {
            value: metric.value,
            rating: metric.rating,
          });
        }
      };

      onCLS(reportVital);
      onFID(reportVital);
      onFCP(reportVital);
      onLCP(reportVital);
      onTTFB(reportVital);
    });
  }

  /**
   * Manual error reporting
   */
  reportError(error: Error, context?: Record<string, any>) {
    logger.error('Application error', error, context);

    // Report to Sentry if available
    if (window.Sentry) {
      window.Sentry.captureException(error, { extra: context });
    }
  }

  /**
   * Manual performance tracking
   */
  trackPerformance(name: string, duration: number) {
    performanceMonitor.trackRender(name, duration);

    // Report to DataDog if available
    if (window.DD_RUM) {
      window.DD_RUM.addTiming(name, duration);
    }
  }

  /**
   * Track custom events
   */
  trackEvent(eventName: string, properties?: Record<string, any>) {
    logger.info(`Event: ${eventName}`, properties);

    // Report to analytics services
    if (window.DD_RUM) {
      window.DD_RUM.addAction(eventName, properties);
    }
  }

  /**
   * Identify user for monitoring
   */
  identifyUser(userId: string, properties?: Record<string, any>) {
    // Sentry user context
    if (window.Sentry) {
      window.Sentry.setUser({ id: userId, ...properties });
    }

    // DataDog user context
    if (window.DD_RUM) {
      window.DD_RUM.setUser({ id: userId, ...properties });
    }

    // LogRocket identify
    if (window.LogRocket) {
      window.LogRocket.identify(userId, properties);
    }
  }

  /**
   * Stop monitoring services
   */
  shutdown() {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();

// Export types
export type { MonitoringService };