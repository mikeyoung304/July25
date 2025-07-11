import { useRef, useCallback, useEffect } from 'react'

interface UseFocusManagementOptions {
  containerRef: React.RefObject<HTMLElement>
  itemSelector: string
  orientation?: 'horizontal' | 'vertical' | 'grid'
  loop?: boolean
  onFocusChange?: (index: number) => void
}

export const useFocusManagement = ({
  containerRef,
  itemSelector,
  orientation = 'vertical',
  loop = true,
  onFocusChange
}: UseFocusManagementOptions) => {
  const currentIndexRef = useRef(0)

  const getItems = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []
    return Array.from(containerRef.current.querySelectorAll(itemSelector))
  }, [containerRef, itemSelector])

  const focusItem = useCallback((index: number) => {
    const items = getItems()
    if (items.length === 0) return

    // Ensure index is within bounds
    let targetIndex = index
    if (loop) {
      targetIndex = ((index % items.length) + items.length) % items.length
    } else {
      targetIndex = Math.max(0, Math.min(index, items.length - 1))
    }

    const item = items[targetIndex]
    if (item) {
      item.focus()
      currentIndexRef.current = targetIndex
      onFocusChange?.(targetIndex)
    }
  }, [getItems, loop, onFocusChange])

  const gridColumnsRef = useRef<number>(1)
  const lastGridCheckRef = useRef<number>(0)
  
  const getGridColumns = useCallback((): number => {
    if (!containerRef.current || orientation !== 'grid') return 1
    
    // Cache grid columns calculation to avoid repeated layout reflows
    const now = Date.now()
    if (now - lastGridCheckRef.current < 100) {
      return gridColumnsRef.current
    }
    
    const items = getItems()
    if (items.length < 2) return 1

    // Use requestAnimationFrame to batch layout reads
    requestAnimationFrame(() => {
      const firstItem = items[0].getBoundingClientRect()
      let columns = 1

      for (let i = 1; i < items.length; i++) {
        const itemRect = items[i].getBoundingClientRect()
        if (itemRect.top > firstItem.top) break
        columns++
      }
      
      gridColumnsRef.current = columns
      lastGridCheckRef.current = now
    })

    return gridColumnsRef.current
  }, [containerRef, orientation, getItems])

  const handleKeyNavigation = useCallback((event: KeyboardEvent) => {
    const items = getItems()
    if (items.length === 0) return

    let nextIndex = currentIndexRef.current
    let handled = false

    switch (event.key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'grid') {
          nextIndex = currentIndexRef.current - (orientation === 'grid' ? getGridColumns() : 1)
          handled = true
        }
        break
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'grid') {
          nextIndex = currentIndexRef.current + (orientation === 'grid' ? getGridColumns() : 1)
          handled = true
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'grid') {
          nextIndex = currentIndexRef.current - 1
          handled = true
        }
        break
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'grid') {
          nextIndex = currentIndexRef.current + 1
          handled = true
        }
        break
      case 'Home':
        nextIndex = 0
        handled = true
        break
      case 'End':
        nextIndex = items.length - 1
        handled = true
        break
    }

    if (handled) {
      event.preventDefault()
      focusItem(nextIndex)
    }
  }, [getItems, orientation, focusItem, getGridColumns])

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyNavigation)

    // Update current index when focus changes naturally
    const handleFocusIn = (event: FocusEvent) => {
      const items = getItems()
      const target = event.target as HTMLElement
      const index = items.indexOf(target)
      if (index !== -1) {
        currentIndexRef.current = index
      }
    }

    container.addEventListener('focusin', handleFocusIn)

    return () => {
      container.removeEventListener('keydown', handleKeyNavigation)
      container.removeEventListener('focusin', handleFocusIn)
    }
  }, [containerRef, handleKeyNavigation, getItems])

  return {
    focusFirst: () => focusItem(0),
    focusLast: () => focusItem(getItems().length - 1),
    focusNext: () => focusItem(currentIndexRef.current + 1),
    focusPrevious: () => focusItem(currentIndexRef.current - 1),
    focusItem,
    getCurrentIndex: () => currentIndexRef.current,
    getItemCount: () => getItems().length
  }
}