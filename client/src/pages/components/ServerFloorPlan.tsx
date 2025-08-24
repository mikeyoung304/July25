import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FloorPlanCanvas } from '@/modules/floor-plan/components/FloorPlanCanvas'
import type { Table } from '@/modules/floor-plan/types'

interface ServerFloorPlanProps {
  tables: Table[]
  selectedTableId: string | null
  onTableClick: (tableId: string) => void
  onCanvasClick: () => void
  isLoading: boolean
}

export function ServerFloorPlan({ 
  tables, 
  selectedTableId, 
  onTableClick, 
  onCanvasClick,
  isLoading 
}: ServerFloorPlanProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 700 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [hasAutoFitted, setHasAutoFitted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate optimal view to show all tables centered
  const calculateOptimalView = useCallback(() => {
    if (tables.length === 0 || !containerRef.current) return null

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

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    
    // Add padding around content
    const padding = 80
    const paddedWidth = contentWidth + padding * 2
    const paddedHeight = contentHeight + padding * 2

    // Calculate zoom to fit all tables
    const availableWidth = canvasSize.width - 40
    const availableHeight = canvasSize.height - 40
    const scaleX = availableWidth / paddedWidth
    const scaleY = availableHeight / paddedHeight
    let optimalZoom = Math.min(scaleX, scaleY)
    
    // Ensure minimum interactive size
    const minTableSize = Math.min(...tables.map(t => Math.min(t.width, t.height)))
    const minRequiredZoom = 44 / minTableSize
    optimalZoom = Math.max(optimalZoom, minRequiredZoom)
    
    // Constrain zoom range
    optimalZoom = Math.max(0.5, Math.min(2.0, optimalZoom))

    // Calculate center point of content
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // Calculate pan offset to center the content
    const canvasCenterX = canvasSize.width / 2
    const canvasCenterY = canvasSize.height / 2
    
    const optimalPanX = canvasCenterX - centerX * optimalZoom
    const optimalPanY = canvasCenterY - centerY * optimalZoom

    return {
      zoom: optimalZoom,
      pan: { x: optimalPanX, y: optimalPanY }
    }
  }, [tables, canvasSize])

  // Auto-fit tables in view
  const autoFitTables = useCallback(() => {
    const optimalView = calculateOptimalView()
    if (optimalView) {
      setZoomLevel(optimalView.zoom)
      setPanOffset(optimalView.pan)
    }
  }, [calculateOptimalView])

  // Update canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({
          width: Math.max(1200, rect.width - 48),
          height: 700
        })
      }
    }
    
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

  // Auto-fit tables when they load
  useEffect(() => {
    if (!isLoading && tables.length > 0 && !hasAutoFitted) {
      // Small delay to ensure canvas is ready
      const timer = setTimeout(() => {
        autoFitTables()
        setHasAutoFitted(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isLoading, tables.length, hasAutoFitted, autoFitTables])

  // Reset auto-fit flag when loading starts
  useEffect(() => {
    if (isLoading) {
      setHasAutoFitted(false)
    }
  }, [isLoading])

  if (isLoading) {
    return (
      <Card className="p-12 text-center">
        <LoadingSpinner message="Loading floor plan..." />
      </Card>
    )
  }

  if (tables.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-macon-navy/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-macon-navy/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">Floor Plan Setup Needed</h3>
          <p className="text-neutral-600">Create your restaurant floor plan in the Admin section to enable table management and order taking.</p>
          <div className="mt-4 text-sm text-neutral-500">
            <p>Go to Admin → Floor Plan Creator to get started</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-white" ref={containerRef} id="floor-plan-container">
      <FloorPlanCanvas
        tables={tables}
        selectedTableId={selectedTableId}
        canvasSize={canvasSize}
        onTableClick={onTableClick}
        onCanvasClick={onCanvasClick}
        showGrid={false}
        gridSize={20}
        snapToGrid={false}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        onZoomChange={setZoomLevel}
        onPanChange={setPanOffset}
      />
    </Card>
  )
}