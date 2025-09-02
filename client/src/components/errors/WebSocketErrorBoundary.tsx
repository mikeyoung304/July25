import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { logger } from '@/services/logger';
import { connectionManager } from '@/services/websocket/ConnectionManager';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isReconnecting: boolean;
}

/**
 * Error boundary for WebSocket connection issues
 * Provides automatic reconnection and user feedback
 */
export class WebSocketErrorBoundary extends Component<Props, State> {
  private readonly MAX_RETRIES = 3;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isReconnecting: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log WebSocket error for debugging
    logger.error('WebSocket error caught by boundary', error, {
      errorInfo,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
    });

    this.setState({
      error,
      errorInfo
    });

    // Check if it's a WebSocket-related error
    if (this.isWebSocketError(error)) {
      this.attemptReconnection();
    }
  }

  componentWillUnmount() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }

  private isWebSocketError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('websocket') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('network') ||
      errorMessage.includes('realtime')
    );
  }

  private attemptReconnection = () => {
    if (this.state.retryCount >= this.MAX_RETRIES) {
      logger.warn('Max WebSocket reconnection attempts reached');
      return;
    }

    this.setState({ isReconnecting: true });

    // Exponential backoff for reconnection
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        // Force disconnect and reconnect
        connectionManager.forceDisconnect();
        await connectionManager.connect();
        
        // If successful, reset error state
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: 0,
          isReconnecting: false
        });
        
        logger.info('WebSocket reconnection successful');
      } catch (reconnectError) {
        logger.error('WebSocket reconnection failed', reconnectError);
        
        this.setState(prevState => ({
          retryCount: prevState.retryCount + 1,
          isReconnecting: false
        }));
        
        // Try again if we haven't hit the limit
        if (this.state.retryCount < this.MAX_RETRIES - 1) {
          this.attemptReconnection();
        }
      }
    }, delay);
  };

  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isReconnecting: false
    });
    
    // Force reconnection
    connectionManager.forceDisconnect();
    connectionManager.connect().catch(error => {
      logger.error('Manual WebSocket reconnection failed', error);
      this.setState({
        hasError: true,
        error: error instanceof Error ? error : new Error('Reconnection failed')
      });
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount, isReconnecting } = this.state;
      const isWebSocketIssue = error && this.isWebSocketError(error);
      
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-orange-100 rounded-full mb-4">
              <WifiOff className="w-6 h-6 text-orange-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
              {isWebSocketIssue ? 'Connection Issue' : 'Something went wrong'}
            </h2>
            
            <p className="text-center text-gray-600 mb-6">
              {this.props.fallbackMessage || 
                (isWebSocketIssue 
                  ? 'Real-time updates are temporarily unavailable. The app will continue to work but may not show live updates.'
                  : 'An unexpected error occurred. Please try refreshing the page.'
                )}
            </p>

            {isReconnecting && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 text-center">
                  Attempting to reconnect... (Attempt {retryCount + 1}/{this.MAX_RETRIES})
                </p>
              </div>
            )}

            {error && import.meta.env.DEV && (
              <details className="mb-4 p-3 bg-gray-50 rounded text-xs">
                <summary className="cursor-pointer text-gray-700 font-medium">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-red-600 overflow-auto">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleManualRetry}
              disabled={isReconnecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
              {isReconnecting ? 'Reconnecting...' : 'Try Again'}
            </button>

            {retryCount >= this.MAX_RETRIES && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Unable to establish connection. Please check your network and try again.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}