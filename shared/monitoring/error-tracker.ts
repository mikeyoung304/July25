/**
 * Error Tracking and Reporting
 * Captures and reports application errors for monitoring
 */

// Browser type definitions for shared code

export interface ErrorReport {
  id: string;
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  sessionId: string;
  userId?: string;
  context?: Record<string, unknown>;
  breadcrumbs?: Array<{
    timestamp: number;
    category: string;
    message: string;
    level: string;
    data?: Record<string, any>;
  }>;
  tags?: Record<string, string>;
}

class ErrorTracker {
  private sessionId: string;
  private userId?: string;
  private breadcrumbs: ErrorReport['breadcrumbs'] = [];
  private reportEndpoint: string;
  private maxBreadcrumbs: number = 50;
  private context: Record<string, any> = {};

  constructor(options: {
    endpoint?: string;
    sessionId?: string;
    userId?: string;
    maxBreadcrumbs?: number;
  } = {}) {
    this.sessionId = options.sessionId || this.generateSessionId();
    this.userId = options.userId;
    this.reportEndpoint = options.endpoint || '/api/v1/metrics/errors';
    this.maxBreadcrumbs = options.maxBreadcrumbs || 50;
    
    this.initializeErrorHandlers();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeErrorHandlers() {
    // Only set up browser handlers if we're in a browser environment
    if (typeof window === 'undefined') return;
    
    // Global error handler for unhandled errors
     
    (window as any).addEventListener('error', (event: any) => {
      this.captureError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript_error'
      });
    });

    // Global handler for unhandled promise rejections
    (window as any).addEventListener('unhandledrejection', (event: any) => {
      this.captureError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'unhandled_promise_rejection' }
      );
    });

    // Console error interception
    const originalError = console.error;
    console.error = (...args) => {
      this.addBreadcrumb('console', 'error', args.join(' '));
      originalError.apply(console, args);
    };

    // Console warn interception  
    const originalWarn = console.warn;
    console.warn = (...args) => {
      this.addBreadcrumb('console', 'warning', args.join(' '));
      originalWarn.apply(console, args);
    };
  }

  public setUser(userId: string, userData?: Record<string, any>) {
    this.userId = userId;
    if (userData) {
      this.setContext('user', userData);
    }
  }

  public setContext(key: string, value: any) {
    this.context[key] = value;
  }

  public addBreadcrumb(
    category: string,
    level: 'info' | 'warning' | 'error',
    message: string,
    data?: Record<string, any>
  ) {
    const breadcrumb = {
      timestamp: Date.now(),
      category,
      message,
      level,
      data
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  public captureError(
    error: Error,
    context?: Record<string, any>,
    level: ErrorReport['level'] = 'error'
  ) {
    const report: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      level,
      message: error.message,
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      sessionId: this.sessionId,
      userId: this.userId,
      context: { ...this.context, ...context },
      breadcrumbs: [...this.breadcrumbs],
      tags: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || 'unknown'
      }
    };

    this.sendErrorReport(report);
    this.addBreadcrumb('error', level, error.message, { errorId: report.id });
    
    return report.id;
  }

  public captureMessage(
    message: string,
    level: ErrorReport['level'] = 'info',
    context?: Record<string, any>
  ) {
    const report: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      level,
      message,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      sessionId: this.sessionId,
      userId: this.userId,
      context: { ...this.context, ...context },
      breadcrumbs: [...this.breadcrumbs],
      tags: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || 'unknown'
      }
    };

    this.sendErrorReport(report);
    this.addBreadcrumb('message', level, message);
    
    return report.id;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendErrorReport(report: ErrorReport) {
    try {
      await fetch(this.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
        keepalive: true,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 Error reported:', {
          id: report.id,
          level: report.level,
          message: report.message,
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to report error:', error);
      
      // Store in localStorage as fallback
      this.storeErrorForRetry(report);
    }
  }

  private storeErrorForRetry(report: ErrorReport) {
    try {
      const stored = localStorage.getItem('errors_pending');
      const pending = stored ? JSON.parse(stored) : [];
      pending.push(report);
      
      // Keep only last 20 errors to avoid storage bloat
      if (pending.length > 20) {
        pending.splice(0, pending.length - 20);
      }
      
      localStorage.setItem('errors_pending', JSON.stringify(pending));
    } catch (error) {
      console.warn('Failed to store error for retry:', error);
    }
  }

  public async retryPendingErrors() {
    try {
      const stored = localStorage.getItem('errors_pending');
      if (!stored) return;

      const pending: ErrorReport[] = JSON.parse(stored);
      
      for (const report of pending) {
        try {
          await this.sendErrorReport(report);
        } catch (error) {
          console.warn('Failed to retry error report:', error);
          continue;
        }
      }

      localStorage.removeItem('errors_pending');
    } catch (error) {
      console.warn('Failed to retry pending error reports:', error);
    }
  }

  public getBreadcrumbs(): ErrorReport['breadcrumbs'] {
    return [...this.breadcrumbs];
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public clearBreadcrumbs() {
    this.breadcrumbs = [];
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// Export class for manual initialization
export { ErrorTracker };

// Auto-initialize features
if (typeof window !== 'undefined') {
  // Retry pending errors from previous sessions
  errorTracker.retryPendingErrors();
  
  // Track page navigation (only in browser)
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      errorTracker.addBreadcrumb('navigation', 'info', `Navigated to ${window.location.href}`);
    });
  }
  
  // Track focus/blur for user activity
  window.addEventListener('focus', () => {
    errorTracker.addBreadcrumb('user', 'info', 'Window gained focus');
  });
  
  window.addEventListener('blur', () => {
    errorTracker.addBreadcrumb('user', 'info', 'Window lost focus');
  });
}