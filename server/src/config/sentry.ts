import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { logger } from '../utils/logger';

let sentryInitialized = false;

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Safe to call multiple times - will only initialize once
 */
export function initializeSentry(): void {
  // Avoid duplicate initialization
  if (sentryInitialized) {
    logger.debug('Sentry already initialized, skipping...');
    return;
  }

  const dsn = process.env['SENTRY_DSN'];
  const environment = process.env['SENTRY_ENVIRONMENT'] || process.env['NODE_ENV'] || 'development';
  const tracesSampleRate = parseFloat(process.env['SENTRY_TRACES_SAMPLE_RATE'] || '0.1');

  // Skip initialization if no DSN provided or if using placeholder
  if (!dsn || dsn.includes('placeholder')) {
    logger.info('Sentry DSN not configured (using placeholder), skipping initialization');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,

      // Performance Monitoring
      tracesSampleRate, // Capture 10% of transactions for performance monitoring

      // Profiling
      profilesSampleRate: tracesSampleRate, // Match trace sample rate
      integrations: [
        new ProfilingIntegration(),
      ],

      // Additional configuration
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request) {
          // Remove sensitive headers
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
            delete event.request.headers['x-csrf-token'];
          }

          // Remove sensitive query parameters
          if (event.request.query_string) {
            const params = new URLSearchParams(event.request.query_string);
            params.delete('token');
            params.delete('key');
            params.delete('secret');
            event.request.query_string = params.toString();
          }
        }

        // Remove sensitive context data
        if (event.contexts?.user) {
          delete event.contexts.user.ip_address;
        }

        return event;
      },

      // Ignore common non-critical errors
      ignoreErrors: [
        // Network errors
        'NetworkError',
        'Network request failed',

        // CSRF token errors (handled by our middleware)
        'EBADCSRFTOKEN',
        'invalid csrf token',

        // Client disconnection (normal)
        'ECONNRESET',
        'EPIPE',

        // Rate limiting (expected)
        'Too Many Requests',
      ],
    });

    sentryInitialized = true;
    logger.info(`Sentry initialized for environment: ${environment}`);
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Get Sentry request handler middleware for Express
 */
export function getSentryRequestHandler() {
  if (!sentryInitialized) {
    // Return no-op middleware if Sentry is not initialized
    return (_req: any, _res: any, next: any) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Get Sentry tracing handler middleware for Express
 */
export function getSentryTracingHandler() {
  if (!sentryInitialized) {
    // Return no-op middleware if Sentry is not initialized
    return (_req: any, _res: any, next: any) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Get Sentry error handler middleware for Express
 * Should be added after all routes but before other error handlers
 */
export function getSentryErrorHandler() {
  if (!sentryInitialized) {
    // Return no-op middleware if Sentry is not initialized
    return (_err: any, _req: any, _res: any, next: any) => next(_err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Handle all errors with status code >= 500
      return !error.statusCode || error.statusCode >= 500;
    },
  });
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (sentryInitialized) {
    Sentry.captureException(error, { extra: context });
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  if (sentryInitialized) {
    Sentry.captureMessage(message, { level, extra: context });
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  if (sentryInitialized) {
    Sentry.setUser(user);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  if (sentryInitialized) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}

/**
 * Check if Sentry is initialized and configured
 */
export function isSentryEnabled(): boolean {
  return sentryInitialized;
}

// Export Sentry for advanced usage
export { Sentry };
