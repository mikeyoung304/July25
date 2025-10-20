import { useState, useCallback, useEffect } from 'react'
import { Table } from '../types'

export interface UseTableManagementResult {
  tables: Table[]
  selectedTableId: string | null
  selectedTable: Table | undefined
  setTables: React.Dispatch<React.SetStateAction<Table[]>>
  setSelectedTableId: React.Dispatch<React.SetStateAction<string | null>>
  addTable: (type: Table['type'], canvasSize: { width: number; height: number }) => void
  updateTable: (id: string, updates: Partial<Table>) => void
  deleteTable: () => void
  duplicateTable: () => void
}

/**
 * Custom hook for managing table state and operations
 * Handles CRUD operations, selection, and keyboard shortcuts
 */
export function useTableManagement(): UseTableManagementResult {
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)

  const selectedTable = tables.find(t => t.id === selectedTableId)

  // Add table with smart centering
  const addTable = useCallback((type: Table['type'], canvasSize: { width: number; height: number }) => {
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

  // Duplicate table with smart naming
  const duplicateTable = useCallback(() => {
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

  return {
    tables,
    selectedTableId,
    selectedTable,
    setTables,
    setSelectedTableId,
    addTable,
    updateTable,
    deleteTable,
    duplicateTable
  }
}
