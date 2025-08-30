import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/services/monitoring/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  isolate?: boolean; // Isolate errors to this boundary
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * Global Error Boundary with recovery options
 * Best practices:
 * - Logs errors to monitoring service
 * - Provides user-friendly error messages
 * - Offers recovery actions
 * - Tracks error frequency for circuit breaking
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private resetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
    this.resetKeys = props.resetKeys || [];
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, isolate } = this.props;
    const { errorCount } = this.state;

    // Log to monitoring service
    logger.error('Application Error Boundary Triggered', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorCount: errorCount + 1,
      isolated: isolate || false
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error details
    this.setState({
      errorInfo,
      errorCount: errorCount + 1
    });

    // Auto-recover after 3 errors (circuit breaker pattern)
    if (errorCount >= 3) {
      this.scheduleReset(5000);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props;
    const prevResetKeys = prevProps.resetKeys || [];
    
    // Reset if resetKeys changed
    if (resetKeys && resetKeys.some((key, idx) => key !== prevResetKeys[idx])) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  scheduleReset = (delay: number) => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorCount } = this.state;
    const { children, fallback, isolate } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
              {isolate ? 'Component Error' : 'Something went wrong'}
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              {errorCount > 2
                ? 'This error keeps happening. Please try refreshing the page.'
                : 'We encountered an unexpected error. You can try again or refresh the page.'}
            </p>

            {/* Error details in development */}
            {import.meta.env.DEV && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                  {error.stack || error.message}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.resetErrorBoundary}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>

              {!isolate && (
                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go to Home
                </button>
              )}
            </div>

            {errorCount > 1 && (
              <p className="text-xs text-gray-500 text-center mt-4">
                Error occurred {errorCount} times
              </p>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}