import { renderHook, act } from '@testing-library/react'
import { useAsyncState, useAsyncOperations } from '../useAsyncState'

describe('useAsyncState', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useAsyncState<string>())
    
    expect(result.current.data).toBeUndefined()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('initializes with provided data', () => {
    const initialData = { id: 1, name: 'Test' }
    const { result } = renderHook(() => useAsyncState(initialData))
    
    expect(result.current.data).toEqual(initialData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('handles successful async operation', async () => {
    const { result } = renderHook(() => useAsyncState<string>())
    const testData = 'test result'
    
    await act(async () => {
      const returnedData = await result.current.execute(
        Promise.resolve(testData)
      )
      expect(returnedData).toBe(testData)
    })
    
    expect(result.current.data).toBe(testData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('handles failed async operation', async () => {
    const { result } = renderHook(() => useAsyncState<string>())
    const testError = new Error('Test error')
    
    await act(async () => {
      try {
        await result.current.execute(Promise.reject(testError))
      } catch (error) {
        expect(error).toBe(testError)
      }
    })
    
    expect(result.current.data).toBeUndefined()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(testError)
  })

  it('sets loading state during async operation', async () => {
    const { result } = renderHook(() => useAsyncState<string>())
    
    let resolvePromise: (value: string) => void
    const promise = new Promise<string>(resolve => {
      resolvePromise = resolve
    })
    
    act(() => {
      result.current.execute(promise)
    })
    
    // Check loading is true while promise is pending
    expect(result.current.loading).toBe(true)
    
    // Resolve the promise
    await act(async () => {
      resolvePromise!('data')
      await promise
    })
    
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe('data')
  })

  it('allows manual state updates', () => {
    const { result } = renderHook(() => useAsyncState<string>())
    
    act(() => {
      result.current.setData('manual data')
      result.current.setLoading(true)
      result.current.setError(new Error('manual error'))
    })
    
    expect(result.current.data).toBe('manual data')
    expect(result.current.loading).toBe(true)
    expect(result.current.error?.message).toBe('manual error')
  })

  it('resets to initial state', () => {
    const initialData = 'initial'
    const { result } = renderHook(() => useAsyncState(initialData))
    
    act(() => {
      result.current.setData('changed')
      result.current.setError(new Error('error'))
      result.current.reset()
    })
    
    expect(result.current.data).toBe(initialData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('converts non-Error objects to Error instances', async () => {
    const { result } = renderHook(() => useAsyncState<string>())
    
    await act(async () => {
      try {
        await result.current.execute(Promise.reject('string error'))
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('string error')
      }
    })
    
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('string error')
  })
})

describe('useAsyncOperations', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useAsyncOperations())
    
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('handles multiple successful operations', async () => {
    const { result } = renderHook(() => useAsyncOperations())
    
    await act(async () => {
      const [result1, result2] = await result.current.execute([
        Promise.resolve('data1'),
        Promise.resolve(123)
      ])
      
      expect(result1).toBe('data1')
      expect(result2).toBe(123)
    })
    
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('handles failure in any operation', async () => {
    const { result } = renderHook(() => useAsyncOperations())
    const testError = new Error('Operation failed')
    
    await act(async () => {
      try {
        await result.current.execute([
          Promise.resolve('success'),
          Promise.reject(testError)
        ])
      } catch (error) {
        expect(error).toBe(testError)
      }
    })
    
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(testError)
  })

  it('maintains loading state during operations', async () => {
    const { result } = renderHook(() => useAsyncOperations())
    
    let resolvePromise: (value: string) => void
    const promise = new Promise<string>(resolve => {
      resolvePromise = resolve
    })
    
    act(() => {
      result.current.execute([promise])
    })
    
    // Check loading is true while promise is pending
    expect(result.current.loading).toBe(true)
    
    // Resolve the promise
    await act(async () => {
      resolvePromise!('data')
      await promise
    })
    
    expect(result.current.loading).toBe(false)
  })

  it('resets state correctly', () => {
    const { result } = renderHook(() => useAsyncOperations())
    
    act(() => {
      result.current.setLoading(true)
      result.current.setError(new Error('test'))
      result.current.reset()
    })
    
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })
})