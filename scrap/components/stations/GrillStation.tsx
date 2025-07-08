'use client'

import { memo, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Flame, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrderCard } from '../order-card'

interface GrillStationProps {
  orders: any[]
  onOrderAction: (action: string, orderId: string) => void
  className?: string
}

// Grill-specific order priorities
const getGrillPriority = (items: string[]) => {
  const grillItems = ['steak', 'burger', 'chicken', 'fish', 'sausage']
  const hasGrillItems = items.some(item => 
    grillItems.some(grillItem => 
      item.toLowerCase().includes(grillItem)
    )
  )
  return hasGrillItems ? 'high' : 'medium'
}

// Estimated cooking times for grill items
const getEstimatedCookTime = (items: string[]) => {
  const cookTimes: Record<string, number> = {
    steak: 15,
    burger: 8,
    chicken: 12,
    fish: 10,
    sausage: 6,
  }
  
  let maxTime = 5 // default
  items.forEach(item => {
    Object.entries(cookTimes).forEach(([food, time]) => {
      if (item.toLowerCase().includes(food)) {
        maxTime = Math.max(maxTime, time)
      }
    })
  })
  
  return maxTime
}

// Grill-specific order card
const GrillOrderCard = memo(({ 
  order, 
  onAction 
}: { 
  order: any
  onAction: (action: string, orderId: string) => void 
}) => {
  const estimatedTime = getEstimatedCookTime(order.items || [])
  const priority = getGrillPriority(order.items || [])
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
      priority === 'high' && "border-orange-500 bg-orange-50/5",
      elapsedMinutes > estimatedTime && "border-red-500 bg-red-50/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
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
                getGrillPriority([item]) === 'high' 
                  ? "font-medium text-orange-600"
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
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <Flame className="h-3 w-3 mr-1" />
              Start Grilling
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
GrillOrderCard.displayName = 'GrillOrderCard'

export const GrillStation = memo<GrillStationProps>(({ 
  orders, 
  onOrderAction, 
  className 
}) => {
  // Filter orders relevant to grill station
  const grillOrders = orders.filter(order => {
    const items = order.items || []
    return items.some((item: string) => 
      ['steak', 'burger', 'chicken', 'fish', 'sausage', 'grill'].some(grillItem =>
        item.toLowerCase().includes(grillItem)
      )
    )
  })
  
  // Sort by priority and time
  const sortedOrders = grillOrders.sort((a, b) => {
    const aPriority = getGrillPriority(a.items || [])
    const bPriority = getGrillPriority(b.items || [])
    
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
          <Flame className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-white">Grill Station</h2>
        </div>
        
        <Badge variant="secondary" className={cn(
          activeOrders > 5 
            ? "bg-red-900/40 text-red-400" 
            : activeOrders > 2 
              ? "bg-yellow-900/40 text-yellow-400"
              : "bg-green-900/40 text-green-400"
        )}>
          {activeOrders} active
        </Badge>
      </div>
      
      {sortedOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Flame className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No grill orders</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedOrders.map(order => (
            <GrillOrderCard
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

GrillStation.displayName = 'GrillStation'