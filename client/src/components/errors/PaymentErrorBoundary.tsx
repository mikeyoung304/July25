import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/services/logger';
import { DemoAuthService } from '@/services/auth/demoAuth';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  hasRefreshedToken: boolean;
}

/**
 * Specialized error boundary for payment processing
 * Provides recovery options and logs payment failures for audit
 */
export class PaymentErrorBoundary extends Component<Props, State> {
  private readonly MAX_RETRIES = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      hasRefreshedToken: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if it's an auth error in demo mode
    const isAuthError = error.message?.includes('401') || 
                       error.message?.includes('403') || 
                       error.message?.includes('Unauthorized');
    const isDemoMode = !import.meta.env.VITE_SQUARE_ACCESS_TOKEN || 
                      import.meta.env.VITE_SQUARE_ACCESS_TOKEN === 'demo' || 
                      import.meta.env.DEV;
    
    // Auto-refresh token once for auth errors in demo mode
    if (isAuthError && isDemoMode && !this.state.hasRefreshedToken) {
      logger.info('Auth error in demo mode, refreshing token...');
      try {
        await DemoAuthService.refreshTokenIfNeeded();
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          hasRefreshedToken: true
        });
        // Retry the operation
        if (this.props.onRetry) {
          this.props.onRetry();
        }
        return;
      } catch (refreshError) {
        logger.error('Failed to refresh demo token', refreshError);
      }
    }
    
    // Log payment error for audit trail
    logger.error('Payment processing error caught by boundary', error, {
      errorInfo,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      hasRefreshedToken: this.state.hasRefreshedToken,
      // Include payment context if available
      paymentContext: {
        page: 'CheckoutPage',
        component: errorInfo.componentStack
      }
    });

    // Store error details for display
    this.setState({
      error,
      errorInfo
    });

    // Report to monitoring service in production
    if (!import.meta.env.DEV) {
      this.reportToMonitoring(error, errorInfo);
    }
  }

  private reportToMonitoring(error: Error, errorInfo: ErrorInfo) {
    // Store critical payment error for later analysis
    try {
      const paymentErrors = JSON.parse(
        localStorage.getItem('payment_errors') || '[]'
      );
      
      paymentErrors.push({
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
        userAgent: navigator.userAgent,
        url: window.location.href
      });

      // Keep only last 10 payment errors
      if (paymentErrors.length > 10) {
        paymentErrors.shift();
      }

      localStorage.setItem('payment_errors', JSON.stringify(paymentErrors));
    } catch (storageError) {
      logger.error('Failed to store payment error', storageError);
    }
  }

  private handleRetry = async () => {
    if (this.state.retryCount < this.MAX_RETRIES) {
      // Refresh token before retry in demo mode
      const isDemoMode = !import.meta.env.VITE_SQUARE_ACCESS_TOKEN || 
                        import.meta.env.VITE_SQUARE_ACCESS_TOKEN === 'demo' || 
                        import.meta.env.DEV;
      
      if (isDemoMode && !this.state.hasRefreshedToken) {
        try {
          await DemoAuthService.refreshTokenIfNeeded();
        } catch (err) {
          logger.error('Failed to refresh token on retry', err);
        }
      }
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        hasRefreshedToken: true
      }));

      // Call parent retry handler if provided
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;
      const canRetry = retryCount < this.MAX_RETRIES;
      const isNetworkError = error?.message?.toLowerCase().includes('network') ||
                            error?.message?.toLowerCase().includes('fetch');
      
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
              Payment Processing Error
            </h2>
            
            <p className="text-center text-gray-600 mb-6">
              {isNetworkError 
                ? 'Unable to connect to payment service. Please check your internet connection.'
                : 'An error occurred while processing your payment. Your card has not been charged.'}
            </p>

            {error && import.meta.env.DEV && (
              <details className="mb-4 p-3 bg-gray-50 rounded text-xs">
                <summary className="cursor-pointer text-gray-700 font-medium">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-red-600 overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again ({this.MAX_RETRIES - retryCount} attempts remaining)
                </button>
              )}

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </button>
            </div>

            {!canRetry && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Maximum retry attempts reached. Please contact support if the issue persists.
              </p>
            )}

            <p className="text-center text-xs text-gray-400 mt-6">
              Error ID: {Date.now().toString(36).toUpperCase()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}