import React, { useState, useEffect, useCallback } from 'react'
import { logger } from '@/services/logger'
import { Table } from '../types'
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
  // Simple state - no complex reducers needed
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [canvasSize, _setCanvasSize] = useState({ width: 1200, height: 900 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)

  const selectedTable = tables.find(t => t.id === selectedTableId)

  // Load tables on mount
  useEffect(() => {
    const loadTables = async () => {
      try {
        setIsLoading(true)
        const { tables } = await tableService.getTables()
        setTables(tables || [])
        if (tables?.length > 0) {
          toast.success(`Loaded ${tables.length} tables`)
        }
      } catch (error) {
        console.error('Failed to load tables:', error)
        toast.error('Failed to load floor plan')
      } finally {
        setIsLoading(false)
      }
    }
    loadTables()
  }, [restaurantId])

  // Simple table creation
  const addTable = useCallback((type: Table['type']) => {
    const existingLabels = tables.map(t => t.label.toLowerCase())
    let tableNumber = 1
    while (existingLabels.includes(`table ${tableNumber}`)) {
      tableNumber++
    }

    const newTable: Table = {
      id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: 100 + (tables.length % 5) * 120,
      y: 100 + Math.floor(tables.length / 5) * 120,
      width: type === 'circle' ? 80 : 100,
      height: type === 'circle' ? 80 : type === 'square' ? 100 : 60,
      seats: 4,
      label: `Table ${tableNumber}`,
      rotation: 0,
      status: 'available',
      z_index: 1,
    }

    setTables(prev => [...prev, newTable])
    setSelectedTableId(newTable.id)
  }, [tables])

  // Update table
  const updateTable = useCallback((id: string, updates: Partial<Table>) => {
    setTables(prev => prev.map(table => 
      table.id === id ? { ...table, ...updates } : table
    ))
  }, [])

  // Delete table
  const deleteTable = useCallback(() => {
    if (!selectedTableId) return
    setTables(prev => prev.filter(t => t.id !== selectedTableId))
    setSelectedTableId(null)
  }, [selectedTableId])

  // Duplicate table
  const duplicateTable = useCallback(() => {
    if (!selectedTable) return
    const newTable: Table = {
      ...selectedTable,
      id: `table-${Date.now()}`,
      x: selectedTable.x + 20,
      y: selectedTable.y + 20,
      label: `${selectedTable.label} Copy`
    }
    setTables(prev => [...prev, newTable])
    setSelectedTableId(newTable.id)
  }, [selectedTable])

  // Smart save with create/update logic
  const handleSave = useCallback(async () => {
    if (tables.length === 0) {
      toast.error('No tables to save')
      return
    }

    // Basic duplicate name check
    const labels = tables.map(t => t.label.trim().toLowerCase())
    const duplicates = labels.filter((label, index) => 
      label && labels.indexOf(label) !== index
    )
    
    if (duplicates.length > 0) {
      toast.error(`Duplicate table names found. Please rename tables.`)
      return
    }

    setIsSaving(true)
    try {
      // Separate new tables (with generated IDs) from existing tables (with UUID IDs)
      const newTables = tables.filter(table => table.id.startsWith('table-'))
      const existingTables = tables.filter(table => !table.id.startsWith('table-'))
      
      logger.info('🔧 Save analysis:', { 
        total: tables.length, 
        new: newTables.length, 
        existing: existingTables.length 
      })

      const savedTables: Table[] = []

      // 1. Create new tables first
      if (newTables.length > 0) {
        logger.info(`🆕 Creating ${newTables.length} new tables...`)
        for (const table of newTables) {
          const cleanNewTable = {
            label: table.label.trim(),
            seats: table.seats,
            x: Math.round(table.x),
            y: Math.round(table.y),
            width: Math.round(table.width),
            height: Math.round(table.height),
            rotation: table.rotation || 0,
            type: table.type,
            status: table.status,
            current_order_id: table.current_order_id || null,
            active: table.active !== false,
            z_index: table.z_index || 1
          }
          
          const createdTable = await tableService.createTable(cleanNewTable)
          savedTables.push(createdTable)
          logger.info('✅ Created table:', createdTable.id)
        }
      }

      // 2. Update existing tables
      if (existingTables.length > 0) {
        logger.info(`🔄 Updating ${existingTables.length} existing tables...`)
        const cleanExistingTables = existingTables.map(table => ({
          id: table.id,
          label: table.label.trim(),
          seats: table.seats,
          x: Math.round(table.x),
          y: Math.round(table.y),
          width: Math.round(table.width),
          height: Math.round(table.height),
          rotation: table.rotation || 0,
          type: table.type,
          status: table.status,
          current_order_id: table.current_order_id || null,
          active: table.active !== false,
          z_index: table.z_index || 1
        }))

        const updatedTables = await tableService.batchUpdateTables(cleanExistingTables)
        savedTables.push(...updatedTables)
      }

      // Update local state with the new IDs from created tables
      setTables(savedTables)
      
      logger.info(`✅ Save successful, total tables: ${savedTables.length}`)
      toast.success(`Floor plan saved! (${savedTables.length} tables)`)
      onSave?.(savedTables)
    } catch (error) {
      console.error('❌ Save failed with error:', error)
      console.error('❌ Error type:', error.constructor.name)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error status:', error.status)
      console.error('❌ Error details:', error.details)
      toast.error('Failed to save floor plan')
    } finally {
      setIsSaving(false)
    }
  }, [tables, onSave])

  // Table position updates
  const handleTableMove = useCallback((tableId: string, x: number, y: number) => {
    const finalX = snapToGrid ? Math.round(x / 20) * 20 : x
    const finalY = snapToGrid ? Math.round(y / 20) * 20 : y
    updateTable(tableId, { x: finalX, y: finalY })
  }, [snapToGrid, updateTable])

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
    <div className="flex flex-col h-full bg-gray-50">
      <FloorPlanToolbar
        onAddTable={addTable}
        onDeleteTable={deleteTable}
        onDuplicateTable={duplicateTable}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onToggleSnapToGrid={() => setSnapToGrid(!snapToGrid)}
        onSave={handleSave}
        showGrid={showGrid}
        snapToGrid={snapToGrid}
        hasSelectedTable={!!selectedTable}
        zoomLevel={zoomLevel}
        onZoomIn={() => setZoomLevel(Math.min(2, zoomLevel * 1.2))}
        onZoomOut={() => setZoomLevel(Math.max(0.5, zoomLevel / 1.2))}
        onZoomReset={() => setZoomLevel(1)}
        onResetView={() => {
          setZoomLevel(1)
          setPanOffset({ x: 0, y: 0 })
        }}
        isSaving={isSaving}
      />

      <div className="flex flex-col lg:flex-row flex-1 gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-2 min-h-0 min-w-0">
          <div className="text-xs text-gray-500 px-1">
            Tip: Click tables to select • Drag to move • Use toolbar to add/remove tables
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <FloorPlanCanvas
              tables={tables}
              selectedTableId={selectedTableId}
              canvasSize={canvasSize}
              showGrid={showGrid}
              gridSize={20}
              snapToGrid={snapToGrid}
              zoomLevel={zoomLevel}
              panOffset={panOffset}
              onTableClick={setSelectedTableId}
              onTableMove={handleTableMove}
              onCanvasClick={() => setSelectedTableId(null)}
              onZoomChange={setZoomLevel}
              onPanChange={setPanOffset}
            />
          </div>
        </div>

        <FloorPlanSidePanel
          selectedTable={selectedTable}
          tables={tables}
          onUpdateTable={updateTable}
          onSelectTable={setSelectedTableId}
        />
      </div>
    </div>
  )
}