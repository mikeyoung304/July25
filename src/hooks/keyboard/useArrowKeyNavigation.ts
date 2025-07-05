import { useCallback } from 'react'
import { useKeyboardNavigation } from './useKeyboardNavigation'

interface UseArrowKeyNavigationOptions {
  onUp?: () => void
  onDown?: () => void
  onLeft?: () => void
  onRight?: () => void
  enabled?: boolean
  orientation?: 'horizontal' | 'vertical' | 'both'
}

export const useArrowKeyNavigation = ({
  onUp,
  onDown,
  onLeft,
  onRight,
  enabled = true,
  orientation = 'both'
}: UseArrowKeyNavigationOptions): void => {
  const handleArrowUp = useCallback(() => {
    if (orientation === 'vertical' || orientation === 'both') {
      onUp?.()
    }
  }, [onUp, orientation])

  const handleArrowDown = useCallback(() => {
    if (orientation === 'vertical' || orientation === 'both') {
      onDown?.()
    }
  }, [onDown, orientation])

  const handleArrowLeft = useCallback(() => {
    if (orientation === 'horizontal' || orientation === 'both') {
      onLeft?.()
    }
  }, [onLeft, orientation])

  const handleArrowRight = useCallback(() => {
    if (orientation === 'horizontal' || orientation === 'both') {
      onRight?.()
    }
  }, [onRight, orientation])

  useKeyboardNavigation({
    onArrowUp: handleArrowUp,
    onArrowDown: handleArrowDown,
    onArrowLeft: handleArrowLeft,
    onArrowRight: handleArrowRight,
    enabled
  })
}