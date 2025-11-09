/**
 * React Hooks for HTTP Client
 * Provides hook-based API access with automatic state management
 */

import { useState, useCallback } from 'react'
import { httpClient } from './httpClient'
import type { HttpRequestOptions } from './httpClient'

/**
 * Return type for useHttpClient hook
 */
export interface UseHttpClientReturn<T = unknown> {
  /** The response data from the last successful request */
  data: T | undefined
  /** Whether a request is currently in flight */
  loading: boolean
  /** The error from the last failed request, or null if successful */
  error: Error | null
  /** Execute a custom HTTP request function */
  execute: (fn: () => Promise<T>) => Promise<T>
  /** Make a GET request */
  get: (endpoint: string, options?: HttpRequestOptions) => Promise<T>
  /** Make a POST request */
  post: (endpoint: string, data?: unknown, options?: HttpRequestOptions) => Promise<T>
  /** Make a PUT request */
  put: (endpoint: string, data?: unknown, options?: HttpRequestOptions) => Promise<T>
  /** Make a PATCH request */
  patch: (endpoint: string, data?: unknown, options?: HttpRequestOptions) => Promise<T>
  /** Make a DELETE request */
  del: (endpoint: string, options?: HttpRequestOptions) => Promise<T>
  /** Reset the state to initial values */
  reset: () => void
}

/**
 * Hook for making HTTP requests with automatic state management
 *
 * Provides a declarative API for HTTP requests with built-in loading,
 * error, and data state management. Wraps the singleton httpClient
 * with React state hooks.
 *
 * @example
 * ```tsx
 * function MenuList() {
 *   const { data, loading, error, get } = useHttpClient<MenuItem[]>()
 *
 *   useEffect(() => {
 *     get('/api/v1/menu/items')
 *   }, [])
 *
 *   if (loading) return <Spinner />
 *   if (error) return <ErrorMessage error={error} />
 *   if (!data) return null
 *
 *   return <ul>{data.map(item => <li key={item.id}>{item.name}</li>)}</ul>
 * }
 * ```
 *
 * @example
 * ```tsx
 * function CreateOrder() {
 *   const { loading, error, post } = useHttpClient<Order>()
 *
 *   const handleSubmit = async (orderData: CreateOrderRequest) => {
 *     try {
 *       const order = await post('/api/v1/orders', orderData)
 *       // Order created successfully, ID available in order.id
 *     } catch (err) {
 *       // Error is automatically set in state
 *     }
 *   }
 *
 *   return <OrderForm onSubmit={handleSubmit} loading={loading} error={error} />
 * }
 * ```
 *
 * @template T The expected response data type
 * @returns Object with data, loading, error state and HTTP methods
 */
export function useHttpClient<T = unknown>(): UseHttpClientReturn<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Execute a custom HTTP request function with automatic state management
   */
  const execute = useCallback(async (fn: () => Promise<T>): Promise<T> => {
    setLoading(true)
    setError(null)

    try {
      const result = await fn()
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Make a GET request
   */
  const get = useCallback(
    (endpoint: string, options?: HttpRequestOptions): Promise<T> => {
      return execute(() => httpClient.get<T>(endpoint, options))
    },
    [execute]
  )

  /**
   * Make a POST request
   */
  const post = useCallback(
    (endpoint: string, data?: unknown, options?: HttpRequestOptions): Promise<T> => {
      return execute(() => httpClient.post<T>(endpoint, data, options))
    },
    [execute]
  )

  /**
   * Make a PUT request
   */
  const put = useCallback(
    (endpoint: string, data?: unknown, options?: HttpRequestOptions): Promise<T> => {
      return execute(() => httpClient.put<T>(endpoint, data, options))
    },
    [execute]
  )

  /**
   * Make a PATCH request
   */
  const patch = useCallback(
    (endpoint: string, data?: unknown, options?: HttpRequestOptions): Promise<T> => {
      return execute(() => httpClient.patch<T>(endpoint, data, options))
    },
    [execute]
  )

  /**
   * Make a DELETE request
   */
  const del = useCallback(
    (endpoint: string, options?: HttpRequestOptions): Promise<T> => {
      return execute(() => httpClient.delete<T>(endpoint, options))
    },
    [execute]
  )

  /**
   * Reset the state to initial values (clear data, error, loading)
   */
  const reset = useCallback(() => {
    setData(undefined)
    setError(null)
    setLoading(false)
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    get,
    post,
    put,
    patch,
    del,
    reset
  }
}
