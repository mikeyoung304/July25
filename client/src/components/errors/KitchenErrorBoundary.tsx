import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string
}

class KitchenErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `kds_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console with detailed info
    console.error('🚨 Kitchen Display System Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })

    // In production, you might want to send this to an error tracking service
    // Example: Sentry, LogRocket, or custom error API
    if (process.env.NODE_ENV === 'production') {
      // reportErrorToService({
      //   error,
      //   errorInfo,
      //   errorId: this.state.errorId
      // })
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    })
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props
      const { error } = this.state

      if (Fallback && error) {
        return <Fallback error={error} retry={this.handleRetry} />
      }

      return <DefaultKitchenErrorFallback error={error} retry={this.handleRetry} />
    }

    return this.props.children
  }
}

function DefaultKitchenErrorFallback({ error, retry }: { error: Error | null; retry: () => void }) {
  const isNetworkError = error?.message?.includes('fetch') || 
                         error?.message?.includes('network') ||
                         error?.message?.includes('connection')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center">
        <div className="mb-6">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Kitchen Display Error</h2>
          
          {isNetworkError ? (
            <div className="text-gray-600">
              <p className="mb-2">Connection to the kitchen system was lost.</p>
              <p>This may affect real-time order updates.</p>
            </div>
          ) : (
            <div className="text-gray-600">
              <p className="mb-2">An unexpected error occurred in the kitchen display.</p>
              <p>Orders may not be displaying correctly.</p>
            </div>
          )}
        </div>

        {/* Error Details - Only in development */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-6 p-4 bg-gray-100 rounded text-left text-xs">
            <div className="font-bold mb-2">Error Details (Dev Mode):</div>
            <div className="text-red-600 font-mono">
              {error.message}
            </div>
            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-gray-600">Stack Trace</summary>
                <pre className="mt-1 text-gray-500 text-xs overflow-auto max-h-32">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Recovery Actions */}
        <div className="space-y-3">
          <Button onClick={retry} className="w-full" size="lg">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reload Page
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
            >
              <Home className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Help Information */}
        <div className="mt-6 pt-4 border-t text-sm text-gray-500">
          <p>If this problem persists, please contact support.</p>
          {isNetworkError && (
            <p className="mt-1">
              Check your internet connection and server status.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export { KitchenErrorBoundary }