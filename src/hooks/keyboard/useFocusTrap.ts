import { useEffect, useRef, useCallback } from 'react'

interface UseFocusTrapOptions {
  containerRef: React.RefObject<HTMLElement>
  enabled?: boolean
  initialFocusRef?: React.RefObject<HTMLElement>
  returnFocusOnDeactivate?: boolean
}

export const useFocusTrap = ({
  containerRef,
  enabled = true,
  initialFocusRef,
  returnFocusOnDeactivate = true
}: UseFocusTrapOptions): void => {
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input[type="text"]:not([disabled])',
      'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ]

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        focusableSelectors.join(',')
      )
    ).filter(el => el.offsetParent !== null) // Filter out hidden elements
  }, [containerRef])

  const handleTabKey = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !containerRef.current) return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement as HTMLElement

      if (event.shiftKey) {
        // Shift + Tab
        if (activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    },
    [enabled, containerRef, getFocusableElements]
  )

  useEffect(() => {
    if (!enabled) return

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement

    // Set initial focus
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus()
    } else {
      const focusableElements = getFocusableElements()
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }

    // Add event listener
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        handleTabKey(event)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Return focus to the previously focused element
      if (returnFocusOnDeactivate && previousActiveElementRef.current) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [
    enabled,
    initialFocusRef,
    returnFocusOnDeactivate,
    getFocusableElements,
    handleTabKey
  ])
}