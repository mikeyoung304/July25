import React, { useState, useEffect, useCallback } from 'react'
import { FloorPlanCanvas } from './FloorPlanCanvas'
import { FloorPlanToolbar } from './FloorPlanToolbar'
import { TableEditor } from './TableEditor'
import { CanvasInstructions } from './CanvasInstructions'
import { LoadingOverlay } from './LoadingOverlay'
import { useTableManagement, useCanvasControls, useFloorPlanLayout } from '../hooks'
import { TablePersistenceService } from '../services/TablePersistenceService'
import { Table } from '../types'

interface FloorPlanEditorProps {
  restaurantId: string
  onSave?: (tables: Table[]) => void
  onBack?: () => void
}

/**
 * Floor Plan Editor Component (Refactored)
 *
 * Reduced from 940 lines to ~200 lines by extracting:
 * - useTableManagement hook (CRUD operations, selection, keyboard shortcuts)
 * - useCanvasControls hook (zoom, pan, canvas size)
 * - useFloorPlanLayout hook (auto-fit, center, layout algorithms)
 * - TablePersistenceService (save/load logic)
 * - UI components (TableEditor, CanvasInstructions, LoadingOverlay)
 */
export function FloorPlanEditor({ restaurantId, onSave, onBack }: FloorPlanEditorProps) {
  // State management hooks
  const {
    tables,
    selectedTableId,
    selectedTable,
    setTables,
    setSelectedTableId,
    addTable,
    updateTable,
    deleteTable
  } = useTableManagement(restaurantId)

  // Canvas container ref
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null)

  // Canvas controls hook
  const {
    canvasSize,
    zoomLevel,
    panOffset,
    snapToGrid,
    canvasReady,
    setZoomLevel,
    setPanOffset,
    setCanvasSize,
    setCanvasReady
  } = useCanvasControls(containerRef)

  // Layout algorithms hook
  const {
    autoFitTables,
    centerAllTables
  } = useFloorPlanLayout({
    tables,
    canvasSize,
    containerRef,
    setTables,
    setZoomLevel,
    setPanOffset,
    setCanvasSize
  })

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasAutoFitted, setHasAutoFitted] = useState(false)
  const [isAutoFitting, setIsAutoFitting] = useState(false)

  // Load tables on mount
  useEffect(() => {
    const loadTables = async () => {
      setIsLoading(true)
      const loadedTables = await TablePersistenceService.loadTables(restaurantId)
      setTables(loadedTables)
      setIsLoading(false)
    }
    loadTables()
  }, [restaurantId, setTables])

  // Smart auto-fit when canvas and data are ready
  useEffect(() => {
    if (canvasReady && !isLoading && tables.length > 0 && !hasAutoFitted) {
      setIsAutoFitting(true)

      // Simple timeout to ensure canvas is ready
      setTimeout(() => {
        // First center all existing tables properly
        centerAllTables({ animate: false })

        // Then auto-fit to show all tables nicely
        setTimeout(() => {
          autoFitTables({ animate: false })
          setHasAutoFitted(true)
          setIsAutoFitting(false)
        }, 50)
      }, 100)
    }
  }, [canvasReady, isLoading, tables.length, hasAutoFitted, autoFitTables, centerAllTables])

  // Re-center when canvas becomes square
  useEffect(() => {
    if (canvasReady && !isLoading && tables.length > 0) {
      // Always re-center for square canvas optimization
      const timer = setTimeout(() => {
        centerAllTables({ animate: hasAutoFitted }) // Animate only after initial fit
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [canvasSize.width, canvasSize.height, canvasReady, isLoading, tables.length, hasAutoFitted, centerAllTables])

  // Reset auto-fit flag when tables are reloaded
  useEffect(() => {
    if (isLoading) {
      setHasAutoFitted(false)
    }
  }, [isLoading])

  // Add table with auto-fit
  const handleAddTable = useCallback((type: Table['type']) => {
    addTable(type, canvasSize)

    // Auto center the new table after a short delay
    setTimeout(() => {
      autoFitTables({ animate: true })
    }, 100)
  }, [addTable, canvasSize, autoFitTables])

  // Save handler
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    const savedTables = await TablePersistenceService.saveTables(tables, restaurantId, onSave)
    setIsSaving(false)

    if (savedTables) {
      setTables(savedTables)
    }
  }, [tables, restaurantId, onSave, setTables])

  // Table position updates with grid snapping
  const handleTableMove = useCallback((tableId: string, x: number, y: number) => {
    const finalX = snapToGrid ? Math.round(x / 20) * 20 : x
    const finalY = snapToGrid ? Math.round(y / 20) * 20 : y
    updateTable(tableId, { x: finalX, y: finalY })
  }, [snapToGrid, updateTable])

  // Table resize handler
  const handleTableResize = useCallback((tableId: string, width: number, height: number) => {
    updateTable(tableId, { width, height })
  }, [updateTable])

  // Loading screen
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading floor plan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* Toolbar */}
      <FloorPlanToolbar
        onAddTable={handleAddTable}
        onSave={handleSave}
        onAutoFit={() => autoFitTables()}
        onBack={onBack}
        isSaving={isSaving}
      />

      {/* Canvas Container */}
      <div className="flex-1 relative">
        {/* Table Editor Panel */}
        {selectedTable && (
          <TableEditor
            selectedTable={selectedTable}
            onUpdate={updateTable}
            onDelete={deleteTable}
          />
        )}

        {/* Canvas */}
        <div ref={setContainerRef} className="absolute inset-0">
          <FloorPlanCanvas
            tables={tables}
            selectedTableId={selectedTableId}
            canvasSize={canvasSize}
            showGrid={false}
            gridSize={20}
            snapToGrid={true}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
            onTableClick={setSelectedTableId}
            onTableMove={handleTableMove}
            onTableResize={handleTableResize}
            onCanvasClick={() => setSelectedTableId(null)}
            onZoomChange={setZoomLevel}
            onPanChange={setPanOffset}
          />

          {/* Loading Overlay */}
          <LoadingOverlay
            isLoading={isLoading}
            isAutoFitting={isAutoFitting}
            tableCount={tables.length}
          />
        </div>

        {/* Instructions */}
        <CanvasInstructions />
      </div>
    </div>
  )
}
