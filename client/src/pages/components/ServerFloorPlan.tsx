import React, { useState, useEffect } from 'react'
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
  // Start with a zoom that shows more area and centered view
  const [zoomLevel] = useState(0.7)
  const [panOffset] = useState({ x: 100, y: 100 })

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
    <Card className="p-6 bg-white" id="floor-plan-container">
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
      />
    </Card>
  )
}