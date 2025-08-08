import React from 'react'
import { vi, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary'
import * as envModule from '@/utils/env'

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
  console.error = vi.fn() as Mock
})

afterAll(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      
      expect(screen.getByText(/Component error/)).toBeInTheDocument()
      expect(screen.getByText(/Try again/)).toBeInTheDocument()
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
      
      expect(screen.getByText(/Component error/)).toBeInTheDocument()
      
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
      const onError = vi.fn()
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      )
    })

    it('renders different UI for different error levels', () => {
      render(
        <ErrorBoundary level="section">
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText("This section couldn't be loaded")).toBeInTheDocument()
      
      render(
        <ErrorBoundary level="page">
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText("This page couldn't be loaded")).toBeInTheDocument()
    })
  })

  describe('App level error boundary', () => {
    it('renders app-level error UI', () => {
      render(
        <ErrorBoundary level="app">
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
      expect(screen.getByText(/Please refresh the page/)).toBeInTheDocument()
    })

    it('shows technical details in development', () => {
      // Mock env.DEV to be true
      const originalDEV = envModule.env.DEV
      Object.defineProperty(envModule.env, 'DEV', {
        get: () => true,
        configurable: true
      })
      
      render(
        <ErrorBoundary level="app">
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText(/Technical Details/)).toBeInTheDocument()
      expect(screen.getByText(/Test error/)).toBeInTheDocument()
      
      // Restore original value
      Object.defineProperty(envModule.env, 'DEV', {
        get: () => originalDEV,
        configurable: true
      })
    })

    it('hides technical details in production', () => {
      // Mock env.DEV to be false
      const originalDEV = envModule.env.DEV
      Object.defineProperty(envModule.env, 'DEV', {
        get: () => false,
        configurable: true
      })
      
      render(
        <ErrorBoundary level="app">
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.queryByText(/Technical Details/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Test error/)).not.toBeInTheDocument()
      
      // Restore original value
      Object.defineProperty(envModule.env, 'DEV', {
        get: () => originalDEV,
        configurable: true
      })
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
      expect(screen.getByText(/Component error/)).toBeInTheDocument()
    })

    it('passes error boundary props', () => {
      const TestComponent = () => {
        throw new Error('Test')
      }
      
      const onError = vi.fn()
      const WrappedComponent = withErrorBoundary(TestComponent, {
        level: 'section',
        onError
      })
      
      render(<WrappedComponent />)
      
      expect(screen.getByText("This section couldn't be loaded")).toBeInTheDocument()
      expect(onError).toHaveBeenCalled()
    })

  })

  describe('Error logging', () => {
    it('logs errors in development', () => {
      // Mock env.DEV to be true
      const originalDEV = envModule.env.DEV
      Object.defineProperty(envModule.env, 'DEV', {
        get: () => true,
        configurable: true
      })
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(console.error).toHaveBeenCalledWith(
        'Error:',
        expect.any(Error),
        expect.any(Object)
      )
      
      // Restore original value
      Object.defineProperty(envModule.env, 'DEV', {
        get: () => originalDEV,
        configurable: true
      })
    })

    it('does not log in production', () => {
      // Mock env.DEV to be false
      const originalDEV = envModule.env.DEV
      Object.defineProperty(envModule.env, 'DEV', {
        get: () => false,
        configurable: true
      })
      
      // Clear any previous console.error calls
      ;(console.error as Mock).mockClear()
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(console.error).not.toHaveBeenCalledWith(
        'Error:',
        expect.any(Error),
        expect.any(Object)
      )
      
      // Restore original value
      Object.defineProperty(envModule.env, 'DEV', {
        get: () => originalDEV,
        configurable: true
      })
    })
  })
})