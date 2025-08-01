/**
 * Simple monitoring service for error logging and Web Vitals
 */

import { performanceMonitor } from '@/services/performance/performanceMonitor';
import { logger } from '@/services/logger';

class MonitoringService {
  private metricsInterval?: NodeJS.Timeout;

  /**
   * Initialize Web Vitals monitoring
   */
  async initialize() {
    try {
      // Only monitor Web Vitals in production
      if (!import.meta.env.DEV) {
        this.connectWebVitals();
        this.startMetricsReporting();
      }
    } catch (error) {
      logger.error('Failed to initialize monitoring', error);
    }
  }

  /**
   * Track Web Vitals (CLS, FID, FCP, LCP, TTFB)
   */
  private connectWebVitals() {
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      const reportVital = (metric: any) => {
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
   * Report metrics to backend periodically
   */
  private startMetricsReporting() {
    // Report every 5 minutes
    this.metricsInterval = setInterval(() => {
      const stats = performanceMonitor.getStatistics();
      
      // Send to backend metrics endpoint
      fetch('/api/v1/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats,
          timestamp: new Date().toISOString(),
        }),
      }).catch(error => {
        logger.error('Failed to report metrics', error);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Log application errors
   */
  reportError(error: Error, context?: Record<string, any>) {
    logger.error('Application error', error, context);
  }

  /**
   * Clean up monitoring
   */
  shutdown() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();