/**
 * Sentry error tracking integration
 * Stub implementation - replace with actual Sentry SDK when ready
 */

export function initSentry() {
  // Stub for Sentry initialization
  // Uncomment and configure when ready to integrate
  
  /*
  import * as Sentry from '@sentry/react';
  import { BrowserTracing } from '@sentry/tracing';
  
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  */
  
  // Mock Sentry global for development
  if (!window.Sentry) {
    window.Sentry = {
      captureException: (error: Error, context?: any) => {
        console.error('[Sentry Mock] Exception:', error, context);
      },
      captureMessage: (message: string, level?: any) => {
        console.log('[Sentry Mock] Message:', message, level);
      },
      setUser: (user: any) => {
        console.log('[Sentry Mock] User:', user);
      },
    } as any;
  }
}

export function reportToSentry(error: Error, errorInfo: any) {
  if (window.Sentry) {
    window.Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }
}