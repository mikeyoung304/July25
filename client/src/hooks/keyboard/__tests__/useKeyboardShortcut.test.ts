import { renderHook } from '@testing-library/react'
import { vi } from 'vitest';
import { fireEvent } from '@testing-library/react'
import { useKeyboardShortcuts } from '../useKeyboardShortcut'

describe('useKeyboardShortcuts', () => {
  const mockAction1 = vi.fn()
  const mockAction2 = vi.fn()

  beforeEach(() => {
    mockAction1.mockClear()
    mockAction2.mockClear()
  })

  it('should handle multiple shortcuts', () => {
    renderHook(() => useKeyboardShortcuts([
      { key: 'a', action: mockAction1, description: 'Test action 1' },
      { key: 'b', action: mockAction2, description: 'Test action 2' }
    ]))

    fireEvent.keyDown(document, { key: 'a' })
    expect(mockAction1).toHaveBeenCalledTimes(1)
    expect(mockAction2).not.toHaveBeenCalled()

    fireEvent.keyDown(document, { key: 'b' })
    expect(mockAction1).toHaveBeenCalledTimes(1)
    expect(mockAction2).toHaveBeenCalledTimes(1)
  })

  it('should respect modifiers', () => {
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', ctrl: true, action: mockAction1, description: 'Ctrl+K action' }
    ]))

    fireEvent.keyDown(document, { key: 'k' })
    expect(mockAction1).not.toHaveBeenCalled()

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(mockAction1).toHaveBeenCalledTimes(1)
  })

  it('should not trigger in input fields', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    renderHook(() => useKeyboardShortcuts([
      { key: 'a', action: mockAction1, description: 'Test action' }
    ]))

    fireEvent.keyDown(input, { key: 'a' })
    expect(mockAction1).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('should prevent default when action is triggered', () => {
    const preventDefaultSpy = vi.fn()
    
    renderHook(() => useKeyboardShortcuts([
      { key: 'k', action: mockAction1, description: 'Test action' }
    ]))

    const event = new KeyboardEvent('keydown', { key: 'k' })
    Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy })
    
    document.dispatchEvent(event)
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1)
    expect(mockAction1).toHaveBeenCalledTimes(1)
  })
})