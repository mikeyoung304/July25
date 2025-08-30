import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { env } from '@/utils/env'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'section' | 'component'
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error logging for debugging
    const errorDetails = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }
    
    console.error('🚨 [ErrorBoundary] Caught Error:', errorDetails)
    
    // Log error in development with full context
    if (env.DEV) {
      console.error('🔍 [ErrorBoundary] Error Analysis')
      console.error('Original Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.error('Error Stack:', error.stack)
    }
    
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => this.setState({ hasError: false, error: null })

  render() {
    const { hasError, error } = this.state
    const { children, fallback, level = 'component' } = this.props

    if (!hasError) return children
    if (fallback) return <>{fallback}</>

    const errorUIs = {
      page: (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">An unexpected error occurred. Please try refreshing the page.</p>
            {env.DEV && error && (
              <div className="mt-4 text-left">
                <h3 className="font-semibold mb-2">Error Details</h3>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {error.toString()}
                </pre>
              </div>
            )}
            <div className="flex gap-2 justify-center mt-4">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </Card>
        </div>
      ),
      section: (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">This section couldn't be loaded</p>
            <Button onClick={this.handleReset} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ),
      component: (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Component error.{' '}
            <Button onClick={this.handleReset} variant="link" size="sm" className="px-1 h-auto">
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return errorUIs[level] || errorUIs.component
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  return (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
}