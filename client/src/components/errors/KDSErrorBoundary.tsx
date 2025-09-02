import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/services/logger';

interface Props {
  children: ReactNode;
  stationName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * Error boundary specifically for Kitchen Display System
 * Handles order status errors and display issues gracefully
 */
export class KDSErrorBoundary extends Component<Props, State> {
  private errorResetTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log KDS error with context
    logger.error('KDS error caught', error, {
      errorInfo,
      station: this.props.stationName || 'unknown',
      timestamp: new Date().toISOString(),
      errorCount: this.state.errorCount + 1,
      // Check for common KDS issues
      isStatusError: error.message.includes('status'),
      isOrderError: error.message.includes('order'),
      isRenderError: error.message.includes('render')
    });

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Auto-recover after 30 seconds for non-critical errors
    if (this.shouldAutoRecover(error)) {
      this.scheduleAutoRecovery();
    }

    // Report critical KDS errors
    if (this.isCriticalError(error)) {
      this.reportCriticalError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.errorResetTimer) {
      clearTimeout(this.errorResetTimer);
    }
  }

  private shouldAutoRecover(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection')
    );
  }

  private isCriticalError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('undefined status') ||
      errorMessage.includes('invalid order') ||
      errorMessage.includes('cannot read properties')
    );
  }

  private scheduleAutoRecovery() {
    this.errorResetTimer = setTimeout(() => {
      logger.info('Auto-recovering from KDS error');
      this.handleReset();
    }, 30000); // 30 seconds
  }

  private reportCriticalError(error: Error, errorInfo: ErrorInfo) {
    // Store critical KDS errors for analysis
    try {
      const kdsErrors = JSON.parse(
        localStorage.getItem('kds_critical_errors') || '[]'
      );
      
      kdsErrors.push({
        timestamp: new Date().toISOString(),
        station: this.props.stationName,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        componentStack: errorInfo.componentStack
      });

      // Keep only last 5 errors
      if (kdsErrors.length > 5) {
        kdsErrors.shift();
      }

      localStorage.setItem('kds_critical_errors', JSON.stringify(kdsErrors));
    } catch (storageError) {
      logger.error('Failed to store KDS error', storageError);
    }
  }

  private handleReset = () => {
    // Clear error state and let React retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Clear any stuck timers
    if (this.errorResetTimer) {
      clearTimeout(this.errorResetTimer);
      this.errorResetTimer = null;
    }
  };

  private handleReload = () => {
    // Full page reload as last resort
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorCount } = this.state;
      const stationName = this.props.stationName || 'Kitchen Display';
      
      // Check for specific KDS errors
      const isStatusError = error?.message.includes('status');
      const isOrderError = error?.message.includes('order');
      
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-xl p-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
              {stationName} Error
            </h1>
            
            <p className="text-center text-gray-600 mb-6">
              {isStatusError 
                ? 'An error occurred processing order status. This has been logged and will be investigated.'
                : isOrderError
                ? 'Unable to display order information. Please refresh to try again.'
                : 'The display encountered an unexpected error and needs to be refreshed.'}
            </p>

            {errorCount > 2 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Multiple errors detected. If issues persist, please contact support.
                </p>
              </div>
            )}

            {error && import.meta.env.DEV && (
              <details className="mb-6 p-4 bg-gray-50 rounded-lg text-xs">
                <summary className="cursor-pointer text-gray-700 font-medium text-sm">
                  Technical Details (Development Only)
                </summary>
                <pre className="mt-3 text-red-600 overflow-auto p-2 bg-white rounded">
                  {error.message}
                  {error.stack && `\n\nStack:\n${error.stack}`}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Home className="w-5 h-5" />
                Reload Display
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              Error ID: KDS-{Date.now().toString(36).toUpperCase()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}