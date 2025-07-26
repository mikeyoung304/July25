/**
 * Global type declarations for monitoring services
 */

declare global {
  interface Window {
    // Sentry
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
      captureMessage: (message: string, context?: any) => void;
      setUser: (user: { id?: string; [key: string]: any }) => void;
      addBreadcrumb: (breadcrumb: any) => void;
      configureScope: (callback: (scope: any) => void) => void;
    };

    // DataDog RUM
    DD_RUM?: {
      init: (config: any) => void;
      addTiming: (name: string, value: number) => void;
      addAction: (name: string, context?: any) => void;
      addError: (error: Error, context?: any) => void;
      setUser: (user: { id: string; [key: string]: any }) => void;
      startView: (name: string) => void;
      stopView: () => void;
    };

    // LogRocket
    LogRocket?: {
      init: (appId: string, config?: any) => void;
      identify: (userId: string, traits?: any) => void;
      track: (event: string, properties?: any) => void;
      getSessionURL: (callback: (url: string) => void) => void;
      captureException: (error: Error) => void;
      log: (message: string, data?: any) => void;
    };
  }
}

export {};