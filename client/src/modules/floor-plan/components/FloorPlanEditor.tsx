import React, { useState, useEffect, useCallback } from 'react'
import { logger } from '@/services/logger'
import { Table } from '../types'
import { FloorPlanCanvas } from './FloorPlanCanvas'
import { FloorPlanToolbar } from './FloorPlanToolbar'
import { tableService } from '@/services/tables/TableService'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Trash2, Edit3, Users } from 'lucide-react'

interface FloorPlanEditorProps {
  restaurantId: string
  onSave?: (tables: Table[]) => void
  onBack?: () => void
}

export function FloorPlanEditor({ restaurantId, onSave, onBack }: FloorPlanEditorProps) {
  // Simple state - no complex reducers needed
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 900 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  // Grid functionality
  const [_showGrid, _setShowGrid] = useState(true)
  const [snapToGrid, _setSnapToGrid] = useState(true)
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null)

  const selectedTable = tables.find(t => t.id === selectedTableId)

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
  }, [calculateOptimalView, containerRef])

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
  }, [tables, containerRef, canvasSize])

  // Distribute tables evenly across canvas (INDUSTRY BEST PRACTICE)
  const _distributeTablesEvenly = useCallback(() => {
    if (tables.length === 0 || !containerRef) return

    const containerRect = containerRef.getBoundingClientRect()
    const usableWidth = (containerRect.width * 0.8) / zoomLevel  // 80% of canvas
    const usableHeight = (containerRect.height * 0.8) / zoomLevel

    // Calculate canvas center in world coordinates
    const centerX = (containerRect.width / 2 - panOffset.x) / zoomLevel
    const centerY = (containerRect.height / 2 - panOffset.y) / zoomLevel

    // Calculate optimal grid dimensions based on aspect ratio
    const aspectRatio = usableWidth / usableHeight
    const totalTables = tables.length
    let cols = Math.ceil(Math.sqrt(totalTables * aspectRatio))
    let rows = Math.ceil(totalTables / cols)

    // Adjust for better distribution
    while (cols * rows < totalTables) {
      if (cols * aspectRatio < rows) cols++
      else rows++
    }

    // Calculate cell dimensions with proper spacing
    const cellWidth = usableWidth / cols
    const cellHeight = usableHeight / rows
    const _minSpacing = 80 // Restaurant-appropriate spacing for staff movement

    // Distribute tables in a grid pattern
    const distributedTables = tables.map((table, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      
      // Calculate position within the grid
      const cellCenterX = centerX - usableWidth/2 + (col + 0.5) * cellWidth
      const cellCenterY = centerY - usableHeight/2 + (row + 0.5) * cellHeight

      // Add subtle randomization to avoid rigid grid look
      const jitterX = (Math.random() - 0.5) * (cellWidth * 0.1)
      const jitterY = (Math.random() - 0.5) * (cellHeight * 0.1)

      return {
        ...table,
        x: cellCenterX + jitterX,
        y: cellCenterY + jitterY
      }
    })

    setTables(distributedTables)
  }, [tables, containerRef, panOffset, zoomLevel])

  // Force-directed layout for natural table distribution
  const _applyForceDirectedLayout = useCallback(() => {
    if (tables.length === 0 || !containerRef) return

    // Force simulation parameters
    const iterations = 50
    const repulsion = 8000
    const attraction = 0.005
    const damping = 0.85

    const nodes = tables.map(table => ({
      ...table,
      vx: 0,
      vy: 0
    }))

    const containerRect = containerRef.getBoundingClientRect()
    const centerX = (containerRect.width / 2 - panOffset.x) / zoomLevel
    const centerY = (containerRect.height / 2 - panOffset.y) / zoomLevel

    // Run force simulation
    for (let iter = 0; iter < iterations; iter++) {
      // Apply repulsive forces between all table pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1
          
          if (distance < 250) { // Apply force if tables are too close
            const force = repulsion / (distance * distance)
            const fx = (dx / distance) * force
            const fy = (dy / distance) * force
            
            nodes[i].vx -= fx
            nodes[i].vy -= fy
            nodes[j].vx += fx
            nodes[j].vy += fy
          }
        }
      }

      // Apply center attraction to keep tables from flying off
      nodes.forEach(node => {
        const dx = centerX - node.x
        const dy = centerY - node.y
        node.vx += dx * attraction
        node.vy += dy * attraction
      })

      // Update positions and apply damping
      nodes.forEach(node => {
        node.x += node.vx
        node.y += node.vy
        node.vx *= damping
        node.vy *= damping
      })
    }

    // Update table positions
    const newTables = nodes.map(node => ({
      ...node,
      x: node.x,
      y: node.y
    }))

    setTables(newTables)
  }, [tables, containerRef, panOffset, zoomLevel])

  // Update canvas size when container resizes and mark canvas as ready
  useEffect(() => {
    if (!containerRef) return

    const updateCanvasSize = () => {
      const rect = containerRef.getBoundingClientRect()
      
      // Use full screen area - no aspect ratio constraints
      const newSize = { 
        width: rect.width, 
        height: rect.height 
      }
      setCanvasSize(newSize)
      
      // Mark canvas as ready after size is set
      requestAnimationFrame(() => {
        setCanvasReady(true)
      })
    }

    updateCanvasSize()
    
    const resizeObserver = new ResizeObserver(updateCanvasSize)
    resizeObserver.observe(containerRef)

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef])

  // Canvas readiness and auto-fit state
  const [canvasReady, setCanvasReady] = useState(false)
  const [hasAutoFitted, setHasAutoFitted] = useState(false)
  const [isAutoFitting, setIsAutoFitting] = useState(false)

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

  // Load tables on mount
  useEffect(() => {
    const loadTables = async () => {
      try {
        setIsLoading(true)
        logger.info('[FloorPlanEditor] Loading tables for restaurant:', restaurantId)
        
        const { tables } = await tableService.getTables()
        logger.info('[FloorPlanEditor] Loaded tables from API:', {
          count: tables?.length || 0,
          sample: tables?.[0] || null
        })
        
        setTables(tables || [])
        
        if (tables?.length > 0) {
          toast.success(`Loaded ${tables.length} tables`)
        } else {
          logger.info('[FloorPlanEditor] No tables found, starting with empty floor plan')
        }
      } catch (error) {
        logger.error('[FloorPlanEditor] Failed to load tables:', {
          error: error.message,
          restaurantId,
          stack: error.stack
        })
        console.error('Failed to load tables:', error)
        toast.error('Failed to load floor plan. Please check your connection.')
        // Set empty tables array on error so user can still create new tables
        setTables([])
      } finally {
        setIsLoading(false)
      }
    }
    loadTables()
  }, [restaurantId])

  // Simple table creation with better centering
  const addTable = useCallback((type: Table['type']) => {
    // Create unique names based on table type and count
    const typeLabels = {
      circle: 'Round Table',
      square: 'Square Table', 
      rectangle: 'Long Table',
      chip_monkey: 'Monkey'
    }
    
    const baseLabel = typeLabels[type]
    const existingLabels = tables.map(t => t.label.toLowerCase())
    let tableNumber = 1
    let newLabel = `${baseLabel} ${tableNumber}`
    
    while (existingLabels.includes(newLabel.toLowerCase())) {
      tableNumber++
      newLabel = `${baseLabel} ${tableNumber}`
    }

    // Use canvas center - ensure tables are always visible
    const centerX = canvasSize.width / 2
    const centerY = canvasSize.height / 2
    
    // Simple grid layout - spread tables around center
    const tableCount = tables.length
    const radius = 150 // Distance from center
    const angle = (tableCount * 60) * (Math.PI / 180) // 60 degree spacing
    
    let finalX = centerX + Math.cos(angle) * radius
    let finalY = centerY + Math.sin(angle) * radius
    
    // Keep tables within canvas bounds
    const margin = 100
    finalX = Math.max(margin, Math.min(canvasSize.width - margin, finalX))
    finalY = Math.max(margin, Math.min(canvasSize.height - margin, finalY))

    // Table sizes
    const tableSizes = {
      circle: { width: 120, height: 120, seats: 4 },
      square: { width: 140, height: 140, seats: 4 },
      rectangle: { width: 180, height: 100, seats: 6 },
      chip_monkey: { width: 64, height: 64, seats: 1 }
    }

    const sizeConfig = tableSizes[type]

    const newTable: Table = {
      id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: finalX,
      y: finalY,
      width: sizeConfig.width,
      height: sizeConfig.height,
      seats: sizeConfig.seats,
      label: newLabel,
      rotation: 0,
      status: 'available',
      z_index: 1,
    }

    setTables(prev => [...prev, newTable])
    setSelectedTableId(newTable.id)
    
    // Auto center the new table after a short delay
    setTimeout(() => {
      autoFitTables({ animate: true })
    }, 100)
  }, [tables, canvasSize, autoFitTables])

  // Update table
  const updateTable = useCallback((id: string, updates: Partial<Table>) => {
    setTables(prev => prev.map(table => 
      table.id === id ? { ...table, ...updates } : table
    ))
  }, [])

  // Keyboard shortcuts for rotation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedTable) return
      
      // Check if we're not in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      
      // Rotation shortcuts
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        const rotationStep = e.shiftKey ? 45 : 15
        updateTable(selectedTable.id, { 
          rotation: ((selectedTable.rotation || 0) + rotationStep) % 360 
        })
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        const rotationStep = e.shiftKey ? 45 : 15
        updateTable(selectedTable.id, { 
          rotation: ((selectedTable.rotation || 0) - rotationStep + 360) % 360 
        })
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        updateTable(selectedTable.id, { rotation: 0 })
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedTable, updateTable])

  // Delete table
  const deleteTable = useCallback(() => {
    if (!selectedTableId) return
    setTables(prev => prev.filter(t => t.id !== selectedTableId))
    setSelectedTableId(null)
  }, [selectedTableId])

  // Duplicate table with smart naming
  const _duplicateTable = useCallback(() => {
    if (!selectedTable) return
    
    // Smart duplicate naming with auto-increment
    const baseLabel = selectedTable.label.replace(/ (?:Copy|\d+)$/, '') // Remove existing "Copy" or numbers
    const existingLabels = tables.map(t => t.label.toLowerCase())
    
    let duplicateNumber = 2
    let newLabel = `${baseLabel} ${duplicateNumber}`
    
    // Find the next available number
    while (existingLabels.includes(newLabel.toLowerCase())) {
      duplicateNumber++
      newLabel = `${baseLabel} ${duplicateNumber}`
    }
    
    // Position duplicate with better spacing to avoid overlaps
    const spacing = 40
    const newTable: Table = {
      ...selectedTable,
      id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: selectedTable.x + spacing,
      y: selectedTable.y + spacing,
      label: newLabel
    }
    setTables(prev => [...prev, newTable])
    setSelectedTableId(newTable.id)
  }, [selectedTable, tables])

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
      const uniqueDuplicates = [...new Set(duplicates)]
      const duplicateDetails = uniqueDuplicates.map(dup => {
        const originalLabels = tables
          .filter(t => t.label.trim().toLowerCase() === dup)
          .map(t => t.label)
        return `  • "${originalLabels[0]}" (${originalLabels.length} tables)`
      }).join('\n')

      toast.error(
        `Duplicate table names found:\n${duplicateDetails}\n\nTable names are case-insensitive. Please use unique names.`,
        { duration: 8000 }
      )
      logger.warn('Duplicate names found:', duplicates)
      return
    }

    logger.info('Starting save process...')
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
        logger.info('Creating new tables:', newTables)
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
          
          logger.debug('Calling tableService.createTable with:', cleanNewTable)
          const createdTable = await tableService.createTable(cleanNewTable)
          logger.debug('Received created table:', createdTable)
          savedTables.push(createdTable)
          logger.info('✅ Created table:', createdTable.id)
        }
      }

      // 2. Update existing tables
      if (existingTables.length > 0) {
        logger.info(`🔄 Updating ${existingTables.length} existing tables...`)
        logger.info('Updating existing tables:', existingTables)
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

        logger.debug('Calling tableService.batchUpdateTables with:', cleanExistingTables)
        const updatedTables = await tableService.batchUpdateTables(cleanExistingTables)
        logger.debug('Received updated tables:', updatedTables)
        savedTables.push(...updatedTables)
      }

      // Update local state with the new IDs from created tables
      setTables(savedTables)
      
      logger.info(`✅ Save successful, total tables: ${savedTables.length}`)
      toast.success(`Floor plan saved! (${savedTables.length} tables)`)
      onSave?.(savedTables)
      
      // Force reload tables to ensure consistency
      setTimeout(async () => {
        try {
          logger.info('[FloorPlanEditor] Reloading tables after save to ensure consistency')
          const { tables: refreshedTables } = await tableService.getTables()
          setTables(refreshedTables || [])
          logger.info('[FloorPlanEditor] Tables refreshed after save:', refreshedTables?.length || 0)
        } catch (refreshError) {
          logger.error('[FloorPlanEditor] Failed to refresh tables after save:', refreshError)
        }
      }, 500)
    } catch (error) {
      logger.error('[FloorPlanEditor] Save failed:', {
        error: error.message,
        status: error.status,
        details: error.details,
        restaurantId,
        tableCount: tables.length
      })
      console.error('❌ Save failed with error:', error)
      console.error('❌ Error type:', error.constructor.name)
      console.error('❌ Error message:', error.message)
      console.error('❌ Error status:', error.status)
      console.error('❌ Error details:', error.details)
      
      // More specific error messages
      if (error.status === 401) {
        toast.error('Authentication failed. Please sign in again.')
      } else if (error.status === 403) {
        toast.error('You do not have permission to save the floor plan.')
      } else if (error.status === 400) {
        toast.error(`Invalid data: ${error.message || 'Please check table names and positions.'}`)
      } else {
        toast.error(`Failed to save floor plan: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setIsSaving(false)
    }
  }, [tables, onSave, restaurantId])

  // Table position updates
  const handleTableMove = useCallback((tableId: string, x: number, y: number) => {
    const finalX = snapToGrid ? Math.round(x / 20) * 20 : x
    const finalY = snapToGrid ? Math.round(y / 20) * 20 : y
    updateTable(tableId, { x: finalX, y: finalY })
  }, [snapToGrid, updateTable])

  // Table resize handler
  const handleTableResize = useCallback((tableId: string, width: number, height: number) => {
    updateTable(tableId, { width, height })
  }, [updateTable])

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
      {/* Minimal Toolbar */}
      <FloorPlanToolbar
        onAddTable={addTable}
        onSave={handleSave}
        onAutoFit={autoFitTables}
        onBack={onBack}
        isSaving={isSaving}
      />

      {/* Full Screen Canvas Layout */}
      <div className="flex-1 relative">
        
        {/* Selected Table Editor - Floating in top-left */}
        {selectedTable && (
          <div className="absolute top-6 left-6 z-20 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Edit3 className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Edit Table</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteTable}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    value={selectedTable.label}
                    onChange={(e) => updateTable(selectedTable.id, { label: e.target.value })}
                    className="w-full mt-2 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                {selectedTable.type === 'chip_monkey' ? (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Size</label>
                    <input
                      type="range"
                      min="32"
                      max="120"
                      step="4"
                      value={selectedTable.width}
                      onChange={(e) => {
                        const size = parseInt(e.target.value)
                        updateTable(selectedTable.id, { width: size, height: size })
                      }}
                      className="w-full mt-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600">{selectedTable.width}px</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateTable(selectedTable.id, { width: 40, height: 40 })}
                          className="h-7 px-2 text-xs"
                        >
                          S
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateTable(selectedTable.id, { width: 64, height: 64 })}
                          className="h-7 px-2 text-xs"
                        >
                          M
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateTable(selectedTable.id, { width: 88, height: 88 })}
                          className="h-7 px-2 text-xs"
                        >
                          L
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateTable(selectedTable.id, { width: 112, height: 112 })}
                          className="h-7 px-2 text-xs"
                        >
                          XL
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Seats</label>
                    <div className="relative mt-2">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={selectedTable.seats}
                        onChange={(e) => updateTable(selectedTable.id, { seats: parseInt(e.target.value) || 1 })}
                        className="w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                      <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rotation</label>
                <div className="mt-2 space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={selectedTable.rotation || 0}
                    onChange={(e) => updateTable(selectedTable.id, { rotation: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{selectedTable.rotation || 0}°</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateTable(selectedTable.id, { rotation: ((selectedTable.rotation || 0) - 45 + 360) % 360 })}
                        className="h-7 px-2 text-xs"
                      >
                        -45°
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateTable(selectedTable.id, { rotation: ((selectedTable.rotation || 0) - 90 + 360) % 360 })}
                        className="h-7 px-2 text-xs"
                      >
                        -90°
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateTable(selectedTable.id, { rotation: 0 })}
                        className="h-7 px-2 text-xs"
                      >
                        Reset
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateTable(selectedTable.id, { rotation: ((selectedTable.rotation || 0) + 90) % 360 })}
                        className="h-7 px-2 text-xs"
                      >
                        +90°
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateTable(selectedTable.id, { rotation: ((selectedTable.rotation || 0) + 45) % 360 })}
                        className="h-7 px-2 text-xs"
                      >
                        +45°
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Full Screen Canvas - No Constraints */}
        <div 
          ref={setContainerRef} 
          className="absolute inset-0"
        >
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
          {(isAutoFitting || (isLoading && tables.length === 0)) && (
            <div className="absolute inset-0 bg-gray-50/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600 font-medium">
                  {isAutoFitting ? 'Optimizing layout...' : 'Loading floor plan...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions in bottom-right */}
        <div className="absolute bottom-6 right-6 z-10">
          <div className="text-xs text-gray-500 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm space-y-1">
            <p>Click tables to select • Drag to move • Scroll to zoom • Shift+drag to pan</p>
            <p>R/E to rotate • Shift+R/E for 45° • Ctrl+0 to reset rotation</p>
          </div>
        </div>
      </div>
    </div>
  )
}