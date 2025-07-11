import { useRef, useEffect, useCallback } from 'react'

interface UseAriaLiveOptions {
  message: string
  priority?: 'polite' | 'assertive'
  delay?: number
}

export const useAriaLive = (): ((options: UseAriaLiveOptions) => void) => {
  const ariaLiveRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create aria-live region
    const ariaLiveElement = document.createElement('div')
    ariaLiveElement.setAttribute('aria-live', 'polite')
    ariaLiveElement.setAttribute('aria-atomic', 'true')
    ariaLiveElement.style.position = 'absolute'
    ariaLiveElement.style.left = '-10000px'
    ariaLiveElement.style.width = '1px'
    ariaLiveElement.style.height = '1px'
    ariaLiveElement.style.overflow = 'hidden'
    
    document.body.appendChild(ariaLiveElement)
    ariaLiveRef.current = ariaLiveElement

    return () => {
      if (ariaLiveRef.current) {
        document.body.removeChild(ariaLiveRef.current)
      }
    }
  }, [])

  const announce = useCallback(
    ({ message, priority = 'polite', delay = 100 }: UseAriaLiveOptions) => {
      if (!ariaLiveRef.current) return

      // Update priority if needed
      ariaLiveRef.current.setAttribute('aria-live', priority)

      // Clear existing message
      ariaLiveRef.current.textContent = ''

      // Set new message after a delay to ensure screen readers pick it up
      setTimeout(() => {
        if (ariaLiveRef.current) {
          ariaLiveRef.current.textContent = message
        }
      }, delay)
    },
    []
  )

  return announce
}