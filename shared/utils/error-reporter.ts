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

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableRemoteReporting: false,
      enableUserNotification: true,
      ...config
    };
  }

  /**
   * Update reporter configuration
   */
  updateConfig(config: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorReportingConfig {
    return { ...this.config };
  }

  /**
   * Check if console logging is enabled
   */
  isConsoleLoggingEnabled(): boolean {
    return this.config.enableConsoleLogging;
  }

  /**
   * Check if remote reporting is enabled
   */
  isRemoteReportingEnabled(): boolean {
    return this.config.enableRemoteReporting;
  }

  /**
   * Check if user notification is enabled
   */
  isUserNotificationEnabled(): boolean {
    return this.config.enableUserNotification;
  }

  /**
   * Log error to console
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
   * Get appropriate console log level based on severity
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
   * Report error to remote service
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
   * Notify user about error
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
   * Get user-friendly error message based on error type
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
