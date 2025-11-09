/**
 * Unit tests for useHttpClient hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHttpClient } from '../hooks'
import { httpClient } from '../httpClient'

// Mock httpClient
vi.mock('../httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

describe('useHttpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useHttpClient())

      expect(result.current.data).toBeUndefined()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('GET requests', () => {
    it('should handle successful GET request', async () => {
      const mockData = { id: 1, name: 'Test Item' }
      vi.mocked(httpClient.get).mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useHttpClient<typeof mockData>())

      // Verify initial state
      expect(result.current.loading).toBe(false)

      // Make request
      let requestPromise: Promise<any>
      act(() => {
        requestPromise = result.current.get('/api/test')
      })

      // Verify loading state
      expect(result.current.loading).toBe(true)
      expect(result.current.error).toBeNull()

      // Wait for request to complete
      await act(async () => {
        await requestPromise
      })

      // Verify final state
      expect(result.current.data).toEqual(mockData)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(httpClient.get).toHaveBeenCalledWith('/api/test', undefined)
    })

    it('should handle failed GET request', async () => {
      const mockError = new Error('Network error')
      vi.mocked(httpClient.get).mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useHttpClient())

      // Make request
      let requestPromise: Promise<any>
      act(() => {
        requestPromise = result.current.get('/api/test').catch(() => {})
      })

      // Wait for request to complete
      await act(async () => {
        await requestPromise
      })

      // Verify error state
      expect(result.current.data).toBeUndefined()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toEqual(mockError)
    })

    it('should pass options to httpClient.get', async () => {
      const mockData = { id: 1 }
      const options = { params: { page: 1 }, skipAuth: true }
      vi.mocked(httpClient.get).mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useHttpClient())

      await act(async () => {
        await result.current.get('/api/test', options)
      })

      expect(httpClient.get).toHaveBeenCalledWith('/api/test', options)
    })
  })

  describe('POST requests', () => {
    it('should handle successful POST request', async () => {
      const mockData = { id: 2, created: true }
      const postData = { name: 'New Item' }
      vi.mocked(httpClient.post).mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useHttpClient<typeof mockData>())

      await act(async () => {
        await result.current.post('/api/items', postData)
      })

      expect(result.current.data).toEqual(mockData)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(httpClient.post).toHaveBeenCalledWith('/api/items', postData, undefined)
    })

    it('should handle POST with options', async () => {
      const mockData = { success: true }
      const postData = { value: 100 }
      const options = { skipRestaurantId: true }
      vi.mocked(httpClient.post).mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useHttpClient())

      await act(async () => {
        await result.current.post('/api/submit', postData, options)
      })

      expect(httpClient.post).toHaveBeenCalledWith('/api/submit', postData, options)
    })
  })

  describe('PUT requests', () => {
    it('should handle successful PUT request', async () => {
      const mockData = { id: 1, updated: true }
      const putData = { name: 'Updated Name' }
      vi.mocked(httpClient.put).mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useHttpClient<typeof mockData>())

      await act(async () => {
        await result.current.put('/api/items/1', putData)
      })

      expect(result.current.data).toEqual(mockData)
      expect(result.current.error).toBeNull()
      expect(httpClient.put).toHaveBeenCalledWith('/api/items/1', putData, undefined)
    })
  })

  describe('PATCH requests', () => {
    it('should handle successful PATCH request', async () => {
      const mockData = { id: 1, patched: true }
      const patchData = { status: 'active' }
      vi.mocked(httpClient.patch).mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useHttpClient<typeof mockData>())

      await act(async () => {
        await result.current.patch('/api/items/1', patchData)
      })

      expect(result.current.data).toEqual(mockData)
      expect(httpClient.patch).toHaveBeenCalledWith('/api/items/1', patchData, undefined)
    })
  })

  describe('DELETE requests', () => {
    it('should handle successful DELETE request', async () => {
      const mockData = { success: true }
      vi.mocked(httpClient.delete).mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useHttpClient<typeof mockData>())

      await act(async () => {
        await result.current.del('/api/items/1')
      })

      expect(result.current.data).toEqual(mockData)
      expect(httpClient.delete).toHaveBeenCalledWith('/api/items/1', undefined)
    })
  })

  describe('execute method', () => {
    it('should execute custom function with state management', async () => {
      const mockData = { custom: true }
      const customFn = vi.fn().mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useHttpClient<typeof mockData>())

      await act(async () => {
        await result.current.execute(customFn)
      })

      expect(result.current.data).toEqual(mockData)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(customFn).toHaveBeenCalled()
    })

    it('should handle custom function errors', async () => {
      const mockError = new Error('Custom error')
      const customFn = vi.fn().mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useHttpClient())

      await act(async () => {
        await result.current.execute(customFn).catch(() => {})
      })

      expect(result.current.error).toEqual(mockError)
      expect(result.current.loading).toBe(false)
    })

    it('should convert non-Error to Error', async () => {
      const customFn = vi.fn().mockRejectedValueOnce('String error')

      const { result } = renderHook(() => useHttpClient())

      await act(async () => {
        await result.current.execute(customFn).catch(() => {})
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('String error')
    })
  })

  describe('reset method', () => {
    it('should reset all state to initial values', async () => {
      const mockData = { id: 1 }
      vi.mocked(httpClient.get).mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useHttpClient())

      // Make a request to populate state
      await act(async () => {
        await result.current.get('/api/test')
      })

      // Verify state is populated
      expect(result.current.data).toEqual(mockData)

      // Reset
      act(() => {
        result.current.reset()
      })

      // Verify state is cleared
      expect(result.current.data).toBeUndefined()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('State transitions', () => {
    it('should maintain correct loading sequence', async () => {
      const mockData = { id: 1 }
      vi.mocked(httpClient.get).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockData), 50))
      )

      const { result } = renderHook(() => useHttpClient())

      // Initial: not loading
      expect(result.current.loading).toBe(false)

      // Start request
      let requestPromise: Promise<any>
      act(() => {
        requestPromise = result.current.get('/api/test')
      })

      // During request: loading
      expect(result.current.loading).toBe(true)

      // Wait for completion
      await act(async () => {
        await requestPromise
      })

      // After request: not loading
      expect(result.current.loading).toBe(false)
    })

    it('should clear error on new successful request', async () => {
      const mockError = new Error('First error')
      const mockData = { id: 1 }

      // First request fails
      vi.mocked(httpClient.get).mockRejectedValueOnce(mockError)
      const { result } = renderHook(() => useHttpClient())

      await act(async () => {
        await result.current.get('/api/test').catch(() => {})
      })

      expect(result.current.error).toEqual(mockError)

      // Second request succeeds
      vi.mocked(httpClient.get).mockResolvedValueOnce(mockData)

      await act(async () => {
        await result.current.get('/api/test')
      })

      // Error should be cleared
      expect(result.current.error).toBeNull()
      expect(result.current.data).toEqual(mockData)
    })
  })

  describe('Multiple concurrent requests', () => {
    it('should handle concurrent requests independently', async () => {
      const { result: result1 } = renderHook(() => useHttpClient())
      const { result: result2 } = renderHook(() => useHttpClient())

      const mockData1 = { id: 1 }
      const mockData2 = { id: 2 }

      vi.mocked(httpClient.get)
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2)

      await act(async () => {
        await Promise.all([
          result1.current.get('/api/test1'),
          result2.current.get('/api/test2')
        ])
      })

      // Each hook should have independent state
      expect(result1.current.data).toEqual(mockData1)
      expect(result2.current.data).toEqual(mockData2)
    })
  })
})
