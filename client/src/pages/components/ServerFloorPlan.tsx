import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { FloorPlanCanvas } from '@/modules/floor-plan/components/FloorPlanCanvas'
import { ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react'
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
  // Interactive zoom and pan controls
  const [zoomLevel, setZoomLevel] = useState(0.7)
  const [panOffset, setPanOffset] = useState({ x: 100, y: 100 })

  // Calculate bounding box of all tables for "Fit All" functionality
  const calculateTablesBounds = useCallback(() => {
    if (tables.length === 0) return { minX: 0, minY: 0, maxX: 1200, maxY: 700 }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    tables.forEach(table => {
      const halfWidth = table.width / 2
      const halfHeight = table.height / 2
      minX = Math.min(minX, table.x - halfWidth)
      maxX = Math.max(maxX, table.x + halfWidth)
      minY = Math.min(minY, table.y - halfHeight)
      maxY = Math.max(maxY, table.y + halfHeight)
    })
    
    return { minX, minY, maxX, maxY }
  }, [tables])

  // Fit all tables in view with padding
  const fitAllTables = useCallback(() => {
    if (tables.length === 0) return
    
    const bounds = calculateTablesBounds()
    const boundsWidth = bounds.maxX - bounds.minX
    const boundsHeight = bounds.maxY - bounds.minY
    const padding = 100
    
    // Calculate zoom to fit all tables with padding
    const zoomX = (canvasSize.width - padding * 2) / boundsWidth
    const zoomY = (canvasSize.height - padding * 2) / boundsHeight
    const newZoom = Math.min(Math.max(0.25, Math.min(zoomX, zoomY)), 3)
    
    // Center the view on the tables
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    const newPanX = canvasSize.width / 2 - centerX * newZoom
    const newPanY = canvasSize.height / 2 - centerY * newZoom
    
    setZoomLevel(newZoom)
    setPanOffset({ x: newPanX, y: newPanY })
  }, [tables, canvasSize, calculateTablesBounds])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(3, prev * 1.2))
  }, [])
  
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(0.25, prev / 1.2))
  }, [])
  
  const handleResetView = useCallback(() => {
    setZoomLevel(0.7)
    setPanOffset({ x: 100, y: 100 })
  }, [])

  useEffect(() => {
    const updateCanvasSize = () => {
      const container = document.getElementById('floor-plan-container')
      if (container) {
        const rect = container.getBoundingClientRect()
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
    <Card className="bg-white" id="floor-plan-container">
      {/* Zoom Controls Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Server View</span>
          {tables.length > 0 && (
            <span className="text-xs text-gray-500">({tables.length} tables)</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.25}
            title="Zoom Out"
            className="h-8 w-8 p-0 hover:bg-gray-100 transition-all duration-200"
          >
            <ZoomOut className="h-4 w-4 text-gray-600" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetView}
            title="Reset View"
            className="h-8 px-2 text-xs font-medium hover:bg-gray-100 transition-all duration-200 text-gray-600"
          >
            {Math.round(zoomLevel * 100)}%
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            title="Zoom In"
            className="h-8 w-8 p-0 hover:bg-gray-100 transition-all duration-200"
          >
            <ZoomIn className="h-4 w-4 text-gray-600" />
          </Button>
          
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={fitAllTables}
            disabled={tables.length === 0}
            title="Fit All Tables"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
          >
            <Maximize className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetView}
            title="Reset Position"
            className="h-8 w-8 p-0 hover:bg-gray-100 transition-all duration-200"
          >
            <RotateCcw className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </div>
      
      {/* Floor Plan Canvas */}
      <div className="p-6">
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
      </div>
    </Card>
  )
}