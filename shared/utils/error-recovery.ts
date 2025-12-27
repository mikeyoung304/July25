/**
 * Error Recovery Module
 * Handles recovery strategies, retries, and fallbacks for errors
 */

import type { EnterpriseError, ErrorRecoveryConfig } from './error-types';
import { ErrorType, RecoveryStrategy } from './error-types';
import { MemoryMonitor } from './memory-monitoring';

/**
 * Callback function type used to transform raw errors into EnterpriseError instances
 * during recovery operations.
 *
 * @param error - The original error (can be Error, string, or unknown)
 * @param context - Partial error context to merge with the created EnterpriseError
 * @returns A fully-formed EnterpriseError instance
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
 *
 * @example
 * const recovery = new ErrorRecovery();
 * recovery.configureRecovery(ErrorType.API_ERROR, {
 *   maxRetries: 5,
 *   retryDelay: 1000,
 *   backoffMultiplier: 2,
 *   maxRetryDelay: 30000
 * });
 */
export class ErrorRecovery {
  private recoveryConfigs = new Map<ErrorType, ErrorRecoveryConfig>();

  /**
   * Creates a new ErrorRecovery instance with default recovery configurations.
   * Default configurations are set up for common error types like network, API,
   * timeout, authentication, and memory errors.
   */
  constructor() {
    this.setupDefaultRecoveryConfigs();
  }

  /**
   * Sets up default recovery configurations for common error types.
   * Called automatically during construction. Configures retry strategies
   * with exponential backoff for network, API, and timeout errors.
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
   * Retrieves the recovery configuration for a specific error type.
   *
   * @param type - The ErrorType to get configuration for
   * @returns The ErrorRecoveryConfig for the type, or undefined if not configured
   *
   * @example
   * const config = recovery.getRecoveryConfig(ErrorType.NETWORK_ERROR);
   * if (config) {
   *   logger.debug(`Max retries: ${config.maxRetries}`);
   * }
   */
  getRecoveryConfig(type: ErrorType): ErrorRecoveryConfig | undefined {
    return this.recoveryConfigs.get(type);
  }

  /**
   * Configures or updates the recovery strategy for a specific error type.
   * Overwrites any existing configuration for the given type.
   *
   * @param type - The ErrorType to configure
   * @param config - The recovery configuration to apply
   *
   * @example
   * recovery.configureRecovery(ErrorType.NETWORK_ERROR, {
   *   maxRetries: 5,
   *   retryDelay: 2000,
   *   backoffMultiplier: 1.5,
   *   maxRetryDelay: 15000
   * });
   */
  configureRecovery(type: ErrorType, config: ErrorRecoveryConfig): void {
    this.recoveryConfigs.set(type, config);
  }

  /**
   * Determines and assigns the appropriate recovery strategy for an error.
   * Mutates the error object to set canRecover, maxRetries, and recoveryStrategy properties
   * based on the error type and configured recovery options.
   *
   * @param error - The EnterpriseError to analyze (modified in place)
   *
   * @example
   * const error = createEnterpriseError(new Error('Network failed'), {
   *   type: ErrorType.NETWORK_ERROR
   * });
   * recovery.determineRecoveryStrategy(error);
   * // error.recoveryStrategy is now RecoveryStrategy.RETRY
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
   * Attempts to recover from an error using the configured recovery strategy.
   * Supports retry with backoff, fallback values, page refresh, redirect, and logout.
   *
   * @template T - The expected return type of the operation
   * @param error - The EnterpriseError to recover from
   * @param operation - The operation to retry (for RETRY strategy)
   * @param errorHandler - Callback to create EnterpriseErrors from retry failures
   * @returns The operation result on success, or null if recovery failed
   *
   * @example
   * const result = await recovery.recover(
   *   networkError,
   *   () => fetchData(),
   *   (err, ctx) => createEnterpriseError(err, ctx)
   * );
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
   * Retries a failed operation with exponential backoff.
   * Increments the retry count on the error object and respects maxRetries limit.
   * Calls onRetry and onMaxRetriesReached callbacks when configured.
   *
   * @template T - The expected return type of the operation
   * @param error - The EnterpriseError tracking retry state
   * @param operation - The operation to retry
   * @param config - The recovery configuration with retry settings
   * @param errorHandler - Callback to create EnterpriseErrors from retry failures
   * @returns The operation result on success, or null if max retries exceeded
   *
   * @example
   * const result = await recovery.retryOperation(
   *   error,
   *   () => api.fetchData(),
   *   { maxRetries: 3, retryDelay: 1000, backoffMultiplier: 2, maxRetryDelay: 10000 },
   *   errorHandler
   * );
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
   * Returns a fallback value when error recovery fails.
   * Executes the configured fallback function if present, otherwise returns the fallback value.
   * If the fallback function throws, the error is passed to the errorHandler.
   *
   * @template T - The expected return type
   * @param error - The original EnterpriseError
   * @param config - The recovery configuration containing fallback settings
   * @param errorHandler - Callback to handle errors from fallback function execution
   * @returns The fallback value or function result, or null if neither is configured
   *
   * @example
   * const fallbackData = recovery.useFallback<UserData>(
   *   error,
   *   { fallbackValue: { name: 'Guest', role: 'anonymous' } },
   *   errorHandler
   * );
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
