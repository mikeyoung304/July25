import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { logger } from '@/services/logger';
import { reportError } from '@/services/monitoring';
import { ActionButton } from '@/components/ui/ActionButton';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class KioskErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0
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
    logger.error('Kiosk Error Boundary Caught Error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'KioskErrorBoundary',
      retryCount: this.state.retryCount,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to monitoring service
    reportError(error, {
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: 'kiosk-error-boundary',
      retryCount: this.state.retryCount
    });
  }

  handleReset = () => {
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    
    this.setState({
      hasError: false,
      error: null,
      retryCount: this.state.retryCount + 1
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleBackToModeSelection = () => {
    // Reset to mode selection by reloading kiosk page
    window.location.href = '/kiosk';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, retryCount } = this.state;
      const isDevelopment = import.meta.env.DEV;
      const isHighRetryCount = retryCount >= 3;

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <Card className="p-12 text-center bg-white shadow-2xl">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-8">
                <AlertTriangle className="h-10 w-10 text-red-600" />
              </div>

              {/* Error Title */}
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Oops! Something went wrong
              </h1>

              {/* Error Description */}
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {isHighRetryCount 
                  ? "We're experiencing technical difficulties. Our team has been notified."
                  : "Don't worry - this happens sometimes. Let's try to get you back to ordering."
                }
              </p>

              {/* Error details in development */}
              {isDevelopment && error && (
                <Card className="mb-8 p-6 bg-gray-50 text-left">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Error Details (Development Only)
                  </h3>
                  <div className="space-y-3 text-sm font-mono text-gray-700">
                    <div>
                      <strong>Message:</strong> {error.message}
                    </div>
                    <div>
                      <strong>Retry Count:</strong> {retryCount}
                    </div>
                    {error.stack && (
                      <details className="cursor-pointer">
                        <summary className="font-medium hover:text-gray-900">
                          Stack Trace
                        </summary>
                        <pre className="mt-3 whitespace-pre-wrap text-xs overflow-auto max-h-40 bg-gray-100 p-3 rounded">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </Card>
              )}

              {/* Action buttons */}
              <div className="space-y-4">
                {/* Primary actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!isHighRetryCount && (
                    <ActionButton
                      onClick={this.handleReset}
                      size="large"
                      className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 text-lg font-semibold"
                    >
                      <RefreshCw className="mr-3 h-5 w-5" />
                      Try Again
                    </ActionButton>
                  )}
                  
                  <ActionButton
                    onClick={this.handleBackToModeSelection}
                    size="large"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold"
                  >
                    <ArrowLeft className="mr-3 h-5 w-5" />
                    Start Over
                  </ActionButton>
                </div>

                {/* Secondary actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ActionButton
                    onClick={this.handleReload}
                    variant="outline"
                    size="large"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg"
                  >
                    Reload Page
                  </ActionButton>
                  
                  <ActionButton
                    onClick={this.handleGoHome}
                    variant="ghost"
                    size="large"
                    className="text-gray-600 hover:text-gray-800 px-8 py-4 text-lg"
                  >
                    <Home className="mr-3 h-5 w-5" />
                    Go to Dashboard
                  </ActionButton>
                </div>
              </div>

              {/* Support information */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-lg text-gray-500 mb-2">
                  Need help? Ask a team member for assistance.
                </p>
                {!isDevelopment && (
                  <p className="text-sm text-gray-400">
                    Error ID: {Date.now().toString(36).toUpperCase()}
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}