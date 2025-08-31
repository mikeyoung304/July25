import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/services/logger';

interface Props {
  children: ReactNode;
  context?: 'payment' | 'kitchen' | 'orders' | 'app' | 'general';
  onRetry?: () => void;
  onReset?: () => void;
  fallback?: ReactNode;
  maxRetries?: number;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Unified error boundary for all application contexts
 * Configurable for different error scenarios
 */
export class UnifiedErrorBoundary extends Component<Props, State> {
  private readonly maxRetries: number;

  constructor(props: Props) {
    super(props);
    this.maxRetries = props.maxRetries ?? 3;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const context = this.props.context || 'general';
    
    logger.error(`[${context.toUpperCase()}] Error caught by boundary`, error, {
      errorInfo,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      context,
      stack: errorInfo.componentStack
    });

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
      
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const { error, retryCount } = this.state;
      const context = this.props.context || 'general';
      const canRetry = retryCount < this.maxRetries;
      const showDetails = this.props.showDetails ?? import.meta.env.DEV;

      // Context-specific messages
      const contextMessages: Record<string, string> = {
        payment: 'Payment processing encountered an issue',
        kitchen: 'Kitchen display system error',
        orders: 'Order management error',
        app: 'Application error',
        general: 'Something went wrong'
      };

      const contextSuggestions: Record<string, string> = {
        payment: 'Please try again or contact support if the issue persists.',
        kitchen: 'Orders may not display correctly. Please refresh the page.',
        orders: 'Order status may be out of sync. Please refresh to see latest updates.',
        app: 'The application encountered an unexpected error.',
        general: 'An unexpected error occurred. Please try again.'
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            
            <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
              {contextMessages[context]}
            </h2>
            
            <p className="mt-2 text-sm text-center text-gray-600">
              {contextSuggestions[context]}
            </p>

            {showDetails && error && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                <p className="font-mono text-red-600">{error.message}</p>
                {retryCount > 0 && (
                  <p className="mt-1 text-gray-500">
                    Retry attempt: {retryCount}/{this.maxRetries}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                  {retryCount > 0 && ` (${this.maxRetries - retryCount} left)`}
                </button>
              )}
              
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export convenience wrappers for backward compatibility
export const PaymentErrorBoundary: React.FC<{ children: ReactNode; onRetry?: () => void }> = 
  ({ children, onRetry }) => (
    <UnifiedErrorBoundary context="payment" onRetry={onRetry}>
      {children}
    </UnifiedErrorBoundary>
  );

export const KitchenErrorBoundary: React.FC<{ children: ReactNode }> = 
  ({ children }) => (
    <UnifiedErrorBoundary context="kitchen">
      {children}
    </UnifiedErrorBoundary>
  );

export const OrderStatusErrorBoundary: React.FC<{ children: ReactNode }> = 
  ({ children }) => (
    <UnifiedErrorBoundary context="orders">
      {children}
    </UnifiedErrorBoundary>
  );

export const AppErrorBoundary: React.FC<{ children: ReactNode }> = 
  ({ children }) => (
    <UnifiedErrorBoundary context="app">
      {children}
    </UnifiedErrorBoundary>
  );