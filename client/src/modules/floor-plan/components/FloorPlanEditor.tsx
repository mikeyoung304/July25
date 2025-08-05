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
  const [isCreatingTable, setIsCreatingTable] = useState(false)
  const [creatingTableType, setCreatingTableType] = useState<Table['type'] | null>(null)

  // Load floor plan on mount - Fixed infinite loop by removing unstable dependencies
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
  }, [restaurantId])

  // Separate effect for centering canvas when tables or canvas size changes
  useEffect(() => {
    if (selectors.tables.length > 0 && selectors.canvasSize.width > 0) {
      const tables = selectors.tables
      const minX = Math.min(...tables.map(t => t.x))
      const maxX = Math.max(...tables.map(t => t.x + t.width))
      const minY = Math.min(...tables.map(t => t.y))
      const maxY = Math.max(...tables.map(t => t.y + t.height))
      
      const contentWidth = maxX - minX
      const contentHeight = maxY - minY
      const centerX = minX + contentWidth / 2
      const centerY = minY + contentHeight / 2
      
      // Center the content in the viewport with some padding
      const viewportCenterX = selectors.canvasSize.width / 2
      const viewportCenterY = selectors.canvasSize.height / 2
      
      actions.setPanOffset({
        x: viewportCenterX - centerX,
        y: viewportCenterY - centerY
      })
    }
  }, [selectors.tables.length, selectors.canvasSize.width, selectors.canvasSize.height])

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
      const tableWidth = type === 'circle' ? 80 : 100
      const tableHeight = type === 'circle' ? 80 : type === 'square' ? 100 : 60
      
      // Ensure proper spacing between tables (table width + padding)
      const horizontalSpacing = Math.max(tableWidth + 40, 120) // 40px padding minimum
      const verticalSpacing = Math.max(tableHeight + 40, 120)
      
      // Calculate grid position (5 tables per row)
      const col = (tableCount - 1) % 5
      const row = Math.floor((tableCount - 1) / 5)
      
      // Base positions with proper spacing
      const baseX = 100 + col * horizontalSpacing
      const baseY = 100 + row * verticalSpacing

      // Apply grid snapping if enabled
      const finalX = selectors.snapToGrid 
        ? Math.round(baseX / selectors.gridSize) * selectors.gridSize
        : baseX
      const finalY = selectors.snapToGrid
        ? Math.round(baseY / selectors.gridSize) * selectors.gridSize  
        : baseY

      return {
        id: `table-${Date.now()}`,
        type,
        x: finalX,
        y: finalY,
        width: tableWidth,
        height: tableHeight,
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
    async (type: Table['type']) => {
      try {
        setIsCreatingTable(true)
        setCreatingTableType(type)
        
        const newTable = createDefaultTable(type)
        actions.addToUndoStack([...selectors.tables])
        actions.addTable(newTable)
        
        // Small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error('Failed to create table:', error)
        toast.error('Failed to create table')
      } finally {
        setIsCreatingTable(false)
        setCreatingTableType(null)
      }
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
      
      console.log('Sending tables to batch update:', {
        count: tablesToUpdate.length,
        sample: tablesToUpdate[0],
        all: tablesToUpdate
      })
      
      if (tablesToUpdate.length === 0) {
        toast.error('No tables to save')
        return
      }
      
      await tableService.batchUpdateTables(tablesToUpdate)
      
      toast.success('Floor plan saved successfully')
      // Call the onSave callback if provided
      onSave?.(selectors.tables)
    } catch (error) {
      console.error('Failed to save floor plan:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        cause: error instanceof Error ? error.cause : undefined
      })
      
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast.error(`Failed to save floor plan: ${errorMessage}`)
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

  const handleResetView = useCallback(() => {
    // Reset zoom
    actions.setZoomLevel(1)
    
    // Re-center on tables
    if (selectors.tables.length > 0) {
      const minX = Math.min(...selectors.tables.map(t => t.x))
      const maxX = Math.max(...selectors.tables.map(t => t.x + t.width))
      const minY = Math.min(...selectors.tables.map(t => t.y))
      const maxY = Math.max(...selectors.tables.map(t => t.y + t.height))
      
      const contentWidth = maxX - minX
      const contentHeight = maxY - minY
      const centerX = minX + contentWidth / 2
      const centerY = minY + contentHeight / 2
      
      const viewportCenterX = selectors.canvasSize.width / 2
      const viewportCenterY = selectors.canvasSize.height / 2
      
      actions.setPanOffset({
        x: viewportCenterX - centerX,
        y: viewportCenterY - centerY
      })
    } else {
      // No tables, center at origin
      actions.setPanOffset({ x: 0, y: 0 })
    }
  }, [actions, selectors.tables, selectors.canvasSize])

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
        onResetView={handleResetView}
        isSaving={isSaving}
        isCreatingTable={isCreatingTable}
        creatingTableType={creatingTableType}
      />

      <div className="flex flex-col lg:flex-row flex-1 gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="text-xs text-[#6b7280] px-1 hidden sm:block">
            <span className="font-medium text-[#2d4a7c]">Tip:</span> Right-click or Shift+Click to pan • Scroll to zoom • Click tables to select • Use Reset View button to center
          </div>
          <div className="text-xs text-[#6b7280] px-1 sm:hidden">
            <span className="font-medium text-[#2d4a7c]">Tip:</span> Tap to select • Pinch to zoom • Use Reset View button
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