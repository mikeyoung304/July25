import { useState, useEffect } from 'react'

export interface UseCanvasControlsResult {
  canvasSize: { width: number; height: number }
  zoomLevel: number
  panOffset: { x: number; y: number }
  snapToGrid: boolean
  canvasReady: boolean
  setCanvasSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  setCanvasReady: React.Dispatch<React.SetStateAction<boolean>>
}

/**
 * Custom hook for managing canvas controls (zoom, pan, size)
 * Automatically updates canvas size based on container dimensions
 */
export function useCanvasControls(
  containerRef: HTMLDivElement | null
): UseCanvasControlsResult {
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 900 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [snapToGrid] = useState(true)
  const [canvasReady, setCanvasReady] = useState(false)

  // Update canvas size when container resizes and mark canvas as ready
  useEffect(() => {
    if (!containerRef) return

    const updateCanvasSize = () => {
      const rect = containerRef.getBoundingClientRect()

      // Use full screen area - no aspect ratio constraints
      const newSize = {
        width: rect.width,
        height: rect.height
      }
      setCanvasSize(newSize)

      // Mark canvas as ready after size is set
      requestAnimationFrame(() => {
        setCanvasReady(true)
      })
    }

    updateCanvasSize()

    const resizeObserver = new ResizeObserver(updateCanvasSize)
    resizeObserver.observe(containerRef)

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef])

  return {
    canvasSize,
    zoomLevel,
    panOffset,
    snapToGrid,
    canvasReady,
    setCanvasSize,
    setZoomLevel,
    setPanOffset,
    setCanvasReady
  }
}
