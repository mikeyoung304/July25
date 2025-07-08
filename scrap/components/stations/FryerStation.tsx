'use client'

import { memo, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Timer, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrderCard } from '../order-card'

interface FryerStationProps {
  orders: any[]
  onOrderAction: (action: string, orderId: string) => void
  className?: string
}

// Fryer-specific order priorities
const getFryerPriority = (items: string[]) => {
  const fryerItems = ['fries', 'rings', 'nuggets', 'wings', 'calamari', 'tempura']
  const hasUrgentItems = items.some(item => 
    ['fries', 'rings'].some(urgentItem => 
      item.toLowerCase().includes(urgentItem)
    )
  )
  const hasFryerItems = items.some(item => 
    fryerItems.some(fryerItem => 
      item.toLowerCase().includes(fryerItem)
    )
  )
  
  if (hasUrgentItems) return 'high'
  if (hasFryerItems) return 'medium'
  return 'low'
}

// Estimated frying times
const getEstimatedFryTime = (items: string[]) => {
  const fryTimes: Record<string, number> = {
    fries: 4,
    rings: 5,
    nuggets: 6,
    wings: 8,
    calamari: 3,
    tempura: 4,
  }
  
  let maxTime = 3 // default
  items.forEach(item => {
    Object.entries(fryTimes).forEach(([food, time]) => {
      if (item.toLowerCase().includes(food)) {
        maxTime = Math.max(maxTime, time)
      }
    })
  })
  
  return maxTime
}

// Fryer-specific order card
const FryerOrderCard = memo(({ 
  order, 
  onAction 
}: { 
  order: any
  onAction: (action: string, orderId: string) => void 
}) => {
  const estimatedTime = getEstimatedFryTime(order.items || [])
  const priority = getFryerPriority(order.items || [])
  const elapsedMinutes = order.elapsed_seconds ? Math.floor(order.elapsed_seconds / 60) : 0
  
  const handleStart = useCallback(() => {
    onAction('start', order.id)
  }, [onAction, order.id])
  
  const handleComplete = useCallback(() => {
    onAction('complete', order.id)
  }, [onAction, order.id])
  
  return (
    <Card className={cn(
      "relative",
      priority === 'high' && "border-yellow-500 bg-yellow-50/5",
      elapsedMinutes > estimatedTime && "border-red-500 bg-red-50/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="font-semibold">Table {order.table_label}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={priority === 'high' ? 'destructive' : 'secondary'}>
              {priority}
            </Badge>
            
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Timer className="h-3 w-3" />
              <span>{elapsedMinutes}m / {estimatedTime}m</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {(order.items || []).map((item: string, index: number) => (
            <div key={index} className="text-sm">
              <span className={cn(
                getFryerPriority([item]) === 'high' 
                  ? "font-medium text-yellow-600"
                  : "text-gray-700"
              )}>
                {item}
              </span>
            </div>
          ))}
        </div>
        
        {order.special_requests && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <strong>Special:</strong> {order.special_requests}
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          {order.status === 'new' && (
            <Button 
              onClick={handleStart}
              size="sm" 
              className="flex-1 bg-yellow-600 hover:bg-yellow-700"
            >
              <Zap className="h-3 w-3 mr-1" />
              Start Frying
            </Button>
          )}
          
          {order.status === 'in_progress' && (
            <Button 
              onClick={handleComplete}
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
FryerOrderCard.displayName = 'FryerOrderCard'

export const FryerStation = memo<FryerStationProps>(({ 
  orders, 
  onOrderAction, 
  className 
}) => {
  // Filter orders relevant to fryer station
  const fryerOrders = orders.filter(order => {
    const items = order.items || []
    return items.some((item: string) => 
      ['fries', 'rings', 'nuggets', 'wings', 'calamari', 'tempura', 'fried'].some(fryerItem =>
        item.toLowerCase().includes(fryerItem)
      )
    )
  })
  
  // Sort by priority and time
  const sortedOrders = fryerOrders.sort((a, b) => {
    const aPriority = getFryerPriority(a.items || [])
    const bPriority = getFryerPriority(b.items || [])
    
    if (aPriority !== bPriority) {
      return aPriority === 'high' ? -1 : 1
    }
    
    return (a.elapsed_seconds || 0) - (b.elapsed_seconds || 0)
  })
  
  const activeOrders = sortedOrders.filter(order => 
    order.status === 'new' || order.status === 'in_progress'
  ).length
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-white">Fryer Station</h2>
        </div>
        
        <Badge variant="secondary" className={cn(
          activeOrders > 8 
            ? "bg-red-900/40 text-red-400" 
            : activeOrders > 4 
              ? "bg-yellow-900/40 text-yellow-400"
              : "bg-green-900/40 text-green-400"
        )}>
          {activeOrders} active
        </Badge>
      </div>
      
      {sortedOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No fryer orders</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedOrders.map(order => (
            <FryerOrderCard
              key={order.id}
              order={order}
              onAction={onOrderAction}
            />
          ))}
        </div>
      )}
    </div>
  )
})

FryerStation.displayName = 'FryerStation'