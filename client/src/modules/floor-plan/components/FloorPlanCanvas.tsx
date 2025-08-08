import React, { useRef, useEffect, useCallback } from 'react'
import { Table } from '../types'

interface FloorPlanCanvasProps {
  tables: Table[]
  selectedTableId: string | null
  canvasSize: { width: number; height: number }
  showGrid: boolean
  gridSize: number
  onTableClick?: (tableId: string) => void
  onTableMove?: (tableId: string, x: number, y: number) => void
  onTableResize?: (tableId: string, width: number, height: number) => void
  onCanvasClick?: () => void
  snapToGrid: boolean
  zoomLevel: number
  panOffset: { x: number; y: number }
  onZoomChange?: (level: number) => void
  onPanChange?: (offset: { x: number; y: number }) => void
}

export function FloorPlanCanvas({
  tables,
  selectedTableId,
  canvasSize,
  showGrid,
  gridSize,
  onTableClick,
  onTableMove,
  onTableResize,
  onCanvasClick,
  snapToGrid,
  zoomLevel,
  panOffset,
  onZoomChange,
  onPanChange,
}: FloorPlanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef(false)
  const draggedTableRef = useRef<string | null>(null)
  const resizingTableRef = useRef<string | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const resizeHandleRef = useRef<string | null>(null)
  const initialSizeRef = useRef({ width: 0, height: 0 })
  const mouseStartRef = useRef({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const lastPanPositionRef = useRef({ x: 0, y: 0 })

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const scaledGridSize = gridSize * zoomLevel
    
    // Calculate grid offset based on pan position
    const offsetX = ((panOffset.x / zoomLevel) % gridSize) * zoomLevel
    const offsetY = ((panOffset.y / zoomLevel) % gridSize) * zoomLevel
    
    // Use Macon brand colors for grid
    ctx.strokeStyle = 'rgba(26, 54, 93, 0.05)' // macon-navy with low opacity
    ctx.lineWidth = 0.5 / zoomLevel // Scale line width with zoom

    // Calculate start positions to avoid negative offsets
    const startX = offsetX >= 0 ? offsetX : offsetX + scaledGridSize
    const startY = offsetY >= 0 ? offsetY : offsetY + scaledGridSize

    // Draw vertical lines
    for (let x = startX; x <= canvasSize.width + scaledGridSize; x += scaledGridSize) {
      if (x >= 0 && x <= canvasSize.width) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvasSize.height)
        ctx.stroke()
      }
    }

    // Draw horizontal lines
    for (let y = startY; y <= canvasSize.height + scaledGridSize; y += scaledGridSize) {
      if (y >= 0 && y <= canvasSize.height) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvasSize.width, y)
        ctx.stroke()
      }
    }
    
    // Add subtle dots at major grid intersections
    ctx.fillStyle = 'rgba(26, 54, 93, 0.1)' // macon-navy
    const majorGridSize = scaledGridSize * 4
    const majorStartX = startX - (startX % majorGridSize)
    const majorStartY = startY - (startY % majorGridSize)
    
    for (let x = majorStartX; x <= canvasSize.width + majorGridSize; x += majorGridSize) {
      for (let y = majorStartY; y <= canvasSize.height + majorGridSize; y += majorGridSize) {
        if (x >= 0 && x <= canvasSize.width && y >= 0 && y <= canvasSize.height) {
          ctx.beginPath()
          ctx.arc(x, y, 1.5 / zoomLevel, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }, [canvasSize, gridSize, zoomLevel, panOffset])

  const drawResizeHandles = useCallback((ctx: CanvasRenderingContext2D, table: Table) => {
    const handles = getResizeHandles(table)
    
    ctx.fillStyle = '#fb923c' // macon-orange
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    
    Object.values(handles).forEach(handle => {
      ctx.beginPath()
      ctx.arc(handle.x, handle.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })
  }, [])

  const drawTable = useCallback((ctx: CanvasRenderingContext2D, table: Table, isSelected: boolean) => {
    ctx.save()
    ctx.translate(table.x, table.y)
    ctx.rotate((table.rotation * Math.PI) / 180)

    // Create subtle shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 4

    // Create gradient fills for premium feel
    let gradient: CanvasGradient
    if (table.type === 'circle') {
      gradient = ctx.createRadialGradient(0, -table.height/4, 0, 0, 0, table.width/2)
    } else {
      gradient = ctx.createLinearGradient(0, -table.height/2, 0, table.height/2)
    }

    // Status-based color schemes using Macon brand colors
    if (table.status === 'occupied') {
      gradient.addColorStop(0, '#fb923c') // macon-orange
      gradient.addColorStop(1, '#ea7c1c') // macon-orange-dark
    } else if (table.status === 'reserved') {
      gradient.addColorStop(0, '#2d4a7c') // macon-navy-light
      gradient.addColorStop(1, '#1a365d') // macon-navy
    } else {
      gradient.addColorStop(0, '#4dd4cc') // macon-teal-light
      gradient.addColorStop(1, '#38b2ac') // macon-teal
    }

    ctx.fillStyle = gradient

    // Draw shape with rounded corners for rectangles
    if (table.type === 'circle') {
      ctx.beginPath()
      ctx.arc(0, 0, table.width / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const radius = 8
      const halfWidth = table.width / 2
      const halfHeight = table.height / 2
      
      ctx.beginPath()
      ctx.moveTo(-halfWidth + radius, -halfHeight)
      ctx.lineTo(halfWidth - radius, -halfHeight)
      ctx.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius)
      ctx.lineTo(halfWidth, halfHeight - radius)
      ctx.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight)
      ctx.lineTo(-halfWidth + radius, halfHeight)
      ctx.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius)
      ctx.lineTo(-halfWidth, -halfHeight + radius)
      ctx.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight)
      ctx.closePath()
      ctx.fill()
    }

    // Reset shadow for other elements
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Selection outline with Macon brand glow effect
    if (isSelected) {
      // Outer glow with Macon orange
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.3)' // macon-orange with opacity
      ctx.lineWidth = 8
      if (table.type === 'circle') {
        ctx.beginPath()
        ctx.arc(0, 0, table.width / 2 + 4, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        const radius = 12
        const halfWidth = table.width / 2 + 4
        const halfHeight = table.height / 2 + 4
        
        ctx.beginPath()
        ctx.moveTo(-halfWidth + radius, -halfHeight)
        ctx.lineTo(halfWidth - radius, -halfHeight)
        ctx.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius)
        ctx.lineTo(halfWidth, halfHeight - radius)
        ctx.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight)
        ctx.lineTo(-halfWidth + radius, halfHeight)
        ctx.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius)
        ctx.lineTo(-halfWidth, -halfHeight + radius)
        ctx.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight)
        ctx.closePath()
        ctx.stroke()
      }
      
      // Inner stroke with Macon orange
      ctx.strokeStyle = '#fb923c' // macon-orange
      ctx.lineWidth = 2
      if (table.type === 'circle') {
        ctx.beginPath()
        ctx.arc(0, 0, table.width / 2 + 2, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        const radius = 10
        const halfWidth = table.width / 2 + 2
        const halfHeight = table.height / 2 + 2
        
        ctx.beginPath()
        ctx.moveTo(-halfWidth + radius, -halfHeight)
        ctx.lineTo(halfWidth - radius, -halfHeight)
        ctx.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius)
        ctx.lineTo(halfWidth, halfHeight - radius)
        ctx.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight)
        ctx.lineTo(-halfWidth + radius, halfHeight)
        ctx.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius)
        ctx.lineTo(-halfWidth, -halfHeight + radius)
        ctx.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight)
        ctx.closePath()
        ctx.stroke()
      }

      // Draw resize handles
      drawResizeHandles(ctx, table)
    }

    // Table label with better typography
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(table.label, 0, -8)
    
    // Seats indicator
    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillText(`${table.seats} seats`, 0, 8)

    ctx.restore()
  }, [drawResizeHandles])

  const getResizeHandles = (table: Table) => {
    const halfWidth = table.width / 2
    const halfHeight = table.height / 2
    
    if (table.type === 'circle') {
      return {
        n: { x: 0, y: -halfHeight, cursor: 'ns-resize' },
        e: { x: halfWidth, y: 0, cursor: 'ew-resize' },
        s: { x: 0, y: halfHeight, cursor: 'ns-resize' },
        w: { x: -halfWidth, y: 0, cursor: 'ew-resize' },
      }
    } else {
      return {
        nw: { x: -halfWidth, y: -halfHeight, cursor: 'nw-resize' },
        n: { x: 0, y: -halfHeight, cursor: 'ns-resize' },
        ne: { x: halfWidth, y: -halfHeight, cursor: 'ne-resize' },
        e: { x: halfWidth, y: 0, cursor: 'ew-resize' },
        se: { x: halfWidth, y: halfHeight, cursor: 'se-resize' },
        s: { x: 0, y: halfHeight, cursor: 'ns-resize' },
        sw: { x: -halfWidth, y: halfHeight, cursor: 'sw-resize' },
        w: { x: -halfWidth, y: 0, cursor: 'ew-resize' },
      }
    }
  }

  const getResizeHandleAtPoint = useCallback((table: Table, worldX: number, worldY: number): string | null => {
    const handles = getResizeHandles(table)
    const threshold = 10 // Fixed threshold in world coordinates
    
    // Transform point to table's local coordinates
    const cos = Math.cos(-table.rotation * Math.PI / 180)
    const sin = Math.sin(-table.rotation * Math.PI / 180)
    const localX = (worldX - table.x) * cos - (worldY - table.y) * sin
    const localY = (worldX - table.x) * sin + (worldY - table.y) * cos
    
    for (const [key, handle] of Object.entries(handles)) {
      const distance = Math.sqrt(Math.pow(localX - handle.x, 2) + Math.pow(localY - handle.y, 2))
      if (distance <= threshold) {
        return key
      }
    }
    
    return null
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas with Macon brand background
    ctx.fillStyle = '#FBFBFA' // Matching the app background
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Save context state
    ctx.save()
    
    // Apply zoom and pan transformations
    ctx.translate(panOffset.x, panOffset.y)
    ctx.scale(zoomLevel, zoomLevel)

    // Draw grid (in screen space, not world space)
    if (showGrid) {
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform for grid
      drawGrid(ctx)
      ctx.restore()
      
      // Restore the zoom and pan transform
      ctx.translate(panOffset.x, panOffset.y)
      ctx.scale(zoomLevel, zoomLevel)
    }

    // Draw tables
    tables.forEach(table => {
      drawTable(ctx, table, table.id === selectedTableId)
    })
    
    // Restore context state
    ctx.restore()
  }, [tables, selectedTableId, canvasSize, showGrid, drawGrid, drawTable, zoomLevel, panOffset])

  const getTableAtPoint = useCallback((screenX: number, screenY: number): Table | null => {
    // Convert screen coordinates to world coordinates
    const worldX = (screenX - panOffset.x) / zoomLevel
    const worldY = (screenY - panOffset.y) / zoomLevel
    
    // Check tables in reverse order (top to bottom)
    for (let i = tables.length - 1; i >= 0; i--) {
      const table = tables[i]
      
      if (table.type === 'circle') {
        const distance = Math.sqrt(Math.pow(worldX - table.x, 2) + Math.pow(worldY - table.y, 2))
        if (distance <= table.width / 2) {
          return table
        }
      } else {
        // Handle rotated rectangles properly
        const cos = Math.cos(-table.rotation * Math.PI / 180)
        const sin = Math.sin(-table.rotation * Math.PI / 180)
        
        // Transform point to table's local coordinates
        const localX = (worldX - table.x) * cos - (worldY - table.y) * sin
        const localY = (worldX - table.x) * sin + (worldY - table.y) * cos
        
        const halfWidth = table.width / 2
        const halfHeight = table.height / 2
        
        if (
          localX >= -halfWidth &&
          localX <= halfWidth &&
          localY >= -halfHeight &&
          localY <= halfHeight
        ) {
          return table
        }
      }
    }
    return null
  }, [tables, zoomLevel, panOffset])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Convert to world coordinates
    const worldX = (x - panOffset.x) / zoomLevel
    const worldY = (y - panOffset.y) / zoomLevel

    // Check for middle mouse button or space key for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isPanningRef.current = true
      lastPanPositionRef.current = { x: e.clientX, y: e.clientY }
      canvas.style.cursor = 'grab'
      return
    }

    // Check if clicking on a resize handle first
    if (selectedTableId) {
      const selectedTable = tables.find(t => t.id === selectedTableId)
      if (selectedTable) {
        const handle = getResizeHandleAtPoint(selectedTable, worldX, worldY)
        if (handle) {
          isResizingRef.current = true
          resizingTableRef.current = selectedTable.id
          resizeHandleRef.current = handle
          initialSizeRef.current = { width: selectedTable.width, height: selectedTable.height }
          mouseStartRef.current = { x: worldX, y: worldY }
          return
        }
      }
    }

    const table = getTableAtPoint(x, y)
    if (table) {
      onTableClick?.(table.id)
      isDraggingRef.current = true
      draggedTableRef.current = table.id
      dragOffsetRef.current = { x: worldX - table.x, y: worldY - table.y }
    } else {
      onCanvasClick?.()
    }
  }, [getTableAtPoint, onTableClick, onCanvasClick, selectedTableId, tables, zoomLevel, panOffset, getResizeHandleAtPoint])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Convert to world coordinates
    const worldX = (x - panOffset.x) / zoomLevel
    const worldY = (y - panOffset.y) / zoomLevel

    // Handle panning
    if (isPanningRef.current) {
      const dx = e.clientX - lastPanPositionRef.current.x
      const dy = e.clientY - lastPanPositionRef.current.y
      onPanChange?.({
        x: panOffset.x + dx,
        y: panOffset.y + dy
      })
      lastPanPositionRef.current = { x: e.clientX, y: e.clientY }
      return
    }

    // Handle resizing
    if (isResizingRef.current && resizingTableRef.current && resizeHandleRef.current) {
      const table = tables.find(t => t.id === resizingTableRef.current)
      if (!table) return

      const dx = (worldX - mouseStartRef.current.x)
      const dy = (worldY - mouseStartRef.current.y)
      
      // Transform delta based on rotation
      const cos = Math.cos(-table.rotation * Math.PI / 180)
      const sin = Math.sin(-table.rotation * Math.PI / 180)
      const localDx = dx * cos - dy * sin
      const localDy = dx * sin + dy * cos

      let newWidth = initialSizeRef.current.width
      let newHeight = initialSizeRef.current.height

      const handle = resizeHandleRef.current
      const minSize = 40
      
      if (table.type === 'circle') {
        // For circles, maintain aspect ratio
        let delta = 0
        if (handle === 'n' || handle === 's') {
          delta = (handle === 'n' ? -localDy : localDy)
        } else if (handle === 'e' || handle === 'w') {
          delta = (handle === 'e' ? localDx : -localDx)
        }
        
        newWidth = newHeight = Math.max(minSize, initialSizeRef.current.width + delta * 2)
      } else {
        // For rectangles, allow independent resizing
        if (handle.includes('w')) newWidth = Math.max(minSize, initialSizeRef.current.width - localDx * 2)
        if (handle.includes('e')) newWidth = Math.max(minSize, initialSizeRef.current.width + localDx * 2)
        if (handle.includes('n')) newHeight = Math.max(minSize, initialSizeRef.current.height - localDy * 2)
        if (handle.includes('s')) newHeight = Math.max(minSize, initialSizeRef.current.height + localDy * 2)
      }

      // Snap to grid if enabled
      if (snapToGrid) {
        newWidth = Math.round(newWidth / gridSize) * gridSize
        newHeight = Math.round(newHeight / gridSize) * gridSize
      }

      onTableResize?.(table.id, newWidth, newHeight)
      return
    }

    // Handle dragging
    if (isDraggingRef.current && draggedTableRef.current) {
      const newX = worldX - dragOffsetRef.current.x
      const newY = worldY - dragOffsetRef.current.y
      onTableMove?.(draggedTableRef.current, newX, newY)
      return
    }

    // Update cursor based on hover state
    if (selectedTableId) {
      const selectedTable = tables.find(t => t.id === selectedTableId)
      if (selectedTable) {
        const handle = getResizeHandleAtPoint(selectedTable, worldX, worldY)
        if (handle) {
          const handles = getResizeHandles(selectedTable)
          canvas.style.cursor = (handles as Record<string, { cursor: string }>)[handle].cursor
          return
        }
      }
    }

    const table = getTableAtPoint(x, y)
    canvas.style.cursor = table ? 'move' : e.shiftKey ? 'grab' : 'default'
  }, [onTableMove, onTableResize, tables, selectedTableId, snapToGrid, gridSize, getTableAtPoint, zoomLevel, panOffset, onPanChange, getResizeHandleAtPoint])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
    isResizingRef.current = false
    isPanningRef.current = false
    draggedTableRef.current = null
    resizingTableRef.current = null
    resizeHandleRef.current = null
    dragOffsetRef.current = { x: 0, y: 0 }
    
    const canvas = canvasRef.current
    if (canvas) {
      canvas.style.cursor = 'default'
    }
  }, [])

  // Handle zoom with mouse wheel
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.5, Math.min(2, zoomLevel * delta))
      onZoomChange?.(newZoom)
    }

    // Add non-passive event listener to allow preventDefault
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [zoomLevel, onZoomChange])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="rounded-xl shadow-medium cursor-pointer transition-all duration-200 hover:shadow-large"
      style={{ 
        touchAction: 'none',
        background: '#ffffff',
        border: '1px solid rgba(26, 54, 93, 0.08)'
      }}
    />
  )
}