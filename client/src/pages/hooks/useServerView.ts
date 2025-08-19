import { useState, useEffect, useCallback, useContext, useMemo } from 'react'
import { RestaurantContext } from '@/core'
import { tableService } from '@/services/tables/TableService'
import { useToast } from '@/hooks/useToast'
import type { Table } from '@/modules/floor-plan/types'

export function useServerView() {
  const { toast } = useToast()
  const context = useContext(RestaurantContext)
  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  
  const restaurant = context?.restaurant

  const loadFloorPlan = useCallback(async () => {
    if (!restaurant?.id) {
      setTables([])
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      const { tables: loadedTables } = await tableService.getTables()
      
      if (loadedTables && loadedTables.length > 0) {
        setTables(loadedTables)
      } else {
        setTables([])
        toast.success('Please set up your floor plan in Admin.')
      }
    } catch (error) {
      console.error('Failed to load floor plan:', error)
      setTables([])
      toast.error('Failed to load floor plan. Please configure in Admin.')
    } finally {
      setIsLoading(false)
    }
  }, [restaurant?.id])

  useEffect(() => {
    loadFloorPlan()
    
    // Reload floor plan every 30 seconds to catch admin updates
    const interval = setInterval(() => {
      loadFloorPlan()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [loadFloorPlan])

  const stats = useMemo(() => {
    const totalTables = tables.length
    const availableTables = tables.filter(t => t.status === 'available').length
    const occupiedTables = tables.filter(t => t.status === 'occupied').length
    const reservedTables = tables.filter(t => t.status === 'reserved').length
    const totalSeats = tables.reduce((acc, t) => acc + t.seats, 0)
    const availableSeats = tables
      .filter(t => t.status === 'available')
      .reduce((acc, t) => acc + t.seats, 0)
    
    return {
      totalTables,
      availableTables,
      occupiedTables,
      reservedTables,
      totalSeats,
      availableSeats
    }
  }, [tables])

  const selectedTable = useMemo(() => 
    tables.find(t => t.id === selectedTableId),
    [tables, selectedTableId]
  )

  return {
    tables,
    isLoading,
    selectedTableId,
    setSelectedTableId,
    selectedTable,
    stats,
    restaurant,
    loadFloorPlan
  }
}