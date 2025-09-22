/**
 * Web Vitals Monitoring
 * Collects and reports Core Web Vitals metrics
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface WebVitalsMetrics {
  url: string;
  timestamp: number;
  sessionId: string;
  metrics: {
    CLS?: number;    // Cumulative Layout Shift
    FCP?: number;    // First Contentful Paint
    INP?: number;    // Interaction to Next Paint
    LCP?: number;    // Largest Contentful Paint
    TTFB?: number;   // Time to First Byte
  };
  userAgent: string;
  connection?: {
    effectiveType: string;
    rtt: number;
    downlink: number;
  };
}

class WebVitalsReporter {
  private sessionId: string;
  private metrics: WebVitalsMetrics['metrics'] = {};
  private reportEndpoint: string;
  private batchTimeout: number = 5000; // 5 seconds
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(options: {
    endpoint?: string;
    sessionId?: string;
    batchTimeout?: number;
  } = {}) {
    this.sessionId = options.sessionId || this.generateSessionId();
    this.reportEndpoint = options.endpoint || '/api/v1/metrics/web-vitals';
    this.batchTimeout = options.batchTimeout || 5000;
    
    this.initializeWebVitals();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeWebVitals() {
    const handleMetric = (metric: Metric) => {
      this.metrics[metric.name as keyof WebVitalsMetrics['metrics']] = metric.value;
      this.scheduleReport();
    };

    // Register all Web Vitals observers
    onCLS(handleMetric);
    onFCP(handleMetric);
    onINP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
  }

  private scheduleReport() {
    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Schedule batch report
    this.batchTimer = setTimeout(() => {
      this.sendReport();
    }, this.batchTimeout);
  }

  private async sendReport() {
    const report: WebVitalsMetrics = {
      url: window.location.href,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metrics: { ...this.metrics },
      userAgent: navigator.userAgent,
    };

    // Add connection information if available
    if ('connection' in navigator && (navigator as any).connection) {
      const conn = (navigator as any).connection;
      report.connection = {
        effectiveType: conn.effectiveType,
        rtt: conn.rtt,
        downlink: conn.downlink,
      };
    }

    try {
      await fetch(this.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
        // Use keepalive to ensure the request completes even if the page unloads
        keepalive: true,
      });

      // Debug: Web Vitals metrics reported successfully
    } catch (error) {
      console.warn('⚠️ Failed to report Web Vitals:', error);
      
      // Fallback: Store in localStorage for later retry
      this.storeForRetry(report);
    }
  }

  private storeForRetry(report: WebVitalsMetrics) {
    try {
      const stored = localStorage.getItem('webvitals_pending');
      const pending = stored ? JSON.parse(stored) : [];
      pending.push(report);
      
      // Keep only last 10 reports to avoid storage bloat
      if (pending.length > 10) {
        pending.splice(0, pending.length - 10);
      }
      
      localStorage.setItem('webvitals_pending', JSON.stringify(pending));
    } catch (error) {
      console.warn('Failed to store Web Vitals for retry:', error);
    }
  }

  public async retryPendingReports() {
    try {
      const stored = localStorage.getItem('webvitals_pending');
      if (!stored) return;

      const pending: WebVitalsMetrics[] = JSON.parse(stored);
      
      for (const report of pending) {
        try {
          await fetch(this.reportEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(report),
          });
        } catch (error) {
          console.warn('Failed to retry Web Vitals report:', error);
          // Keep failed reports for next retry
          continue;
        }
      }

      // Clear successfully sent reports
      localStorage.removeItem('webvitals_pending');
    } catch (error) {
      console.warn('Failed to retry pending Web Vitals reports:', error);
    }
  }

  public getCurrentMetrics(): WebVitalsMetrics['metrics'] {
    return { ...this.metrics };
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const webVitalsReporter = new WebVitalsReporter();

// Export for manual initialization with custom options
export { WebVitalsReporter };

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  // Retry any pending reports from previous sessions
  webVitalsReporter.retryPendingReports();
  
  // Report metrics when page is about to unload
  window.addEventListener('beforeunload', () => {
    // Force immediate report
    webVitalsReporter['sendReport']();
  });
}