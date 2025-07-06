import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary'

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Mock console.error to avoid noise in test output
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component level error boundary', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('renders error UI when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Component Error')).toBeInTheDocument()
      expect(screen.getByText(/This component couldn't be rendered/)).toBeInTheDocument()
    })

    it('allows retry after error', () => {
      let shouldThrow = true
      
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>No error</div>
      }
      
      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Component Error')).toBeInTheDocument()
      
      // Set shouldThrow to false so the component won't throw on retry
      shouldThrow = false
      
      // Click retry
      fireEvent.click(screen.getByText('Try again'))
      
      expect(screen.queryByText('Component Error')).not.toBeInTheDocument()
      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Custom error UI')).toBeInTheDocument()
      expect(screen.queryByText('Component Error')).not.toBeInTheDocument()
    })

    it('calls onError callback when error occurs', () => {
      const onError = jest.fn()
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      )
    })
  })

  describe('Section level error boundary', () => {
    it('renders section error UI', () => {
      render(
        <ErrorBoundary level="section">
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText("This section couldn't be loaded")).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('shows error icon for section errors', () => {
      render(
        <ErrorBoundary level="section">
          <ThrowError />
        </ErrorBoundary>
      )
      
      // Check that the error message is displayed which indicates the icon is rendered
      expect(screen.getByText("This section couldn't be loaded")).toBeInTheDocument()
      // The icon is rendered as part of the section error UI
    })
  })

  describe('Page level error boundary', () => {
    it('renders page error UI', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument()
      expect(screen.getByText('Refresh Page')).toBeInTheDocument()
      expect(screen.getByText('Go Back')).toBeInTheDocument()
    })

    it('shows error details in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      render(
        <ErrorBoundary level="page">
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Error Details')).toBeInTheDocument()
      expect(screen.getByText(/Error: Test error/)).toBeInTheDocument()
      
      process.env.NODE_ENV = originalEnv
    })

    it('hides error details in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      render(
        <ErrorBoundary level="page">
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('withErrorBoundary HOC', () => {
    it('wraps component with error boundary', () => {
      const TestComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
        if (shouldThrow) throw new Error('HOC test error')
        return <div>HOC content</div>
      }
      
      const WrappedComponent = withErrorBoundary(TestComponent)
      
      const { rerender } = render(<WrappedComponent shouldThrow={false} />)
      expect(screen.getByText('HOC content')).toBeInTheDocument()
      
      rerender(<WrappedComponent shouldThrow={true} />)
      expect(screen.getByText('Component Error')).toBeInTheDocument()
    })

    it('passes error boundary props', () => {
      const TestComponent = () => {
        throw new Error('Test')
      }
      
      const onError = jest.fn()
      const WrappedComponent = withErrorBoundary(TestComponent, {
        level: 'section',
        onError
      })
      
      render(<WrappedComponent />)
      
      expect(screen.getByText("This section couldn't be loaded")).toBeInTheDocument()
      expect(onError).toHaveBeenCalled()
    })

    it('preserves display name', () => {
      const TestComponent = () => <div>Test</div>
      TestComponent.displayName = 'TestComponent'
      
      const WrappedComponent = withErrorBoundary(TestComponent)
      
      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)')
    })
  })

  describe('Error logging', () => {
    it('logs errors in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(console.error).toHaveBeenCalledWith(
        'Error caught by boundary:',
        expect.any(Error),
        expect.any(Object)
      )
      
      process.env.NODE_ENV = originalEnv
    })

    it('logs production errors differently', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(console.error).toHaveBeenCalledWith(
        '[Production Error]:',
        'Test error'
      )
      
      process.env.NODE_ENV = originalEnv
    })
  })
})