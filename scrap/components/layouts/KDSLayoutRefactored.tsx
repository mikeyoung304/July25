'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useKDSState } from '@/lib/hooks/use-kds-state'
import { KDSHeader } from './KDSHeader'
import { KDSMainContent } from './KDSMainContent'
import {
  BarStation,
  ExpoStation,
  FryerStation,
  GrillStation,
  SaladStation,
  type StationType,
  filterOrdersByStation,
} from './stations'
import { getClientUser } from '@/lib/modassembly/supabase/auth/session'
import { createClient } from '@/lib/supabase/client'
import {
  addOrderNotes,
  bumpOrder,
  recallOrder,
  startOrderPrep,
  updateOrderPriority,
} from '@/lib/modassembly/supabase/database/kds'
import { useToast } from '@/hooks/use-toast'

interface KDSLayoutRefactoredProps {
  stationId?: string
  className?: string
  showHeader?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

/**
 * Refactored KDS Layout Component
 * 
 * This component replaces the original 792-line kds-layout.tsx with a
 * cleaner, more maintainable architecture:
 * 
 * - KDSHeader: Connection status, controls, metrics (250 lines)
 * - KDSMainContent: Order display logic (200 lines)
 * - Station Components: Domain-specific order handling (250 lines each)
 * - This orchestrator: Business logic and state management (300 lines)
 * 
 * Benefits:
 * - 792 lines → 5 focused components
 * - Better separation of concerns
 * - Easier testing and maintenance
 * - Station-specific optimizations
 * - Reusable components
 */
export const KDSLayoutRefactored = memo<KDSLayoutRefactoredProps>(({ 
  stationId, 
  className, 
  showHeader = true, 
  isFullscreen = false, 
  onToggleFullscreen 
}) => {
  const kdsState = useKDSState(stationId)
  const { toast } = useToast()
  
  // Local UI state
  const [selectedStation, setSelectedStation] = useState<StationType>(
    (stationId as StationType) || 'all'
  )
  
  // Filter orders based on selected station
  const stationOrders = useMemo(() => {
    return filterOrdersByStation(kdsState.orders || [], selectedStation)
  }, [kdsState.orders, selectedStation])
  
  // Order action handlers with proper error handling and optimistic updates
  const handleOrderAction = useCallback(
    async (action: string, orderId: string) => {
      try {
        const user = await getClientUser()
        const userId = user?.id || 'unknown-user'
        switch (action) {
          case 'start':
            // Optimistic update
            kdsState.optimisticUpdate(orderId, {
              started_at: new Date().toISOString()
            })
            await startOrderPrep(orderId)
            toast({
              title: 'Preparation started',
              description: 'Order preparation has begun',
            })
            break
            
          case 'complete':
            // Optimistic update
            kdsState.optimisticUpdate(orderId, {
              completed_at: new Date().toISOString(),
              bumped_at: new Date().toISOString()
            })
            await bumpOrder(orderId, userId)
            toast({
              title: 'Order completed',
              description: 'Order marked as ready for pickup',
            })
            break
            
          case 'recall':
            // Optimistic update
            kdsState.optimisticUpdate(orderId, {
              completed_at: null,
              bumped_at: null,
              recalled_at: new Date().toISOString()
            })
            await recallOrder(orderId)
            toast({
              title: 'Order recalled',
              description: 'Order has been recalled to the kitchen',
            })
            break
            
          case 'quality_check':
            // Custom quality check action for expo station (using notes field)
            kdsState.optimisticUpdate(orderId, {
              notes: `Quality checked by ${userId} at ${new Date().toISOString()}`
            })
            toast({
              title: 'Quality check completed',
              description: 'Order has passed quality inspection',
            })
            break
            
          default:
            console.warn(`Unknown action: ${action}`)
        }
      } catch (error) {
        console.error(`Error performing action ${action}:`, error)
        
        // Refetch on error to restore correct state
        kdsState.refetch()
        
        toast({
          title: `Error: ${action}`,
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          variant: 'destructive',
        })
      }
    },
    [kdsState, toast]
  )
  
  // Bulk action handlers
  const handleBulkAction = useCallback(
    async (action: string, orderIds: string[]) => {
      try {
        await Promise.all(
          orderIds.map(orderId => handleOrderAction(action, orderId))
        )
        
        toast({
          title: 'Bulk action completed',
          description: `${action} applied to ${orderIds.length} orders`,
        })
      } catch (error) {
        console.error('Error performing bulk action:', error)
        toast({
          title: 'Bulk action failed',
          description: 'Some orders may not have been updated',
          variant: 'destructive',
        })
      }
    },
    [handleOrderAction, toast]
  )
  
  // Station selection handler
  const handleStationChange = useCallback((station: StationType) => {
    setSelectedStation(station)
    toast({
      title: 'Station changed',
      description: `Switched to ${station === 'all' ? 'all stations' : `${station} station`}`,
    })
  }, [toast])
  
  // Render station-specific view
  const renderStationView = useCallback(() => {
    const commonProps = {
      orders: stationOrders,
      onOrderAction: handleOrderAction,
      className: "h-full"
    }
    
    switch (selectedStation) {
      case 'grill':
        return <GrillStation {...commonProps} />
      case 'fryer':
        return <FryerStation {...commonProps} />
      case 'salad':
        return <SaladStation {...commonProps} />
      case 'expo':
        return <ExpoStation {...commonProps} />
      case 'bar':
        return <BarStation {...commonProps} />
      case 'all':
      default:
        return (
          <KDSMainContent 
            className="h-full"
            orders={stationOrders}
            loading={kdsState.loading}
            error={kdsState.error || undefined}
            viewMode={kdsState.viewMode}
            filterBy={kdsState.filterBy}
            sortBy={kdsState.sortBy}
          />
        )
    }
  }, [selectedStation, stationOrders, handleOrderAction, kdsState.loading, kdsState.error, kdsState.viewMode, kdsState.filterBy, kdsState.sortBy])
  
  return (
    <div className={cn(
      "flex flex-col h-full bg-gray-900 text-white",
      className
    )}>
      {/* Header with controls and status */}
      {showHeader && (
        <KDSHeader 
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
          className="flex-shrink-0"
        />
      )}
      
      {/* Station selector bar */}
      <div className="flex items-center gap-2 p-4 bg-gray-800 border-b border-gray-700">
        <span className="text-sm text-gray-400">Station:</span>
        {(['all', 'grill', 'fryer', 'salad', 'expo', 'bar'] as StationType[]).map(station => (
          <button
            key={station}
            onClick={() => handleStationChange(station)}
            className={cn(
              "px-3 py-1 rounded text-sm font-medium transition-colors",
              selectedStation === station
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            )}
          >
            {station === 'all' ? 'All Stations' : station.charAt(0).toUpperCase() + station.slice(1)}
          </button>
        ))}
        
        {/* Order count for selected station */}
        <div className="ml-auto text-sm text-gray-400">
          {stationOrders.length} orders
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {kdsState.error ? (
          <div className="flex items-center justify-center h-full text-red-400">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Connection Error</h3>
              <p className="text-gray-400 mb-4">{kdsState.error}</p>
              <button 
                onClick={kdsState.refetch}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : (
          renderStationView()
        )}
      </div>
    </div>
  )
})

KDSLayoutRefactored.displayName = 'KDSLayoutRefactored'