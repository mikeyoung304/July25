import React, { useMemo } from 'react'
import { ChefHat, Flame, Salad, Package, Coffee, IceCream, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Order, OrderItem } from '@rebuild/shared'

export interface Station {
  id: string
  name: string
  icon: React.ReactNode
  categories: string[]
  color: string
}

export interface StationStatus {
  station: Station
  itemCount: number
  completedCount: number
  inProgressCount: number
  pendingCount: number
  estimatedMinutes: number
  isCompleted: boolean
  isInProgress: boolean
  completionPercentage: number
}

// Default station configuration (can be customized per restaurant)
export const DEFAULT_STATIONS: Station[] = [
  {
    id: 'grill',
    name: 'Grill',
    icon: <Flame className="w-4 h-4" />,
    categories: ['burgers', 'steaks', 'grilled', 'meat'],
    color: 'orange'
  },
  {
    id: 'saute',
    name: 'Sauté',
    icon: <ChefHat className="w-4 h-4" />,
    categories: ['pasta', 'entrees', 'seafood', 'chicken'],
    color: 'blue'
  },
  {
    id: 'salad',
    name: 'Salad',
    icon: <Salad className="w-4 h-4" />,
    categories: ['salads', 'appetizers', 'cold'],
    color: 'green'
  },
  {
    id: 'fry',
    name: 'Fry',
    icon: <Package className="w-4 h-4" />,
    categories: ['fried', 'sides', 'fries', 'wings'],
    color: 'yellow'
  },
  {
    id: 'dessert',
    name: 'Dessert',
    icon: <IceCream className="w-4 h-4" />,
    categories: ['desserts', 'ice cream', 'cakes'],
    color: 'pink'
  },
  {
    id: 'beverage',
    name: 'Beverage',
    icon: <Coffee className="w-4 h-4" />,
    categories: ['drinks', 'coffee', 'beverages'],
    color: 'brown'
  }
]

interface StationStatusBarProps {
  orders: Order[]
  stations?: Station[]
  showLabels?: boolean
  showTooltips?: boolean
  className?: string
}

/**
 * Calculate which station handles an item based on its category
 *
 * Station Assignment Logic
 *
 * KNOWN LIMITATION: Currently uses keyword matching as fallback.
 * TODO: Refactor to use menu item metadata when menu system supports
 * station assignments at the item level.
 *
 * See: TODO_ISSUES.csv #14
 */
const getItemStation = (item: OrderItem, stations: Station[]): Station | null => {
  // TODO: This should ideally come from the menu item metadata
  // For now, we'll do simple keyword matching
  const itemNameLower = item.name.toLowerCase()
  
  for (const station of stations) {
    for (const category of station.categories) {
      if (itemNameLower.includes(category)) {
        return station
      }
    }
  }
  
  // Default to first station if no match
  return stations[0] || null
}

/**
 * Calculate station status from orders
 */
const calculateStationStatus = (
  orders: Order[],
  stations: Station[]
): StationStatus[] => {
  const stationMap = new Map<string, StationStatus>()
  
  // Initialize all stations
  stations.forEach(station => {
    stationMap.set(station.id, {
      station,
      itemCount: 0,
      completedCount: 0,
      inProgressCount: 0,
      pendingCount: 0,
      estimatedMinutes: 0,
      isCompleted: false,
      isInProgress: false,
      completionPercentage: 0
    })
  })
  
  // Process all orders and items
  orders.forEach(order => {
    order.items.forEach(item => {
      const station = getItemStation(item, stations)
      if (!station) return
      
      const status = stationMap.get(station.id)
      if (!status) return
      
      status.itemCount += item.quantity
      
      // Map order status to item status
      switch (order.status) {
        case 'completed':
        case 'ready':
          status.completedCount += item.quantity
          break
        case 'preparing':
        case 'confirmed':
          status.inProgressCount += item.quantity
          break
        case 'new':
        case 'pending':
          status.pendingCount += item.quantity
          break
      }
    })
  })
  
  // Calculate final status for each station
  stationMap.forEach(status => {
    if (status.itemCount > 0) {
      status.completionPercentage = Math.round(
        (status.completedCount / status.itemCount) * 100
      )
      status.isCompleted = status.completedCount === status.itemCount
      status.isInProgress = status.inProgressCount > 0
      
      // Simple time estimate: 3 minutes per item in progress
      status.estimatedMinutes = status.inProgressCount * 3
    }
  })
  
  return Array.from(stationMap.values())
}

/**
 * Individual station indicator
 */
const StationIndicator: React.FC<{
  status: StationStatus
  showLabel?: boolean
  showTooltip?: boolean
}> = ({ status, showLabel = false, showTooltip = true }) => {
  const { station, isCompleted, isInProgress, completionPercentage } = status
  
  const getColorClass = () => {
    if (isCompleted) return 'bg-green-500'
    if (isInProgress) return 'bg-yellow-500'
    if (completionPercentage > 0) return 'bg-blue-500'
    return 'bg-gray-300'
  }
  
  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle className="w-3 h-3" />
    if (isInProgress) return <Clock className="w-3 h-3" />
    if (status.pendingCount > 0) return <AlertCircle className="w-3 h-3" />
    return null
  }
  
  const indicator = (
    <div className={cn(
      "relative flex items-center gap-1 px-2 py-1 rounded-full transition-all",
      "hover:scale-105",
      isCompleted && "bg-green-100",
      isInProgress && "bg-yellow-100 animate-pulse",
      !isCompleted && !isInProgress && completionPercentage > 0 && "bg-blue-100",
      !isCompleted && !isInProgress && completionPercentage === 0 && "bg-gray-100"
    )}>
      {/* Progress bar background */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            getColorClass(),
            "opacity-20"
          )}
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
      
      {/* Station icon and label */}
      <div className="relative flex items-center gap-1">
        <div className={cn(
          "text-gray-700",
          isCompleted && "text-green-700",
          isInProgress && "text-yellow-700"
        )}>
          {station.icon}
        </div>
        {showLabel && (
          <span className="text-xs font-medium">
            {station.name}
          </span>
        )}
        {getStatusIcon()}
      </div>
      
      {/* Item count badge */}
      {status.itemCount > 0 && (
        <div className="relative">
          <span className="text-xs font-bold">
            {status.completedCount}/{status.itemCount}
          </span>
        </div>
      )}
    </div>
  )
  
  if (!showTooltip) return indicator
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{station.name} Station</p>
            <div className="text-xs space-y-1">
              <p>Total Items: {status.itemCount}</p>
              <p>Completed: {status.completedCount}</p>
              <p>In Progress: {status.inProgressCount}</p>
              <p>Pending: {status.pendingCount}</p>
              {status.estimatedMinutes > 0 && (
                <p>Est. Time: {status.estimatedMinutes} min</p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Station Status Bar Component
 * Shows completion status for each kitchen station
 */
export const StationStatusBar: React.FC<StationStatusBarProps> = ({
  orders,
  stations = DEFAULT_STATIONS,
  showLabels = false,
  showTooltips = true,
  className
}) => {
  const stationStatuses = useMemo(
    () => calculateStationStatus(orders, stations),
    [orders, stations]
  )
  
  const overallCompletion = useMemo(() => {
    const total = stationStatuses.reduce((sum, s) => sum + s.itemCount, 0)
    const completed = stationStatuses.reduce((sum, s) => sum + s.completedCount, 0)
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }, [stationStatuses])
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Overall progress */}
      <div className="flex items-center gap-2 pr-3 border-r">
        <span className="text-xs font-medium text-gray-600">Stations:</span>
        <div className="flex items-center gap-1">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                overallCompletion === 100 && "bg-green-500",
                overallCompletion >= 75 && overallCompletion < 100 && "bg-blue-500",
                overallCompletion >= 50 && overallCompletion < 75 && "bg-yellow-500",
                overallCompletion < 50 && "bg-gray-400"
              )}
              style={{ width: `${overallCompletion}%` }}
            />
          </div>
          <span className="text-xs font-bold">{overallCompletion}%</span>
        </div>
      </div>
      
      {/* Individual station indicators */}
      <div className="flex items-center gap-1">
        {stationStatuses.map(status => (
          <StationIndicator
            key={status.station.id}
            status={status}
            showLabel={showLabels}
            showTooltip={showTooltips}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Compact station dots for use in cards
 */
export const StationDots: React.FC<{
  orders: Order[]
  stations?: Station[]
  size?: 'sm' | 'md' | 'lg'
}> = ({ orders, stations = DEFAULT_STATIONS, size = 'sm' }) => {
  const stationStatuses = useMemo(
    () => calculateStationStatus(orders, stations),
    [orders, stations]
  )
  
  const dotSize = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }[size]
  
  return (
    <div className="flex items-center gap-1">
      {stationStatuses
        .filter(s => s.itemCount > 0)
        .map(status => (
          <div
            key={status.station.id}
            className={cn(
              dotSize,
              "rounded-full transition-all",
              status.isCompleted && "bg-green-500",
              status.isInProgress && "bg-yellow-500 animate-pulse",
              !status.isCompleted && !status.isInProgress && status.completionPercentage > 0 && "bg-blue-500",
              !status.isCompleted && !status.isInProgress && status.completionPercentage === 0 && "bg-gray-300"
            )}
            title={`${status.station.name}: ${status.completedCount}/${status.itemCount}`}
          />
        ))}
    </div>
  )
}