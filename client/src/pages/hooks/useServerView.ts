import { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react'
import { logger } from '@/services/logger'
import { RestaurantContext } from '@/core'
import { tableService } from '@/services/tables/TableService'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/core/supabase'
import type { Table } from '@/modules/floor-plan/types'

export function useServerView() {
  const { toast } = useToast()
  // Fix memory leak: use ref to access toast without including it in dependencies
  const toastRef = useRef(toast)
  toastRef.current = toast

  const context = useContext(RestaurantContext)
  const [tables, setTables] = useState<Table[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const isInitialLoad = useRef(true)
  const loadingRef = useRef(false)

  const restaurant = context?.restaurant

  // Inline Supabase subscription - no useTableStatus hook needed (B1: deleted useTableStatus.ts)
  useEffect(() => {
    if (!restaurant?.id) {
      setIsSubscribed(false)
      return
    }

    const channel = supabase
      .channel(`tables:${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        (payload) => {
          logger.info('[useServerView] Real-time table update', {
            eventType: payload.eventType,
            tableId: (payload.new as { id?: string })?.id || (payload.old as { id?: string })?.id
          })

          if (payload.eventType === 'DELETE' && payload.old) {
            setTables(prev => prev.filter(t => t.id !== (payload.old as { id: string }).id))
          } else if (payload.new) {
            const newData = payload.new as { id: string; status: string }
            setTables(prev => prev.map(t =>
              t.id === newData.id
                ? { ...t, status: newData.status as Table['status'] }
                : t
            ))
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          logger.info('[useServerView] Subscribed to table updates')
        }
      })

    return () => {
      supabase.removeChannel(channel)
      setIsSubscribed(false)
    }
  }, [restaurant?.id])

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
      
    } catch (error: unknown) {
      // TODO-147: Type-safe error property access
      logger.error('❌ ServerView: Failed to load floor plan:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: (error && typeof error === 'object' && 'status' in error && typeof (error as { status?: unknown }).status === 'number')
          ? (error as { status: number }).status
          : undefined,
        isInitial: isInitialLoad.current
      })

      setTables([])

      // Only show error toast on initial load failure
      if (isInitialLoad.current) {
        toastRef.current.error('Failed to load floor plan. Please configure in Admin.')
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
  }, [restaurant?.id]) // toast removed from deps - using toastRef to prevent memory leak (B2)

  useEffect(() => {
    // Initial load
    loadFloorPlan()

    // Only poll when real-time is unavailable (prevents race conditions)
    if (!isSubscribed) {
      logger.info('[useServerView] Real-time unavailable, starting 30s polling')
      const interval = setInterval(() => {
        if (restaurant?.id) {
          loadFloorPlan()
        }
      }, 30000)

      return () => clearInterval(interval)
    } else {
      logger.info('[useServerView] Real-time active, polling disabled')
    }
  }, [loadFloorPlan, restaurant?.id, isSubscribed])

  // TODO-145: Single-pass stats calculation (O(n) instead of O(7n))
  const stats = useMemo(() => {
    return tables.reduce(
      (acc, t) => {
        acc.totalTables++
        acc.totalSeats += t.seats

        if (t.status === 'available') {
          acc.availableTables++
          acc.availableSeats += t.seats
        } else if (t.status === 'occupied') {
          acc.occupiedTables++
        } else if (t.status === 'reserved') {
          acc.reservedTables++
        } else if (t.status === 'paid') {
          acc.paidTables++
        }

        return acc
      },
      {
        totalTables: 0,
        availableTables: 0,
        occupiedTables: 0,
        reservedTables: 0,
        paidTables: 0,
        totalSeats: 0,
        availableSeats: 0
      }
    )
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