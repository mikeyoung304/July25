import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'section' | 'component'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to error tracking service (e.g., Sentry) in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service
      console.error('[Production Error]:', error.message)
    }

    this.setState({
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, level = 'component' } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>
      }

      // Default error UI based on level
      switch (level) {
        case 'page':
          return (
            <div className="min-h-screen flex items-center justify-center p-4">
              <Card className="max-w-lg w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Something went wrong
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    An unexpected error occurred. Please try refreshing the page.
                  </p>
                  {process.env.NODE_ENV === 'development' && (
                    <Alert variant="destructive">
                      <AlertTitle>Error Details</AlertTitle>
                      <AlertDescription>
                        <pre className="text-xs overflow-auto mt-2">
                          {error.toString()}
                          {errorInfo && errorInfo.componentStack}
                        </pre>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={() => window.location.reload()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Page
                    </Button>
                    <Button variant="outline" onClick={() => window.history.back()}>
                      Go Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )

        case 'section':
          return (
            <Card className="border-destructive">
              <CardContent className="py-8 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  This section couldn't be loaded
                </p>
                <Button onClick={this.handleReset} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )

        case 'component':
        default:
          return (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Component Error</AlertTitle>
              <AlertDescription>
                This component couldn't be rendered. 
                <Button 
                  onClick={this.handleReset} 
                  variant="link" 
                  size="sm"
                  className="px-2 h-auto"
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )
      }
    }

    return children
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}