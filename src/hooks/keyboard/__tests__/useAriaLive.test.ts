import { renderHook, act, waitFor } from '@testing-library/react'
import { useAriaLive } from '../useAriaLive'

describe('useAriaLive', () => {
  it('should create aria-live region on mount', () => {
    renderHook(() => useAriaLive())

    const ariaLiveElement = document.querySelector('[aria-live]')
    expect(ariaLiveElement).toBeTruthy()
    expect(ariaLiveElement?.getAttribute('aria-live')).toBe('polite')
    expect(ariaLiveElement?.getAttribute('aria-atomic')).toBe('true')
  })

  it('should announce messages with delay', async () => {
    const { result } = renderHook(() => useAriaLive())
    const announce = result.current

    act(() => {
      announce({ message: 'Test message', delay: 50 })
    })

    const ariaLiveElement = document.querySelector('[aria-live]')
    expect(ariaLiveElement?.textContent).toBe('')

    await waitFor(() => {
      expect(ariaLiveElement?.textContent).toBe('Test message')
    }, { timeout: 100 })
  })

  it('should update aria-live priority', async () => {
    const { result } = renderHook(() => useAriaLive())
    const announce = result.current

    act(() => {
      announce({ message: 'Urgent message', priority: 'assertive', delay: 0 })
    })

    const ariaLiveElement = document.querySelector('[aria-live]')
    expect(ariaLiveElement?.getAttribute('aria-live')).toBe('assertive')
  })

  it('should clear previous message before setting new one', async () => {
    const { result } = renderHook(() => useAriaLive())
    const announce = result.current

    act(() => {
      announce({ message: 'First message', delay: 0 })
    })

    await waitFor(() => {
      const ariaLiveElement = document.querySelector('[aria-live]')
      expect(ariaLiveElement?.textContent).toBe('First message')
    })

    act(() => {
      announce({ message: 'Second message', delay: 0 })
    })

    await waitFor(() => {
      const ariaLiveElement = document.querySelector('[aria-live]')
      expect(ariaLiveElement?.textContent).toBe('Second message')
    })
  })

  it('should remove aria-live region on unmount', () => {
    const { unmount } = renderHook(() => useAriaLive())

    expect(document.querySelector('[aria-live]')).toBeTruthy()

    unmount()

    expect(document.querySelector('[aria-live]')).toBeFalsy()
  })
})