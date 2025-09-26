/**
 * Simple logging service for client-side applications
 */

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

class ClientLogger implements Logger {
  private isDevelopment = import.meta.env.DEV;

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.warn(`[INFO] ${message}`, meta || '');
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, meta || '');
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, meta || '');
  }
}

export const logger = new ClientLogger();
