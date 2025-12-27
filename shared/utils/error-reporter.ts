/**
 * Error Reporter Module
 * Handles logging, remote reporting, and user notifications for errors
 */

import type { EnterpriseError, ErrorReportingConfig } from './error-types';
import { ErrorType, ErrorSeverity } from './error-types';

/**
 * ErrorReporter class handles all error reporting concerns:
 * - Console logging with appropriate log levels
 * - Remote error reporting to external services
 * - User notifications for errors
 */
export class ErrorReporter {
  private config: ErrorReportingConfig;

  /**
   * Creates a new ErrorReporter instance with the specified configuration.
   *
   * @param config - Partial configuration object to customize reporter behavior
   *
   * @example
   * const reporter = new ErrorReporter({
   *   enableRemoteReporting: true,
   *   reportingEndpoint: 'https://errors.example.com/report'
   * });
   */
  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableRemoteReporting: false,
      enableUserNotification: true,
      ...config
    };
  }

  /**
   * Updates the reporter configuration by merging with existing settings.
   *
   * @param config - Partial configuration object with properties to update
   *
   * @example
   * reporter.updateConfig({ enableRemoteReporting: true });
   */
  updateConfig(config: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Returns a copy of the current reporter configuration.
   *
   * @returns A shallow copy of the current ErrorReportingConfig
   */
  getConfig(): ErrorReportingConfig {
    return { ...this.config };
  }

  /**
   * Checks whether console logging is enabled in the current configuration.
   *
   * @returns True if console logging is enabled, false otherwise
   */
  isConsoleLoggingEnabled(): boolean {
    return this.config.enableConsoleLogging;
  }

  /**
   * Checks whether remote error reporting is enabled in the current configuration.
   *
   * @returns True if remote reporting is enabled, false otherwise
   */
  isRemoteReportingEnabled(): boolean {
    return this.config.enableRemoteReporting;
  }

  /**
   * Checks whether user notifications are enabled in the current configuration.
   *
   * @returns True if user notifications are enabled, false otherwise
   */
  isUserNotificationEnabled(): boolean {
    return this.config.enableUserNotification;
  }

  /**
   * Logs an enterprise error to the console using the appropriate log level.
   * Uses the window.logger if available in browser environments.
   *
   * @param error - The EnterpriseError to log
   *
   * @example
   * reporter.logError({
   *   id: 'err-123',
   *   type: ErrorType.NETWORK_ERROR,
   *   severity: ErrorSeverity.HIGH,
   *   message: 'Connection failed'
   * });
   */
  logError(error: EnterpriseError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.severity.toUpperCase()}] ${error.type}: ${error.message}`;

    if (typeof window !== 'undefined' && (window as unknown as { logger?: unknown }).logger) {
      const logger = (window as unknown as { logger: { error: (msg: string, data: object) => void; warn: (msg: string, data: object) => void } }).logger;
      const logData = {
        id: error.id,
        component: error.component,
        service: error.service,
        timestamp: error.timestamp,
        details: error.details,
        stack: error.stack
      };

      if (logLevel === 'error') {
        logger.error(logMessage, logData);
      } else {
        logger.warn(logMessage, logData);
      }
    }
  }

  /**
   * Maps an error severity level to the appropriate console log level.
   *
   * @param severity - The ErrorSeverity to map
   * @returns The console log level ('error', 'warn', 'info', or 'log')
   *
   * @example
   * reporter.getLogLevel(ErrorSeverity.CRITICAL); // Returns 'error'
   * reporter.getLogLevel(ErrorSeverity.LOW); // Returns 'info'
   */
  getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'log' {
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
   * Reports an error to the configured remote reporting service.
   * Sanitizes sensitive data before sending if a filter function is configured.
   * Does nothing if no reporting endpoint is configured or fetch is unavailable.
   *
   * @param error - The EnterpriseError to report
   * @returns A promise that resolves when the error has been reported
   *
   * @example
   * await reporter.reportError(enterpriseError);
   */
  async reportError(error: EnterpriseError): Promise<void> {
    if (!this.config.reportingEndpoint) {
      return;
    }

    // Check if fetch is available
    if (typeof fetch === 'undefined') {
      // Debug: fetch API not available for error reporting
      return;
    }

    try {
      const sanitizedError = this.config.filterSensitiveData?.(error) || error;

      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedError)
      });
    } catch {
      // Debug: Failed to report error
    }
  }

  /**
   * Notifies the user about an error using the configured callback or default behavior.
   * For critical errors without a custom callback, uses window.alert in browser environments.
   *
   * @param error - The EnterpriseError to notify the user about
   *
   * @example
   * reporter.notifyUser(enterpriseError);
   */
  notifyUser(error: EnterpriseError): void {
    if (this.config.userNotificationCallback) {
      this.config.userNotificationCallback(error);
    } else {
      // Default user notification
      const userMessage = this.getUserFriendlyMessage(error);

      if (typeof window !== 'undefined' && 'alert' in window && error.severity === ErrorSeverity.CRITICAL) {
        alert(userMessage);
      } else {
        // Debug: User notification would be shown
      }
    }
  }

  /**
   * Converts an enterprise error into a user-friendly message suitable for display.
   * Maps technical error types to plain-language descriptions.
   *
   * @param error - The EnterpriseError to convert
   * @returns A user-friendly error message string
   *
   * @example
   * const message = reporter.getUserFriendlyMessage(networkError);
   * // Returns 'Network connection issue. Please check your internet connection and try again.'
   */
  getUserFriendlyMessage(error: EnterpriseError): string {
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
}
