/**
 * Client-side logging service
 * Provides environment-aware logging with proper production handling
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
  error?: Error;
  context?: LogContext;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;
  private context: LogContext = {};

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   * Follows Pino/Bunyan pattern for structured logging
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger({ ...this.context, ...additionalContext });
    childLogger.logBuffer = this.logBuffer; // Share buffer with parent
    return childLogger;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): void {
    // Merge context with data
    const mergedData = Object.keys(this.context).length > 0
      ? { ...this.context, ...(typeof data === 'object' && data !== null ? data : { value: data }) }
      : data;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data: mergedData,
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
    };

    // Add to buffer for error reporting
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Only console log in development or for errors
    if (this.shouldLog(level)) {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      
      if (data) {
        switch (level) {
          case 'debug':
          case 'info':
            console.warn(prefix, message, data); // Use warn for debug/info as they're allowed
            break;
          case 'warn':
            console.warn(prefix, message, data);
            break;
          case 'error':
            console.error(prefix, message, data);
            break;
        }
      } else {
        switch (level) {
          case 'debug':
          case 'info':
            console.warn(prefix, message); // Use warn for debug/info as they're allowed
            break;
          case 'warn':
            console.warn(prefix, message);
            break;
          case 'error':
            console.error(prefix, message);
            break;
        }
      }
    }

    // In production, send errors to monitoring service
    if (!this.isDevelopment && level === 'error') {
      this.sendToMonitoring(entry);
    }
  }

  debug(message: string, data?: unknown): void {
    this.formatMessage('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.formatMessage('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.formatMessage('warn', message, data);
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    // Merge context with data
    const mergedData = Object.keys(this.context).length > 0
      ? { ...this.context, ...(typeof data === 'object' && data !== null ? data : { value: data }) }
      : data;

    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error : new Error(String(error)),
      data: mergedData,
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
    };

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Always log errors
    console.error(`[${entry.timestamp}] [ERROR]`, message, error, data);

    // Send to monitoring in production
    if (!this.isDevelopment) {
      this.sendToMonitoring(entry);
    }
  }

  // Get recent logs for error reporting
  getRecentLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  // Clear log buffer
  clearLogs(): void {
    this.logBuffer = [];
  }

  private sendToMonitoring(entry: LogEntry): void {
    // Store in localStorage for debugging
    try {
      const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      errorLogs.push({
        ...entry,
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
      
      // Keep only last 50 errors
      if (errorLogs.length > 50) {
        errorLogs.splice(0, errorLogs.length - 50);
      }
      
      localStorage.setItem('error_logs', JSON.stringify(errorLogs));
    } catch {
      // Fail silently if localStorage is full or unavailable
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };