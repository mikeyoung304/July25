/**
 * Performance Monitoring Service
 * Tracks and reports application performance metrics
 */

import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface PerformanceThresholds {
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  FCP: number; // First Contentful Paint
  TTFB: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observer: PerformanceObserver | null = null;
  private navigationTimings: Record<string, number> = {};
  
  private thresholds: PerformanceThresholds = {
    LCP: 2500, // Good < 2.5s
    FID: 100,  // Good < 100ms
    CLS: 0.1,  // Good < 0.1
    FCP: 1800, // Good < 1.8s
    TTFB: 800  // Good < 0.8s
  };

  constructor() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.initializeObserver();
      this.measureNavigationTiming();
      this.setupVisibilityTracking();
    }
  }

  /**
   * Initialize Performance Observer for Core Web Vitals
   */
  private initializeObserver() {
    try {
      // Track Largest Contentful Paint
      this.observeMetric('largest-contentful-paint', (entries) => {
        const lastEntry = entries[entries.length - 1];
        const value = lastEntry.startTime;
        this.recordMetric('LCP', value, 'ms', {
          element: (lastEntry as { element?: { tagName: string } }).element?.tagName,
          url: (lastEntry as { url?: string }).url,
          good: value < this.thresholds.LCP
        });
      });

      // Track First Input Delay
      this.observeMetric('first-input', (entries) => {
        const entry = entries[0];
        const value = ((entry as any).processingStart || entry.startTime) - entry.startTime;
        this.recordMetric('FID', value, 'ms', {
          eventType: entry.name,
          good: value < this.thresholds.FID
        });
      });

      // Track Cumulative Layout Shift
      let clsValue = 0;
      this.observeMetric('layout-shift', (entries) => {
        for (const entry of entries) {
          if (!(entry as { hadRecentInput?: boolean }).hadRecentInput) {
            clsValue += (entry as any).value || 0;
          }
        }
        this.recordMetric('CLS', clsValue, 'score', {
          good: clsValue < this.thresholds.CLS
        });
      });

      // Track First Contentful Paint
      this.observeMetric('paint', (entries) => {
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime, 'ms', {
              good: entry.startTime < this.thresholds.FCP
            });
          }
        }
      });

    } catch (error) {
      logger.warn('Failed to initialize performance observer', { error });
    }
  }

  /**
   * Helper to observe specific metric types
   */
  private observeMetric(type: string, callback: (entries: any[]) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
    } catch (error) {
      // Observer might not be supported for this metric type
      logger.info(`Performance metric ${type} not supported`);
    }
  }

  /**
   * Measure navigation timing metrics
   */
  private measureNavigationTiming() {
    if (!window.performance?.timing) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const navigationStart = timing.navigationStart;

        // Time to First Byte
        const ttfb = timing.responseStart - navigationStart;
        this.recordMetric('TTFB', ttfb, 'ms', {
          good: ttfb < this.thresholds.TTFB
        });

        // DOM Content Loaded
        const dcl = timing.domContentLoadedEventEnd - navigationStart;
        this.recordMetric('DCL', dcl, 'ms');

        // Page Load Time
        const loadTime = timing.loadEventEnd - navigationStart;
        this.recordMetric('PageLoad', loadTime, 'ms');

        // DNS Lookup
        const dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
        this.recordMetric('DNS', dnsTime, 'ms');

        // TCP Connection
        const tcpTime = timing.connectEnd - timing.connectStart;
        this.recordMetric('TCP', tcpTime, 'ms');

        // Request Time
        const requestTime = timing.responseEnd - timing.requestStart;
        this.recordMetric('Request', requestTime, 'ms');

        this.navigationTimings = {
          ttfb,
          dcl,
          loadTime,
          dnsTime,
          tcpTime,
          requestTime
        };

        // Report metrics batch
        this.reportMetrics();
      }, 0);
    });
  }

  /**
   * Track page visibility changes
   */
  private setupVisibilityTracking() {
    let hiddenTime = 0;
    let visibleTime = Date.now();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        hiddenTime = Date.now();
        const activeTime = hiddenTime - visibleTime;
        this.recordMetric('ActiveTime', activeTime, 'ms', {
          path: window.location.pathname
        });
      } else {
        visibleTime = Date.now();
        if (hiddenTime > 0) {
          const awayTime = visibleTime - hiddenTime;
          this.recordMetric('AwayTime', awayTime, 'ms');
        }
      }
    });
  }

  /**
   * Record a performance metric
   */
  private recordMetric(
    name: string, 
    value: number, 
    unit: string, 
    metadata?: Record<string, unknown>
  ) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Log in development
    if (import.meta.env.DEV) {
      const status = metadata?.good === false ? '⚠️' : '✅';
      logger.info(`${status} Performance: ${name} = ${value.toFixed(2)}${unit}`, metadata);
    }
  }

  /**
   * Manually track a custom metric
   */
  public trackMetric(name: string, value: number, unit = 'ms', metadata?: Record<string, unknown>) {
    this.recordMetric(name, value, unit, metadata);
  }

  /**
   * Mark the start of a performance measurement
   */
  public mark(name: string) {
    if (window.performance?.mark) {
      window.performance.mark(name);
    }
  }

  /**
   * Measure between two marks
   */
  public measure(name: string, startMark: string, endMark?: string) {
    if (window.performance?.measure) {
      try {
        const entry = endMark 
          ? window.performance.measure(name, startMark, endMark)
          : window.performance.measure(name, startMark);
        
        this.recordMetric(name, entry.duration, 'ms', {
          start: startMark,
          end: endMark || 'now'
        });
        
        return entry.duration;
      } catch (error) {
        logger.warn('Failed to measure performance', { error, name, startMark, endMark });
      }
    }
    return 0;
  }

  /**
   * Report collected metrics
   */
  private reportMetrics() {
    if (this.metrics.length === 0) return;

    const report = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      metrics: this.metrics,
      timings: this.navigationTimings,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        rtt: (navigator as any).connection.rtt,
        downlink: (navigator as any).connection.downlink
      } : undefined
    };

    // In production, send to analytics service
    if (!import.meta.env.DEV) {
      // TODO: Send to analytics endpoint
      fetch('/api/v1/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(() => {
        // Silently fail - don't impact user experience
      });
    }

    logger.info('Performance Report', report);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  public clearMetrics() {
    this.metrics = [];
  }

  /**
   * Destroy observer
   */
  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types
export type { PerformanceMetric, PerformanceThresholds };