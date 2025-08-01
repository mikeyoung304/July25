import { renderHook } from '@testing-library/react'
import { vi } from 'vitest';
import { fireEvent } from '@testing-library/react'
import { useKeyboardShortcut, useKeyboardShortcuts } from '../useKeyboardShortcut'

describe('useKeyboardShortcut', () => {
  const mockAction = vi.fn()

  beforeEach(() => {
    mockAction.mockClear()
  })

  it('should trigger action on correct key press', () => {
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      action: mockAction
    }))

    fireEvent.keyDown(document, { key: 'k' })
    expect(mockAction).toHaveBeenCalledTimes(1)
  })

  it('should respect ctrl modifier', () => {
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      ctrl: true,
      action: mockAction
    }))

    fireEvent.keyDown(document, { key: 'k' })
    expect(mockAction).not.toHaveBeenCalled()

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(mockAction).toHaveBeenCalledTimes(1)
  })

  it('should respect multiple modifiers', () => {
    renderHook(() => useKeyboardShortcut({
      key: 's',
      ctrl: true,
      shift: true,
      action: mockAction
    }))

    fireEvent.keyDown(document, { key: 's', ctrlKey: true })
    expect(mockAction).not.toHaveBeenCalled()

    fireEvent.keyDown(document, { key: 's', ctrlKey: true, shiftKey: true })
    expect(mockAction).toHaveBeenCalledTimes(1)
  })

  it('should not trigger when disabled', () => {
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      action: mockAction,
      enabled: false
    }))

    fireEvent.keyDown(document, { key: 'k' })
    expect(mockAction).not.toHaveBeenCalled()
  })

  it('should prevent default when configured', () => {
    const preventDefaultSpy = vi.fn()
    
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      action: mockAction,
      preventDefault: true
    }))

    const event = new KeyboardEvent('keydown', { key: 'k' })
    Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy })
    
    document.dispatchEvent(event)
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1)
  })
})

describe('useKeyboardShortcuts', () => {
  const mockAction1 = vi.fn()
  const mockAction2 = vi.fn()

  beforeEach(() => {
    mockAction1.mockClear()
    mockAction2.mockClear()
  })

  it('should handle multiple shortcuts', () => {
    renderHook(() => useKeyboardShortcuts([
      { key: 'a', action: mockAction1 },
      { key: 'b', action: mockAction2 }
    ]))

    fireEvent.keyDown(document, { key: 'a' })
    expect(mockAction1).toHaveBeenCalledTimes(1)
    expect(mockAction2).not.toHaveBeenCalled()

    fireEvent.keyDown(document, { key: 'b' })
    expect(mockAction1).toHaveBeenCalledTimes(1)
    expect(mockAction2).toHaveBeenCalledTimes(1)
  })

  it('should skip shortcuts in input fields', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)

    renderHook(() => useKeyboardShortcuts([
      { key: 'a', action: mockAction1 }
    ]))

    // Fire event with input as target
    const inputEvent = new KeyboardEvent('keydown', { 
      key: 'a',
      bubbles: true 
    })
    Object.defineProperty(inputEvent, 'target', { value: input })
    document.dispatchEvent(inputEvent)
    expect(mockAction1).not.toHaveBeenCalled()

    // Fire event with document as target
    fireEvent.keyDown(document.body, { key: 'a' })
    expect(mockAction1).toHaveBeenCalledTimes(1)

    document.body.removeChild(input)
  })
})