import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/services/logger';
import { monitoring } from '@/services/monitoring';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    logger.error('Application Error Boundary Caught Error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'AppErrorBoundary',
      errorCount: this.state.errorCount + 1,
    });

    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to error tracking service in production
    if (!import.meta.env.DEV) {
      this.reportErrorToService(error, errorInfo);
    }
  }

  reportErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Report to monitoring service
    monitoring.reportError(error, {
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Also store in localStorage for debugging
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      const existingErrors = JSON.parse(
        localStorage.getItem('error_reports') || '[]'
      );
      existingErrors.push(errorReport);
      
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      
      localStorage.setItem('error_reports', JSON.stringify(existingErrors));
    } catch (e) {
      // Fail silently
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, errorInfo, errorCount } = this.state;
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Oops! Something went wrong
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We're sorry for the inconvenience. The application encountered an unexpected error.
              </p>
              {errorCount > 2 && (
                <p className="mt-2 text-sm text-red-600">
                  Multiple errors detected. You may need to refresh the page.
                </p>
              )}
            </div>

            {/* Error details in development */}
            {isDevelopment && error && (
              <div className="mt-6 bg-gray-100 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Error Details (Development Only)
                </h3>
                <div className="text-xs font-mono text-gray-700 space-y-2">
                  <div>
                    <strong>Message:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <details className="cursor-pointer">
                      <summary className="font-medium">Stack Trace</summary>
                      <pre className="mt-2 whitespace-pre-wrap text-xs overflow-auto max-h-40">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                  {errorInfo?.componentStack && (
                    <details className="cursor-pointer">
                      <summary className="font-medium">Component Stack</summary>
                      <pre className="mt-2 whitespace-pre-wrap text-xs overflow-auto max-h-40">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="w-full"
              >
                Reload Page
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="ghost"
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Button>
            </div>

            {/* Support information */}
            <div className="text-center text-sm text-gray-500">
              <p>If the problem persists, please contact support.</p>
              {!isDevelopment && (
                <p className="mt-1">
                  Error ID: {Date.now().toString(36)}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}