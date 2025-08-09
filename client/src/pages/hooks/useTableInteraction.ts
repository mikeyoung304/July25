import { useCallback } from 'react'
import type { Table } from '@/modules/floor-plan/types'

export function useTableInteraction(
  tables: Table[], 
  setSelectedTableId: (id: string | null) => void
) {
  const handleTableClick = useCallback((tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    if (table) {
      setSelectedTableId(tableId)
    }
  }, [tables, setSelectedTableId])

  const handleCanvasClick = useCallback(() => {
    setSelectedTableId(null)
  }, [setSelectedTableId])

  const isTableAvailable = useCallback((tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    return table?.status === 'available'
  }, [tables])

  const getTableOccupancy = useCallback(() => {
    const occupied = tables.filter(t => t.status === 'occupied').length
    const total = tables.length
    return { occupied, total, percentage: total > 0 ? (occupied / total) * 100 : 0 }
  }, [tables])

  return {
    handleTableClick,
    handleCanvasClick,
    isTableAvailable,
    getTableOccupancy
  }
}