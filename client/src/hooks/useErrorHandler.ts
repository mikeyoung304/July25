import { useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import { env } from '@/utils/env'

export interface ErrorHandlerOptions {
  showToast?: boolean
  fallbackMessage?: string
  onError?: (error: Error) => void
  retryable?: boolean
  onRetry?: () => void | Promise<void>
}

export interface UseErrorHandlerReturn {
  handleError: (error: unknown, options?: ErrorHandlerOptions) => void
  handleAsyncError: <T>(
    promise: Promise<T>,
    options?: ErrorHandlerOptions
  ) => Promise<T | undefined>
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const { toast } = useToast()

  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const {
        showToast = true,
        fallbackMessage = 'An error occurred',
        onError
      } = options

      // Convert unknown error to Error object
      const errorObj = error instanceof Error 
        ? error 
        : new Error(typeof error === 'string' ? error : fallbackMessage)

      // Log error in development
      if (env.DEV) {
        console.error('[Error Handler]:', errorObj)
      }

      // Show toast notification
      if (showToast) {
        toast.error(errorObj.message || fallbackMessage, {
          duration: 5000
        })
      }

      // Call custom error handler
      if (onError) {
        onError(errorObj)
      }

      // In production, send to error tracking service
      if (env.MODE === 'production') {
        // TODO: Send to Sentry or similar service
        console.error('[Production Error]:', errorObj.message)
      }
    },
    [toast]
  )

  const handleAsyncError = useCallback(
    async <T,>(
      promise: Promise<T>,
      options?: ErrorHandlerOptions
    ): Promise<T | undefined> => {
      try {
        return await promise
      } catch (error) {
        handleError(error, options)
        return undefined
      }
    },
    [handleError]
  )

  return {
    handleError,
    handleAsyncError
  }
}

// Utility function for common API error handling
export const handleAPIError = (error: unknown): string => {
  if (error instanceof Error) {
    // Check for common API error patterns
    if ('status' in error && typeof error.status === 'number') {
      switch (error.status) {
        case 400:
          return 'Invalid request. Please check your input.'
        case 401:
          return 'You are not authorized to perform this action.'
        case 403:
          return 'You do not have permission to access this resource.'
        case 404:
          return 'The requested resource was not found.'
        case 429:
          return 'Too many requests. Please try again later.'
        case 500:
          return 'Server error. Please try again later.'
        case 503:
          return 'Service temporarily unavailable. Please try again later.'
        default:
          return error.message || 'An error occurred while processing your request.'
      }
    }
    return error.message
  }
  return 'An unexpected error occurred.'
}

// Retry utility with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry
  } = options

  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffFactor, attempt),
          maxDelay
        )
        
        if (onRetry) {
          onRetry(attempt + 1, lastError)
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}