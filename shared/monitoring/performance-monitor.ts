/**
 * Performance Monitoring
 * Tracks application performance metrics and API response times
 */

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'api_request' | 'page_load' | 'user_interaction' | 'resource_load';
  name: string;
  duration: number;
  metadata?: Record<string, any>;
  sessionId: string;
  url?: string;
  status?: 'success' | 'error' | 'timeout';
}

export interface APIPerformanceMetric extends PerformanceMetric {
  type: 'api_request';
  method: string;
  statusCode?: number;
  endpoint: string;
  responseSize?: number;
  errorMessage?: string;
}

class PerformanceMonitor {
  private sessionId: string;
  private reportEndpoint: string;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 100;
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options: {
    endpoint?: string;
    sessionId?: string;
    maxMetrics?: number;
    batchSize?: number;
    flushInterval?: number;
  } = {}) {
    this.sessionId = options.sessionId || this.generateSessionId();
    this.reportEndpoint = options.endpoint || '/api/v1/metrics/performance';
    this.maxMetrics = options.maxMetrics || 100;
    this.batchSize = options.batchSize || 10;
    this.flushInterval = options.flushInterval || 30000;
    
    this.startFlushTimer();
    this.initializeObservers();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private initializeObservers() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') return;
    
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordPageLoadMetric(navEntry);
          }
        }
      });
      
      try {
        navObserver.observe({ type: 'navigation', buffered: true });
      } catch (e) {
        console.warn('Navigation timing observer not supported');
      }

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordResourceMetric(entry as PerformanceResourceTiming);
          }
        }
      });

      try {
        resourceObserver.observe({ type: 'resource', buffered: true });
      } catch (e) {
        console.warn('Resource timing observer not supported');
      }
    }

    // Intercept fetch for API monitoring
    this.interceptFetch();
    this.interceptXHR();
  }

  private recordPageLoadMetric(entry: PerformanceNavigationTiming) {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: Date.now(),
      type: 'page_load',
      name: 'page_load',
      duration: entry.loadEventEnd - entry.loadEventStart,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      status: 'success',
      metadata: {
        domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
        firstPaint: entry.loadEventStart - entry.fetchStart,
        dnsLookup: entry.domainLookupEnd - entry.domainLookupStart,
        tcpConnect: entry.connectEnd - entry.connectStart,
        serverResponse: entry.responseEnd - entry.requestStart,
        domProcessing: entry.domComplete - entry.domInteractive,
        transferSize: entry.transferSize,
        encodedSize: entry.encodedBodySize,
        decodedSize: entry.decodedBodySize,
      }
    };

    this.addMetric(metric);
  }

  private recordResourceMetric(entry: PerformanceResourceTiming) {
    // Only track significant resources (not tiny images, etc.)
    if (entry.transferSize < 1024) return;

    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: Date.now(),
      type: 'resource_load',
      name: this.getResourceName(entry.name),
      duration: entry.responseEnd - entry.requestStart,
      sessionId: this.sessionId,
      url: entry.name,
      status: entry.responseEnd > 0 ? 'success' : 'error',
      metadata: {
        resourceType: this.getResourceType(entry.name),
        transferSize: entry.transferSize,
        encodedSize: entry.encodedBodySize,
        decodedSize: entry.decodedBodySize,
        cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
      }
    };

    this.addMetric(metric);
  }

  private interceptFetch() {
    // Only intercept in browser environment
    if (typeof window === 'undefined' || !window.fetch) return;
    
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      let response: Response;
      let error: Error | null = null;
      
      try {
        response = await originalFetch(input, init);
      } catch (e) {
        error = e as Error;
        throw e;
      } finally {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        const metric: APIPerformanceMetric = {
          id: this.generateMetricId(),
          timestamp: Date.now(),
          type: 'api_request',
          name: this.getAPIName(url),
          duration,
          sessionId: this.sessionId,
          url,
          method,
          endpoint: url,
          status: error ? 'error' : 'success',
          statusCode: error ? undefined : response!.status,
          errorMessage: error?.message,
          metadata: {
            requestSize: this.estimateRequestSize(init),
            cached: error ? false : response!.headers.get('cf-cache-status') !== null,
          }
        };

        // Try to get response size
        if (!error && response!) {
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            metric.responseSize = parseInt(contentLength);
          }
        }

        this.addMetric(metric);
      }
      
      return response!;
    };
  }

  private interceptXHR() {
    // Only intercept in browser environment
    if (typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined') return;
    
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const monitor = this;
    
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      (this as any)._perfMonitor = {
        method,
        url: url.toString(),
        startTime: null,
      };
      return originalOpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(body?: any) {
      const perfData = (this as any)._perfMonitor;
      if (perfData) {
        perfData.startTime = performance.now();
        
        this.addEventListener('loadend', () => {
          const endTime = performance.now();
          const duration = endTime - perfData.startTime;
          
          const metric: APIPerformanceMetric = {
            id: monitor.generateMetricId(),
            timestamp: Date.now(),
            type: 'api_request',
            name: monitor.getAPIName(perfData.url),
            duration,
            sessionId: monitor.sessionId,
            url: perfData.url,
            method: perfData.method,
            endpoint: perfData.url,
            status: this.status >= 200 && this.status < 300 ? 'success' : 'error',
            statusCode: this.status,
            metadata: {
              responseSize: this.responseText?.length || 0,
              requestSize: body ? JSON.stringify(body).length : 0,
            }
          };
          
          monitor.addMetric(metric);
        });
      }
      
      return originalSend.apply(this, [body]);
    };
  }

  public recordUserInteraction(name: string, duration: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: Date.now(),
      type: 'user_interaction',
      name,
      duration,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      status: 'success',
      metadata
    };

    this.addMetric(metric);
  }

  public startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordUserInteraction(name, duration);
    };
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Remove old metrics to prevent memory bloat
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Auto-flush if we have enough metrics
    if (this.metrics.length >= this.batchSize) {
      this.flush();
    }
  }

  public async flush() {
    if (this.metrics.length === 0) return;
    
    const metricsToSend = [...this.metrics];
    this.metrics = [];
    
    try {
      await fetch(this.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          metrics: metricsToSend,
        }),
        keepalive: true,
      });

      if (process.env['NODE_ENV'] === 'development') {
        console.log(`📊 Sent ${metricsToSend.length} performance metrics`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to send performance metrics:', error);
      // Put metrics back for retry
      this.metrics = [...metricsToSend, ...this.metrics];
    }
  }

  private generateMetricId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getResourceName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || pathname;
      return filename || 'unknown_resource';
    } catch {
      return 'unknown_resource';
    }
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js': return 'script';
      case 'css': return 'stylesheet';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp': return 'image';
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf': return 'font';
      default: return 'other';
    }
  }

  private getAPIName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract API endpoint pattern
      if (pathname.startsWith('/api/')) {
        return pathname.split('/').slice(0, 4).join('/'); // e.g., /api/v1/orders
      }
      
      return pathname;
    } catch {
      return 'unknown_api';
    }
  }

  private estimateRequestSize(init?: RequestInit): number {
    if (!init?.body) return 0;
    
    if (typeof init.body === 'string') {
      return init.body.length;
    }
    
    if (init.body instanceof FormData) {
      // Rough estimate for FormData
      return 1000;
    }
    
    return 0;
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush(); // Send remaining metrics
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export class for manual initialization
export { PerformanceMonitor };

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.flush();
  });
  
  // Also handle page visibility changes for better cleanup
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        performanceMonitor.flush();
      }
    });
  }
}