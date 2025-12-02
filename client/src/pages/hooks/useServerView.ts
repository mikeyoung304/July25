import { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react'
import { logger } from '@/services/logger'
import { RestaurantContext } from '@/core'
import { tableService } from '@/services/tables/TableService'
import { useToast } from '@/hooks/useToast'
import { useTableStatus } from '@/hooks/useTableStatus'
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

  // Real-time table status subscription - updates tables instantly when status changes
  const { isSubscribed } = useTableStatus(
    restaurant?.id,
    // When a table status changes via Supabase, update our local state
    useCallback((updatedTable) => {
      logger.info('[useServerView] Real-time table update received', {
        tableId: updatedTable.id,
        status: updatedTable.status
      });
      setTables(prev => prev.map(t =>
        t.id === updatedTable.id
          ? { ...t, status: updatedTable.status as Table['status'] }
          : t
      ));
    }, [])
  );

  const loadFloorPlan = useCallback(async () => {
    // Prevent concurrent calls
    if (loadingRef.current) {
      logger.info('🍽️ ServerView: Load already in progress, skipping')
      return
    }

    logger.info('🍽️ ServerView loadFloorPlan called', { 
      restaurantId: restaurant?.id,
      isInitialLoad: isInitialLoad.current 
    })
    
    if (!restaurant?.id) {
      logger.info('⏳ ServerView: No restaurant ID yet, waiting for context')
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
      
      logger.info('📊 ServerView: Received tables:', { 
        count: loadedTables?.length || 0,
        isInitial: isInitialLoad.current
      })
      
      setTables(loadedTables || [])
      
      // Only show success message on initial load if no tables
      if (isInitialLoad.current && (!loadedTables || loadedTables.length === 0)) {
        logger.info('📭 ServerView: No tables found on initial load')
      }
      
    } catch (error) {
      logger.error('❌ ServerView: Failed to load floor plan:', {
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
        logger.warn('Floor plan refresh failed - will retry on next interval')
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

    // Reload floor plan periodically to catch admin updates
    // Use longer interval when real-time subscription is active (2 min vs 30 sec)
    const pollInterval = isSubscribed ? 120000 : 30000
    logger.info('[useServerView] Poll interval set', { pollInterval, isSubscribed })

    const interval = setInterval(() => {
      if (restaurant?.id) {
        loadFloorPlan()
      }
    }, pollInterval)

    return () => clearInterval(interval)
  }, [loadFloorPlan, restaurant?.id, isSubscribed])

  const stats = useMemo(() => {
    const totalTables = tables.length
    const availableTables = tables.filter(t => t.status === 'available').length
    const occupiedTables = tables.filter(t => t.status === 'occupied').length
    const reservedTables = tables.filter(t => t.status === 'reserved').length
    const paidTables = tables.filter(t => t.status === 'paid').length
    const totalSeats = tables.reduce((acc, t) => acc + t.seats, 0)
    const availableSeats = tables
      .filter(t => t.status === 'available')
      .reduce((acc, t) => acc + t.seats, 0)

    return {
      totalTables,
      availableTables,
      occupiedTables,
      reservedTables,
      paidTables,
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