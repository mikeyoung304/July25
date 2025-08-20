import { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react'
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
  const isInitialLoad = useRef(true)
  const loadingRef = useRef(false)
  
  const restaurant = context?.restaurant

  const loadFloorPlan = useCallback(async () => {
    // Prevent concurrent calls
    if (loadingRef.current) {
      console.log('🍽️ ServerView: Load already in progress, skipping')
      return
    }

    console.log('🍽️ ServerView loadFloorPlan called', { 
      restaurantId: restaurant?.id,
      isInitialLoad: isInitialLoad.current 
    })
    
    if (!restaurant?.id) {
      console.log('⏳ ServerView: No restaurant ID yet, waiting for context')
      if (isInitialLoad.current) {
        setTables([])
        setIsLoading(false)
        isInitialLoad.current = false
      }
      return
    }
    
    loadingRef.current = true
    
    try {
      if (isInitialLoad.current) {
        setIsLoading(true)
      }
      
      const { tables: loadedTables } = await tableService.getTables()
      
      console.log('📊 ServerView: Received tables:', { 
        count: loadedTables?.length || 0,
        isInitial: isInitialLoad.current
      })
      
      setTables(loadedTables || [])
      
      // Only show success message on initial load if no tables
      if (isInitialLoad.current && (!loadedTables || loadedTables.length === 0)) {
        console.log('📭 ServerView: No tables found on initial load')
      }
      
    } catch (error) {
      console.error('❌ ServerView: Failed to load floor plan:', {
        error: error.message,
        status: error.status,
        isInitial: isInitialLoad.current
      })
      
      setTables([])
      
      // Only show error toast on initial load failure
      if (isInitialLoad.current) {
        toast.error('Failed to load floor plan. Please configure in Admin.')
      } else {
        // Just log refresh failures
        console.warn('Floor plan refresh failed - will retry on next interval')
      }
    } finally {
      loadingRef.current = false
      if (isInitialLoad.current) {
        setIsLoading(false)
        isInitialLoad.current = false
      }
    }
  }, [restaurant?.id, toast])

  useEffect(() => {
    // Initial load
    loadFloorPlan()
    
    // Reload floor plan every 30 seconds to catch admin updates
    // Only if we have a restaurant ID
    const interval = setInterval(() => {
      if (restaurant?.id) {
        loadFloorPlan()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [loadFloorPlan, restaurant?.id])

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