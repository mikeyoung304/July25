import { useCallback } from 'react'
import { Table } from '../types'

export interface UseFloorPlanLayoutResult {
  calculateOptimalView: () => {
    zoom: number
    pan: { x: number; y: number }
    canvasSize: { width: number; height: number }
  } | undefined
  autoFitTables: (options?: { animate?: boolean }) => void
  centerAllTables: (options?: { animate?: boolean }) => void
}

export interface UseFloorPlanLayoutProps {
  tables: Table[]
  canvasSize: { width: number; height: number }
  containerRef: HTMLDivElement | null
  setTables: React.Dispatch<React.SetStateAction<Table[]>>
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  setCanvasSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>
}

/**
 * Custom hook for floor plan layout algorithms
 * Handles auto-fit, centering, and optimal view calculations
 */
export function useFloorPlanLayout({
  tables,
  canvasSize,
  containerRef,
  setTables,
  setZoomLevel,
  setPanOffset,
  setCanvasSize
}: UseFloorPlanLayoutProps): UseFloorPlanLayoutResult {

  // Calculate optimal view to show all tables with proper interaction zones
  const calculateOptimalView = useCallback(() => {
    if (tables.length === 0 || !containerRef) return

    // Calculate bounding box of all tables
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    tables.forEach(table => {
      const halfWidth = table.width / 2
      const halfHeight = table.height / 2

      minX = Math.min(minX, table.x - halfWidth)
      maxX = Math.max(maxX, table.x + halfWidth)
      minY = Math.min(minY, table.y - halfHeight)
      maxY = Math.max(maxY, table.y + halfHeight)
    })

    // Optimized padding for square canvas
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    const tableCount = tables.length

    // Balanced padding for square format
    const basePadding = 60  // Reduced for better space usage
    const percentagePadding = Math.max(contentWidth, contentHeight) * 0.10  // Tighter padding
    const tablePadding = Math.min(tableCount * 5, 40)  // Minimal table padding
    const totalPadding = basePadding + percentagePadding + tablePadding

    const paddedWidth = contentWidth + totalPadding * 2
    const paddedHeight = contentHeight + totalPadding * 2

    // Use actual canvas size for proper centering calculations
    const availableWidth = canvasSize.width - 40  // Use canvas size, not container
    const availableHeight = canvasSize.height - 40

    // Calculate zoom with interaction constraints
    const scaleX = availableWidth / paddedWidth
    const scaleY = availableHeight / paddedHeight
    let optimalZoom = Math.min(scaleX, scaleY)

    // CRITICAL: Ensure minimum interactive size (44px minimum touch target)
    const minTableSize = Math.min(...tables.map(t => Math.min(t.width, t.height)))
    const minRequiredZoom = 44 / minTableSize
    optimalZoom = Math.max(optimalZoom, minRequiredZoom)

    // Optimized zoom range for square canvas
    optimalZoom = Math.max(0.6, Math.min(3.0, optimalZoom))

    // Calculate center point of content
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // Calculate pan offset to center the content in the actual canvas
    const canvasCenterX = canvasSize.width / 2
    const canvasCenterY = canvasSize.height / 2

    const optimalPanX = canvasCenterX - centerX * optimalZoom
    const optimalPanY = canvasCenterY - centerY * optimalZoom

    return {
      zoom: optimalZoom,
      pan: { x: optimalPanX, y: optimalPanY },
      canvasSize: canvasSize // Use existing canvas size
    }
  }, [tables, containerRef, canvasSize])

  // Auto-fit all tables in view with enhanced centering
  const autoFitTables = useCallback((options = { animate: true }) => {
    const optimalView = calculateOptimalView()
    if (optimalView) {
      if (options.animate) {
        // Add smooth transition class to container
        if (containerRef) {
          containerRef.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }

        // Apply changes with animation
        setZoomLevel(optimalView.zoom)
        setPanOffset(optimalView.pan)
        setCanvasSize(optimalView.canvasSize)

        // Remove transition after animation completes
        setTimeout(() => {
          if (containerRef) {
            containerRef.style.transition = ''
          }
        }, 500)
      } else {
        // Instant application for initial load
        setZoomLevel(optimalView.zoom)
        setPanOffset(optimalView.pan)
        setCanvasSize(optimalView.canvasSize)
      }
    }
  }, [calculateOptimalView, containerRef, setZoomLevel, setPanOffset, setCanvasSize])

  // Center all tables in the middle of the canvas with better positioning logic
  const centerAllTables = useCallback((options = { animate: true }) => {
    if (tables.length === 0) return

    // Calculate bounding box of all tables
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    tables.forEach(table => {
      const halfWidth = table.width / 2
      const halfHeight = table.height / 2

      minX = Math.min(minX, table.x - halfWidth)
      maxX = Math.max(maxX, table.x + halfWidth)
      minY = Math.min(minY, table.y - halfHeight)
      maxY = Math.max(maxY, table.y + halfHeight)
    })

    // Calculate current center of mass
    const currentCenterX = (minX + maxX) / 2
    const currentCenterY = (minY + maxY) / 2

    // Calculate target center position (simple world coordinates)
    const targetCenterX = canvasSize.width / 2
    const targetCenterY = canvasSize.height / 2

    // Calculate required offset to center the group
    const offsetX = targetCenterX - currentCenterX
    const offsetY = targetCenterY - currentCenterY

    // Apply smooth transition if requested
    if (options.animate && containerRef) {
      containerRef.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      setTimeout(() => {
        if (containerRef) {
          containerRef.style.transition = ''
        }
      }, 400)
    }

    // Apply offset to all tables atomically
    const centeredTables = tables.map(table => ({
      ...table,
      x: table.x + offsetX,
      y: table.y + offsetY
    }))

    setTables(centeredTables)
  }, [tables, containerRef, canvasSize, setTables])

  return {
    calculateOptimalView,
    autoFitTables,
    centerAllTables
  }
}
