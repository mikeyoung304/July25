import { useEffect, useCallback } from 'react'

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
  action: () => void
  enabled?: boolean
  preventDefault?: boolean
}

export const useKeyboardShortcut = (shortcut: KeyboardShortcut): void => {
  const {
    key,
    ctrl = false,
    alt = false,
    shift = false,
    meta = false,
    action,
    enabled = true,
    preventDefault = true
  } = shortcut

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      const ctrlMatch = ctrl === event.ctrlKey
      const altMatch = alt === event.altKey
      const shiftMatch = shift === event.shiftKey
      const metaMatch = meta === event.metaKey

      if (
        event.key === key &&
        ctrlMatch &&
        altMatch &&
        shiftMatch &&
        metaMatch
      ) {
        if (preventDefault) {
          event.preventDefault()
        }
        action()
      }
    },
    [key, ctrl, alt, shift, meta, action, enabled, preventDefault]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]): void => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.contentEditable === 'true'
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue

        const ctrlMatch = (shortcut.ctrl || false) === event.ctrlKey
        const altMatch = (shortcut.alt || false) === event.altKey
        const shiftMatch = (shortcut.shift || false) === event.shiftKey
        const metaMatch = (shortcut.meta || false) === event.metaKey

        if (
          event.key === shortcut.key &&
          ctrlMatch &&
          altMatch &&
          shiftMatch &&
          metaMatch
        ) {
          if (shortcut.preventDefault ?? true) {
            event.preventDefault()
          }
          shortcut.action()
          break
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}