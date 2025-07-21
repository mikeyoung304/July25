/**
 * Client-side logging service
 * Provides environment-aware logging with proper production handling
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    // Add to buffer for error reporting
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Only console log in development or for errors
    if (this.shouldLog(level)) {
      const consoleMethod = console[level] || console.log;
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      
      if (data) {
        consoleMethod(prefix, message, data);
      } else {
        consoleMethod(prefix, message);
      }
    }

    // In production, send errors to monitoring service
    if (!this.isDevelopment && level === 'error') {
      this.sendToMonitoring(entry);
    }
  }

  debug(message: string, data?: any): void {
    this.formatMessage('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.formatMessage('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.formatMessage('warn', message, data);
  }

  error(message: string, error?: Error | any, data?: any): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error : new Error(String(error)),
      data,
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
    // TODO: Integrate with error monitoring service (Sentry, LogRocket, etc.)
    // For now, we'll just store in localStorage for debugging
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
    } catch (e) {
      // Fail silently if localStorage is full or unavailable
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };