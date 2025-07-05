import { useState, useCallback } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
}

export interface UseAsyncStateReturn<T> extends AsyncState<T> {
  execute: (promise: Promise<T>) => Promise<T>
  setData: (data: T | undefined) => void
  setError: (error: Error | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

/**
 * Hook for managing async state with loading and error handling
 * Eliminates boilerplate for common async patterns
 * 
 * @example
 * const { data: orders, loading, error, execute } = useAsyncState<Order[]>([])
 * 
 * const loadOrders = async () => {
 *   await execute(api.getOrders())
 * }
 */
export function useAsyncState<T>(
  initialData?: T
): UseAsyncStateReturn<T> {
  const [data, setData] = useState<T | undefined>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (promise: Promise<T>): Promise<T> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await promise
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

  const reset = useCallback(() => {
    setData(initialData)
    setLoading(false)
    setError(null)
  }, [initialData])

  return {
    data,
    loading,
    error,
    execute,
    setData,
    setError,
    setLoading,
    reset
  }
}

/**
 * Hook for managing multiple async operations with shared loading state
 * Useful for components that need to load multiple resources
 * 
 * @example
 * const { loading, error, execute } = useAsyncOperations()
 * 
 * const loadData = async () => {
 *   const [orders, tables] = await execute([
 *     api.getOrders(),
 *     api.getTables()
 *   ])
 * }
 */
export function useAsyncOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async <T extends unknown[]>(
    promises: [...{ [K in keyof T]: Promise<T[K]> }]
  ): Promise<T> => {
    setLoading(true)
    setError(null)
    
    try {
      const results = await Promise.all(promises)
      return results as T
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
  }, [])

  return {
    loading,
    error,
    execute,
    setLoading,
    setError,
    reset
  }
}