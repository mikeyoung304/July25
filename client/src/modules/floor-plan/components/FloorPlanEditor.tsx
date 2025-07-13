import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Table } from '../types'
import { useFloorPlanReducer } from '../hooks/useFloorPlanReducer'
import { FloorPlanCanvas } from './FloorPlanCanvas'
import { FloorPlanToolbar } from './FloorPlanToolbar'
import { FloorPlanSidePanel } from './FloorPlanSidePanel'
import { tableService } from '@/services/tables/TableService'
import { toast } from 'react-hot-toast'

interface FloorPlanEditorProps {
  restaurantId: string
  onSave?: (tables: Table[]) => void
}

export function FloorPlanEditor({ restaurantId, onSave }: FloorPlanEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { selectors, actions } = useFloorPlanReducer()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load floor plan on mount
  useEffect(() => {
    const loadFloorPlan = async () => {
      try {
        setIsLoading(true)
        const { tables } = await tableService.getTables()
        
        if (tables && tables.length > 0) {
          actions.setTables(tables)
          toast.success('Floor plan loaded successfully')
        }
      } catch (error) {
        console.error('Failed to load floor plan:', error)
        toast.error('Failed to load floor plan')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadFloorPlan()
  }, [restaurantId, actions])

  // Adjust canvas size on mount and window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const isLargeScreen = window.innerWidth >= 1024 // lg breakpoint
        
        // On large screens, account for side panel. On smaller screens, use full width
        const sidePanelWidth = isLargeScreen ? 320 : 0
        const padding = 32 // Account for p-4 (16px * 2)
        const width = Math.min(1200, containerWidth - sidePanelWidth - padding)
        
        actions.setCanvasSize({ width, height: width * 0.75 })
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [actions])

  // Table creation helper
  const createDefaultTable = useCallback(
    (type: Table['type']): Table => {
      const tableCount = selectors.tables.length + 1
      const gridOffset = selectors.snapToGrid ? selectors.gridSize : 20

      return {
        id: `table-${Date.now()}`,
        type,
        x: selectors.snapToGrid
          ? Math.round((100 + (tableCount % 5) * gridOffset) / selectors.gridSize) * selectors.gridSize
          : 100 + (tableCount % 5) * gridOffset,
        y: selectors.snapToGrid
          ? Math.round((100 + Math.floor(tableCount / 5) * gridOffset) / selectors.gridSize) * selectors.gridSize
          : 100 + Math.floor(tableCount / 5) * gridOffset,
        width: type === 'circle' ? 80 : 100,
        height: type === 'circle' ? 80 : type === 'square' ? 100 : 60,
        seats: 4,
        label: `Table ${tableCount}`,
        rotation: 0,
        status: 'available',
        z_index: 1,
      }
    },
    [selectors.tables.length, selectors.snapToGrid, selectors.gridSize]
  )

  // Table management handlers
  const handleAddTable = useCallback(
    (type: Table['type']) => {
      const newTable = createDefaultTable(type)
      actions.addToUndoStack([...selectors.tables])
      actions.addTable(newTable)
    },
    [createDefaultTable, actions, selectors.tables]
  )

  const handleDeleteTable = useCallback(() => {
    if (!selectors.selectedTable) return
    actions.addToUndoStack([...selectors.tables])
    actions.deleteTable(selectors.selectedTable.id)
  }, [selectors.selectedTable, actions, selectors.tables])

  const handleDuplicateTable = useCallback(() => {
    if (!selectors.selectedTable) return
    actions.addToUndoStack([...selectors.tables])
    const newTable: Table = {
      ...selectors.selectedTable,
      id: `table-${Date.now()}`,
      x: selectors.selectedTable.x + 20,
      y: selectors.selectedTable.y + 20,
    }
    actions.addTable(newTable)
  }, [selectors.selectedTable, actions, selectors.tables])

  const handleTableMove = useCallback(
    (tableId: string, x: number, y: number) => {
      const finalX = selectors.snapToGrid ? Math.round(x / selectors.gridSize) * selectors.gridSize : x
      const finalY = selectors.snapToGrid ? Math.round(y / selectors.gridSize) * selectors.gridSize : y
      actions.updateTable(tableId, { x: finalX, y: finalY })
    },
    [actions, selectors.snapToGrid, selectors.gridSize]
  )

  const handleTableResize = useCallback(
    (tableId: string, width: number, height: number) => {
      actions.updateTable(tableId, { width, height })
    },
    [actions]
  )

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true)
      
      // Batch update all tables
      const tablesToUpdate = selectors.tables.map(table => ({
        id: table.id,
        type: table.type,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        seats: table.seats,
        label: table.label,
        rotation: table.rotation,
        status: table.status,
        z_index: table.z_index,
        metadata: table.metadata,
        active: table.active
      }))
      
      await tableService.batchUpdateTables(tablesToUpdate)
      
      toast.success('Floor plan saved successfully')
      // Call the onSave callback if provided
      onSave?.(selectors.tables)
    } catch (error) {
      console.error('Failed to save floor plan:', error)
      toast.error('Failed to save floor plan. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [selectors.tables, onSave])

  const handleZoomIn = useCallback(() => {
    actions.setZoomLevel(Math.min(2, selectors.zoomLevel * 1.2))
  }, [actions, selectors.zoomLevel])

  const handleZoomOut = useCallback(() => {
    actions.setZoomLevel(Math.max(0.5, selectors.zoomLevel / 1.2))
  }, [actions, selectors.zoomLevel])

  const handleZoomReset = useCallback(() => {
    actions.setZoomLevel(1)
  }, [actions])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete
      if (e.key === 'Delete' && selectors.selectedTable) {
        handleDeleteTable()
      }
      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && selectors.canUndo) {
        actions.undo()
      }
      // Redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && selectors.canRedo) {
        actions.redo()
      }
      // Duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectors.selectedTable) {
        e.preventDefault()
        handleDuplicateTable()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectors.selectedTable, selectors.canUndo, selectors.canRedo, actions, handleDeleteTable, handleDuplicateTable])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: '#FBFBFA' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-macon-teal mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading floor plan...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full" style={{ backgroundColor: '#FBFBFA' }}>
      <FloorPlanToolbar
        onAddTable={handleAddTable}
        onDeleteTable={handleDeleteTable}
        onDuplicateTable={handleDuplicateTable}
        onToggleGrid={actions.toggleGrid}
        onToggleSnapToGrid={actions.toggleSnapToGrid}
        onUndo={actions.undo}
        onRedo={actions.redo}
        onSave={handleSave}
        showGrid={selectors.showGrid}
        snapToGrid={selectors.snapToGrid}
        canUndo={selectors.canUndo}
        canRedo={selectors.canRedo}
        hasSelectedTable={!!selectors.selectedTable}
        zoomLevel={selectors.zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        isSaving={isSaving}
      />

      <div className="flex flex-col lg:flex-row flex-1 gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="text-xs text-[#6b7280] px-1 hidden sm:block">
            <span className="font-medium text-[#2d4a7c]">Tip:</span> Use Shift+Click or Middle Mouse to pan • Scroll to zoom • Click tables to select
          </div>
          <div className="text-xs text-[#6b7280] px-1 sm:hidden">
            <span className="font-medium text-[#2d4a7c]">Tip:</span> Tap to select • Pinch to zoom
          </div>
          <FloorPlanCanvas
            tables={selectors.tables}
            selectedTableId={selectors.selectedTableId}
            canvasSize={selectors.canvasSize}
            showGrid={selectors.showGrid}
            gridSize={selectors.gridSize}
            snapToGrid={selectors.snapToGrid}
            zoomLevel={selectors.zoomLevel}
            panOffset={selectors.panOffset}
            onTableClick={actions.selectTable}
            onTableMove={handleTableMove}
            onTableResize={handleTableResize}
            onCanvasClick={() => actions.selectTable(null)}
            onZoomChange={actions.setZoomLevel}
            onPanChange={actions.setPanOffset}
          />
        </div>

        <FloorPlanSidePanel
          selectedTable={selectors.selectedTable}
          tables={selectors.tables}
          onUpdateTable={actions.updateTable}
          onSelectTable={actions.selectTable}
        />
      </div>
    </div>
  )
}