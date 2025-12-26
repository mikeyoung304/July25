/**
 * Enterprise Error Handling System
 * Unified error handling, recovery, and reporting for production systems
 *
 * This module re-exports from focused sub-modules for backwards compatibility:
 * - error-types.ts: Enums, interfaces, and type definitions
 * - error-reporter.ts: Logging and remote error reporting
 * - error-recovery.ts: Recovery strategies and retry logic
 * - error-pattern-tracker.ts: Pattern analysis and error storm detection
 */

import { MemoryMonitor } from './memory-monitoring';

// Re-export all types for backwards compatibility
export {
  ErrorType,
  ErrorSeverity,
  RecoveryStrategy
} from './error-types';

export type {
  EnterpriseError,
  ErrorRecoveryConfig,
  ErrorReportingConfig,
  ErrorPatternData,
  ErrorStats
} from './error-types';

// Import types for internal use
import type { EnterpriseError, ErrorRecoveryConfig, ErrorReportingConfig, ErrorStats } from './error-types';
import { ErrorType, ErrorSeverity, RecoveryStrategy } from './error-types';

// Re-export sub-module classes
export { ErrorReporter } from './error-reporter';
export { ErrorRecovery, type ErrorHandlerCallback } from './error-recovery';
export { ErrorPatternTracker, type ErrorStormCallback } from './error-pattern-tracker';

// Import sub-modules for composition
import { ErrorReporter } from './error-reporter';
import { ErrorRecovery } from './error-recovery';
import { ErrorPatternTracker } from './error-pattern-tracker';

/**
 * Enterprise Error Handler Class
 * Composes ErrorReporter, ErrorRecovery, and ErrorPatternTracker
 */
export class EnterpriseErrorHandler {
  private static instance: EnterpriseErrorHandler | null = null;
  private errors: EnterpriseError[] = [];
  private maxErrorHistory = 1000;

  // Composed sub-modules
  private reporter: ErrorReporter;
  private recovery: ErrorRecovery;
  private patternTracker: ErrorPatternTracker;

  constructor(reportingConfig: Partial<ErrorReportingConfig> = {}) {
    this.reporter = new ErrorReporter(reportingConfig);
    this.recovery = new ErrorRecovery();
    this.patternTracker = new ErrorPatternTracker((error, context) => {
      // Handle error storm by creating a meta-error
      this.handleError(error, context);
    });

    this.setupGlobalErrorHandlers();
  }

  static getInstance(config?: Partial<ErrorReportingConfig>): EnterpriseErrorHandler {
    if (!EnterpriseErrorHandler.instance) {
      EnterpriseErrorHandler.instance = new EnterpriseErrorHandler(config);
    }
    return EnterpriseErrorHandler.instance;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Browser environment
    if (typeof window !== 'undefined') {
      // Unhandled JavaScript errors
      window.addEventListener('error', (event: ErrorEvent) => {
        this.handleError(event.error || new Error(event.message || 'Unknown error'), {
          type: ErrorType.SYSTEM_ERROR,
          severity: ErrorSeverity.HIGH,
          component: 'Global',
          details: {
            filename: event.filename || undefined,
            lineno: event.lineno || undefined,
            colno: event.colno || undefined
          }
        });
      });

      // Unhandled promise rejections
      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        this.handleError(event.reason, {
          type: ErrorType.SYSTEM_ERROR,
          severity: ErrorSeverity.HIGH,
          component: 'Promise',
          details: {
            promise: '[Promise]' // Don't include actual promise object for serialization
          }
        });
      });

      // Network status changes
      window.addEventListener('online', () => {
        // Debug: Network connection restored
      });

      window.addEventListener('offline', () => {
        this.handleError(new Error('Network connection lost'), {
          type: ErrorType.NETWORK_ERROR,
          severity: ErrorSeverity.MEDIUM,
          component: 'Network'
        });
      });
    }

    // Node.js environment
    if (typeof process !== 'undefined' && process.on) {
      process.on('uncaughtException', (error: Error) => {
        this.handleError(error, {
          type: ErrorType.SYSTEM_ERROR,
          severity: ErrorSeverity.CRITICAL,
          component: 'Process'
        });
      });

      process.on('unhandledRejection', (reason: unknown) => {
        this.handleError(reason instanceof Error ? reason : new Error(String(reason)), {
          type: ErrorType.SYSTEM_ERROR,
          severity: ErrorSeverity.HIGH,
          component: 'Promise'
        });
      });
    }
  }

  /**
   * Main error handling method
   */
  handleError(
    error: Error | string | unknown,
    context: Partial<EnterpriseError> = {}
  ): EnterpriseError {
    const enterpriseError = this.createEnterpriseError(error, context);

    // Add to error history
    this.errors.push(enterpriseError);
    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(-this.maxErrorHistory);
    }

    // Track error patterns
    this.patternTracker.trackErrorPattern(enterpriseError);

    // Log error
    if (this.reporter.isConsoleLoggingEnabled()) {
      this.reporter.logError(enterpriseError);
    }

    // Report error
    if (this.reporter.isRemoteReportingEnabled()) {
      this.reporter.reportError(enterpriseError);
    }

    // Notify user if appropriate
    if (this.reporter.isUserNotificationEnabled() &&
        enterpriseError.severity !== ErrorSeverity.LOW) {
      this.reporter.notifyUser(enterpriseError);
    }

    return enterpriseError;
  }

  /**
   * Create standardized enterprise error
   */
  private createEnterpriseError(
    error: Error | string | unknown,
    context: Partial<EnterpriseError>
  ): EnterpriseError {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const errorMessage = originalError.message || String(error);

    // Get system context
    const memoryInfo = MemoryMonitor.getMemoryStatus();

    const enterpriseError: EnterpriseError = {
      id: this.generateErrorId(),
      type: context.type || this.inferErrorType(originalError),
      severity: context.severity || this.inferSeverity(originalError),
      message: errorMessage,
      originalError,
      timestamp: new Date().toISOString(),
      ...(originalError.stack && { stack: originalError.stack }),
      ...((originalError as unknown as { cause?: unknown }).cause ? { cause: String((originalError as unknown as { cause: unknown }).cause) } : {}),
      details: {
        ...context.details,
        originalType: originalError.constructor.name
      },
      recoveryStrategy: RecoveryStrategy.NONE,
      retryCount: 0,
      canRecover: false,

      // Context from parameters
      component: context.component || 'unknown',
      service: context.service || 'unknown',
      ...(context.userId && { userId: context.userId }),
      sessionId: context.sessionId || this.getSessionId(),
      ...(context.correlationId && { correlationId: context.correlationId }),
      ...(context.requestId && { requestId: context.requestId }),
      ...(context.tags && { tags: context.tags }),

      // System context
      ...(memoryInfo.current?.percentage && { memoryUsage: memoryInfo.current.percentage }),
      networkStatus: typeof navigator !== 'undefined' && 'onLine' in navigator ?
        (navigator.onLine ? 'online' : 'offline') : 'unknown',
      ...(typeof navigator !== 'undefined' && 'userAgent' in navigator && { userAgent: navigator.userAgent }),
      ...(typeof window !== 'undefined' && 'location' in window && { url: window.location.href })
    };

    // Determine recovery strategy using the recovery module
    this.recovery.determineRecoveryStrategy(enterpriseError);

    return enterpriseError;
  }

  /**
   * Infer error type from error instance
   */
  private inferErrorType(error: Error): ErrorType {
    const errorName = error.constructor.name.toLowerCase();
    const errorMessage = error.message.toLowerCase();

    // Network-related errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }

    // Validation errors
    if (errorName.includes('validation') || errorMessage.includes('invalid')) {
      return ErrorType.VALIDATION_ERROR;
    }

    // Type errors
    if (errorName === 'typeerror') {
      return ErrorType.TYPE_ERROR;
    }

    // Reference errors
    if (errorName === 'referenceerror') {
      return ErrorType.SYSTEM_ERROR;
    }

    // Syntax errors
    if (errorName === 'syntaxerror') {
      return ErrorType.SYSTEM_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * Infer error severity
   */
  private inferSeverity(error: Error): ErrorSeverity {
    const errorMessage = error.message.toLowerCase();

    // Critical keywords
    if (errorMessage.includes('fatal') || errorMessage.includes('critical')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity keywords
    if (errorMessage.includes('failed') || errorMessage.includes('error')) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity keywords
    if (errorMessage.includes('warning') || errorMessage.includes('deprecated')) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  /**
   * Attempt to recover from error
   */
  async recover<T>(
    error: EnterpriseError,
    operation: () => Promise<T> | T
  ): Promise<T | null> {
    return this.recovery.recover(
      error,
      operation,
      (err, ctx) => this.handleError(err, ctx)
    );
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get session ID (implement based on your session management)
   */
  private getSessionId(): string {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('sessionId') || 'no-session';
    }
    return 'server-session';
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const errorsByType = {} as Record<ErrorType, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    this.errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errors.slice(-10),
      errorPatterns: this.patternTracker.getPatterns()
    };
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errors = [];
    this.patternTracker.clear();
  }

  /**
   * Configure recovery strategy for error type
   */
  configureRecovery(type: ErrorType, config: ErrorRecoveryConfig): void {
    this.recovery.configureRecovery(type, config);
  }
}

// Global error handler instance
export const errorHandler = EnterpriseErrorHandler.getInstance();

// Convenience functions for common error handling patterns
export const handleError = (error: Error | string | unknown, context?: Partial<EnterpriseError>): EnterpriseError =>
  errorHandler.handleError(error, context);

export const withErrorRecovery = async <T>(
  operation: () => Promise<T> | T,
  errorContext?: Partial<EnterpriseError>
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    const enterpriseError = errorHandler.handleError(error, errorContext);
    return errorHandler.recover(enterpriseError, operation);
  }
};

// React error boundary helper
export const createErrorBoundary = (
  fallbackComponent: React.ComponentType<{ error: Error }>,
  errorContext?: Partial<EnterpriseError>
) => {
  // Only create React components if React is available
  if (typeof window === 'undefined' || typeof (globalThis as { React?: unknown }).React === 'undefined') {
    return null;
  }

  // Dynamic React import for browser environment only
  const React = (globalThis as { React: typeof import('react') }).React;

  return class ErrorBoundary extends React.Component {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): { error: EnterpriseError } {
      const enterpriseError = errorHandler.handleError(error, {
        type: ErrorType.COMPONENT_ERROR,
        severity: ErrorSeverity.HIGH,
        ...errorContext
      });

      return { error: enterpriseError };
    }

    override render() {
      if ((this.state as { error: EnterpriseError | null }).error) {
        const errorWithName = { ...(this.state as { error: EnterpriseError }).error, name: 'EnterpriseError' };
        return React.createElement(fallbackComponent, { error: errorWithName });
      }

      return (this.props as { children: React.ReactNode }).children;
    }
  };
};
