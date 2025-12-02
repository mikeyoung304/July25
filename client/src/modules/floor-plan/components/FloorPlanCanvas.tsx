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
    // Only draw grid if zoom level is reasonable
    if (zoomLevel < 0.3) return
    
    const scaledGridSize = gridSize * zoomLevel
    
    // Skip grid if too dense
    if (scaledGridSize < 8) return
    
    // Calculate grid offset based on pan position
    const offsetX = ((panOffset.x / zoomLevel) % gridSize) * zoomLevel
    const offsetY = ((panOffset.y / zoomLevel) % gridSize) * zoomLevel
    
    // Use adaptive opacity based on zoom level
    const baseOpacity = Math.min(0.15, Math.max(0.02, (zoomLevel - 0.3) * 0.2))
    
    // Lighter grid lines for better visual hierarchy
    ctx.strokeStyle = `rgba(26, 54, 93, ${baseOpacity})` // macon-navy with adaptive opacity
    ctx.lineWidth = Math.max(0.5, 1 / zoomLevel) // Minimum line width for visibility

    // Calculate start positions to avoid negative offsets
    const startX = offsetX >= 0 ? offsetX : offsetX + scaledGridSize
    const startY = offsetY >= 0 ? offsetY : offsetY + scaledGridSize

    // More efficient line drawing - batch horizontal and vertical lines
    ctx.beginPath()
    
    // Draw vertical lines
    for (let x = startX; x <= canvasSize.width + scaledGridSize; x += scaledGridSize) {
      if (x >= 0 && x <= canvasSize.width) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvasSize.height)
      }
    }

    // Draw horizontal lines
    for (let y = startY; y <= canvasSize.height + scaledGridSize; y += scaledGridSize) {
      if (y >= 0 && y <= canvasSize.height) {
        ctx.moveTo(0, y)
        ctx.lineTo(canvasSize.width, y)
      }
    }
    
    ctx.stroke()
    
    // Add subtle dots at major grid intersections (only at higher zoom levels)
    if (zoomLevel > 0.7 && scaledGridSize > 20) {
      ctx.fillStyle = `rgba(26, 54, 93, ${baseOpacity * 2})` // macon-navy
      const majorGridSize = scaledGridSize * 5
      const majorStartX = startX - (startX % majorGridSize)
      const majorStartY = startY - (startY % majorGridSize)
      
      const dotRadius = Math.max(1, 2 / zoomLevel)
      
      for (let x = majorStartX; x <= canvasSize.width + majorGridSize; x += majorGridSize) {
        for (let y = majorStartY; y <= canvasSize.height + majorGridSize; y += majorGridSize) {
          if (x >= 0 && x <= canvasSize.width && y >= 0 && y <= canvasSize.height) {
            ctx.beginPath()
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
            ctx.fill()
          }
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

    // Enhanced shadow for better visual anchoring
    const shadowBlur = Math.max(8, 16 / zoomLevel)
    const shadowOffset = Math.max(3, 6 / zoomLevel)
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)' // Stronger shadow
    ctx.shadowBlur = shadowBlur
    ctx.shadowOffsetX = shadowOffset * 0.5  // Slight horizontal offset for depth
    ctx.shadowOffsetY = shadowOffset

    // Create gradient fills with better visual hierarchy (skip for chip_monkey)
    if (table.type !== 'chip_monkey') {
      let gradient: CanvasGradient
      if (table.type === 'circle') {
        gradient = ctx.createRadialGradient(0, -table.height/4, 0, 0, 0, table.width/2)
      } else {
        gradient = ctx.createLinearGradient(0, -table.height/2, 0, table.height/2)
      }

      if (table.status === 'paid') {
        gradient.addColorStop(0, '#FEF9C3') // Yellow-100 highlight
        gradient.addColorStop(0.5, '#EAB308') // Yellow-500 main (gold)
        gradient.addColorStop(1, '#CA8A04') // Yellow-600 depth
      } else if (table.status === 'occupied') {
        gradient.addColorStop(0, '#FEF3C7') // Amber-50 highlight
        gradient.addColorStop(0.5, '#F59E0B') // Amber-500 main
        gradient.addColorStop(1, '#D97706') // Amber-600 depth
      } else if (table.status === 'reserved') {
        gradient.addColorStop(0, '#EFF6FF') // Blue-50 highlight
        gradient.addColorStop(0.5, '#3B82F6') // Blue-500 main
        gradient.addColorStop(1, '#1D4ED8') // Blue-700 depth
      } else if (table.status === 'cleaning') {
        gradient.addColorStop(0, '#F5F3FF') // Violet-50 highlight
        gradient.addColorStop(0.5, '#8B5CF6') // Violet-500 main
        gradient.addColorStop(1, '#7C3AED') // Violet-600 depth
      } else if (table.status === 'unavailable') {
        gradient.addColorStop(0, '#F3F4F6') // Gray-100 highlight
        gradient.addColorStop(0.5, '#9CA3AF') // Gray-400 main
        gradient.addColorStop(1, '#6B7280') // Gray-500 depth
      } else {
        // Available - fresh professional green
        gradient.addColorStop(0, '#ECFDF5') // Emerald-50 highlight
        gradient.addColorStop(0.5, '#10B981') // Emerald-500 main
        gradient.addColorStop(1, '#059669') // Emerald-600 depth
      }

      ctx.fillStyle = gradient
    }

    // Draw shape with rounded corners for rectangles
    if (table.type === 'circle') {
      ctx.beginPath()
      ctx.arc(0, 0, table.width / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (table.type === 'chip_monkey') {
      // Draw an actual monkey character
      const size = table.width
      const scale = size / 64 // Base size for proportions
      
      ctx.save()
      ctx.scale(scale, scale)
      
      // Shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 3
      
      // Tail (curved, drawn first so it appears behind body)
      ctx.strokeStyle = '#8B4513'
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(12, 20)
      ctx.quadraticCurveTo(28, 15, 25, 0)
      ctx.quadraticCurveTo(23, -10, 28, -18)
      ctx.stroke()
      
      // Body (oval shape)
      ctx.fillStyle = '#8B4513' // Saddle brown for main fur
      ctx.beginPath()
      ctx.ellipse(0, 8, 18, 22, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Belly
      ctx.fillStyle = '#D2B48C' // Tan for belly
      ctx.beginPath()
      ctx.ellipse(0, 10, 12, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Arms
      ctx.fillStyle = '#8B4513'
      // Left arm
      ctx.save()
      ctx.rotate(-0.5)
      ctx.beginPath()
      ctx.ellipse(-15, 5, 6, 15, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      
      // Right arm
      ctx.save()
      ctx.rotate(0.5)
      ctx.beginPath()
      ctx.ellipse(15, 5, 6, 15, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      
      // Legs
      // Left leg
      ctx.beginPath()
      ctx.ellipse(-8, 25, 7, 12, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Right leg
      ctx.beginPath()
      ctx.ellipse(8, 25, 7, 12, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Feet
      ctx.fillStyle = '#654321' // Darker brown for feet
      ctx.beginPath()
      ctx.ellipse(-8, 32, 6, 4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(8, 32, 6, 4, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Hands
      ctx.beginPath()
      ctx.arc(-18, 15, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(18, 15, 4, 0, Math.PI * 2)
      ctx.fill()
      
      // Head (larger, more prominent)
      ctx.fillStyle = '#8B4513'
      ctx.beginPath()
      ctx.ellipse(0, -12, 20, 18, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Face area (lighter color)
      ctx.fillStyle = '#D2B48C' // Tan
      ctx.beginPath()
      ctx.ellipse(0, -10, 14, 13, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Ears (very prominent, monkey-like)
      ctx.fillStyle = '#8B4513'
      // Left ear
      ctx.beginPath()
      ctx.arc(-18, -12, 8, 0, Math.PI * 2)
      ctx.fill()
      // Right ear
      ctx.beginPath()
      ctx.arc(18, -12, 8, 0, Math.PI * 2)
      ctx.fill()
      
      // Inner ears
      ctx.fillStyle = '#FFB6C1' // Light pink
      ctx.beginPath()
      ctx.arc(-18, -12, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(18, -12, 4, 0, Math.PI * 2)
      ctx.fill()
      
      // Muzzle/snout area
      ctx.fillStyle = '#FFDAB9' // Peach
      ctx.beginPath()
      ctx.ellipse(0, -5, 10, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Eyes (larger, more expressive)
      // Eye whites
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.ellipse(-6, -14, 5, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(6, -14, 5, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Pupils
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(-5, -13, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(5, -13, 3, 0, Math.PI * 2)
      ctx.fill()
      
      // Eye shine
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(-4, -14, 1.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(6, -14, 1.2, 0, Math.PI * 2)
      ctx.fill()
      
      // Eyebrows
      ctx.strokeStyle = '#654321'
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-10, -18)
      ctx.lineTo(-3, -19)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(10, -18)
      ctx.lineTo(3, -19)
      ctx.stroke()
      
      // Nose
      ctx.fillStyle = '#654321'
      ctx.beginPath()
      ctx.ellipse(0, -6, 2, 1.5, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Nostrils
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(-1, -6, 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(1, -6, 0.5, 0, Math.PI * 2)
      ctx.fill()
      
      // Mouth (smile)
      ctx.strokeStyle = '#654321'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(0, -4, 5, 0.2 * Math.PI, 0.8 * Math.PI)
      ctx.stroke()
      
      ctx.restore()
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

    // Professional multi-layer selection highlighting
    if (isSelected) {
      const selectionColor = '#FB923C' // Orange-400
      const selectionGlow = 'rgba(251, 146, 60, 0.2)'
      
      // Draw selection layers with scale-aware thickness
      const outerGlowWidth = Math.max(6, 12 / zoomLevel)
      const innerStrokeWidth = Math.max(2, 3 / zoomLevel)
      const selectionOffset = Math.max(3, 6 / zoomLevel)
      
      const drawSelectionShape = (offset: number, strokeWidth: number, color: string) => {
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
        
        if (table.type === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, table.width / 2 + offset, 0, Math.PI * 2)
          ctx.stroke()
        } else if (table.type === 'chip_monkey') {
          // Simple circular selection for chip_monkey
          ctx.beginPath()
          ctx.arc(0, 0, table.width / 2 + offset, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          const radius = Math.max(8, 12 / zoomLevel)
          const halfWidth = table.width / 2 + offset
          const halfHeight = table.height / 2 + offset
          
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
      }

      // Outer glow layer
      drawSelectionShape(selectionOffset + 2, outerGlowWidth, selectionGlow)
      
      // Main selection outline
      drawSelectionShape(selectionOffset, innerStrokeWidth, selectionColor)

      // Draw resize handles
      drawResizeHandles(ctx, table)
    }

    // Scale-aware typography
    const baseFontSize = Math.max(10, 14 / zoomLevel)
    const smallFontSize = Math.max(8, 11 / zoomLevel)
    
    // Table label with adaptive sizing
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'
    ctx.font = `600 ${baseFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Add text stroke for better readability
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = Math.max(1, 2 / zoomLevel)
    ctx.strokeText(table.label, 0, -4)
    ctx.fillText(table.label, 0, -4)
    
    // Seats indicator (only show if zoom level allows readable text)
    if (zoomLevel > 0.6) {
      ctx.font = `400 ${smallFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.strokeText(`${table.seats} seats`, 0, 8)
      ctx.fillText(`${table.seats} seats`, 0, 8)
    }

    ctx.restore()
  }, [drawResizeHandles, zoomLevel])

  const getResizeHandles = (table: Table) => {
    const halfWidth = table.width / 2
    const halfHeight = table.height / 2
    
    if (table.type === 'circle' || table.type === 'chip_monkey') {
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

  const drawCanvasBoundaries = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw more prominent canvas frame with visual anchoring
    const borderWidth = 3
    const margin = 8
    
    // Outer subtle shadow for depth
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)'
    ctx.lineWidth = 1
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.rect(margin - 1, margin - 1, canvasSize.width - (margin - 1) * 2, canvasSize.height - (margin - 1) * 2)
    ctx.stroke()
    
    // Main border with premium blue-gray
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.15)' // slate-700 with opacity
    ctx.lineWidth = borderWidth
    ctx.beginPath()
    ctx.rect(margin, margin, canvasSize.width - margin * 2, canvasSize.height - margin * 2)
    ctx.stroke()
    
    // Inner highlight for premium feel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.rect(margin + 1, margin + 1, canvasSize.width - (margin + 1) * 2, canvasSize.height - (margin + 1) * 2)
    ctx.stroke()
    
    // Draw center guides (subtle crosshairs)
    if (zoomLevel > 0.5) { // Only show at reasonable zoom levels
      const centerX = canvasSize.width / 2
      const centerY = canvasSize.height / 2
      const guideLength = 40
      const guideOpacity = Math.min(0.15, (zoomLevel - 0.5) * 0.3)
      
      ctx.strokeStyle = `rgba(26, 54, 93, ${guideOpacity})`
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      
      // Horizontal center line
      ctx.beginPath()
      ctx.moveTo(centerX - guideLength, centerY)
      ctx.lineTo(centerX + guideLength, centerY)
      ctx.stroke()
      
      // Vertical center line
      ctx.beginPath()
      ctx.moveTo(centerX, centerY - guideLength)
      ctx.lineTo(centerX, centerY + guideLength)
      ctx.stroke()
      
      // Center point dot
      ctx.fillStyle = `rgba(26, 54, 93, ${guideOpacity * 2})`
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [canvasSize, zoomLevel])

  const drawLayoutExtents = useCallback((ctx: CanvasRenderingContext2D) => {
    if (tables.length === 0 || zoomLevel < 0.4) return

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

    // Add padding around the extent box
    const padding = 60
    minX -= padding
    maxX += padding
    minY -= padding
    maxY += padding

    // Draw subtle extent box
    const extentOpacity = Math.min(0.1, (zoomLevel - 0.4) * 0.2)
    ctx.strokeStyle = `rgba(59, 130, 246, ${extentOpacity})` // blue-500 with opacity
    ctx.lineWidth = 2
    ctx.setLineDash([8, 8])
    
    ctx.beginPath()
    ctx.rect(minX, minY, maxX - minX, maxY - minY)
    ctx.stroke()
    
    // Add dimension labels at higher zoom levels
    if (zoomLevel > 0.8) {
      const width = Math.round((maxX - minX) / 10) / 10
      const height = Math.round((maxY - minY) / 10) / 10
      
      ctx.fillStyle = `rgba(59, 130, 246, ${extentOpacity * 3})`
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Width label at top
      ctx.fillText(`${width}ft`, (minX + maxX) / 2, minY - 20)
      
      // Height label on side
      ctx.save()
      ctx.translate(minX - 20, (minY + maxY) / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(`${height}ft`, 0, 0)
      ctx.restore()
    }
    
    ctx.setLineDash([])
  }, [tables, zoomLevel])

  const drawScaleReference = useCallback((ctx: CanvasRenderingContext2D) => {
    // Only show scale at reasonable zoom levels
    if (zoomLevel < 0.5) return

    // Calculate scale bar dimensions
    const scaleLength = 100 * zoomLevel // 100 units in world space
    const x = canvasSize.width - 120
    const y = canvasSize.height - 40
    
    const scaleOpacity = Math.min(0.6, (zoomLevel - 0.3) * 0.8)
    
    // Draw scale bar background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillRect(x - 10, y - 15, scaleLength + 20, 25)
    
    // Draw scale bar
    ctx.strokeStyle = `rgba(26, 54, 93, ${scaleOpacity})`
    ctx.lineWidth = 2
    ctx.setLineDash([])
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + scaleLength, y)
    ctx.stroke()
    
    // Draw scale ticks
    ctx.beginPath()
    ctx.moveTo(x, y - 3)
    ctx.lineTo(x, y + 3)
    ctx.moveTo(x + scaleLength, y - 3)
    ctx.lineTo(x + scaleLength, y + 3)
    ctx.stroke()
    
    // Draw scale label
    ctx.fillStyle = `rgba(26, 54, 93, ${scaleOpacity})`
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('10ft', x + scaleLength / 2, y + 5)
  }, [canvasSize, zoomLevel])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Enhanced professional background with better visual anchoring
    ctx.fillStyle = '#FAFBFC' // Warmer, more premium background
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Multi-layer background for depth and visual anchoring
    const centerGradient = ctx.createRadialGradient(
      canvasSize.width / 2, canvasSize.height / 2, 0,
      canvasSize.width / 2, canvasSize.height / 2, Math.max(canvasSize.width, canvasSize.height) / 2
    )
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
    centerGradient.addColorStop(0.7, 'rgba(249, 250, 251, 0.4)')
    centerGradient.addColorStop(1, 'rgba(243, 244, 246, 0.2)')
    ctx.fillStyle = centerGradient
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Add subtle paper texture with diagonal gradient
    const diagonalGradient = ctx.createLinearGradient(0, 0, canvasSize.width, canvasSize.height)
    diagonalGradient.addColorStop(0, 'rgba(248, 250, 252, 0.15)')
    diagonalGradient.addColorStop(0.5, 'rgba(241, 245, 249, 0.05)')
    diagonalGradient.addColorStop(1, 'rgba(248, 250, 252, 0.15)')
    ctx.fillStyle = diagonalGradient
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    // Draw canvas boundaries and center guides (before transform)
    drawCanvasBoundaries(ctx)

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

    // Draw layout extents (before drawing tables for proper layering)
    drawLayoutExtents(ctx)

    // Draw tables
    tables.forEach(table => {
      drawTable(ctx, table, table.id === selectedTableId)
    })
    
    // Restore context state
    ctx.restore()
    
    // Draw scale reference in screen space (after transform restore)
    drawScaleReference(ctx)
  }, [tables, selectedTableId, canvasSize, showGrid, drawGrid, drawTable, drawCanvasBoundaries, drawLayoutExtents, drawScaleReference, zoomLevel, panOffset])

  const getTableAtPoint = useCallback((screenX: number, screenY: number): Table | null => {
    // Convert screen coordinates to world coordinates
    const worldX = (screenX - panOffset.x) / zoomLevel
    const worldY = (screenY - panOffset.y) / zoomLevel
    
    // Check tables in reverse order (top to bottom)
    for (let i = tables.length - 1; i >= 0; i--) {
      const table = tables[i]
      
      if (table.type === 'circle' || table.type === 'chip_monkey') {
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
      const minSize = table.type === 'chip_monkey' ? 24 : 40
      
      if (table.type === 'circle' || table.type === 'chip_monkey') {
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