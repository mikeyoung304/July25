 
/**
 * Enterprise Error Handling System
 * Unified error handling, recovery, and reporting for production systems
 */

import { MemoryMonitor } from './memory-monitoring';

/**
 * Standard error types for the application
 */
export enum ErrorType {
  // Network & API errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TYPE_ERROR = 'TYPE_ERROR',
  CONSTRAINT_ERROR = 'CONSTRAINT_ERROR',
  
  // System errors
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Business logic errors
  BUSINESS_RULE_ERROR = 'BUSINESS_RULE_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Integration errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  
  // User interface errors
  UI_ERROR = 'UI_ERROR',
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  RENDERING_ERROR = 'RENDERING_ERROR',
  
  // Unknown/unexpected errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  NONE = 'none',
  RETRY = 'retry',
  FALLBACK = 'fallback',
  REFRESH = 'refresh',
  RELOAD = 'reload',
  REDIRECT = 'redirect',
  LOGOUT = 'logout'
}

/**
 * Enhanced error interface with enterprise features
 */
export interface EnterpriseError {
  // Basic error info
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  
  // Context information
  component?: string;
  service?: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  
  // Technical details
  stack?: string;
  cause?: string;
  details?: Record<string, any>;
  
  // Recovery information
  recoveryStrategy: RecoveryStrategy;
  retryCount?: number;
  maxRetries?: number;
  canRecover: boolean;
  
  // Metadata
  tags?: string[];
  correlationId?: string;
  requestId?: string;
  
  // System context
  userAgent?: string;
  url?: string;
  memoryUsage?: number;
  networkStatus?: string;
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
  fallbackValue?: any;
  fallbackFunction?: () => any;
  onRetry?: (error: EnterpriseError, attempt: number) => void;
  onMaxRetriesReached?: (error: EnterpriseError) => void;
}

/**
 * Error reporting configuration
 */
export interface ErrorReportingConfig {
  enableConsoleLogging: boolean;
  enableRemoteReporting: boolean;
  enableUserNotification: boolean;
  reportingEndpoint?: string;
  userNotificationCallback?: (error: EnterpriseError) => void;
  filterSensitiveData?: (error: EnterpriseError) => EnterpriseError;
}

/**
 * Enterprise Error Handler Class
 */
export class EnterpriseErrorHandler {
  private static instance: EnterpriseErrorHandler | null = null;
  private errors: EnterpriseError[] = [];
  private maxErrorHistory = 1000;
  private recoveryConfigs = new Map<ErrorType, ErrorRecoveryConfig>();
  private reportingConfig: ErrorReportingConfig;
  private errorPatterns = new Map<string, { count: number; lastSeen: number }>();
  
  constructor(reportingConfig: Partial<ErrorReportingConfig> = {}) {
    this.reportingConfig = {
      enableConsoleLogging: true,
      enableRemoteReporting: false,
      enableUserNotification: true,
      ...reportingConfig
    };
    
    this.setupDefaultRecoveryConfigs();
    this.setupGlobalErrorHandlers();
  }
  
  static getInstance(config?: Partial<ErrorReportingConfig>): EnterpriseErrorHandler {
    if (!EnterpriseErrorHandler.instance) {
      EnterpriseErrorHandler.instance = new EnterpriseErrorHandler(config);
    }
    return EnterpriseErrorHandler.instance;
  }
  
  /**
   * Setup default recovery configurations for different error types
   */
  private setupDefaultRecoveryConfigs(): void {
    // Network errors - retry with backoff
    this.recoveryConfigs.set(ErrorType.NETWORK_ERROR, {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxRetryDelay: 10000
    });
    
    // API errors - conditional retry
    this.recoveryConfigs.set(ErrorType.API_ERROR, {
      maxRetries: 2,
      retryDelay: 2000,
      backoffMultiplier: 1.5,
      maxRetryDelay: 5000
    });
    
    // Timeout errors - immediate retry
    this.recoveryConfigs.set(ErrorType.TIMEOUT_ERROR, {
      maxRetries: 2,
      retryDelay: 500,
      backoffMultiplier: 2,
      maxRetryDelay: 2000
    });
    
    // Authentication errors - redirect to login
    this.recoveryConfigs.set(ErrorType.AUTHENTICATION_ERROR, {
      maxRetries: 0,
      retryDelay: 0,
      backoffMultiplier: 1,
      maxRetryDelay: 0
    });
    
    // Memory errors - force cleanup
    this.recoveryConfigs.set(ErrorType.MEMORY_ERROR, {
      maxRetries: 1,
      retryDelay: 5000,
      backoffMultiplier: 1,
      maxRetryDelay: 5000,
      fallbackFunction: () => {
        // Force garbage collection and cleanup
        MemoryMonitor.forceGarbageCollection();
        return null;
      }
    });
  }
  
  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Browser environment
    if (typeof window !== 'undefined') {
      // Unhandled JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleError(event.error || new Error(event.message), {
          type: ErrorType.SYSTEM_ERROR,
          severity: ErrorSeverity.HIGH,
          component: 'Global',
          details: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      });
      
      // Unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          type: ErrorType.SYSTEM_ERROR,
          severity: ErrorSeverity.HIGH,
          component: 'Promise',
          details: {
            promise: event.promise
          }
        });
      });
      
      // Network status changes
      window.addEventListener('online', () => {
        console.log('Network connection restored');
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
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.handleError(error, {
          type: ErrorType.SYSTEM_ERROR,
          severity: ErrorSeverity.CRITICAL,
          component: 'Process'
        });
      });
      
      process.on('unhandledRejection', (reason) => {
        this.handleError(reason as Error, {
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
    error: Error | string | any,
    context: Partial<EnterpriseError> = {}
  ): EnterpriseError {
    const enterpriseError = this.createEnterpriseError(error, context);
    
    // Add to error history
    this.errors.push(enterpriseError);
    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(-this.maxErrorHistory);
    }
    
    // Track error patterns
    this.trackErrorPattern(enterpriseError);
    
    // Log error
    if (this.reportingConfig.enableConsoleLogging) {
      this.logError(enterpriseError);
    }
    
    // Report error
    if (this.reportingConfig.enableRemoteReporting) {
      this.reportError(enterpriseError);
    }
    
    // Notify user if appropriate
    if (this.reportingConfig.enableUserNotification && 
        enterpriseError.severity !== ErrorSeverity.LOW) {
      this.notifyUser(enterpriseError);
    }
    
    return enterpriseError;
  }
  
  /**
   * Create standardized enterprise error
   */
  private createEnterpriseError(
    error: Error | string | any,
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
      stack: originalError.stack,
      cause: originalError.cause?.toString(),
      details: {
        ...context.details,
        originalType: originalError.constructor.name
      },
      recoveryStrategy: RecoveryStrategy.NONE,
      retryCount: 0,
      canRecover: false,
      
      // Context from parameters
      component: context.component,
      service: context.service,
      userId: context.userId,
      sessionId: context.sessionId || this.getSessionId(),
      correlationId: context.correlationId,
      requestId: context.requestId,
      tags: context.tags,
      
      // System context
      memoryUsage: memoryInfo.current?.percentage,
      networkStatus: typeof navigator !== 'undefined' ? 
        (navigator.onLine ? 'online' : 'offline') : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };
    
    // Determine recovery strategy
    this.determineRecoveryStrategy(enterpriseError);
    
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
   * Determine recovery strategy for error
   */
  private determineRecoveryStrategy(error: EnterpriseError): void {
    const config = this.recoveryConfigs.get(error.type);
    
    if (config) {
      error.maxRetries = config.maxRetries;
      error.canRecover = config.maxRetries > 0 || !!config.fallbackValue || !!config.fallbackFunction;
      
      if (config.maxRetries > 0) {
        error.recoveryStrategy = RecoveryStrategy.RETRY;
      } else if (config.fallbackValue !== undefined || config.fallbackFunction) {
        error.recoveryStrategy = RecoveryStrategy.FALLBACK;
      }
    }
    
    // Special cases
    switch (error.type) {
      case ErrorType.AUTHENTICATION_ERROR:
        error.recoveryStrategy = RecoveryStrategy.LOGOUT;
        break;
      case ErrorType.MEMORY_ERROR:
        error.recoveryStrategy = RecoveryStrategy.REFRESH;
        break;
      case ErrorType.CONFIGURATION_ERROR:
        error.recoveryStrategy = RecoveryStrategy.RELOAD;
        break;
    }
  }
  
  /**
   * Track error patterns for analysis
   */
  private trackErrorPattern(error: EnterpriseError): void {
    const pattern = `${error.type}:${error.component || 'unknown'}`;
    const existing = this.errorPatterns.get(pattern);
    
    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
    } else {
      this.errorPatterns.set(pattern, {
        count: 1,
        lastSeen: Date.now()
      });
    }
    
    // Check for error storms (same error type occurring frequently)
    if (existing && existing.count > 10) {
      const timeSinceFirst = Date.now() - (existing.lastSeen - (existing.count * 1000));
      if (timeSinceFirst < 60000) { // Within 1 minute
        console.warn(`Error storm detected: ${pattern} occurred ${existing.count} times`);
        
        // Create meta-error for error storm
        this.handleError(new Error(`Error storm: ${pattern}`), {
          type: ErrorType.SYSTEM_ERROR,
          severity: ErrorSeverity.CRITICAL,
          component: 'ErrorHandler',
          details: { originalPattern: pattern, occurrences: existing.count }
        });
      }
    }
  }
  
  /**
   * Attempt to recover from error
   */
  async recover<T>(
    error: EnterpriseError,
    operation: () => Promise<T> | T
  ): Promise<T | null> {
    if (!error.canRecover) {
      return null;
    }
    
    const config = this.recoveryConfigs.get(error.type);
    if (!config) {
      return null;
    }
    
    switch (error.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        return this.retryOperation(error, operation, config);
      
      case RecoveryStrategy.FALLBACK:
        return this.useFallback(error, config);
      
      case RecoveryStrategy.REFRESH:
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
        return null;
      
      case RecoveryStrategy.REDIRECT:
        if (typeof window !== 'undefined' && error.details?.redirectUrl) {
          window.location.href = error.details.redirectUrl;
        }
        return null;
      
      case RecoveryStrategy.LOGOUT:
        // Trigger logout logic
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/login';
        }
        return null;
      
      default:
        return null;
    }
  }
  
  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    error: EnterpriseError,
    operation: () => Promise<T> | T,
    config: ErrorRecoveryConfig
  ): Promise<T | null> {
    if (!error.maxRetries || error.retryCount! >= error.maxRetries) {
      config.onMaxRetriesReached?.(error);
      return null;
    }
    
    error.retryCount = (error.retryCount || 0) + 1;
    
    const delay = Math.min(
      config.retryDelay * Math.pow(config.backoffMultiplier, error.retryCount - 1),
      config.maxRetryDelay
    );
    
    config.onRetry?.(error, error.retryCount);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      return await operation();
    } catch (retryError) {
      const newError = this.handleError(retryError, {
        ...error,
        retryCount: error.retryCount,
        details: { ...error.details, retryAttempt: error.retryCount }
      });
      
      return this.retryOperation(newError, operation, config);
    }
  }
  
  /**
   * Use fallback value or function
   */
  private useFallback<T>(error: EnterpriseError, config: ErrorRecoveryConfig): T | null {
    if (config.fallbackFunction) {
      try {
        return config.fallbackFunction();
      } catch (fallbackError) {
        this.handleError(fallbackError, {
          type: ErrorType.SYSTEM_ERROR,
          severity: ErrorSeverity.HIGH,
          component: 'ErrorRecovery',
          details: { originalError: error.id }
        });
        return null;
      }
    }
    
    return config.fallbackValue || null;
  }
  
  /**
   * Log error to console
   */
  private logError(error: EnterpriseError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.severity.toUpperCase()}] ${error.type}: ${error.message}`;
    
    console[logLevel](logMessage, {
      id: error.id,
      component: error.component,
      service: error.service,
      timestamp: error.timestamp,
      details: error.details,
      stack: error.stack
    });
  }
  
  /**
   * Get appropriate console log level
   */
  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'log' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }
  
  /**
   * Report error to remote service
   */
  private async reportError(error: EnterpriseError): Promise<void> {
    if (!this.reportingConfig.reportingEndpoint) {
      return;
    }
    
    try {
      const sanitizedError = this.reportingConfig.filterSensitiveData?.(error) || error;
      
      await fetch(this.reportingConfig.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedError)
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }
  
  /**
   * Notify user about error
   */
  private notifyUser(error: EnterpriseError): void {
    if (this.reportingConfig.userNotificationCallback) {
      this.reportingConfig.userNotificationCallback(error);
    } else {
      // Default user notification
      const userMessage = this.getUserFriendlyMessage(error);
      
      if (typeof window !== 'undefined' && error.severity === ErrorSeverity.CRITICAL) {
        alert(userMessage);
      } else {
        console.warn('User notification:', userMessage);
      }
    }
  }
  
  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: EnterpriseError): string {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return 'Network connection issue. Please check your internet connection and try again.';
      case ErrorType.AUTHENTICATION_ERROR:
        return 'Your session has expired. Please log in again.';
      case ErrorType.AUTHORIZATION_ERROR:
        return 'You do not have permission to perform this action.';
      case ErrorType.VALIDATION_ERROR:
        return 'Please check your input and try again.';
      case ErrorType.RESOURCE_NOT_FOUND:
        return 'The requested item could not be found.';
      case ErrorType.MEMORY_ERROR:
        return 'The application is running low on memory. Please refresh the page.';
      default:
        return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
  }
  
  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get session ID (implement based on your session management)
   */
  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sessionId') || 'no-session';
    }
    return 'server-session';
  }
  
  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: EnterpriseError[];
    errorPatterns: Array<{ pattern: string; count: number; lastSeen: number }>;
  } {
    const errorsByType = {} as Record<ErrorType, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;
    
    this.errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });
    
    const errorPatterns = Array.from(this.errorPatterns.entries()).map(([pattern, data]) => ({
      pattern,
      count: data.count,
      lastSeen: data.lastSeen
    }));
    
    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errors.slice(-10),
      errorPatterns
    };
  }
  
  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errors = [];
    this.errorPatterns.clear();
  }
  
  /**
   * Configure recovery strategy for error type
   */
  configureRecovery(type: ErrorType, config: ErrorRecoveryConfig): void {
    this.recoveryConfigs.set(type, config);
  }
}

// Global error handler instance
export const errorHandler = EnterpriseErrorHandler.getInstance();

// Convenience functions for common error handling patterns
export const handleError = (error: Error | string, context?: Partial<EnterpriseError>) => 
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
  fallbackComponent: any,
  errorContext?: Partial<EnterpriseError>
) => {
  // Only create React components if React is available
  if (typeof window === 'undefined' || !(globalThis as any).React) {
    return null;
  }
  
  // Dynamic React import for browser environment only
  const React = (globalThis as any).React;
  
  return class ErrorBoundary extends React.Component {
    constructor(props: any) {
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
    
    render() {
      if ((this.state as any).error) {
        return React.createElement(fallbackComponent, { error: (this.state as any).error });
      }
      
      return (this.props as any).children;
    }
  };
};