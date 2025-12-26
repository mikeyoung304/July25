/**
 * Error Recovery Module
 * Handles recovery strategies, retries, and fallbacks for errors
 */

import type { EnterpriseError, ErrorRecoveryConfig } from './error-types';
import { ErrorType, RecoveryStrategy } from './error-types';
import { MemoryMonitor } from './memory-monitoring';

/**
 * Type for the error handler callback used in recovery operations
 */
export type ErrorHandlerCallback = (
  error: Error | string | unknown,
  context: Partial<EnterpriseError>
) => EnterpriseError;

/**
 * ErrorRecovery class handles all error recovery concerns:
 * - Default recovery configurations per error type
 * - Retry operations with exponential backoff
 * - Fallback value/function handling
 * - Recovery strategy determination
 */
export class ErrorRecovery {
  private recoveryConfigs = new Map<ErrorType, ErrorRecoveryConfig>();

  constructor() {
    this.setupDefaultRecoveryConfigs();
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
   * Get recovery configuration for an error type
   */
  getRecoveryConfig(type: ErrorType): ErrorRecoveryConfig | undefined {
    return this.recoveryConfigs.get(type);
  }

  /**
   * Configure recovery strategy for error type
   */
  configureRecovery(type: ErrorType, config: ErrorRecoveryConfig): void {
    this.recoveryConfigs.set(type, config);
  }

  /**
   * Determine recovery strategy for error
   */
  determineRecoveryStrategy(error: EnterpriseError): void {
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
   * Attempt to recover from error
   */
  async recover<T>(
    error: EnterpriseError,
    operation: () => Promise<T> | T,
    errorHandler: ErrorHandlerCallback
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
        return this.retryOperation(error, operation, config, errorHandler);

      case RecoveryStrategy.FALLBACK:
        return this.useFallback(error, config, errorHandler);

      case RecoveryStrategy.REFRESH:
        if (typeof window !== 'undefined' && 'location' in window && typeof window.location.reload === 'function') {
          window.location.reload();
        }
        return null;

      case RecoveryStrategy.REDIRECT:
        if (typeof window !== 'undefined' && 'location' in window && error.details?.['redirectUrl']) {
          window.location.href = error.details['redirectUrl'] as string;
        }
        return null;

      case RecoveryStrategy.LOGOUT:
        // Trigger logout logic
        if (typeof window !== 'undefined') {
          if (typeof localStorage !== 'undefined') {
            localStorage.clear();
          }
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
          }
          if ('location' in window) {
            window.location.href = '/login';
          }
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation<T>(
    error: EnterpriseError,
    operation: () => Promise<T> | T,
    config: ErrorRecoveryConfig,
    errorHandler: ErrorHandlerCallback
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
      const newError = errorHandler(retryError, {
        ...error,
        retryCount: error.retryCount,
        details: { ...error.details, retryAttempt: error.retryCount }
      });

      return this.retryOperation(newError, operation, config, errorHandler);
    }
  }

  /**
   * Use fallback value or function
   */
  useFallback<T>(
    error: EnterpriseError,
    config: ErrorRecoveryConfig,
    errorHandler: ErrorHandlerCallback
  ): T | null {
    if (config.fallbackFunction) {
      try {
        return config.fallbackFunction() as T | null;
      } catch (fallbackError) {
        errorHandler(fallbackError, {
          type: ErrorType.SYSTEM_ERROR,
          severity: error.severity,
          component: 'ErrorRecovery',
          details: { originalError: error.id }
        });
        return null;
      }
    }

    return (config.fallbackValue ?? null) as T | null;
  }
}
